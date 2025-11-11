from flask_smorest import Blueprint
from flask import session, request
from sqlalchemy.exc import IntegrityError
from models.user.user import User, UserRole, db
from models.activity.activity import Activity
from models.attendance.attendance import ActivityAttendance
from models.points.points import PointsLedger
from services.points_service import PointsService
from utils.decorators import login_required
from marshmallow import Schema, fields, validate, ValidationError
from datetime import datetime, timezone

blp = Blueprint("Attendance", "attendance", url_prefix="/api/attendance", description="Attendance management routes")

class ConfirmAttendanceSchema(Schema):
    activity_id = fields.Int(required=True)
    will_attend = fields.Bool(required=True)  # True for "yes", False for "no"

class MarkAttendanceSchema(Schema):
    attendees = fields.List(fields.Dict(keys=fields.Str(), values=fields.Raw()), required=True)
    # attendees format: [{"user_id": 1, "present": true}, {"user_id": 2, "present": false}]

class AttendanceService:
    """Service for managing activity attendance"""
    
    @staticmethod
    def confirm_attendance(activity_id, user_id, will_attend=True):
        """Confirm user attendance for an activity"""
        # Check if activity exists
        activity = Activity.query.get(activity_id)
        if not activity:
            raise ValueError("Activity not found")
        
        # Check if user is a participant
        if not activity.is_participant(user_id):
            raise ValueError("User is not a participant of this activity")
        
        # Confirm attendance
        attendance = ActivityAttendance.confirm_attendance(activity_id, user_id, will_attend)
        return attendance
    
    @staticmethod
    def mark_attendance_batch(activity_id, attendees_data, marked_by):
        """Mark attendance for multiple users (organizer action)"""
        activity = Activity.query.get(activity_id)
        if not activity:
            raise ValueError("Activity not found")
        
        results = []
        for attendee_data in attendees_data:
            user_id = attendee_data.get('user_id')
            present = attendee_data.get('present')
            
            if user_id is None or present is None:
                continue
            
            # Mark attendance
            attendance = ActivityAttendance.mark_attendance(activity_id, user_id, present, marked_by)
            
            # Deduct points if user didn't attend
            if not present:
                PointsService.deduct_points(
                    user_id,
                    100,
                    f"No asistió a la actividad: {activity.title}",
                    "ACTIVITY",
                    activity_id
                )
            
            results.append(attendance)
        
        return results
    
    @staticmethod
    def get_activity_attendance(activity_id):
        """Get all attendance records for an activity"""
        return ActivityAttendance.get_activity_attendance(activity_id)
    
    @staticmethod
    def get_user_attendance(user_id, limit=None):
        """Get attendance records for a user"""
        return ActivityAttendance.get_user_attendance(user_id, limit)
    
    @staticmethod
    def check_and_deduct_no_confirmation_points():
        """Check for activities that need confirmation and deduct points for no-shows"""
        # This would typically be called by a cron job or scheduled task
        # For now, it's a placeholder for the automatic point deduction logic
        
        # Get activities that are starting soon and need confirmation
        now = datetime.now(timezone.utc)
        # Implementation would check for activities within the confirmation window
        # and deduct points from users who haven't confirmed
        pass
    
    @staticmethod
    def get_activities_needing_confirmation(user_id):
        """Get activities that need confirmation from user"""
        user = User.query.get(user_id)
        if not user:
            return []
        
        now = datetime.now(timezone.utc)
        upcoming_activities = []
        
        for activity in user.joined_activities:
            # Use the date_aware property to ensure timezone consistency
            activity_date = activity.date_aware
            if activity_date > now:
                attendance = ActivityAttendance.query.filter_by(
                    activity_id=activity.id,
                    user_id=user_id
                ).first()
                
                if not attendance or not attendance.is_confirmed:
                    upcoming_activities.append({
                        'activity': activity,
                        'needs_confirmation': True,
                        'attendance': attendance
                    })
        
        return upcoming_activities

# REST endpoints
@blp.route("/confirm", methods=["POST"])
@blp.arguments(ConfirmAttendanceSchema)
@login_required
def confirm_attendance(args):
    """Confirm attendance for an activity"""
    user_id = session.get('user_id')
    activity_id = args['activity_id']
    will_attend = args['will_attend']
    
    try:
        attendance = AttendanceService.confirm_attendance(activity_id, user_id, will_attend)
        message = 'Attendance confirmed successfully' if will_attend else 'Declined attendance successfully'
        return {
            'message': message,
            'will_attend': will_attend,
            'attendance': attendance.to_dict()
        }
    except ValueError as e:
        blp.abort(400, message=str(e))
    except Exception as e:
        blp.abort(500, message="Failed to confirm attendance")

@blp.route("/activities/<int:activity_id>/mark", methods=["POST"])
@blp.arguments(MarkAttendanceSchema)
@login_required
def mark_attendance(activity_id, args):
    """Mark attendance for activity participants (organizer/admin only)"""
    user_id = session.get('user_id')
    current_user = User.query.get(user_id)
    
    # Check if user can mark attendance
    activity = Activity.query.get(activity_id)
    if not activity:
        blp.abort(404, message="Activity not found")
    
    # Check if user is organizer/admin or activity creator
    if not (current_user.is_organizer_or_admin() or activity.created_by == user_id):
        blp.abort(403, message="Only organizers, admins, or activity creators can mark attendance")
    
    try:
        results = AttendanceService.mark_attendance_batch(
            activity_id,
            args['attendees'],
            user_id
        )
        
        return {
            'message': f'Attendance marked for {len(results)} participants',
            'attendance_records': [r.to_dict() for r in results]
        }
    except ValueError as e:
        blp.abort(400, message=str(e))
    except Exception as e:
        blp.abort(500, message="Failed to mark attendance")

@blp.route("/activities/<int:activity_id>", methods=["GET"])
@login_required
def get_activity_attendance(activity_id):
    """Get attendance records for an activity"""
    user_id = session.get('user_id')
    current_user = User.query.get(user_id)
    
    activity = Activity.query.get(activity_id)
    if not activity:
        blp.abort(404, message="Activity not found")
    
    # Check if user can view attendance (participant, organizer, or admin)
    if not (current_user.is_organizer_or_admin() or 
            activity.created_by == user_id or 
            activity.is_participant(user_id)):
        blp.abort(403, message="Not authorized to view attendance")
    
    attendance_records = AttendanceService.get_activity_attendance(activity_id)
    
    return {
        'activity_id': activity_id,
        'attendance': [record.to_dict() for record in attendance_records]
    }

@blp.route("/user/pending", methods=["GET"])
@login_required
def get_pending_confirmations():
    """Get activities that need confirmation from current user"""
    user_id = session.get('user_id')
    
    activities_needing_confirmation = AttendanceService.get_activities_needing_confirmation(user_id)
    
    return {
        'activities': [
            {
                'activity': {
                    'id': item['activity'].id,
                    'title': item['activity'].title,
                    'description': item['activity'].description,
                    'date': item['activity'].date.isoformat(),
                    'location': item['activity'].location
                },
                'needs_confirmation': item['needs_confirmation'],
                'attendance_status': item['attendance'].to_dict() if item['attendance'] else None
            }
            for item in activities_needing_confirmation
        ]
    }

@blp.route("/user/history", methods=["GET"])
@login_required
def get_user_attendance_history():
    """Get current user's attendance history"""
    user_id = session.get('user_id')
    limit = request.args.get('limit', 20, type=int)
    
    attendance_records = AttendanceService.get_user_attendance(user_id, limit)
    
    return {
        'attendance_history': [record.to_dict() for record in attendance_records]
    }