from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Import the same db instance used by User model
from models.user.user import db

class UserPoints(db.Model):
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