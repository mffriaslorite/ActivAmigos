from flask_smorest import Blueprint, abort
from models.warnings.warnings import Warning, WarningContextType, MembershipStatus
from models.associations.group_associations import group_members
from models.associations.activity_associations import activity_participants
from models.message.message import Message, MessageContextType
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
from utils.decorators import require_user, login_required

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

        # ✅ TRIGGER: Verificar logro "Así Soy Yo"
        try:
            from utils.achievement_engine_simple import trigger_profile_updated
            trigger_profile_updated(current_user.id)
        except Exception as e:
            print(f"Error checking profile achievements: {e}")

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

@blp.route("/status/overall", methods=["GET"])
@login_required
def get_user_overall_status():
    """Get user's overall moderation status across all contexts"""
    user_id = session.get('user_id')
    
    # Count total warnings
    total_warnings = Warning.query.filter_by(target_user_id=user_id).count()
    
    # Count active groups
    active_groups = db.session.execute(
        group_members.select().where(
            group_members.c.user_id == user_id,
            group_members.c.status == MembershipStatus.ACTIVE
        )
    ).rowcount
    
    # Count active activities
    active_activities = db.session.execute(
        activity_participants.select().where(
            activity_participants.c.user_id == user_id,
            activity_participants.c.status == MembershipStatus.ACTIVE
        )
    ).rowcount
    
    # Count banned contexts
    banned_contexts = db.session.execute(
        group_members.select().where(
            group_members.c.user_id == user_id,
            group_members.c.status == MembershipStatus.BANNED
        )
    ).rowcount + db.session.execute(
        activity_participants.select().where(
            activity_participants.c.user_id == user_id,
            activity_participants.c.status == MembershipStatus.BANNED
        )
    ).rowcount
    
    # Determine overall semaphore color
    if banned_contexts > 0:
        overall_color = 'red'
    elif total_warnings > 0:
        overall_color = 'yellow'
    elif active_groups > 0 or active_activities > 0:
        # Check if user has ever chatted in any context
        has_chatted = Message.query.filter_by(sender_id=user_id).first() is not None
        overall_color = 'dark_green' if has_chatted else 'light_green'
    else:
        overall_color = 'grey'
    
    return {
        'overall_semaphore_color': overall_color,
        'total_warnings': total_warnings,
        'active_groups': active_groups,
        'active_activities': active_activities,
        'banned_contexts': banned_contexts
    }

def get_user_status_for_context(user_id, context_id=None, context_type=None):
    """
    Helper function to get user status for a specific context
    This is used internally by other services
    """
    # Count total warnings
    total_warnings = Warning.query.filter_by(target_user_id=user_id).count()
    
    # Count active groups
    active_groups = db.session.execute(
        group_members.select().where(
            group_members.c.user_id == user_id,
            group_members.c.status == MembershipStatus.ACTIVE
        )
    ).rowcount
    
    # Count active activities
    active_activities = db.session.execute(
        activity_participants.select().where(
            activity_participants.c.user_id == user_id,
            activity_participants.c.status == MembershipStatus.ACTIVE
        )
    ).rowcount
    
    # Count banned contexts
    banned_contexts = db.session.execute(
        group_members.select().where(
            group_members.c.user_id == user_id,
            group_members.c.status == MembershipStatus.BANNED
        )
    ).rowcount + db.session.execute(
        activity_participants.select().where(
            activity_participants.c.user_id == user_id,
            activity_participants.c.status == MembershipStatus.BANNED
        )
    ).rowcount
    
    # Determine overall semaphore color
    if banned_contexts > 0:
        overall_color = 'red'
    elif total_warnings > 0:
        overall_color = 'yellow'
    elif active_groups > 0 or active_activities > 0:
        # Check if user has ever chatted in any context
        has_chatted = Message.query.filter_by(sender_id=user_id).first() is not None
        overall_color = 'dark_green' if has_chatted else 'light_green'
    else:
        overall_color = 'grey'
    
    return {
        'overall_semaphore_color': overall_color,
        'total_warnings': total_warnings,
        'active_groups': active_groups,
        'active_activities': active_activities,
        'banned_contexts': banned_contexts
    }

@blp.route("/<int:user_id>/image", methods=["GET"])
def get_user_image(user_id):
    """Obtener la imagen de perfil pública de cualquier usuario por ID"""
    user = User.query.get_or_404(user_id)
    print(user.profile_image)
    if not user.profile_image:
        abort(404, message="User has no profile image")

    # 1. Usamos tu método existente para sacar el nombre del archivo de la URL
    object_name = minio_client._extract_filename_from_url(user.profile_image)
    
    # Fallback por si el método devuelve None (si la URL no tiene el formato esperado)
    if not object_name:
        object_name = user.profile_image

    try:
        # 2. Usamos tu método existente para obtener los bytes y el tipo
        data, content_type = minio_client.get_object_bytes(object_name)
        
        return Response(
            data, 
            mimetype=content_type,
            headers={
                'Cache-Control': 'public, max-age=3600' # Cachear 1 hora en navegador
            }
        )
    except Exception as e:
        current_app.logger.error(f"Failed to fetch image for user {user_id}: {e}")
        abort(404, message="Image not found")