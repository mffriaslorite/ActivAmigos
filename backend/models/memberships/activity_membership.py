from datetime import datetime
from models.user.user import db
import enum

class MembershipStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    BANNED = "BANNED"

class ActivityMembership(db.Model):
    __tablename__ = 'activity_memberships'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    activity_id = db.Column(db.Integer, db.ForeignKey('activities.id'), nullable=False)
    
    # Sprint 2: Warning and ban system
    warning_count = db.Column(db.Integer, default=0, nullable=False)
    status = db.Column(db.Enum(MembershipStatus), default=MembershipStatus.ACTIVE, nullable=False)
    
    # Basic membership info
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    role = db.Column(db.String(20), default='participant', nullable=False)  # participant, organizer
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Last chat activity for traffic light system
    last_chat_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    user = db.relationship('User', backref='activity_memberships')
    activity = db.relationship('Activity', backref='memberships')

    # Unique constraint
    __table_args__ = (db.UniqueConstraint('user_id', 'activity_id'),)

    def to_dict(self):
        """Convert membership to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'activity_id': self.activity_id,
            'warning_count': self.warning_count,
            'status': self.status.value if self.status else MembershipStatus.ACTIVE.value,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'role': self.role,
            'is_active': self.is_active,
            'last_chat_at': self.last_chat_at.isoformat() if self.last_chat_at else None,
            'user': self.user.to_dict() if self.user else None
        }

    def get_semaphore_color(self):
        """Get traffic light color for this membership"""
        if not self.is_active:
            return 'grey'  # Not participating
        
        if self.status == MembershipStatus.BANNED:
            return 'red'  # Banned
        
        if self.warning_count >= 1:
            return 'yellow'  # Has warnings
        
        if self.last_chat_at:
            return 'dark_green'  # Joined and chatted
        
        return 'light_green'  # Joined but never chatted

    def can_chat(self):
        """Check if user can send messages"""
        return self.is_active and self.status == MembershipStatus.ACTIVE

    def add_warning(self):
        """Add a warning and check for auto-ban"""
        self.warning_count += 1
        if self.warning_count >= 3:
            self.status = MembershipStatus.BANNED
        return self.warning_count

    def unban(self):
        """Unban the user (reset status but keep warning count)"""
        self.status = MembershipStatus.ACTIVE

    def update_chat_activity(self):
        """Update last chat activity timestamp"""
        self.last_chat_at = datetime.utcnow()

    def __repr__(self):
        return f'<ActivityMembership user={self.user_id} activity={self.activity_id} status={self.status}>'