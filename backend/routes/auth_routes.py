from flask import Blueprint, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
import re
from datetime import datetime

auth_routes = Blueprint("auth_routes", __name__)

from backend.models.user.user import User, db

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Za-z]', password):
        return False, "Password must contain at least one letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"

def validate_username(username):
    """Validate username format"""
    if len(username) < 3:
        return False, "Username must be at least 3 characters long"
    if len(username) > 20:
        return False, "Username must be no more than 20 characters long"
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return False, "Username can only contain letters, numbers, hyphens, and underscores"
    return True, "Username is valid"

@auth_routes.route("/api/register", methods=["POST"])
def register():
    """Register a new user"""
    try:
        # User and db are imported at the top
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({
                "error": "Missing required fields",
                "missing_fields": missing_fields
            }), 400
        
        username = data['username'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        
        # Validate input formats
        username_valid, username_msg = validate_username(username)
        if not username_valid:
            return jsonify({"error": username_msg}), 400
        
        if not validate_email(email):
            return jsonify({"error": "Invalid email format"}), 400
        
        password_valid, password_msg = validate_password(password)
        if not password_valid:
            return jsonify({"error": password_msg}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({"error": "Username already exists"}), 409
        
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 409
        
        # Create new user
        user = User(
            username=username,
            email=email,
            first_name=data.get('first_name', '').strip(),
            last_name=data.get('last_name', '').strip()
        )
        user.set_password(password)
        
        
        db.session.add(user)
        db.session.commit()
        
        # Create session
        session['user_id'] = user.id
        session['username'] = user.username
        
        return jsonify({
            "message": "User registered successfully",
            "user": user.to_dict()
        }), 201
        
    except Exception as e:
        User, db = get_user_model()
        db.session.rollback()
        return jsonify({"error": "Registration failed", "details": str(e)}), 500

@auth_routes.route("/api/login", methods=["POST"])
def login():
    """Login user"""
    try:
        User, db = get_user_model()
        data = request.get_json()
        
        # Validate required fields
        if not data.get('username') or not data.get('password'):
            return jsonify({"error": "Username and password are required"}), 400
        
        username_or_email = data['username'].strip()
        password = data['password']
        
        # Find user by username or email
        user = User.query.filter(
            (User.username == username_or_email) | 
            (User.email == username_or_email.lower())
        ).first()
        
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401
        
        if not user.is_active:
            return jsonify({"error": "Account is deactivated"}), 401
        
        if not user.check_password(password):
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Update last login
        user.update_last_login()
        
        # Create session
        session['user_id'] = user.id
        session['username'] = user.username
        
        return jsonify({
            "message": "Login successful",
            "user": user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Login failed", "details": str(e)}), 500

@auth_routes.route("/api/logout", methods=["POST"])
def logout():
    """Logout user"""
    try:
        if 'user_id' in session:
            session.clear()
            return jsonify({"message": "Logout successful"}), 200
        else:
            return jsonify({"error": "No active session"}), 400
    except Exception as e:
        return jsonify({"error": "Logout failed", "details": str(e)}), 500

@auth_routes.route("/api/profile", methods=["GET"])
def get_profile():
    """Get current user profile"""
    try:
        User, db = get_user_model()
        if 'user_id' not in session:
            return jsonify({"error": "Authentication required"}), 401
        
        user = User.query.get(session['user_id'])
        if not user:
            session.clear()
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "user": user.to_dict(include_sensitive=True)
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to get profile", "details": str(e)}), 500

@auth_routes.route("/api/profile", methods=["PUT"])
def update_profile():
    """Update user profile"""
    try:
        User, db = get_user_model()
        if 'user_id' not in session:
            return jsonify({"error": "Authentication required"}), 401
        
        user = User.query.get(session['user_id'])
        if not user:
            session.clear()
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'first_name' in data:
            user.first_name = data['first_name'].strip()
        if 'last_name' in data:
            user.last_name = data['last_name'].strip()
        if 'bio' in data:
            user.bio = data['bio'].strip()
        
        # Handle email update (with validation)
        if 'email' in data:
            new_email = data['email'].strip().lower()
            if new_email != user.email:
                if not validate_email(new_email):
                    return jsonify({"error": "Invalid email format"}), 400
                
                if User.query.filter_by(email=new_email).first():
                    return jsonify({"error": "Email already in use"}), 409
                
                user.email = new_email
                user.email_verified = False  # Reset verification status
        
        db.session.commit()
        
        return jsonify({
            "message": "Profile updated successfully",
            "user": user.to_dict(include_sensitive=True)
        }), 200
        
    except Exception as e:
        User, db = get_user_model()
        db.session.rollback()
        return jsonify({"error": "Profile update failed", "details": str(e)}), 500

@auth_routes.route("/api/change-password", methods=["POST"])
def change_password():
    """Change user password"""
    try:
        User, db = get_user_model()
        if 'user_id' not in session:
            return jsonify({"error": "Authentication required"}), 401
        
        user = User.query.get(session['user_id'])
        if not user:
            session.clear()
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json()
        
        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({"error": "Current password and new password are required"}), 400
        
        # Verify current password
        if not user.check_password(data['current_password']):
            return jsonify({"error": "Current password is incorrect"}), 401
        
        # Validate new password
        password_valid, password_msg = validate_password(data['new_password'])
        if not password_valid:
            return jsonify({"error": password_msg}), 400
        
        # Update password
        user.set_password(data['new_password'])
        db.session.commit()
        
        return jsonify({"message": "Password changed successfully"}), 200
        
    except Exception as e:
        User, db = get_user_model()
        db.session.rollback()
        return jsonify({"error": "Password change failed", "details": str(e)}), 500

@auth_routes.route("/api/check-session", methods=["GET"])
def check_session():
    """Check if user session is valid"""
    try:
        User, db = get_user_model()
        if 'user_id' in session:
            user = User.query.get(session['user_id'])
            if user and user.is_active:
                return jsonify({
                    "authenticated": True,
                    "user": user.to_dict()
                }), 200
            else:
                session.clear()
        
        return jsonify({"authenticated": False}), 200
        
    except Exception as e:
        return jsonify({"error": "Session check failed", "details": str(e)}), 500