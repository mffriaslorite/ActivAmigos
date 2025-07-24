"""
Group-related association tables.

This module contains all many-to-many relationship tables
related to groups functionality.
"""

from datetime import datetime
from models.user.user import db

# Many-to-many association table between users and groups
group_members = db.Table('group_members',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('group_id', db.Integer, db.ForeignKey('groups.id'), primary_key=True),
    db.Column('joined_at', db.DateTime, default=datetime.utcnow),
    db.Column('role', db.String(20), default='member'),  # Future: admin, moderator, member
    db.Column('is_active', db.Boolean, default=True)     # Future: for soft deletes
)

# Future association tables can be added here:
# 
# group_activities = db.Table('group_activities',
#     db.Column('group_id', db.Integer, db.ForeignKey('groups.id'), primary_key=True),
#     db.Column('activity_id', db.Integer, db.ForeignKey('activities.id'), primary_key=True),
#     db.Column('created_at', db.DateTime, default=datetime.utcnow)
# )
#
# group_tags = db.Table('group_tags',
#     db.Column('group_id', db.Integer, db.ForeignKey('groups.id'), primary_key=True),
#     db.Column('tag_id', db.Integer, db.ForeignKey('tags.id'), primary_key=True)
# )