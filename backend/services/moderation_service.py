from flask_smorest import Blueprint
from flask import session, jsonify
from models.user.user import User, UserRole, db
from models.warnings.warnings import Warning, WarningContextType, MembershipStatus
from models.associations.group_associations import group_members
from models.associations.activity_associations import activity_participants
from models.message.message import Message, MessageContextType
from services.points_service import PointsService
from utils.decorators import login_required
from marshmallow import Schema, fields, validate

blp = Blueprint("Moderation", "moderation", url_prefix="/api/moderation", description="Moderation routes")

# --- Schemas ---

class ModerationStatusSchema(Schema):
    context_type = fields.Str(required=True, validate=validate.OneOf(['GROUP', 'ACTIVITY']))
    context_id = fields.Int(required=True)
    user_id = fields.Int(required=True)

class IssueWarningSchema(Schema):
    context_type = fields.Str(required=True, validate=validate.OneOf(['GROUP', 'ACTIVITY']))
    context_id = fields.Int(required=True)
    target_user_id = fields.Int(required=True)
    reason = fields.Str(required=True, validate=validate.Length(min=1, max=255))

class WarningHistorySchema(Schema):
    id = fields.Int()
    reason = fields.Str()
    issued_at = fields.DateTime()
    issued_by_name = fields.Str()
    context_type = fields.Str()

# --- Service Logic ---
socketio = None

class ModerationService:
    
    @staticmethod
    def init_socketio(socketio_instance):
        global socketio
        socketio = socketio_instance
    
    @staticmethod
    def issue_warning(context_type, context_id, target_user_id, issued_by, reason):
        try:
            # 1. Crear advertencia
            context_enum = WarningContextType.GROUP if context_type == 'GROUP' else WarningContextType.ACTIVITY
            warning = Warning(
                context_type=context_enum,
                context_id=context_id,
                target_user_id=target_user_id,
                issued_by=issued_by,
                reason=reason
            )
            db.session.add(warning)
            
            # 2. Actualizar contador en la membresía
            new_warning_count = 0
            is_banned = False
            
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
            
            # 3. Penalización de Puntos
            # Al ejecutarse esto, ahora bajará la barra de nivel del usuario automáticamente
            PointsService.deduct_points(
                target_user_id, 
                100,
                f"Aviso de moderación: {reason}",
                context_type,
                context_id
            )

            target_user = User.query.get(target_user_id)
            target_username = target_user.username if target_user else f"Usuario {target_user_id}"
            
            # 4. Auto-Ban (3 strikes)
            if new_warning_count >= 3:
                ModerationService.ban_user(context_type, context_id, target_user_id)
                is_banned = True
                
                msg_content = f"El usuario {target_username} ha sido expulsado automáticamente tras 3 avisos."
            else:
                msg_content = f"El usuario {target_username} ha recibido un aviso: {reason}"

            # Enviar mensaje al chat
            sys_message = Message(
                content=msg_content,
                sender_id=issued_by,
                context_type=MessageContextType.GROUP if context_type == 'GROUP' else MessageContextType.ACTIVITY,
                context_id=context_id,
                is_system=True
            )
            db.session.add(sys_message)
            db.session.commit()

            # Enviar por Socket.IO en tiempo real
            if socketio:
                room_name = f"{context_type.lower()}:{context_id}"
                socketio.emit('new_message', sys_message.to_dict(), room=room_name)
            
            # 5. Calcular nuevo color del semáforo
            new_color = 'red' if is_banned else ('yellow' if new_warning_count > 0 else 'light_green')
            
            return {
                'warning': warning,
                'warning_count': new_warning_count,
                'new_semaphore_color': new_color,
                'was_banned': is_banned
            }
            
        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def ban_user(context_type, context_id, user_id):
        table = group_members if context_type == 'GROUP' else activity_participants
        id_col = 'group_id' if context_type == 'GROUP' else 'activity_id'
        
        db.session.execute(
            table.update().where(
                (table.c.user_id == user_id) & 
                (getattr(table.c, id_col) == context_id)
            ).values(status=MembershipStatus.BANNED)
        )

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

# --- Routes ---

@blp.route("/warnings", methods=["POST"])
@blp.arguments(IssueWarningSchema)
@login_required
def issue_warning(args):
    """Issue a warning"""
    user_id = session.get('user_id')
   
    try:
        result = ModerationService.issue_warning(
            args['context_type'],
            args['context_id'],
            args['target_user_id'],
            user_id,
            args['reason']
        )
        
        return {
            'message': 'Advertencia enviada correctamente',
            'warning_count': result['warning_count'],
            'new_semaphore_color': result['new_semaphore_color'],
            'was_banned': result['was_banned']
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

@blp.route("/users/<int:user_id>/warnings", methods=["GET"])
@blp.response(200, WarningHistorySchema(many=True))
@login_required
def get_user_warnings(user_id):
    """Get warning history for a user"""
    requester_id = session.get('user_id')
    requester = User.query.get(requester_id)
    
    if requester_id != user_id and not requester.is_organizer_or_admin():
        blp.abort(403, message="No tienes permiso para ver este historial.")
        
    warnings = Warning.query.filter_by(target_user_id=user_id).order_by(Warning.issued_at.desc()).all()
    
    result = []
    for w in warnings:
        issuer = User.query.get(w.issued_by)
        result.append({
            'id': w.id,
            'reason': w.reason,
            'issued_at': w.issued_at,
            'issued_by_name': issuer.username if issuer else 'Sistema',
            'context_type': w.context_type.value
        })
        
    return result