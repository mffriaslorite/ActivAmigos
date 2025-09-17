from datetime import datetime
from models.user.user import db
import enum

class MessageType(enum.Enum):
    USER = "USER"
    SYSTEM = "SYSTEM"
    WARNING = "WARNING"
    BAN = "BAN"

class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Sprint 2: Message type and context
    message_type = db.Column(db.Enum(MessageType), nullable=False, default=MessageType.USER)
    context_type = db.Column(db.String(20), nullable=True)  # 'GROUP' or 'ACTIVITY'
    context_id = db.Column(db.Integer, nullable=False)  # ID of group or activity
    
    # Foreign keys
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Nullable for system messages
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True)
    activity_id = db.Column(db.Integer, db.ForeignKey('activities.id'), nullable=True)
    
    # Relationships
    sender = db.relationship('User', backref='sent_messages')
    group = db.relationship('Group', backref='messages')
    activity = db.relationship('Activity', backref='messages')
    
    def __repr__(self):
        return f'<Message {self.id} from {self.sender_id}>'
    
    def to_dict(self):
        """Convert message to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'content': self.content,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'message_type': self.message_type.value if self.message_type else MessageType.USER.value,
            'context_type': self.context_type,
            'context_id': self.context_id,
            'sender_id': self.sender_id,
            'sender': {
                'id': self.sender.id,
                'username': self.sender.username,
                'first_name': self.sender.first_name,
                'last_name': self.sender.last_name,
                'profile_image': self.sender.profile_image
            } if self.sender else None,
            'group_id': self.group_id,
            'activity_id': self.activity_id
        }
    
    @property
    def chat_room_id(self):
        """Get the chat room identifier for this message"""
        if self.group_id:
            return f"group_{self.group_id}"
        elif self.activity_id:
            return f"activity_{self.activity_id}"
        return None
    
    def __init__(self, content, sender_id=None, group_id=None, activity_id=None, 
                 message_type=MessageType.USER, context_type=None, context_id=None):
        self.content = content
        self.sender_id = sender_id
        self.group_id = group_id
        self.activity_id = activity_id
        self.message_type = message_type
        
        # Set context based on group/activity
        if group_id:
            self.context_type = 'GROUP'
            self.context_id = group_id
        elif activity_id:
            self.context_type = 'ACTIVITY'
            self.context_id = activity_id
        else:
            self.context_type = context_type
            self.context_id = context_id
        
        # For user messages, ensure either group_id or activity_id is provided
        if message_type == MessageType.USER:
            if not group_id and not activity_id:
                raise ValueError("Either group_id or activity_id must be provided for user messages")
            if group_id and activity_id:
                raise ValueError("Cannot specify both group_id and activity_id")
            if not sender_id:
                raise ValueError("sender_id is required for user messages")
    
    @classmethod
    def create_system_message(cls, content, context_type, context_id, message_type=MessageType.SYSTEM):
        """Create a system message"""
        group_id = context_id if context_type == 'GROUP' else None
        activity_id = context_id if context_type == 'ACTIVITY' else None
        
        return cls(
            content=content,
            sender_id=None,
            group_id=group_id,
            activity_id=activity_id,
            message_type=message_type,
            context_type=context_type,
            context_id=context_id
        )