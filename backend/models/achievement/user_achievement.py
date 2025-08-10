from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Import the same db instance used by User model
from models.user.user import db

class UserAchievement(db.Model):
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