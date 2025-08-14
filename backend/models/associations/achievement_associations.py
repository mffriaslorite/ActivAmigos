"""
Achievement-related association tables.

This module contains all association tables related to the
achievements and gamification functionality.
"""

from datetime import datetime
from models.user.user import db

class UserAchievement(db.Model):
    """Association table between users and achievements with additional metadata."""
    __tablename__ = 'user_achievements'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievements.id'), nullable=False)
    date_earned = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Ensure unique combination of user and achievement
    __table_args__ = (db.UniqueConstraint('user_id', 'achievement_id', name='uq_user_achievement'),)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('achievements', cascade='all, delete-orphan'))
    achievement = db.relationship('Achievement', back_populates='user_achievements')

    def __repr__(self):
        return f'<UserAchievement user_id={self.user_id} achievement_id={self.achievement_id}>'


class UserPoints(db.Model):
    """User points tracking table - essentially an association between users and their point totals."""
    __tablename__ = 'user_points'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    points = db.Column(db.Integer, nullable=False, default=0)
    
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to user
    user = db.relationship('User', backref=db.backref('user_points', uselist=False, cascade='all, delete-orphan'))

    @property
    def level(self):
        """Calculate level based on points (level = floor(points / 100))"""
        return self.points // 100

    @property
    def progress_to_next_level(self):
        """Calculate progress to next level (0-1 float)"""
        return (self.points % 100) / 100.0

    def add_points(self, points_to_add):
        """Add points to the user's total"""
        self.points += points_to_add
        self.updated_at = datetime.utcnow()

    def __repr__(self):
        return f'<UserPoints user_id={self.user_id} points={self.points} level={self.level}>'