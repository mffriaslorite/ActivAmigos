from datetime import datetime
from models.user.user import db

class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Reference to either group or activity (one must be set)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True)
    activity_id = db.Column(db.Integer, db.ForeignKey('activities.id'), nullable=True)
    
    # Relationships
    sender = db.relationship('User', backref='sent_messages')
    group = db.relationship('Group', backref='messages')
    activity = db.relationship('Activity', backref='messages')
    
    # Validation: either group_id or activity_id must be set
    __table_args__ = (
        db.CheckConstraint(
            '(group_id IS NOT NULL AND activity_id IS NULL) OR (group_id IS NULL AND activity_id IS NOT NULL)',
            name='check_group_or_activity'
        ),
    )

    def __repr__(self):
        return f'<Message {self.id} from {self.sender_id}>'
    
    @property
    def chat_room_id(self):
        """Get the chat room identifier (group_id or activity_id)"""
        return self.group_id or self.activity_id
    
    @property
    def chat_type(self):
        """Get the type of chat room (group or activity)"""
        return 'group' if self.group_id else 'activity'