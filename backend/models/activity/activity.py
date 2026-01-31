from datetime import datetime, timezone
from models.user.user import db
from models.associations.activity_associations import activity_participants

class Activity(db.Model):
    __tablename__ = 'activities'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    activity_type = db.Column(db.String(50), nullable=True)
    location = db.Column(db.String(255), nullable=True)
    date = db.Column(db.DateTime, nullable=False)
    rules = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_activities')
    participants = db.relationship('User', 
                                 secondary=activity_participants, 
                                 backref=db.backref('joined_activities', lazy='dynamic'),
                                 lazy='dynamic')

    def __init__(self, **kwargs):
        # Ensure date is timezone-aware when creating the activity
        if 'date' in kwargs and kwargs['date'] is not None:
            activity_date = kwargs['date']
            if activity_date.tzinfo is None:
                # If naive datetime, assume it's in UTC
                kwargs['date'] = activity_date.replace(tzinfo=timezone.utc)
        super().__init__(**kwargs)

    @property
    def date_aware(self):
        """Get the date as timezone-aware datetime"""
        if self.date.tzinfo is None:
            return self.date.replace(tzinfo=timezone.utc)
        return self.date

    def __repr__(self):
        return f'<Activity {self.title}>'
    
    @property
    def participant_count(self):
        """Get the number of participants in this activity"""
        return self.participants.count()
    
    def is_participant(self, user_id):
        """Check if a user is a participant of this activity"""
        return self.participants.filter_by(id=user_id).count() > 0
    
    def add_participant(self, user):
        """Add a user to this activity"""
        if not self.is_participant(user.id):
            self.participants.append(user)
            return True
        return False
    
    def remove_participant(self, user):
        """Remove a user from this activity"""
        if self.is_participant(user.id):
            self.participants.remove(user)
            return True
        return False
    
    def is_organizer(self, user_id):
        """Check if a user is an organizer of this activity"""
        result = db.session.execute(
            activity_participants.select().where(
                (activity_participants.c.user_id == user_id) & 
                (activity_participants.c.activity_id == self.id) &
                (activity_participants.c.role == 'organizer')
            )
        ).first()
        return result is not None

    def add_organizer(self, user):
        """Add a user as organizer to this activity"""
        if not self.is_participant(user.id):
            db.session.execute(
                activity_participants.insert().values(
                    user_id=user.id,
                    activity_id=self.id,
                    joined_at=datetime.now(timezone.utc),
                    role='organizer'
                )
            )
            return True
        return False