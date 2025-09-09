from datetime import datetime
from models.user.user import db

class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Foreign keys
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
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
    
    def __init__(self, content, sender_id, group_id=None, activity_id=None):
        self.content = content
        self.sender_id = sender_id
        self.group_id = group_id
        self.activity_id = activity_id
        
        # Ensure either group_id or activity_id is provided, but not both
        if not group_id and not activity_id:
            raise ValueError("Either group_id or activity_id must be provided")
        if group_id and activity_id:
            raise ValueError("Cannot specify both group_id and activity_id")