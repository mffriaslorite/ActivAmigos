"""
User-related association tables.

This module contains all many-to-many relationship tables
related to user functionality that don't belong to specific domains.
"""

from datetime import datetime
from models.user.user import db

# Future user association tables can be added here:
# 
# user_friendships = db.Table('user_friendships',
#     db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
#     db.Column('friend_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
#     db.Column('status', db.String(20), default='pending'),  # pending, accepted, blocked
#     db.Column('created_at', db.DateTime, default=datetime.utcnow),
#     db.Column('accepted_at', db.DateTime, nullable=True)
# )
#
# user_interests = db.Table('user_interests',
#     db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
#     db.Column('interest_id', db.Integer, db.ForeignKey('interests.id'), primary_key=True),
#     db.Column('level', db.String(20), default='beginner')  # beginner, intermediate, advanced
# )