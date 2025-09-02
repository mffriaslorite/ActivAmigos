from flask import request, jsonify
from flask_smorest import Blueprint, abort
from flask_socketio import emit, join_room, leave_room
from flask_socketio import SocketIO
from models.user.user import User
from models.group.group import Group
from models.activity.activity import Activity
from models.message.message import Message
from models.user.user import db
from datetime import datetime
import json

# Create blueprint for REST API endpoints
blp = Blueprint('chat', __name__, description='Chat operations')

# Global socketio instance (will be initialized in app.py)
socketio = None

def init_socketio(app):
    """Initialize SocketIO with the Flask app"""
    global socketio
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
    return socketio

# WebSocket event handlers
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f'Client connected: {request.sid}')
    emit('connected', {'status': 'connected', 'sid': request.sid})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'Client disconnected: {request.sid}')

@socketio.on('join_chat')
def handle_join_chat(data):
    """Handle joining a chat room"""
    try:
        user_id = data.get('user_id')
        chat_type = data.get('chat_type')  # 'group' or 'activity'
        chat_id = data.get('chat_id')
        
        if not all([user_id, chat_type, chat_id]):
            emit('error', {'message': 'Missing required parameters'})
            return
        
        # Validate user membership
        if chat_type == 'group':
            group = Group.query.get(chat_id)
            if not group or not group.is_member(user_id):
                emit('error', {'message': 'Access denied: not a member of this group'})
                return
            room_name = f'group_{chat_id}'
        elif chat_type == 'activity':
            activity = Activity.query.get(chat_id)
            if not activity or not activity.is_participant(user_id):
                emit('error', {'message': 'Access denied: not a participant of this activity'})
                return
            room_name = f'activity_{chat_id}'
        else:
            emit('error', {'message': 'Invalid chat type'})
            return
        
        # Join the room
        join_room(room_name)
        emit('joined_chat', {
            'status': 'success',
            'chat_type': chat_type,
            'chat_id': chat_id,
            'room': room_name
        })
        
        print(f'User {user_id} joined {room_name}')
        
    except Exception as e:
        print(f'Error joining chat: {e}')
        emit('error', {'message': 'Error joining chat room'})

@socketio.on('leave_chat')
def handle_leave_chat(data):
    """Handle leaving a chat room"""
    try:
        chat_type = data.get('chat_type')
        chat_id = data.get('chat_id')
        
        if chat_type == 'group':
            room_name = f'group_{chat_id}'
        elif chat_type == 'activity':
            room_name = f'activity_{chat_id}'
        else:
            emit('error', {'message': 'Invalid chat type'})
            return
        
        leave_room(room_name)
        emit('left_chat', {
            'status': 'success',
            'chat_type': chat_type,
            'chat_id': chat_id
        })
        
    except Exception as e:
        print(f'Error leaving chat: {e}')
        emit('error', {'message': 'Error leaving chat room'})

@socketio.on('send_message')
def handle_send_message(data):
    """Handle sending a new message"""
    try:
        user_id = data.get('user_id')
        content = data.get('content')
        chat_type = data.get('chat_type')
        chat_id = data.get('chat_id')
        
        if not all([user_id, content, chat_type, chat_id]):
            emit('error', {'message': 'Missing required parameters'})
            return
        
        # Validate user membership
        if chat_type == 'group':
            group = Group.query.get(chat_id)
            if not group or not group.is_member(user_id):
                emit('error', {'message': 'Access denied: not a member of this group'})
                return
            room_name = f'group_{chat_id}'
            group_id = chat_id
            activity_id = None
        elif chat_type == 'activity':
            activity = Activity.query.get(chat_id)
            if not activity or not activity.is_participant(user_id):
                emit('error', {'message': 'Access denied: not a participant of this activity'})
                return
            room_name = f'activity_{chat_id}'
            activity_id = chat_id
            group_id = None
        else:
            emit('error', {'message': 'Invalid chat type'})
            return
        
        # Create and save the message
        message = Message(
            content=content,
            sender_id=user_id,
            group_id=group_id,
            activity_id=activity_id,
            timestamp=datetime.utcnow()
        )
        
        db.session.add(message)
        db.session.commit()
        
        # Get sender information
        sender = User.query.get(user_id)
        
        # Prepare message data for broadcasting
        message_data = {
            'id': message.id,
            'content': message.content,
            'timestamp': message.timestamp.isoformat(),
            'sender_id': message.sender_id,
            'sender_name': f"{sender.first_name or ''} {sender.last_name or ''}".strip() or sender.username,
            'sender_username': sender.username,
            'chat_type': chat_type,
            'chat_id': chat_id
        }
        
        # Broadcast to all users in the chat room
        socketio.emit('new_message', message_data, room=room_name)
        
        # Send confirmation to sender
        emit('message_sent', {
            'status': 'success',
            'message_id': message.id
        })
        
        print(f'Message sent in {room_name}: {content[:50]}...')
        
    except Exception as e:
        print(f'Error sending message: {e}')
        emit('error', {'message': 'Error sending message'})
        db.session.rollback()

# REST API endpoints (fallback when WebSockets unavailable)
@blp.route('/chat/<chat_type>/<int:chat_id>/messages', methods=['GET'])
def get_chat_messages(chat_type, chat_id):
    """Get chat messages with pagination"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        
        # Validate chat type
        if chat_type not in ['group', 'activity']:
            abort(400, message='Invalid chat type')
        
        # Build query based on chat type
        if chat_type == 'group':
            query = Message.query.filter_by(group_id=chat_id)
        else:
            query = Message.query.filter_by(activity_id=chat_id)
        
        # Get messages with pagination, ordered by timestamp (newest first)
        messages = query.order_by(Message.timestamp.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Format messages
        formatted_messages = []
        for msg in messages.items:
            sender = User.query.get(msg.sender_id)
            formatted_messages.append({
                'id': msg.id,
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat(),
                'sender_id': msg.sender_id,
                'sender_name': f"{sender.first_name or ''} {sender.last_name or ''}".strip() or sender.username,
                'sender_username': sender.username
            })
        
        return jsonify({
            'messages': formatted_messages,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': messages.total,
                'pages': messages.pages,
                'has_next': messages.has_next,
                'has_prev': messages.has_prev
            }
        })
        
    except Exception as e:
        print(f'Error getting chat messages: {e}')
        abort(500, message='Internal server error')

@blp.route('/chat/<chat_type>/<int:chat_id>/messages', methods=['POST'])
def post_message(chat_type, chat_id):
    """Post a new message via REST API"""
    try:
        data = request.get_json()
        
        if not data or 'content' not in data or 'user_id' not in data:
            abort(400, message='Missing required fields: content and user_id')
        
        content = data['content'].strip()
        user_id = data['user_id']
        
        if not content:
            abort(400, message='Message content cannot be empty')
        
        # Validate user membership
        if chat_type == 'group':
            group = Group.query.get(chat_id)
            if not group or not group.is_member(user_id):
                abort(403, message='Access denied: not a member of this group')
            group_id = chat_id
            activity_id = None
        elif chat_type == 'activity':
            activity = Activity.query.get(chat_id)
            if not activity or not activity.is_participant(user_id):
                abort(403, message='Access denied: not a participant of this activity')
            activity_id = chat_id
            group_id = None
        else:
            abort(400, message='Invalid chat type')
        
        # Create and save the message
        message = Message(
            content=content,
            sender_id=user_id,
            group_id=group_id,
            activity_id=activity_id,
            timestamp=datetime.utcnow()
        )
        
        db.session.add(message)
        db.session.commit()
        
        # Get sender information
        sender = User.query.get(user_id)
        
        # Prepare response
        message_data = {
            'id': message.id,
            'content': message.content,
            'timestamp': message.timestamp.isoformat(),
            'sender_id': message.sender_id,
            'sender_name': f"{sender.first_name or ''} {sender.last_name or ''}".strip() or sender.username,
            'sender_username': sender.username,
            'chat_type': chat_type,
            'chat_id': chat_id
        }
        
        # If WebSocket is available, broadcast to chat room
        if socketio:
            room_name = f'{chat_type}_{chat_id}'
            socketio.emit('new_message', message_data, room=room_name)
        
        return jsonify({
            'status': 'success',
            'message': message_data
        }), 201
        
    except Exception as e:
        print(f'Error posting message: {e}')
        db.session.rollback()
        abort(500, message='Internal server error')

@blp.route('/chat/<chat_type>/<int:chat_id>/status', methods=['GET'])
def get_chat_status(chat_type, chat_id):
    """Get chat room status and member count"""
    try:
        if chat_type == 'group':
            chat_room = Group.query.get(chat_id)
            if not chat_room:
                abort(404, message='Group not found')
            member_count = chat_room.member_count
        elif chat_type == 'activity':
            chat_room = Activity.query.get(chat_id)
            if not chat_room:
                abort(404, message='Activity not found')
            member_count = chat_room.participant_count
        else:
            abort(400, message='Invalid chat type')
        
        # Get message count
        if chat_type == 'group':
            message_count = Message.query.filter_by(group_id=chat_id).count()
        else:
            message_count = Message.query.filter_by(activity_id=chat_id).count()
        
        return jsonify({
            'chat_type': chat_type,
            'chat_id': chat_id,
            'member_count': member_count,
            'message_count': message_count,
            'status': 'active'
        })
        
    except Exception as e:
        print(f'Error getting chat status: {e}')
        abort(500, message='Internal server error')