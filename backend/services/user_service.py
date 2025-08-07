from flask_smorest import Blueprint, abort
from flask import session, request
from sqlalchemy.exc import IntegrityError
from models.user.user import User, db
from models.user.user_schema import UserSchema, UpdateProfileSchema
from schemas.auth_schema import ChangePasswordSchema
from utils.minio_client import minio_client
from utils.validators import validate_password

blp = Blueprint("User", "user", url_prefix="/api/user", description="User profile management")

# ✅ Get profile (current user)
@blp.route("/profile", methods=["GET"])
@blp.response(200, UserSchema)
def get_profile():
    if "user_id" not in session:
        abort(401, message="Authentication required")

    user = User.query.get(session["user_id"])
    if not user:
        abort(404, message="User not found")

    return user

# ✅ Update profile
@blp.route("/profile", methods=["PUT"])
@blp.arguments(UpdateProfileSchema)
@blp.response(200, UserSchema)
def update_profile(data):
    if "user_id" not in session:
        abort(401, message="Authentication required")

    user = User.query.get(session["user_id"])
    if not user:
        abort(404, message="User not found")

    if "first_name" in data:
        user.first_name = data["first_name"]
    if "last_name" in data:
        user.last_name = data["last_name"]
    if "bio" in data:
        user.bio = data["bio"]
    if "email" in data:
        new_email = data["email"].lower()
        if new_email != user.email:
            if User.query.filter_by(email=new_email).first():
                abort(409, message="Email already in use")
            user.email = new_email
            user.email_verified = False

    try:
        db.session.commit()
        return user
    except IntegrityError:
        db.session.rollback()
        abort(500, message="Failed to update profile")

# ✅ Change password
@blp.route("/change-password", methods=["PUT"])
@blp.arguments(ChangePasswordSchema)
@blp.response(200)
def change_password(data):
    if "user_id" not in session:
        abort(401, message="Authentication required")

    user = User.query.get(session["user_id"])
    if not user:
        abort(404, message="User not found")

    # Verify current password
    if not user.check_password(data["current_password"]):
        abort(400, message="Current password is incorrect")

    # Validate new password
    password_valid, password_msg = validate_password(data["new_password"])
    if not password_valid:
        abort(400, message=password_msg)

    # Update password
    user.set_password(data["new_password"])
    
    try:
        db.session.commit()
        return {"message": "Password changed successfully"}
    except Exception:
        db.session.rollback()
        abort(500, message="Failed to change password")

# ✅ Upload profile image
@blp.route("/profile-image", methods=["PUT"])
@blp.response(200, UserSchema)
def upload_profile_image():
    if "user_id" not in session:
        abort(401, message="Authentication required")

    user = User.query.get(session["user_id"])
    if not user:
        abort(404, message="User not found")

    # Check if file is present
    if 'image' not in request.files:
        abort(400, message="No image file provided")

    file = request.files['image']
    if file.filename == '':
        abort(400, message="No file selected")

    try:
        # Read file data
        file_data = file.read()
        content_type = file.content_type

        # Validate file size (16MB max)
        if len(file_data) > 16 * 1024 * 1024:
            abort(400, message="File too large. Maximum size is 16MB")

        # Delete old profile image if exists
        if user.profile_image:
            try:
                minio_client.delete_profile_image(user.profile_image)
            except Exception as e:
                # Log warning but don't fail the upload
                blp.app.logger.warning(f"Failed to delete old profile image: {e}")

        # Upload new image
        image_url = minio_client.upload_profile_image(file_data, user.id, content_type)
        
        # Update user profile
        user.profile_image = image_url
        db.session.commit()

        return user

    except ValueError as e:
        abort(400, message=str(e))
    except Exception as e:
        db.session.rollback()
        abort(500, message="Failed to upload image")

# ✅ Delete account
@blp.route("/profile", methods=["DELETE"])
@blp.response(200)
def delete_account():
    if "user_id" not in session:
        abort(401, message="Authentication required")

    user = User.query.get(session["user_id"])
    if not user:
        abort(404, message="User not found")

    # Delete profile image if exists
    if user.profile_image:
        try:
            minio_client.delete_profile_image(user.profile_image)
        except Exception as e:
            blp.app.logger.warning(f"Failed to delete profile image during account deletion: {e}")

    db.session.delete(user)
    db.session.commit()
    session.clear()

    return {"message": "Account deleted successfully"}
