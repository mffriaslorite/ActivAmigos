from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Import the same db instance used by User model
from models.user.user import db

class Achievement(db.Model):
    __tablename__ = 'achievements'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    icon_url = db.Column(db.String(255), nullable=True)
    points_reward = db.Column(db.Integer, nullable=False, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to user achievements
    user_achievements = db.relationship('UserAchievement', back_populates='achievement', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Achievement {self.title}>'