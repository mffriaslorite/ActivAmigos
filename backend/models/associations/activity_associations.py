"""
Activity-related association tables.

This module contains all many-to-many relationship tables
related to activities functionality.
"""

from datetime import datetime, timezone
from models.user.user import db
from models.warnings.warnings import MembershipStatus

# Many-to-many association table between users and activities
activity_participants = db.Table('activity_participants',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('activity_id', db.Integer, db.ForeignKey('activities.id'), primary_key=True),
    db.Column('joined_at', db.DateTime, default=lambda: datetime.now(timezone.utc)),
    db.Column('role', db.String(20), default='participant'),  # organizer, participant
    db.Column('is_active', db.Boolean, default=True),
    db.Column('warning_count', db.Integer, default=0),
    db.Column('status', db.Enum(MembershipStatus), default=MembershipStatus.ACTIVE)
)