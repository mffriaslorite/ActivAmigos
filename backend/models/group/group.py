from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from models.user.user import db

# Association table for many-to-many relationship between users and groups
group_members = db.Table('group_members',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('group_id', db.Integer, db.ForeignKey('groups.id'), primary_key=True),
    db.Column('joined_at', db.DateTime, default=datetime.utcnow)
)

class Group(db.Model):
    __tablename__ = 'groups'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    rules = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_groups')
    members = db.relationship('User', 
                             secondary=group_members, 
                             backref=db.backref('joined_groups', lazy='dynamic'),
                             lazy='dynamic')

    def __repr__(self):
        return f'<Group {self.name}>'
    
    @property
    def member_count(self):
        """Get the number of members in this group"""
        return self.members.count()
    
    def is_member(self, user_id):
        """Check if a user is a member of this group"""
        return self.members.filter_by(id=user_id).count() > 0
    
    def add_member(self, user):
        """Add a user to this group"""
        if not self.is_member(user.id):
            self.members.append(user)
            return True
        return False
    
    def remove_member(self, user):
        """Remove a user from this group"""
        if self.is_member(user.id):
            self.members.remove(user)
            return True
        return False