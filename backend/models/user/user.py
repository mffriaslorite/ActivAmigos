from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
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

    # Sprint 1: Role and password hints
    role = db.Column(db.Enum(UserRole), default=UserRole.USER, nullable=False)
    password_hint_type = db.Column(db.Enum(PasswordHintType), nullable=True)
    password_hint_value = db.Column(db.String(255), nullable=True)

    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = db.Column(db.DateTime)
    email_verified = db.Column(db.Boolean, default=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def update_last_login(self):
        self.last_login = datetime.now(timezone.utc)
        db.session.commit()
    
    def has_role(self, role):
        """Check if user has specific role"""
        return self.role == role
    
    def is_organizer_or_admin(self):
        """Check if user is organizer or superadmin"""
        return self.role in [UserRole.ORGANIZER, UserRole.SUPERADMIN]
