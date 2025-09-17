from flask_smorest import Blueprint
from flask import request, session, jsonify
from models.user.user import db, User
from models.warnings.warnings import Warning
from models.memberships.group_membership import GroupMembership
from models.memberships.activity_membership import ActivityMembership
from models.message.message import Message, MessageType
from services.points_service import PointsService
from utils.decorators import login_required, role_required
from datetime import datetime

blp = Blueprint('moderation', __name__, url_prefix='/api/moderation')

@blp.route('/warnings', methods=['POST'])
@role_required(['ORGANIZER', 'SUPERADMIN'])
def issue_warning():
    """Issue a warning to a user (organizer/admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['context_type', 'context_id', 'target_user_id', 'reason']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({'error': 'Missing required fields', 'missing_fields': missing_fields}), 400
        
        context_type = data['context_type'].upper()
        context_id = data['context_id']
        target_user_id = data['target_user_id']
        reason = data['reason']
        issuer_id = session['user_id']
        
        # Validate context type
        if context_type not in ['GROUP', 'ACTIVITY']:
            return jsonify({'error': 'Invalid context_type. Must be GROUP or ACTIVITY'}), 400
        
        # Verify target user exists
        target_user = User.query.get(target_user_id)
        if not target_user:
            return jsonify({'error': 'Target user not found'}), 404
        
        # Get membership based on context
        if context_type == 'GROUP':
            membership = GroupMembership.query.filter_by(
                user_id=target_user_id, 
                group_id=context_id
            ).first()
        else:  # ACTIVITY
            membership = ActivityMembership.query.filter_by(
                user_id=target_user_id, 
                activity_id=context_id
            ).first()
        
        if not membership:
            return jsonify({'error': 'User is not a member of this group/activity'}), 404
        
        # Create warning record
        warning = Warning(
            context_type=context_type,
            context_id=context_id,
            target_user_id=target_user_id,
            issued_by=issuer_id,
            reason=reason
        )
        db.session.add(warning)
        
        # Update membership warning count
        warning_count = membership.add_warning()
        
        # Deduct points
        PointsService.deduct_points(
            user_id=target_user_id,
            points=100,
            reason=f"Warning issued: {reason}",
            context_type=context_type,
            context_id=context_id,
            created_by=issuer_id
        )
        
        # Create system message for warning
        if warning_count >= 3:
            # User was banned
            system_message_content = f"⚠️ {target_user.username} has been banned from this chat after receiving 3 warnings."
            ban_message = Message.create_system_message(
                content=system_message_content,
                context_type=context_type,
                context_id=context_id,
                message_type=MessageType.BAN
            )
            db.session.add(ban_message)
        else:
            # Just a warning
            system_message_content = f"⚠️ {target_user.username} has received a warning: {reason} ({warning_count}/3 warnings)"
            warning_message = Message.create_system_message(
                content=system_message_content,
                context_type=context_type,
                context_id=context_id,
                message_type=MessageType.WARNING
            )
            db.session.add(warning_message)
        
        db.session.commit()
        
        # Emit system message via WebSocket if available
        from services.chat_service import socketio
        if socketio:
            room_name = f"{context_type.lower()}_{context_id}"
            if warning_count >= 3:
                socketio.emit('user_banned', {
                    'user_id': target_user_id,
                    'username': target_user.username,
                    'reason': reason,
                    'warning_count': warning_count
                }, room=room_name)
                socketio.emit('new_message', ban_message.to_dict(), room=room_name)
            else:
                socketio.emit('warning_issued', {
                    'user_id': target_user_id,
                    'username': target_user.username,
                    'reason': reason,
                    'warning_count': warning_count
                }, room=room_name)
                socketio.emit('new_message', warning_message.to_dict(), room=room_name)
        
        return jsonify({
            'message': 'Warning issued successfully',
            'warning': warning.to_dict(),
            'warning_count': warning_count,
            'banned': warning_count >= 3
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to issue warning', 'details': str(e)}), 500

@blp.route('/status', methods=['GET'])
@login_required
def get_moderation_status():
    """Get moderation status for a user in a specific context"""
    try:
        context_type = request.args.get('context_type', '').upper()
        context_id = request.args.get('context_id', type=int)
        user_id = request.args.get('user_id', type=int)
        
        if not context_type or not context_id:
            return jsonify({'error': 'context_type and context_id are required'}), 400
        
        if context_type not in ['GROUP', 'ACTIVITY']:
            return jsonify({'error': 'Invalid context_type'}), 400
        
        # If no user_id provided, use current user
        if not user_id:
            user_id = session['user_id']
        
        # Check if current user can view this status
        current_user = User.query.get(session['user_id'])
        if user_id != current_user.id and not current_user.is_organizer_or_admin():
            return jsonify({'error': 'Access denied'}), 403
        
        # Get membership
        if context_type == 'GROUP':
            membership = GroupMembership.query.filter_by(
                user_id=user_id, 
                group_id=context_id
            ).first()
        else:  # ACTIVITY
            membership = ActivityMembership.query.filter_by(
                user_id=user_id, 
                activity_id=context_id
            ).first()
        
        if not membership:
            return jsonify({
                'warning_count': 0,
                'status': 'NOT_MEMBER',
                'semaphore_color': 'grey'
            }), 200
        
        return jsonify({
            'warning_count': membership.warning_count,
            'status': membership.status.value,
            'semaphore_color': membership.get_semaphore_color(),
            'can_chat': membership.can_chat(),
            'last_chat_at': membership.last_chat_at.isoformat() if membership.last_chat_at else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get moderation status', 'details': str(e)}), 500

@blp.route('/memberships/<int:membership_id>/unban', methods=['PATCH'])
@role_required(['SUPERADMIN'])
def unban_user(membership_id):
    """Unban a user (superadmin only)"""
    try:
        # Try to find membership in either groups or activities
        group_membership = GroupMembership.query.get(membership_id)
        activity_membership = ActivityMembership.query.get(membership_id)
        
        membership = group_membership or activity_membership
        if not membership:
            return jsonify({'error': 'Membership not found'}), 404
        
        # Unban the user
        membership.unban()
        
        # Determine context
        if group_membership:
            context_type = 'GROUP'
            context_id = membership.group_id
        else:
            context_type = 'ACTIVITY' 
            context_id = membership.activity_id
        
        # Create system message
        target_user = User.query.get(membership.user_id)
        system_message_content = f"✅ {target_user.username} has been unbanned and can now participate in the chat."
        unban_message = Message.create_system_message(
            content=system_message_content,
            context_type=context_type,
            context_id=context_id,
            message_type=MessageType.SYSTEM
        )
        db.session.add(unban_message)
        db.session.commit()
        
        # Emit system message via WebSocket if available
        from services.chat_service import socketio
        if socketio:
            room_name = f"{context_type.lower()}_{context_id}"
            socketio.emit('user_unbanned', {
                'user_id': membership.user_id,
                'username': target_user.username
            }, room=room_name)
            socketio.emit('new_message', unban_message.to_dict(), room=room_name)
        
        return jsonify({
            'message': 'User unbanned successfully',
            'membership': membership.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to unban user', 'details': str(e)}), 500

@blp.route('/warnings', methods=['GET'])
@role_required(['ORGANIZER', 'SUPERADMIN'])
def get_warnings():
    """Get warnings for a context (organizer/admin only)"""
    try:
        context_type = request.args.get('context_type', '').upper()
        context_id = request.args.get('context_id', type=int)
        
        if not context_type or not context_id:
            return jsonify({'error': 'context_type and context_id are required'}), 400
        
        if context_type not in ['GROUP', 'ACTIVITY']:
            return jsonify({'error': 'Invalid context_type'}), 400
        
        warnings = Warning.query.filter_by(
            context_type=context_type,
            context_id=context_id
        ).order_by(Warning.created_at.desc()).all()
        
        return jsonify({
            'warnings': [warning.to_dict() for warning in warnings]
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get warnings', 'details': str(e)}), 500