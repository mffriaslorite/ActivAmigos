from flask_smorest import Blueprint, abort
from flask import session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta, timezone
from models.user.user import User, db
from models.activity.activity import Activity
from models.associations.activity_associations import activity_participants
from models.attendance.attendance import ActivityAttendance
from services.user_service import get_user_status_for_context
from models.activity.activity_schema import (
    ActivityCreateSchema, 
    ActivityUpdateSchema, 
    ActivityResponseSchema, 
    ActivityListSchema,
    JoinLeaveActivityResponseSchema,
    ActivityParticipantSchema,
    ActivityDetailsResponseSchema
)

blp = Blueprint("Activities", "activities", url_prefix="/api/activities", description="Activities management routes")

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

@blp.route("", methods=["POST"])
@blp.arguments(ActivityCreateSchema)
@blp.response(201, ActivityResponseSchema)
def create_activity(args):
    """Create a new activity"""
    current_user = get_current_user()
    
    try:
        # Create new activity
        activity = Activity(
            title=args['title'],
            description=args.get('description'),
            location=args.get('location'),
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
        
        # Prepare response
        response_data = {
            'id': activity.id,
            'title': activity.title,
            'description': activity.description,
            'location': activity.location,
            'date': activity.date,
            'rules': activity.rules,
            'created_by': activity.created_by,
            'created_at': activity.created_at,
            'participant_count': activity.participant_count,
            'is_participant': True
        }
        
        return response_data
        
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
        
        activities_data.append({
            'id': activity.id,
            'title': activity.title,
            'description': activity.description,
            'location': activity.location,
            'date': activity.date,
            'participant_count': activity.participant_count,
            'is_participant': activity.is_participant(current_user.id),
            'attendance_confirmed': attendance_confirmed,
            'attendance_status': attendance_status,
            'created_at': activity.created_at,
            'created_by': activity.created_by
        })
    
    return activities_data

@blp.route("/<int:activity_id>", methods=["GET"])
@blp.response(200, ActivityResponseSchema)
def get_activity(activity_id):
    """Get activity details"""
    current_user = get_current_user()
    
    activity = Activity.query.get_or_404(activity_id)
    
    # Check if user has confirmed attendance
    attendance_confirmed = False
    if activity.is_participant(current_user.id):
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
    
    response_data = {
        'id': activity.id,
        'title': activity.title,
        'description': activity.description,
        'location': activity.location,
        'date': activity.date,
        'rules': activity.rules,
        'created_by': activity.created_by,
        'created_at': activity.created_at,
        'participant_count': activity.participant_count,
        'is_participant': activity.is_participant(current_user.id),
        'attendance_confirmed': attendance_confirmed,
        'attendance_status': attendance_status
    }
    
    return response_data

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
    if activity.is_participant(current_user.id):
        attendance = ActivityAttendance.query.filter_by(
            activity_id=activity.id,
            user_id=current_user.id
        ).first()
        current_user_attendance_confirmed = attendance is not None and attendance.is_confirmed

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

    return {
        'id': activity.id,
        'title': activity.title,
        'description': activity.description,
        'location': activity.location,
        'date': activity.date,
        'rules': activity.rules,
        'created_by': activity.created_by,
        'created_at': activity.created_at,
        'participant_count': activity.participant_count,
        'is_participant': activity.is_participant(current_user.id),
        'attendance_confirmed': current_user_attendance_confirmed,
        'participants': participants,
        'attendance_status': attendance_status
    }

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
    
    try:
        # Update fields if provided
        if 'title' in args:
            activity.title = args['title']
        if 'description' in args:
            activity.description = args['description']
        if 'location' in args:
            activity.location = args['location']
        if 'date' in args:
            activity.date = args['date']
        if 'rules' in args:
            activity.rules = args['rules']
        
        db.session.commit()
        
        response_data = {
            'id': activity.id,
            'title': activity.title,
            'description': activity.description,
            'location': activity.location,
            'date': activity.date,
            'rules': activity.rules,
            'created_by': activity.created_by,
            'created_at': activity.created_at,
            'participant_count': activity.participant_count,
            'is_participant': activity.is_participant(current_user.id)
        }
        
        return response_data
        
    except IntegrityError:
        db.session.rollback()
        abort(400, message="Error updating activity")

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
    
    # Prevent creator from leaving their own activity
    if activity.created_by == current_user.id:
        abort(400, message="Activity creator cannot leave the activity. Transfer ownership or delete the activity instead.")

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