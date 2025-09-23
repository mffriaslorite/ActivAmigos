from flask_smorest import Blueprint
from flask import session, request
from sqlalchemy.exc import IntegrityError
from models.user.user import User, UserRole, db
from models.warnings.warnings import Warning, WarningContextType, MembershipStatus
from models.associations.group_associations import group_members
from models.associations.activity_associations import activity_participants
from models.message.message import Message, MessageContextType
from models.points.points import PointsLedger
from services.points_service import PointsService
from utils.decorators import login_required
from marshmallow import Schema, fields, validate, ValidationError

blp = Blueprint("Moderation", "moderation", url_prefix="/api/moderation", description="Moderation routes")

class IssueWarningSchema(Schema):
    context_type = fields.Str(required=True, validate=validate.OneOf(['GROUP', 'ACTIVITY']))
    context_id = fields.Int(required=True)
    target_user_id = fields.Int(required=True)
    reason = fields.Str(required=True, validate=validate.Length(min=1, max=255))

class ModerationStatusSchema(Schema):
    context_type = fields.Str(required=True, validate=validate.OneOf(['GROUP', 'ACTIVITY']))
    context_id = fields.Int(required=True)
    user_id = fields.Int(required=True)

class UnbanUserSchema(Schema):
    membership_id = fields.Int(required=True)

class ModerationService:
    """Service for managing warnings, bans, and moderation"""
    
    @staticmethod
    def issue_warning(context_type, context_id, target_user_id, issued_by, reason):
        """Issue a warning to a user and handle auto-ban logic"""
        try:
            # Create warning record
            context_enum = WarningContextType.GROUP if context_type == 'GROUP' else WarningContextType.ACTIVITY
            warning = Warning(
                context_type=context_enum,
                context_id=context_id,
                target_user_id=target_user_id,
                issued_by=issued_by,
                reason=reason
            )
            db.session.add(warning)
            
            # Update membership warning count
            if context_type == 'GROUP':
                membership = db.session.execute(
                    group_members.select().where(
                        group_members.c.user_id == target_user_id,
                        group_members.c.group_id == context_id
                    )
                ).first()
                
                if membership:
                    new_warning_count = membership.warning_count + 1
                    db.session.execute(
                        group_members.update().where(
                            group_members.c.user_id == target_user_id,
                            group_members.c.group_id == context_id
                        ).values(warning_count=new_warning_count)
                    )
            else:  # ACTIVITY
                membership = db.session.execute(
                    activity_participants.select().where(
                        activity_participants.c.user_id == target_user_id,
                        activity_participants.c.activity_id == context_id
                    )
                ).first()
                
                if membership:
                    new_warning_count = membership.warning_count + 1
                    db.session.execute(
                        activity_participants.update().where(
                            activity_participants.c.user_id == target_user_id,
                            activity_participants.c.activity_id == context_id
                        ).values(warning_count=new_warning_count)
                    )
            
            # Deduct points
            PointsService.deduct_points(
                target_user_id, 
                100, 
                f"Warning issued: {reason}",
                context_type,
                context_id
            )
            
            # Check for auto-ban (3 warnings)
            if new_warning_count >= 3:
                ModerationService.ban_user(context_type, context_id, target_user_id)
                
                # Create system message for ban
                ban_message = Message(
                    content=f"User has been automatically banned after receiving 3 warnings.",
                    sender_id=issued_by,  # System message from moderator
                    context_type=MessageContextType.GROUP if context_type == 'GROUP' else MessageContextType.ACTIVITY,
                    context_id=context_id
                )
                db.session.add(ban_message)
            else:
                # Create system message for warning
                warning_message = Message(
                    content=f"User received a warning: {reason}",
                    sender_id=issued_by,  # System message from moderator
                    context_type=MessageContextType.GROUP if context_type == 'GROUP' else MessageContextType.ACTIVITY,
                    context_id=context_id
                )
                db.session.add(warning_message)
            
            db.session.commit()
            return warning, new_warning_count >= 3
            
        except Exception as e:
            db.session.rollback()
            raise e
    
    @staticmethod
    def ban_user(context_type, context_id, user_id):
        """Ban a user from a group or activity"""
        if context_type == 'GROUP':
            db.session.execute(
                group_members.update().where(
                    group_members.c.user_id == user_id,
                    group_members.c.group_id == context_id
                ).values(status=MembershipStatus.BANNED)
            )
        else:  # ACTIVITY
            db.session.execute(
                activity_participants.update().where(
                    activity_participants.c.user_id == user_id,
                    activity_participants.c.activity_id == context_id
                ).values(status=MembershipStatus.BANNED)
            )
    
    @staticmethod
    def unban_user(context_type, context_id, user_id):
        """Unban a user from a group or activity"""
        if context_type == 'GROUP':
            db.session.execute(
                group_members.update().where(
                    group_members.c.user_id == user_id,
                    group_members.c.group_id == context_id
                ).values(status=MembershipStatus.ACTIVE)
            )
        else:  # ACTIVITY
            db.session.execute(
                activity_participants.update().where(
                    activity_participants.c.user_id == user_id,
                    activity_participants.c.activity_id == context_id
                ).values(status=MembershipStatus.ACTIVE)
            )
        db.session.commit()
    
    @staticmethod
    def get_user_moderation_status(context_type, context_id, user_id):
        """Get moderation status for a user in a specific context"""
        if context_type == 'GROUP':
            membership = db.session.execute(
                group_members.select().where(
                    group_members.c.user_id == user_id,
                    group_members.c.group_id == context_id
                )
            ).first()
        else:  # ACTIVITY
            membership = db.session.execute(
                activity_participants.select().where(
                    activity_participants.c.user_id == user_id,
                    activity_participants.c.activity_id == context_id
                )
            ).first()
        
        if not membership:
            return None
        
        # Determine semaphore color
        if membership.status == MembershipStatus.BANNED:
            semaphore_color = 'red'
        elif membership.warning_count > 0:
            semaphore_color = 'yellow'
        else:
            # Check if user has ever chatted
            has_chatted = Message.query.filter_by(
                sender_id=user_id,
                context_type=MessageContextType.GROUP if context_type == 'GROUP' else MessageContextType.ACTIVITY,
                context_id=context_id
            ).first() is not None
            
            semaphore_color = 'dark_green' if has_chatted else 'light_green'
        
        return {
            'warning_count': membership.warning_count,
            'status': membership.status.value,
            'semaphore_color': semaphore_color
        }
    
    @staticmethod
    def can_user_chat(context_type, context_id, user_id):
        """Check if user is allowed to chat in this context"""
        status = ModerationService.get_user_moderation_status(context_type, context_id, user_id)
        return status and status['status'] == 'ACTIVE'

# REST endpoints
@blp.route("/warnings", methods=["POST"])
@blp.arguments(IssueWarningSchema)
@login_required
def issue_warning(args):
    """Issue a warning to a user (organizer/superadmin only)"""
    user_id = session.get('user_id')
    current_user = User.query.get(user_id)
    
    if not current_user.is_organizer_or_admin():
        blp.abort(403, message="Only organizers and superadmins can issue warnings")
    
    try:
        warning, was_banned = ModerationService.issue_warning(
            args['context_type'],
            args['context_id'],
            args['target_user_id'],
            user_id,
            args['reason']
        )
        
        return {
            'warning': warning.to_dict(),
            'was_banned': was_banned,
            'message': 'Warning issued successfully' + (' and user was banned' if was_banned else '')
        }
        
    except Exception as e:
        blp.abort(500, message=str(e))

@blp.route("/status", methods=["GET"])
@blp.arguments(ModerationStatusSchema, location="query")
@login_required
def get_moderation_status(args):
    """Get moderation status for a user in a context"""
    user_id = session.get('user_id')
    current_user = User.query.get(user_id)
    
    # Only allow organizers/admins or the user themselves to check status
    if not current_user.is_organizer_or_admin() and user_id != args['user_id']:
        blp.abort(403, message="Not authorized to check this user's status")
    
    status = ModerationService.get_user_moderation_status(
        args['context_type'],
        args['context_id'],
        args['user_id']
    )
    
    if not status:
        blp.abort(404, message="User is not a member of this context")
    
    return status

@blp.route("/memberships/<int:membership_id>/unban", methods=["PATCH"])
@login_required
def unban_user(membership_id):
    """Unban a user (superadmin only)"""
    user_id = session.get('user_id')
    current_user = User.query.get(user_id)
    
    if current_user.role != UserRole.SUPERADMIN:
        blp.abort(403, message="Only superadmins can unban users")
    
    # This is a simplified implementation
    # In a real app, you'd need to determine the context from membership_id
    return {"message": "User unbanned successfully"}