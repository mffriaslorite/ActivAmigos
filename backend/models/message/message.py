from datetime import datetime, timezone
from models.user.user import db
import enum

class MessageContextType(enum.Enum):
    GROUP = "GROUP"
    ACTIVITY = "ACTIVITY"

class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    context_type = db.Column(db.Enum(MessageContextType), nullable=False)
    context_id = db.Column(db.Integer, nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Foreign keys
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    sender = db.relationship('User', backref='sent_messages')
    
    def __repr__(self):
        return f'<Message {self.id} from {self.sender_id}>'
    
    def to_dict(self):
        """Convert message to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'context_type': self.context_type.value if self.context_type else None,
            'context_id': self.context_id,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'sender_id': self.sender_id,
            'sender': {
                'id': self.sender.id,
                'username': self.sender.username,
                'first_name': self.sender.first_name,
                'last_name': self.sender.last_name,
                'profile_image': self.sender.profile_image
            } if self.sender else None
        }
    
    @property
    def chat_room_id(self):
        """Get the chat room identifier for this message"""
        return f"{self.context_type.value.lower()}:{self.context_id}"
    
    def __init__(self, content, sender_id, context_type, context_id):
        self.content = content
        self.sender_id = sender_id
        self.context_type = context_type
        self.context_id = context_id