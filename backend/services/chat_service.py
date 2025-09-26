from flask import Blueprint, request, session, current_app
from flask_smorest import Api, Blueprint
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from marshmallow import ValidationError
from datetime import datetime, timezone
import functools
import logging

from models.user.user import db, User
from models.group.group import Group
from models.activity.activity import Activity
from models.message.message import Message, MessageContextType
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

def can_user_chat(context_type, context_id, user_id):
    """Check if user is allowed to chat in this context"""
    from models.associations.group_associations import group_members
    from models.associations.activity_associations import activity_participants
    from models.warnings.warnings import MembershipStatus
    
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
    
    return membership and membership.status == MembershipStatus.ACTIVE

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
            
            # Verify user has access to the chat room
            if room_type == 'group':
                group = Group.query.get(room_id)
                if not group or not group.is_member(user_id):
                    emit('error', {'message': 'Access denied to group chat'})
                    return
                room_name = f"group_{room_id}"
            elif room_type == 'activity':
                activity = Activity.query.get(room_id)
                if not activity or not activity.is_participant(user_id):
                    emit('error', {'message': 'Access denied to activity chat'})
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
            
            # Get context info
            context_type = message_data.get('context_type')  # 'GROUP' or 'ACTIVITY'
            context_id = message_data.get('context_id')
            
            if not context_type or not context_id:
                emit('error', {'message': 'Missing context information'})
                return
            
            # Verify user has access and is not banned
            if context_type == 'GROUP':
                group = Group.query.get(context_id)
                if not group or not group.is_member(user_id):
                    emit('error', {'message': 'Access denied to group chat'})
                    return
                room_name = f"group:{context_id}"
            elif context_type == 'ACTIVITY':
                activity = Activity.query.get(context_id)
                if not activity or not activity.is_participant(user_id):
                    emit('error', {'message': 'Access denied to activity chat'})
                    return
                room_name = f"activity:{context_id}"
            else:
                emit('error', {'message': 'Invalid context type'})
                return
            
            # Check if user is banned from chatting
            if not can_user_chat(context_type, context_id, user_id):
                emit('error', {'message': 'You are banned from chatting in this context'})
                return
            
            # Create and save the message
            message_context = MessageContextType.GROUP if context_type == 'GROUP' else MessageContextType.ACTIVITY
            message = Message(
                content=message_data['content'],
                sender_id=user_id,
                context_type=message_context,
                context_id=context_id
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

def require_chat_access(room_type, room_id_param='id'):
    """Decorator to require access to a specific chat room"""
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = session.get('user_id')
            room_id = kwargs.get(room_id_param) or request.view_args.get(room_id_param)
            
            if room_type == 'group':
                group = Group.query.get_or_404(room_id)
                if not group.is_member(user_id):
                    return {"message": "Access denied to group chat"}, 403
            elif room_type == 'activity':
                activity = Activity.query.get_or_404(room_id)
                if not activity.is_participant(user_id):
                    return {"message": "Access denied to activity chat"}, 403
            
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
    
    query = Message.query.filter_by(
        context_type=MessageContextType.GROUP,
        context_id=group_id
    )
    
    if before:
        query = query.filter(Message.created_at < before)
    
    messages = query.order_by(Message.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    ).items
    
    # Reverse to show oldest first
    return list(reversed(messages))

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
    
    query = Message.query.filter_by(
        context_type=MessageContextType.ACTIVITY,
        context_id=activity_id
    )
    
    if before:
        query = query.filter(Message.created_at < before)
    
    messages = query.order_by(Message.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    ).items
    
    # Reverse to show oldest first
    return list(reversed(messages))

@blp.route("/groups/<int:group_id>/messages", methods=["POST"])
@blp.arguments(MessageCreateSchema)
@blp.response(201, MessageSchema)
@require_authentication
@require_chat_access('group', 'group_id')
def post_group_message(message_data, group_id):
    """Send a message to a group chat (REST fallback)"""
    user_id = session.get('user_id')
    
    message = Message(
        content=message_data['content'],
        sender_id=user_id,
        context_type=MessageContextType.GROUP,
        context_id=group_id
    )
    
    db.session.add(message)
    db.session.commit()
    
    # Broadcast via SocketIO if available
    if socketio:
        message_schema = MessageSchema()
        message_dict = message_schema.dump(message)
        socketio.emit('new_message', message_dict, room=f"group_{group_id}")
    
    return message

@blp.route("/activities/<int:activity_id>/messages", methods=["POST"])
@blp.arguments(MessageCreateSchema)
@blp.response(201, MessageSchema)
@require_authentication
@require_chat_access('activity', 'activity_id')
def post_activity_message(message_data, activity_id):
    """Send a message to an activity chat (REST fallback)"""
    user_id = session.get('user_id')
    
    message = Message(
        content=message_data['content'],
        sender_id=user_id,
        context_type=MessageContextType.ACTIVITY,
        context_id=activity_id
    )
    
    db.session.add(message)
    db.session.commit()
    
    # Broadcast via SocketIO if available
    if socketio:
        message_schema = MessageSchema()
        message_dict = message_schema.dump(message)
        socketio.emit('new_message', message_dict, room=f"activity_{activity_id}")
    
    return message

@blp.route("/history", methods=["GET"])
@blp.arguments(MessageListQuerySchema, location="query")
@require_authentication
def get_chat_history(query_args):
    """Get chat history for a context (group or activity)"""
    context_type = query_args['context_type']
    context_id = query_args['context_id']
    cursor = query_args.get('cursor')
    
    user_id = session.get('user_id')
    
    # Verify user has access to this context
    if context_type == 'GROUP':
        group = Group.query.get(context_id)
        if not group or not group.is_member(user_id):
            blp.abort(403, message="Access denied to group chat")
    elif context_type == 'ACTIVITY':
        activity = Activity.query.get(context_id)
        if not activity or not activity.is_participant(user_id):
            blp.abort(403, message="Access denied to activity chat")
    else:
        blp.abort(400, message="Invalid context type")
    
    # Get messages
    message_context = MessageContextType.GROUP if context_type == 'GROUP' else MessageContextType.ACTIVITY
    query = Message.query.filter_by(
        context_type=message_context,
        context_id=context_id
    )
    
    # Apply cursor pagination if provided
    if cursor:
        try:
            cursor_date = datetime.fromisoformat(cursor.replace('Z', '+00:00'))
            query = query.filter(Message.created_at < cursor_date)
        except:
            pass  # Invalid cursor, ignore
    
    messages = query.order_by(Message.created_at.desc()).limit(50).all()
    
    # Reverse to show oldest first
    messages = list(reversed(messages))
    
    return {
        "messages": [message.to_dict() for message in messages],
        "has_more": len(messages) == 50
    }