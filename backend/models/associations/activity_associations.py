"""
Activity-related association tables.

This module contains all many-to-many relationship tables
related to activities functionality.
"""

from datetime import datetime
from models.user.user import db

# Many-to-many association table between users and activities
activity_participants = db.Table('activity_participants',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('activity_id', db.Integer, db.ForeignKey('activities.id'), primary_key=True),
    db.Column('joined_at', db.DateTime, default=datetime.utcnow),
    db.Column('role', db.String(20), default='participant'),  # Future: organizer, participant
    db.Column('is_active', db.Boolean, default=True)          # Future: for soft deletes
)