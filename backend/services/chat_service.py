from flask import Blueprint, Response, request, session, current_app
from flask_smorest import Api, Blueprint
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from marshmallow import ValidationError
from datetime import datetime, timezone
import functools
import logging
from uuid import uuid4

from models.user.user import db, User
from models.group.group import Group
from models.activity.activity import Activity
from models.message.message import Message, MessageContextType
from models.message.message_schema import (
    MessageSchema, 
    MessageCreateSchema, 
    MessageListQuerySchema
)
from utils.minio_client import minio_client
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
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp'}
ALLOWED_AUDIO_TYPES = {
    'audio/webm',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/aac'
}


def normalize_content_type(content_type):
    return (content_type or '').split(';', 1)[0].strip().lower()


def normalize_context_type(context_type):
    normalized = (context_type or '').upper()
    if normalized not in {'GROUP', 'ACTIVITY'}:
        raise ValueError('Invalid context type')
    return normalized


def get_media_type_from_content_type(content_type):
    normalized = normalize_content_type(content_type)
    if normalized in ALLOWED_IMAGE_TYPES:
        return 'IMAGE'
    if normalized in ALLOWED_AUDIO_TYPES:
        return 'AUDIO'
    raise ValueError('Formato no compatible. Solo se permiten imagenes y audios.')


def get_file_extension(content_type):
    extension_map = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'audio/webm': '.webm',
        'audio/ogg': '.ogg',
        'audio/wav': '.wav',
        'audio/x-wav': '.wav',
        'audio/mpeg': '.mp3',
        'audio/mp3': '.mp3',
        'audio/mp4': '.m4a',
        'audio/aac': '.aac'
    }
    return extension_map.get(normalize_content_type(content_type), '')


def resolve_chat_room(context_type, context_id, user_id):
    """Validate access to a room and return its broadcast name."""
    if context_type == 'GROUP':
        group = Group.query.get(context_id)
        if not group or not group.is_member(user_id):
            raise PermissionError('Access denied to group chat')
        return f"group:{context_id}"
    if context_type == 'ACTIVITY':
        activity = Activity.query.get(context_id)
        if not activity or not activity.is_participant(user_id):
            raise PermissionError('Access denied to activity chat')
        return f"activity:{context_id}"
    raise ValueError('Invalid context type')


def create_message_and_broadcast(
    user_id,
    context_type,
    context_id,
    content,
    message_type='TEXT',
    attachment_object_name=None,
    attachment_content_type=None
):
    room_name = resolve_chat_room(context_type, context_id, user_id)

    if not can_user_chat(context_type, context_id, user_id):
        raise PermissionError('You are banned from chatting in this context')

    message_context = MessageContextType.GROUP if context_type == 'GROUP' else MessageContextType.ACTIVITY
    message = Message(
        content=content or None,
        sender_id=user_id,
        context_type=message_context,
        context_id=context_id,
        message_type=message_type,
        attachment_object_name=attachment_object_name,
        attachment_content_type=normalize_content_type(attachment_content_type) if attachment_content_type else None
    )

    db.session.add(message)
    db.session.commit()

    try:
        from utils.achievement_engine_simple import trigger_message_sent
        trigger_message_sent(message.sender_id)
    except Exception as e:
        print(f"Error checking chat achievements: {e}")

    message_dict = message.to_dict()

    if socketio:
        socketio.emit('new_message', message_dict, room=room_name)

    return message_dict


def upload_chat_attachment(file_data, user_id, context_type, context_id, content_type):
    media_type = get_media_type_from_content_type(content_type)
    normalized_content_type = normalize_content_type(content_type)
    object_name = (
        f"chat_attachments/{context_type.lower()}/{context_id}/{user_id}/"
        f"{uuid4()}{get_file_extension(normalized_content_type)}"
    )
    minio_client.upload_bytes(object_name, file_data, normalized_content_type)
    return media_type, object_name, normalized_content_type

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
    
    return membership and (membership.status is None or membership.status == MembershipStatus.ACTIVE)

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
            logger.warning(f"Session data: {dict(session)}")
            emit('error', {'message': 'Not authenticated - please login first'})
            return False
        
        # Verify user exists in database
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"Invalid user_id {user_id} in session")
            emit('error', {'message': 'Invalid user - please login again'})
            return False
        
        logger.info(f"✅ User {user_id} ({user.username}) connected to WebSocket")
        emit('connected', {'message': 'Successfully connected to chat'})
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
            # Support both old and new formats
            context_type = data.get('context_type') or data.get('type')
            context_id = data.get('context_id') or data.get('id')
            
            if not context_type or not context_id:
                emit('error', {'message': 'Invalid room data'})
                return
            
            # Normalize context_type
            if context_type.lower() == 'group':
                context_type = 'GROUP'
            elif context_type.lower() == 'activity':
                context_type = 'ACTIVITY'
            
            room_name = resolve_chat_room(context_type, context_id, user_id)
            
            join_room(room_name)
            emit('joined_chat', {
                'room': room_name,
                'context_type': context_type,
                'context_id': context_id
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
            # Support both old and new formats
            context_type = data.get('context_type') or data.get('type')
            context_id = data.get('context_id') or data.get('id')
            
            if not context_type or not context_id:
                return
                
            # Normalize context_type
            if context_type.lower() == 'group':
                room_name = f"group:{context_id}"
            elif context_type.lower() == 'activity':
                room_name = f"activity:{context_id}"
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
            
            message_dict = create_message_and_broadcast(
                user_id,
                context_type,
                context_id,
                message_data['content']
            )
            logger.info(f"✅ Message {message_dict['id']} sent to {context_type}:{context_id}")
            
            # Confirm to sender
            emit('message_sent', {
                'message_id': message_dict['id'],
                'status': 'success'
            })
            
        except ValidationError as e:
            emit('error', {'message': f'Invalid message data: {e.messages}'})
        except PermissionError as e:
            emit('error', {'message': str(e)})
        except ValueError as e:
            emit('error', {'message': str(e)})
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
@require_chat_access('group', 'group_id')
def post_group_message(message_data, group_id):
    """Send a message to a group chat (REST fallback)"""
    user_id = session.get('user_id')
    
    # Override group_id from URL
    message_data['group_id'] = group_id
    message_data.pop('activity_id', None)
    
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
@require_chat_access('activity', 'activity_id')
def post_activity_message(message_data, activity_id):
    """Send a message to an activity chat (REST fallback)"""
    user_id = session.get('user_id')
    
    # Override activity_id from URL
    message_data['activity_id'] = activity_id
    message_data.pop('group_id', None)
    
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

# New Sprint 2 endpoints with context_type/context_id format
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

    # Privacy filtering for banned users
    if not can_user_chat(context_type, context_id, user_id):
        # Banned user can only see system messages or messages they sent
        from sqlalchemy import or_
        query = query.filter(or_(Message.is_system == True, Message.sender_id == user_id))
    
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


@blp.route("/messages", methods=["POST"])
@blp.arguments(MessageCreateSchema)
@require_authentication
def post_chat_message(message_data):
    """Send a chat message over HTTP and rebroadcast it to the socket room."""
    user_id = session.get('user_id')

    try:
        message_dict = create_message_and_broadcast(
            user_id,
            message_data['context_type'],
            message_data['context_id'],
            message_data['content']
        )
        return message_dict, 201
    except PermissionError as e:
        blp.abort(403, message=str(e))
    except ValueError as e:
        blp.abort(400, message=str(e))
    except Exception as e:
        logger.error(f"Error posting message via HTTP: {e}")
        db.session.rollback()
        blp.abort(500, message="Failed to send message")


@blp.route("/messages/attachments", methods=["POST"])
@require_authentication
def post_chat_attachment():
    """Send an image or audio message over HTTP and rebroadcast it to the socket room."""
    user_id = session.get('user_id')
    file = request.files.get('attachment')

    if not file or not file.filename:
        blp.abort(400, message="Selecciona una imagen o un audio para enviar.")

    try:
        context_type = normalize_context_type(request.form.get('context_type'))
        context_id = request.form.get('context_id', type=int)
        content = (request.form.get('content') or '').strip()

        if not context_id:
            blp.abort(400, message="Falta el chat al que quieres enviar el archivo.")
        if len(content) > 2000:
            blp.abort(400, message="El texto del mensaje es demasiado largo.")

        file_data = file.read()
        if not file_data:
            blp.abort(400, message="El archivo esta vacio.")

        max_file_size = current_app.config.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024)
        if len(file_data) > max_file_size:
            blp.abort(400, message="El archivo supera el tamano maximo permitido.")

        media_type, object_name, attachment_content_type = upload_chat_attachment(
            file_data,
            user_id,
            context_type,
            context_id,
            file.content_type
        )

        message_dict = create_message_and_broadcast(
            user_id,
            context_type,
            context_id,
            content,
            message_type=media_type,
            attachment_object_name=object_name,
            attachment_content_type=attachment_content_type
        )
        return message_dict, 201
    except PermissionError as e:
        blp.abort(403, message=str(e))
    except ValueError as e:
        blp.abort(400, message=str(e))
    except Exception as e:
        logger.error(f"Error posting attachment via HTTP: {e}")
        db.session.rollback()
        blp.abort(500, message="No se pudo enviar el archivo.")


@blp.route("/messages/<int:message_id>/attachment", methods=["GET"])
@require_authentication
def get_chat_attachment(message_id):
    """Stream a chat attachment if the user has access to the message context."""
    user_id = session.get('user_id')
    message = Message.query.get_or_404(message_id)

    if not message.attachment_object_name:
        blp.abort(404, message="Este mensaje no tiene archivo adjunto.")

    context_type = message.context_type.value if message.context_type else None
    if not context_type:
        blp.abort(404, message="No se encontro el contexto del mensaje.")

    try:
        resolve_chat_room(context_type, message.context_id, user_id)
    except PermissionError as e:
        blp.abort(403, message=str(e))

    if not can_user_chat(context_type, message.context_id, user_id):
        can_view = message.is_system or message.sender_id == user_id
        if not can_view:
            blp.abort(403, message="No puedes ver este archivo adjunto.")

    try:
        data, content_type = minio_client.get_object_bytes(message.attachment_object_name)
        return Response(
            data,
            mimetype=message.attachment_content_type or content_type,
            headers={'Cache-Control': 'private, max-age=3600'}
        )
    except Exception as e:
        logger.error(f"Error fetching chat attachment {message_id}: {e}")
        blp.abort(500, message="No se pudo recuperar el archivo adjunto.")
