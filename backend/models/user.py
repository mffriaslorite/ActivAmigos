from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import json

# Import db at module level to avoid circular imports
db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # Profile information
    first_name = db.Column(db.String(50), nullable=True)
    last_name = db.Column(db.String(50), nullable=True)
    profile_image = db.Column(db.String(255), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    
    # Accessibility and preferences
    accessibility_preferences = db.Column(db.JSON, nullable=True, default=lambda: {
        'high_contrast': False,
        'large_text': False,
        'screen_reader': False,
        'keyboard_navigation': False,
        'reduced_motion': False
    })
    
    # Account management
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)
    email_verified = db.Column(db.Boolean, default=False, nullable=False)

    def set_password(self, password):
        """Set password hash for user"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check if provided password matches user's password"""
        return check_password_hash(self.password_hash, password)

    def update_last_login(self):
        """Update the last login timestamp"""
        self.last_login = datetime.utcnow()
        db.session.commit()

    def to_dict(self, include_sensitive=False):
        """Convert user object to dictionary for API responses"""
        user_dict = {
            'id': self.id,
            'username': self.username,
            'email': self.email if include_sensitive else None,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'profile_image': self.profile_image,
            'bio': self.bio,
            'accessibility_preferences': self.accessibility_preferences,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'email_verified': self.email_verified
        }
        return user_dict

    @property
    def full_name(self):
        """Get user's full name"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        elif self.last_name:
            return self.last_name
        else:
            return self.username

    def __repr__(self):
        return f'<User {self.username}>'
