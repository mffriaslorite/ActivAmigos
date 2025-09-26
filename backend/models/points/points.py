from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
from models.user.user import db

class PointsLedger(db.Model):
    __tablename__ = 'points_ledger'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    points = db.Column(db.Integer, nullable=False)  # Positive for awards, negative for deductions
    reason = db.Column(db.String(255), nullable=False)
    context_type = db.Column(db.String(50), nullable=True)  # GROUP, ACTIVITY, etc.
    context_id = db.Column(db.Integer, nullable=True)  # ID of the related entity
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = db.relationship('User', backref=db.backref('points_history', lazy='dynamic'))

    def __repr__(self):
        return f'<PointsLedger user_id={self.user_id} points={self.points}>'

    @classmethod
    def get_user_total_points(cls, user_id):
        """Get total points for a user"""
        result = db.session.query(db.func.sum(cls.points)).filter_by(user_id=user_id).scalar()
        return result or 0

    @classmethod
    def award_points(cls, user_id, points, reason, context_type=None, context_id=None):
        """Award points to a user"""
        entry = cls(
            user_id=user_id,
            points=abs(points),  # Ensure positive
            reason=reason,
            context_type=context_type,
            context_id=context_id
        )
        db.session.add(entry)
        db.session.commit()
        return entry

    @classmethod
    def deduct_points(cls, user_id, points, reason, context_type=None, context_id=None):
        """Deduct points from a user"""
        entry = cls(
            user_id=user_id,
            points=-abs(points),  # Ensure negative
            reason=reason,
            context_type=context_type,
            context_id=context_id
        )
        db.session.add(entry)
        db.session.commit()
        return entry