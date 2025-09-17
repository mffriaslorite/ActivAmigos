from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from models.user.user import db

class PointsLedger(db.Model):
    __tablename__ = 'points_ledger'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    points = db.Column(db.Integer, nullable=False)  # Can be positive or negative
    reason = db.Column(db.String(255), nullable=False)
    context_type = db.Column(db.String(50), nullable=True)  # 'GROUP', 'ACTIVITY', 'GENERAL', etc.
    context_id = db.Column(db.Integer, nullable=True)  # ID of the related entity
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Admin who awarded/deducted

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='points_entries')
    creator = db.relationship('User', foreign_keys=[created_by])

    def to_dict(self):
        """Convert points entry to dictionary representation"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'points': self.points,
            'reason': self.reason,
            'context_type': self.context_type,
            'context_id': self.context_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            'user': self.user.to_dict() if self.user else None,
            'creator': self.creator.to_dict() if self.creator else None
        }

    @classmethod
    def get_user_total_points(cls, user_id):
        """Get total points for a user"""
        result = db.session.query(db.func.sum(cls.points)).filter_by(user_id=user_id).scalar()
        return result or 0

    @classmethod
    def get_user_points_history(cls, user_id, limit=50):
        """Get points history for a user"""
        return cls.query.filter_by(user_id=user_id).order_by(cls.created_at.desc()).limit(limit).all()