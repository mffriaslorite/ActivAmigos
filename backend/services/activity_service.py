from flask_smorest import Blueprint, abort
from flask import session, request, current_app, Response
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta, timezone
from models.user.user import User, db
from models.activity.activity import Activity
from models.group.group import Group
from models.associations.activity_associations import activity_participants
from models.attendance.attendance import ActivityAttendance
from models.rules.rules import activity_rules
from models.message.message import Message, MessageContextType
from services.user_service import get_user_status_for_context
from utils.minio_client import minio_client
from models.activity.activity_schema import (
    ActivityCreateSchema, 
    ActivityUpdateSchema, 
    ActivityResponseSchema, 
    ActivityListSchema,
    JoinLeaveActivityResponseSchema,
    ActivityParticipantSchema,
    ActivityDetailsResponseSchema,
    ActivityImageUploadSchema
)

blp = Blueprint("Activities", "activities", url_prefix="/api/activities", description="Activities management routes")
VALID_ACTIVITY_TYPES = {"sport", "social", "culture", "academic", "other"}

def require_auth():
    """Helper function to check if user is authenticated"""
    if 'user_id' not in session:
        abort(401, message="Authentication required")
    return session['user_id']

def get_current_user():
    """Get the current authenticated user"""
    user_id = require_auth()
    user = User.query.get(user_id)
    if not user:
        abort(401, message="User not found")
    return user

def normalize_activity_types(raw_types, fallback_type=None):
    source = raw_types
    if source is None and fallback_type:
        source = [fallback_type]
    elif isinstance(source, str):
        source = [item.strip() for item in source.split(',')]

    normalized = []
    seen = set()
    for value in source or []:
        if not value:
            continue
        normalized_value = value.strip()
        if normalized_value in VALID_ACTIVITY_TYPES and normalized_value not in seen:
            normalized.append(normalized_value)
            seen.add(normalized_value)
    return normalized

def serialize_activity_types(activity_types=None, fallback_type=None):
    normalized = normalize_activity_types(activity_types, fallback_type)
    return ','.join(normalized) if normalized else None

def deserialize_activity_types(activity: Activity):
    return normalize_activity_types(activity.activity_type)

def build_activity_payload(activity: Activity, current_user_id=None, attendance_confirmed=False, attendance_status=None):
    activity_types = deserialize_activity_types(activity)
    return {
        'id': activity.id,
        'title': activity.title,
        'description': activity.description,
        'activity_type': activity_types[0] if activity_types else None,
        'activity_types': activity_types,
        'image_url': activity.image_url,
        'location': activity.location,
        'group_id': activity.group_id,
        'group_name': activity.group.name if activity.group else None,
        'date': activity.date,
        'rules': activity.rules,
        'created_by': activity.created_by,
        'created_at': activity.created_at,
        'participant_count': activity.participant_count,
        'is_participant': activity.is_participant(current_user_id) if current_user_id else False,
        'attendance_confirmed': attendance_confirmed,
        'attendance_status': attendance_status
    }

@blp.route("", methods=["POST"])
@blp.arguments(ActivityCreateSchema)
@blp.response(201, ActivityResponseSchema)
def create_activity(args):
    """Create a new activity"""
    current_user = get_current_user()
    group = None

    if args.get('group_id') is not None:
        group = Group.query.get_or_404(args['group_id'])
        if not group.is_member(current_user.id):
            abort(403, message="Only group members can link an activity to this group")
    
    try:
        # Create new activity
        activity = Activity(
            title=args['title'],
            description=args.get('description'),
            activity_type=serialize_activity_types(args.get('activity_types'), args.get('activity_type')),
            location=args.get('location'),
            group_id=group.id if group else None,
            date=args['date'],
            rules=args.get('rules'),
            created_by=current_user.id
        )
        
        db.session.add(activity)
        db.session.flush()  # Get the activity ID
        
        # Attach rules if provided
        rule_ids = args.get('rule_ids')
        if rule_ids:
            try:
                # Import here to avoid circular import
                from services.rules_service import RulesService
                RulesService.attach_activity_rules(activity.id, rule_ids, current_user.id)
            except Exception as e:
                print(f"Warning: Could not attach rules to activity: {e}")
                # Continue with activity creation even if rules fail

        # Add creator as an organizer
        activity.add_organizer(current_user)
        
        # Auto-confirm the creator's attendance
        attendance = ActivityAttendance(
            user_id=current_user.id,
            activity_id=activity.id,
            confirmed_at=datetime.now(timezone.utc)
        )
        db.session.add(attendance)
        
        db.session.commit()
        
        # ✅ TRIGGER: Verificar logro "Soy Organizador"
        try:
            from utils.achievement_engine_simple import trigger_creation, trigger_activity_join
            # Verificamos creación
            trigger_creation(current_user.id)
            # Como el creador se une automáticamente, verificamos participación también
            trigger_activity_join(current_user.id)
        except Exception as e:
            print(f"Error checking activity creation achievements: {e}")
        
        return build_activity_payload(activity, current_user.id, attendance_confirmed=True, attendance_status='confirmed')
        
    except IntegrityError:
        db.session.rollback()
        abort(400, message="Error creating activity")

@blp.route("", methods=["GET"])
@blp.response(200, ActivityListSchema(many=True))
def list_activities():
    """List all activities with user specific status"""
    current_user = get_current_user()
    
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
    
    activities = Activity.query\
        .filter(Activity.date > cutoff_time)\
        .order_by(Activity.date.asc())\
        .all()
    
    activities_data = []
    for activity in activities:
        is_participant = activity.is_participant(current_user.id)
        attendance_confirmed = False
        attendance_status = 'not_participant' # Estado por defecto si no participa

        if is_participant:
            attendance = ActivityAttendance.query.filter_by(
                activity_id=activity.id,
                user_id=current_user.id
            ).first()
            
            attendance_confirmed = attendance is not None and attendance.is_confirmed
            
            attendance_status = 'pending'  # Default
            if attendance:
                if attendance.confirmed_at and attendance.present is None:
                    attendance_status = 'confirmed'  # Confirmed but not yet marked by organizer
                elif attendance.confirmed_at and attendance.present is True:
                    attendance_status = 'attended'  # Confirmed and marked as present
                elif attendance.confirmed_at and attendance.present is False:
                # Declined if confirmed before activity date and present is False
                    if attendance.confirmed_at < activity.date:
                        attendance_status = 'declined'
                    else:
                        attendance_status = 'absent'  # Marked absent by organizer after activity date
        
        activities_data.append(build_activity_payload(activity, current_user.id, attendance_confirmed, attendance_status))
    
    return activities_data

@blp.route("/<int:activity_id>", methods=["GET"])
@blp.response(200, ActivityResponseSchema)
def get_activity(activity_id):
    """Get activity details"""
    current_user = get_current_user()
    
    activity = Activity.query.get_or_404(activity_id)
    
    # Init attendance variables
    attendance_confirmed = False
    attendance_status = 'pending'
    
    attendance = ActivityAttendance.query.filter_by(
        activity_id=activity.id,
        user_id=current_user.id
    ).first()
    
    if attendance:
        attendance_confirmed = attendance.is_confirmed
        if attendance.confirmed_at and attendance.present is None:
            attendance_status = 'confirmed'
        elif attendance.confirmed_at and attendance.present is True:
            attendance_status = 'attended'
        elif attendance.confirmed_at and attendance.present is False:
            # Declined if confirmed before activity date and present is False
            if attendance.confirmed_at < activity.date:
                attendance_status = 'declined'
            else:
                attendance_status = 'absent'
    
    return build_activity_payload(activity, current_user.id, attendance_confirmed, attendance_status)

@blp.route("/<int:activity_id>/details", methods=["GET"])
@blp.response(200, ActivityDetailsResponseSchema)
def get_activity_details(activity_id):
    """
    Get full activity details including participants with attendance status and semaphore info
    """
    current_user = get_current_user()
    activity = Activity.query.get_or_404(activity_id)

    # Check if current user has confirmed attendance
    current_user_attendance_confirmed = False
    current_user_attendance_status = 'pending'
    
    attendance = ActivityAttendance.query.filter_by(
        activity_id=activity.id,
        user_id=current_user.id
    ).first()
    
    if attendance:
        current_user_attendance_confirmed = attendance.is_confirmed
        if attendance.confirmed_at and attendance.present is None:
            current_user_attendance_status = 'confirmed'
        elif attendance.confirmed_at and attendance.present is True:
            current_user_attendance_status = 'attended'
        elif attendance.confirmed_at and attendance.present is False:
            if attendance.confirmed_at < activity.date:
                current_user_attendance_status = 'declined'
            else:
                current_user_attendance_status = 'absent'

    # Load participants with extended information including attendance status and semaphore
    participants = []
    for user in activity.participants:
        link = db.session.execute(
            activity_participants.select().where(
                (activity_participants.c.user_id == user.id) & 
                (activity_participants.c.activity_id == activity.id)
            )
        ).first()

        # Get attendance information for this participant
        attendance = ActivityAttendance.query.filter_by(
            activity_id=activity.id,
            user_id=user.id
        ).first()

        # Determine attendance status
        attendance_status = 'pending'  # Default
        if attendance:
            if attendance.confirmed_at and attendance.present is None:
                attendance_status = 'confirmed'  # Confirmed but not yet marked by organizer
            elif attendance.confirmed_at and attendance.present is True:
                attendance_status = 'attended'  # Confirmed and marked as present
            elif attendance.confirmed_at and attendance.present is False:
            # Declined if confirmed before activity date and present is False
                if attendance.confirmed_at < activity.date:
                    attendance_status = 'declined'
                else:
                    attendance_status = 'absent'  # Marked absent by organizer after activity date
        
        # Get user semaphore status
        user_status = get_user_status_for_context(user.id, activity_id, 'ACTIVITY')
        
        participants.append({
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'profile_image': user.profile_image,
            'is_organizer': link.role == 'organizer' if link else False,
            'joined_at': link.joined_at if link else None,
            'attendance_status': attendance_status,
            'attendance_confirmed_at': attendance.confirmed_at.isoformat() if attendance and attendance.confirmed_at else None,
            'semaphore_color': user_status['overall_semaphore_color'],
            'warning_count': user_status['total_warnings']
        })

    response_data = build_activity_payload(
        activity,
        current_user.id,
        current_user_attendance_confirmed,
        current_user_attendance_status
    )
    response_data['participants'] = participants
    return response_data

@blp.route("/<int:activity_id>", methods=["PUT"])
@blp.arguments(ActivityUpdateSchema)
@blp.response(200, ActivityResponseSchema)
def update_activity(args, activity_id):
    """Update an activity (only creator can update)"""
    current_user = get_current_user()
    
    activity = Activity.query.get_or_404(activity_id)
    
    # Check if current user is the creator
    if activity.created_by != current_user.id:
        abort(403, message="Only the activity creator can update this activity")

    if 'group_id' in args and args['group_id'] is not None:
        group = Group.query.get_or_404(args['group_id'])
        if not group.is_member(current_user.id):
            abort(403, message="Only group members can link an activity to this group")
    
    try:
        # Update fields if provided
        if 'title' in args:
            activity.title = args['title']
        if 'description' in args:
            activity.description = args['description']
        if 'activity_types' in args or 'activity_type' in args:
            activity.activity_type = serialize_activity_types(args.get('activity_types'), args.get('activity_type'))
        if 'location' in args:
            activity.location = args['location']
        if 'group_id' in args:
            activity.group_id = args['group_id']
        if 'date' in args:
            activity.date = args['date']
        if 'rules' in args:
            activity.rules = args['rules']
        
        db.session.commit()
        
        return build_activity_payload(activity, current_user.id)
        
    except IntegrityError:
        db.session.rollback()
        abort(400, message="Error updating activity")

@blp.route("/<int:activity_id>/image", methods=["PUT"])
@blp.arguments(ActivityImageUploadSchema, location="files")
@blp.response(200, ActivityResponseSchema)
def upload_activity_image(files, activity_id):
    """Upload or replace the representative image of an activity."""
    current_user = get_current_user()
    activity = Activity.query.get_or_404(activity_id)

    if activity.created_by != current_user.id:
        abort(403, message="Only the activity creator can update the image")

    if 'image' not in request.files:
        abort(400, message="No file provided")

    file = request.files['image']
    if not file or file.filename == '':
        abort(400, message="No file selected")

    try:
        file_data = file.read()
        if len(file_data) > 16 * 1024 * 1024:
            abort(400, message="File too large. Maximum size is 16MB")

        if activity.image_url:
            minio_client.delete_object_url(activity.image_url)

        activity.image_url = minio_client.upload_activity_image(file_data, activity.id, file.content_type)
        db.session.commit()
        return build_activity_payload(activity, current_user.id)
    except ValueError as e:
        abort(400, message=str(e))
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to upload activity image: {e}")
        abort(500, message="Failed to upload image")

@blp.route("/<int:activity_id>/image", methods=["DELETE"])
@blp.response(200, ActivityResponseSchema)
def delete_activity_image(activity_id):
    """Delete the representative image of an activity."""
    current_user = get_current_user()
    activity = Activity.query.get_or_404(activity_id)

    if activity.created_by != current_user.id:
        abort(403, message="Only the activity creator can delete the image")

    if not activity.image_url:
        abort(404, message="No image to delete")

    try:
        minio_client.delete_object_url(activity.image_url)
        activity.image_url = None
        db.session.commit()
        return build_activity_payload(activity, current_user.id)
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to delete activity image: {e}")
        abort(500, message="Failed to delete image")

@blp.route("/<int:activity_id>/image/stream", methods=["GET"])
def stream_activity_image(activity_id):
    """Stream the representative image of an activity."""
    activity = Activity.query.get_or_404(activity_id)

    if not activity.image_url:
        abort(404, message="No image")

    object_name = minio_client._extract_filename_from_url(activity.image_url) or activity.image_url

    try:
        data, content_type = minio_client.get_object_bytes(object_name)
        return Response(
            data,
            mimetype=content_type,
            headers={'Cache-Control': 'public, max-age=3600'}
        )
    except Exception as e:
        current_app.logger.error(f"Failed to fetch activity image: {e}")
        abort(500, message="Failed to fetch image")

@blp.route("/<int:activity_id>", methods=["DELETE"])
@blp.response(204)
def delete_activity(activity_id):
    """Delete an activity (only creator can delete)"""
    current_user = get_current_user()
    
    activity = Activity.query.get_or_404(activity_id)
    
    # Check if current user is the creator
    if activity.created_by != current_user.id:
        abort(403, message="Only the activity creator can delete this activity")

    try:
        if activity.image_url:
            minio_client.delete_object_url(activity.image_url)
        ActivityAttendance.query.filter_by(activity_id=activity_id).delete(synchronize_session=False)
        db.session.execute(activity_rules.delete().where(activity_rules.c.activity_id == activity_id))
        db.session.execute(activity_participants.delete().where(activity_participants.c.activity_id == activity_id))
        Message.query.filter_by(
            context_type=MessageContextType.ACTIVITY,
            context_id=activity_id
        ).delete(synchronize_session=False)

        db.session.delete(activity)
        db.session.commit()
        return ""
        
    except IntegrityError:
        db.session.rollback()
        abort(400, message="Error deleting activity")

@blp.route("/<int:activity_id>/join", methods=["POST"])
@blp.response(200, JoinLeaveActivityResponseSchema)
def join_activity(activity_id):
    """Join an activity"""
    current_user = get_current_user()
    
    activity = Activity.query.get_or_404(activity_id)
    
    try:
        if activity.add_participant(current_user):
            # Auto-confirmar asistencia al apuntarse (#2.10)
            try:
                attendance = ActivityAttendance.query.filter_by(
                    activity_id=activity.id,
                    user_id=current_user.id
                ).first()
                if not attendance:
                    attendance = ActivityAttendance(
                        activity_id=activity.id,
                        user_id=current_user.id
                    )
                    db.session.add(attendance)
                attendance.confirmed_at = datetime.now(timezone.utc)
                attendance.present = None  # Confirmed but not yet marked by organizer
            except Exception as e:
                print(f"Warning: Could not auto-confirm attendance: {e}")

            db.session.commit()
            
            # ✅ TRIGGER: Verificar logro "¡Me Apunto!" y "Súper Activo"
            try:
                from utils.achievement_engine_simple import trigger_activity_join
                trigger_activity_join(current_user.id)
            except Exception as e:
                print(f"Error checking activity join achievements: {e}")
            
            return {
                'message': 'Successfully joined the activity',
                'is_participant': True,
                'participant_count': activity.participant_count
            }
        else:
            return {
                'message': 'You are already a participant of this activity',
                'is_participant': True,
                'participant_count': activity.participant_count
            }
            
    except IntegrityError:
        db.session.rollback()
        abort(400, message="Error joining activity")

@blp.route("/<int:activity_id>/leave", methods=["POST"])
@blp.response(200, JoinLeaveActivityResponseSchema)
def leave_activity(activity_id):
    """Leave an activity"""
    current_user = get_current_user()
    
    activity = Activity.query.get_or_404(activity_id)
    
    try:
        if activity.remove_participant(current_user):
            db.session.commit()
            return {
                'message': 'Successfully left the activity',
                'is_participant': False,
                'participant_count': activity.participant_count
            }
        else:
            return {
                'message': 'You are not a participant of this activity',
                'is_participant': False,
                'participant_count': activity.participant_count
            }
            
    except IntegrityError:
        db.session.rollback()
        abort(400, message="Error leaving activity")

@blp.route("/<int:activity_id>/user-role", methods=["GET"])
def get_user_activity_role(activity_id):
    """Get current user's role in the activity"""
    current_user = get_current_user()
    
    # Check if user participates in the activity
    link = db.session.execute(
        activity_participants.select().where(
            (activity_participants.c.user_id == current_user.id) & 
            (activity_participants.c.activity_id == activity_id)
        )
    ).first()
    
    if link:
        return {'role': link.role}, 200
    else:
        return {'role': None}, 200
