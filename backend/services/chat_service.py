from flask import Blueprint, request, session, current_app
from flask_smorest import Api, Blueprint
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from marshmallow import ValidationError
from datetime import datetime
import functools
import logging

from models.user.user import db, User
from models.group.group import Group
from models.activity.activity import Activity
from models.message.message import Message, MessageType
from models.memberships.group_membership import GroupMembership
from models.memberships.activity_membership import ActivityMembership
from models.message.message_schema import (
    MessageSchema, 
    MessageCreateSchema, 
    MessageListQuerySchema
)
# from utils.decorators import login_required

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask-Smorest blueprint for REST API
blp = Blueprint(
    "chat",
    __name__,
    url_prefix="/api/chat",
    description="Chat and messaging operations"
)

# SocketIO instance will be initialized in app.py
socketio = None

def init_socketio(app, socketio_instance):
    """Initialize SocketIO with the app and set up event handlers"""
    global socketio
    socketio = socketio_instance
    
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection"""
        user_id = session.get('user_id')
        if not user_id:
            logger.warning("Unauthorized connection attempt - no user_id in session")
            disconnect()
            return False
        
        # Verify user exists in database
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"Invalid user_id {user_id} in session")
            disconnect()
            return False
        
        logger.info(f"User {user_id} ({user.username}) connected to WebSocket")
        return True
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        user_id = session.get('user_id')
        if user_id:
            logger.info(f"User {user_id} disconnected")
    
    @socketio.on('join_chat')
    def handle_join_chat(data):
        """Handle joining a chat room"""
        user_id = session.get('user_id')
        if not user_id:
            logger.warning("Join chat attempt without authentication")
            emit('error', {'message': 'Not authenticated'})
            return
        
        # Double-check user exists
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"Join chat attempt with invalid user_id {user_id}")
            emit('error', {'message': 'Invalid user session'})
            disconnect()
            return
        
        try:
            room_type = data.get('type')  # 'group' or 'activity'
            room_id = data.get('id')
            
            if not room_type or not room_id:
                emit('error', {'message': 'Invalid room data'})
                return
            
            # Verify user has access to the chat room and check ban status
            if room_type == 'group':
                membership = GroupMembership.query.filter_by(
                    user_id=user_id, 
                    group_id=room_id
                ).first()
                if not membership or not membership.is_active:
                    emit('error', {'message': 'Access denied to group chat'})
                    return
                if not membership.can_chat():
                    emit('error', {'message': 'You are banned from this chat'})
                    return
                room_name = f"group_{room_id}"
            elif room_type == 'activity':
                membership = ActivityMembership.query.filter_by(
                    user_id=user_id, 
                    activity_id=room_id
                ).first()
                if not membership or not membership.is_active:
                    emit('error', {'message': 'Access denied to activity chat'})
                    return
                if not membership.can_chat():
                    emit('error', {'message': 'You are banned from this chat'})
                    return
                room_name = f"activity_{room_id}"
            else:
                emit('error', {'message': 'Invalid room type'})
                return
            
            join_room(room_name)
            emit('joined_chat', {
                'room': room_name,
                'type': room_type,
                'id': room_id
            })
            logger.info(f"User {user_id} joined {room_name}")
            
        except Exception as e:
            logger.error(f"Error joining chat: {e}")
            emit('error', {'message': 'Failed to join chat'})
    
    @socketio.on('leave_chat')
    def handle_leave_chat(data):
        """Handle leaving a chat room"""
        user_id = session.get('user_id')
        if not user_id:
            return
        
        try:
            room_type = data.get('type')
            room_id = data.get('id')
            
            if room_type == 'group':
                room_name = f"group_{room_id}"
            elif room_type == 'activity':
                room_name = f"activity_{room_id}"
            else:
                return
            
            leave_room(room_name)
            emit('left_chat', {'room': room_name})
            logger.info(f"User {user_id} left {room_name}")
            
        except Exception as e:
            logger.error(f"Error leaving chat: {e}")
    
    @socketio.on('send_message')
    def handle_send_message(data):
        """Handle sending a message"""
        user_id = session.get('user_id')
        if not user_id:
            logger.warning("Send message attempt without authentication")
            emit('error', {'message': 'Not authenticated'})
            return
        
        # Double-check user exists
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"Send message attempt with invalid user_id {user_id}")
            emit('error', {'message': 'Invalid user session'})
            disconnect()
            return
        
        try:
            # Validate message data
            schema = MessageCreateSchema()
            message_data = schema.load(data)
            
            # Verify user has access to the chat room and can send messages
            group_id = message_data.get('group_id')
            activity_id = message_data.get('activity_id')
            
            if group_id:
                membership = GroupMembership.query.filter_by(
                    user_id=user_id, 
                    group_id=group_id
                ).first()
                if not membership or not membership.is_active:
                    emit('error', {'message': 'Access denied to group chat'})
                    return
                if not membership.can_chat():
                    emit('error', {'message': 'You are banned from this chat'})
                    return
                # Update chat activity
                membership.update_chat_activity()
                room_name = f"group_{group_id}"
            elif activity_id:
                membership = ActivityMembership.query.filter_by(
                    user_id=user_id, 
                    activity_id=activity_id
                ).first()
                if not membership or not membership.is_active:
                    emit('error', {'message': 'Access denied to activity chat'})
                    return
                if not membership.can_chat():
                    emit('error', {'message': 'You are banned from this chat'})
                    return
                # Update chat activity
                membership.update_chat_activity()
                room_name = f"activity_{activity_id}"
            else:
                emit('error', {'message': 'Invalid message data'})
                return
            
            # Create and save the message
            message = Message(
                content=message_data['content'],
                sender_id=user_id,
                group_id=group_id,
                activity_id=activity_id
            )
            
            db.session.add(message)
            db.session.commit()
            
            # Serialize message for broadcast
            message_schema = MessageSchema()
            message_dict = message_schema.dump(message)
            
            # Broadcast to all users in the room
            socketio.emit('new_message', message_dict, room=room_name)
            logger.info(f"Message {message.id} sent to {room_name}")
            
        except ValidationError as e:
            emit('error', {'message': f'Invalid message data: {e.messages}'})
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            db.session.rollback()
            emit('error', {'message': 'Failed to send message'})

def require_authentication(f):
    """Decorator to require authentication for REST endpoints"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get('user_id')
        if not user_id:
            return {"message": "Authentication required"}, 401
        return f(*args, **kwargs)
    return decorated_function

def require_chat_access(room_type, room_id_param='id', check_ban=True):
    """Decorator to require access to a specific chat room"""
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = session.get('user_id')
            room_id = kwargs.get(room_id_param) or request.view_args.get(room_id_param)
            
            if room_type == 'group':
                membership = GroupMembership.query.filter_by(
                    user_id=user_id, 
                    group_id=room_id
                ).first()
                if not membership or not membership.is_active:
                    return {"message": "Access denied to group chat"}, 403
                if check_ban and not membership.can_chat():
                    return {"message": "You are banned from this chat"}, 403
            elif room_type == 'activity':
                membership = ActivityMembership.query.filter_by(
                    user_id=user_id, 
                    activity_id=room_id
                ).first()
                if not membership or not membership.is_active:
                    return {"message": "Access denied to activity chat"}, 403
                if check_ban and not membership.can_chat():
                    return {"message": "You are banned from this chat"}, 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@blp.route("/groups/<int:group_id>/messages", methods=["GET"])
@blp.arguments(MessageListQuerySchema, location="query")
@blp.response(200, MessageSchema(many=True))
@require_authentication
@require_chat_access('group', 'group_id')
def get_group_messages(query_args, group_id):
    """Get messages for a group chat with pagination"""
    page = query_args.get('page', 1)
    per_page = query_args.get('per_page', 20)
    before = query_args.get('before')
    
    query = Message.query.filter_by(group_id=group_id)
    
    if before:
        query = query.filter(Message.timestamp < before)
    
    messages = query.order_by(Message.timestamp.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    ).items
    
    # Reverse to show oldest first
    return list(reversed(messages))

@blp.route("/groups/<int:group_id>/messages", methods=["POST"])
@blp.arguments(MessageCreateSchema)
@blp.response(201, MessageSchema)
@require_authentication
@require_chat_access('group', 'group_id', check_ban=True)
def post_group_message(message_data, group_id):
    """Send a message to a group chat (REST fallback)"""
    user_id = session.get('user_id')
    
    # Override group_id from URL
    message_data['group_id'] = group_id
    message_data.pop('activity_id', None)
    
    # Update chat activity
    membership = GroupMembership.query.filter_by(
        user_id=user_id, 
        group_id=group_id
    ).first()
    if membership:
        membership.update_chat_activity()
    
    message = Message(
        content=message_data['content'],
        sender_id=user_id,
        group_id=group_id
    )
    
    db.session.add(message)
    db.session.commit()
    
    # Broadcast via SocketIO if available
    if socketio:
        message_schema = MessageSchema()
        message_dict = message_schema.dump(message)
        socketio.emit('new_message', message_dict, room=f"group_{group_id}")
    
    return message

@blp.route("/activities/<int:activity_id>/messages", methods=["GET"])
@blp.arguments(MessageListQuerySchema, location="query")
@blp.response(200, MessageSchema(many=True))
@require_authentication
@require_chat_access('activity', 'activity_id')
def get_activity_messages(query_args, activity_id):
    """Get messages for an activity chat with pagination"""
    page = query_args.get('page', 1)
    per_page = query_args.get('per_page', 20)
    before = query_args.get('before')
    
    query = Message.query.filter_by(activity_id=activity_id)
    
    if before:
        query = query.filter(Message.timestamp < before)
    
    messages = query.order_by(Message.timestamp.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    ).items
    
    # Reverse to show oldest first
    return list(reversed(messages))

@blp.route("/activities/<int:activity_id>/messages", methods=["POST"])
@blp.arguments(MessageCreateSchema)
@blp.response(201, MessageSchema)
@require_authentication
@require_chat_access('activity', 'activity_id', check_ban=True)
def post_activity_message(message_data, activity_id):
    """Send a message to an activity chat (REST fallback)"""
    user_id = session.get('user_id')
    
    # Override activity_id from URL
    message_data['activity_id'] = activity_id
    message_data.pop('group_id', None)
    
    # Update chat activity
    membership = ActivityMembership.query.filter_by(
        user_id=user_id, 
        activity_id=activity_id
    ).first()
    if membership:
        membership.update_chat_activity()
    
    message = Message(
        content=message_data['content'],
        sender_id=user_id,
        activity_id=activity_id
    )
    
    db.session.add(message)
    db.session.commit()
    
    # Broadcast via SocketIO if available
    if socketio:
        message_schema = MessageSchema()
        message_dict = message_schema.dump(message)
        socketio.emit('new_message', message_dict, room=f"activity_{activity_id}")
    
    return message