from flask_smorest import Blueprint, abort
from flask import session, request, current_app, Response
from sqlalchemy.exc import IntegrityError
from models.user.user import User, db
from models.user.user_schema import (
    UserSchema,
    UpdateProfileSchema,
    ProfileImageUploadSchema
)
from schemas.auth_schema import ChangePasswordSchema
from utils.minio_client import minio_client
from utils.validators import validate_password
from utils.decorators import require_user

blp = Blueprint("User", "user", url_prefix="/api/user", description="User profile management")


# ✅ Get profile (current user)
@blp.route("/profile", methods=["GET"])
@require_user
@blp.response(200, UserSchema)
def get_profile(current_user: User):
    return current_user


# ✅ Update profile
@blp.route("/profile", methods=["PUT"])
@blp.arguments(UpdateProfileSchema)
@require_user
@blp.response(200, UserSchema)
def update_profile(data, current_user: User):
    if "first_name" in data:
        current_user.first_name = data["first_name"]
    if "last_name" in data:
        current_user.last_name = data["last_name"]
    if "bio" in data:
        current_user.bio = data["bio"]
    if "email" in data:
        new_email = data["email"].lower()
        if new_email != current_user.email:
            if User.query.filter_by(email=new_email).first():
                abort(409, message="Email already in use")
            current_user.email = new_email
            current_user.email_verified = False

    try:
        db.session.commit()
        return current_user
    except IntegrityError:
        db.session.rollback()
        abort(500, message="Failed to update profile")

# ✅ Change password
@blp.route("/change-password", methods=["PUT"])
@blp.arguments(ChangePasswordSchema)
@require_user
@blp.response(200)
def change_password(data, current_user: User):
    # Verify current password
    if not current_user.check_password(data["current_password"]):
        abort(400, message="Current password is incorrect")

    # Validate new password
    password_valid, password_msg = validate_password(data["new_password"])
    if not password_valid:
        abort(400, message=password_msg)

    # Update password
    current_user.set_password(data["new_password"])

    try:
        db.session.commit()
        return {"message": "Password changed successfully"}
    except Exception:
        db.session.rollback()
        abort(500, message="Failed to change password")

# ✅ Upload profile image
@blp.route("/profile-image", methods=["PUT"])
@blp.arguments(ProfileImageUploadSchema, location="files")
@require_user
@blp.response(200, UserSchema)
def upload_profile_image(files, current_user: User):
    # Get the uploaded file from request.files
    if 'image' not in request.files:
        abort(400, message="No file provided")
    
    file = request.files['image']
    
    if not file or file.filename == '':
        abort(400, message="No file selected")

    try:
        # Read file data
        file_data = file.read()
        content_type = file.content_type

        # Validate file size (16MB max)
        if len(file_data) > 16 * 1024 * 1024:
            abort(400, message="File too large. Maximum size is 16MB")

        # Delete old profile image if exists
        if current_user.profile_image:
            try:
                minio_client.delete_profile_image(current_user.profile_image)
            except Exception as e:
                # Log warning but don't fail the upload
                current_app.logger.warning(f"Failed to delete old profile image: {e}")

        # Upload new image
        image_url = minio_client.upload_profile_image(file_data, current_user.id, content_type)

        # Update user profile
        current_user.profile_image = image_url
        db.session.commit()

        return current_user

    except ValueError as e:
        abort(400, message=str(e))
    except Exception as e:
        db.session.rollback()
        abort(500, message="Failed to upload image")


# ✅ Delete profile image
@blp.route("/profile-image", methods=["DELETE"])
@require_user
@blp.response(200, UserSchema)
def delete_profile_image(current_user: User):
    if not current_user.profile_image:
        abort(404, message="No profile image to delete")
        
    try:
        try:
            minio_client.delete_profile_image(current_user.profile_image)
        except Exception as e:
            current_app.logger.warning(f"Failed to delete image from MinIO: {e}")

        current_user.profile_image = None
        db.session.commit()

        return current_user
    except Exception as e:
        db.session.rollback()
        abort(500, message=f"Failed to delete profile image: {e}")


        
# ✅ Delete account
@blp.route("/profile", methods=["DELETE"])
@blp.response(200)
@require_user
def delete_account(current_user: User):
    # Delete profile image if exists
    if current_user.profile_image:
        try:
            minio_client.delete_profile_image(current_user.profile_image)
        except Exception as e:
            blp.app.logger.warning(f"Failed to delete profile image during account deletion: {e}")

    db.session.delete(current_user)
    db.session.commit()
    session.clear()

    return {"message": "Account deleted successfully"}

# ✅ Stream profile image
@blp.route("/profile-image/stream", methods=["GET"])
@require_user
def stream_profile_image(current_user: User):
    """Devuelve la imagen de perfil del usuario autenticado (stream)."""
    if not current_user.profile_image:
        abort(404, message="No profile image")

    # Helper to extract object name from profile image URL or return as is
    def get_object_name_from_profile_image(profile_image_url):
        object_name = minio_client._extract_filename_from_url(profile_image_url)
        return object_name if object_name else profile_image_url

    object_name = get_object_name_from_profile_image(current_user.profile_image)

    try:
        data, content_type = minio_client.get_object_bytes(object_name)
        return Response(data, mimetype=content_type)
        # Alternativa: send_file(BytesIO(data), mimetype=content_type)
    except Exception as e:
        current_app.logger.error(f"Failed to fetch profile image: {e}")
        abort(500, message="Failed to fetch profile image")

