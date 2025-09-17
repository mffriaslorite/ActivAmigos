from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import enum

db = SQLAlchemy()

class UserRole(enum.Enum):
    USER = "USER"
    ORGANIZER = "ORGANIZER"
    SUPERADMIN = "SUPERADMIN"

class PasswordHintType(enum.Enum):
    ANIMAL_LIST = "ANIMAL_LIST"

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    first_name = db.Column(db.String(50), nullable=True)
    last_name = db.Column(db.String(50), nullable=True)
    profile_image = db.Column(db.String(255), nullable=True)
    bio = db.Column(db.Text, nullable=True)

    # Sprint 1: Role system
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.USER)

    # Sprint 1: Password hints (DO NOT store actual password or chosen animal)
    password_hint_type = db.Column(db.Enum(PasswordHintType), nullable=True)
    password_hint_value = db.Column(db.String(100), nullable=True)  # For future extensibility

    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    email_verified = db.Column(db.Boolean, default=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def update_last_login(self):
        self.last_login = datetime.utcnow()
        db.session.commit()

    def to_dict(self, include_sensitive=False):
        """Convert user to dictionary representation"""
        data = {
            'id': self.id,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'profile_image': self.profile_image,
            'bio': self.bio,
            'role': self.role.value if self.role else UserRole.USER.value,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
        }
        
        if include_sensitive:
            data.update({
                'email': self.email,
                'email_verified': self.email_verified,
                'password_hint_type': self.password_hint_type.value if self.password_hint_type else None,
            })
        
        return data

    def has_role(self, role):
        """Check if user has specific role"""
        if isinstance(role, str):
            return self.role.value == role
        return self.role == role

    def is_organizer_or_admin(self):
        """Check if user is organizer or superadmin"""
        return self.role in [UserRole.ORGANIZER, UserRole.SUPERADMIN]

    def is_superadmin(self):
        """Check if user is superadmin"""
        return self.role == UserRole.SUPERADMIN
