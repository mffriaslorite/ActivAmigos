from flask_smorest import Blueprint, abort
from flask import session
from sqlalchemy.exc import IntegrityError
from models.user.user import User, db
from models.user.user_schema import UserSchema, UpdateProfileSchema

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

# ✅ Delete account
@blp.route("/profile", methods=["DELETE"])
@blp.response(200)
def delete_account():
    if "user_id" not in session:
        abort(401, message="Authentication required")

    user = User.query.get(session["user_id"])
    if not user:
        abort(404, message="User not found")

    db.session.delete(user)
    db.session.commit()
    session.clear()

    return {"message": "Account deleted successfully"}
