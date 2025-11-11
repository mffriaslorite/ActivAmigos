from datetime import datetime, timezone
from models.user.user import db

class ActivityAttendance(db.Model):
    __tablename__ = 'activity_attendance'

    id = db.Column(db.Integer, primary_key=True)
    activity_id = db.Column(db.Integer, db.ForeignKey('activities.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    confirmed_at = db.Column(db.DateTime, nullable=True)  # When user confirmed attendance
    present = db.Column(db.Boolean, nullable=True)  # Whether user actually attended (marked by organizer)
    marked_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Who marked attendance
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    activity = db.relationship('Activity', backref=db.backref('attendance_records', lazy='dynamic'))
    user = db.relationship('User', foreign_keys=[user_id], backref='attendance_records')
    marker = db.relationship('User', foreign_keys=[marked_by], backref='marked_attendance_records')

    # Unique constraint to prevent duplicate records
    __table_args__ = (db.UniqueConstraint('activity_id', 'user_id', name='_activity_user_attendance_uc'),)

    def __repr__(self):
        return f'<ActivityAttendance activity_id={self.activity_id} user_id={self.user_id}>'

    def to_dict(self):
        """Convert attendance to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'activity_id': self.activity_id,
            'user_id': self.user_id,
            'user': {
                'id': self.user.id,
                'username': self.user.username,
                'first_name': self.user.first_name,
                'last_name': self.user.last_name,
                'profile_image': self.user.profile_image
            } if self.user else None,
            'confirmed_at': self.confirmed_at.isoformat() if self.confirmed_at else None,
            'present': self.present,
            'marked_by': self.marked_by,
            'marker': {
                'id': self.marker.id,
                'username': self.marker.username,
                'first_name': self.marker.first_name,
                'last_name': self.marker.last_name
            } if self.marker else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @classmethod
    def confirm_attendance(cls, activity_id, user_id, will_attend=True):
        """Confirm user attendance for an activity"""
        attendance = cls.query.filter_by(activity_id=activity_id, user_id=user_id).first()
        
        if not attendance:
            attendance = cls(activity_id=activity_id, user_id=user_id)
            db.session.add(attendance)
        
        attendance.confirmed_at = datetime.now(timezone.utc)
        
        # If user explicitly declines, mark as not present
        if not will_attend:
            attendance.present = False
        
        db.session.commit()
        return attendance

    @classmethod
    def mark_attendance(cls, activity_id, user_id, present, marked_by):
        """Mark user attendance as present/absent (organizer action)"""
        attendance = cls.query.filter_by(activity_id=activity_id, user_id=user_id).first()
        
        if not attendance:
            attendance = cls(activity_id=activity_id, user_id=user_id)
            db.session.add(attendance)
        
        attendance.present = present
        attendance.marked_by = marked_by
        attendance.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        return attendance

    @classmethod
    def get_activity_attendance(cls, activity_id):
        """Get all attendance records for an activity"""
        return cls.query.filter_by(activity_id=activity_id).all()

    @classmethod
    def get_user_attendance(cls, user_id, limit=None):
        """Get attendance records for a user"""
        query = cls.query.filter_by(user_id=user_id).order_by(cls.created_at.desc())
        if limit:
            query = query.limit(limit)
        return query.all()

    @property
    def needs_confirmation(self):
        """Check if attendance needs confirmation"""
        return self.confirmed_at is None

    @property
    def is_confirmed(self):
        """Check if attendance is confirmed"""
        return self.confirmed_at is not None

    @property
    def is_marked(self):
        """Check if attendance has been marked by organizer"""
        return self.present is not None