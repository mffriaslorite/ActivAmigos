from datetime import datetime
from models.user.user import db

class Warning(db.Model):
    __tablename__ = 'warnings'

    id = db.Column(db.Integer, primary_key=True)
    context_type = db.Column(db.String(20), nullable=False)  # 'GROUP' or 'ACTIVITY'
    context_id = db.Column(db.Integer, nullable=False)  # ID of group or activity
    target_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    issued_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    target_user = db.relationship('User', foreign_keys=[target_user_id], backref='warnings_received')
    issuer = db.relationship('User', foreign_keys=[issued_by], backref='warnings_issued')

    def to_dict(self):
        """Convert warning to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'context_type': self.context_type,
            'context_id': self.context_id,
            'target_user_id': self.target_user_id,
            'target_user': {
                'id': self.target_user.id,
                'username': self.target_user.username,
                'first_name': self.target_user.first_name,
                'last_name': self.target_user.last_name
            } if self.target_user else None,
            'issued_by': self.issued_by,
            'issuer': {
                'id': self.issuer.id,
                'username': self.issuer.username,
                'first_name': self.issuer.first_name,
                'last_name': self.issuer.last_name
            } if self.issuer else None,
            'reason': self.reason,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<Warning {self.id} for user {self.target_user_id} in {self.context_type} {self.context_id}>'