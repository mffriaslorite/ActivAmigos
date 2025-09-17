from flask_smorest import Blueprint
from flask import session, request, jsonify, make_response
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
import jwt
import re
from models.user.user import User, db, UserRole, PasswordHintType
from models.user.user_schema import UserSchema
from schemas.auth_schema import RegisterSchema, LoginSchema, ChangePasswordSchema
from utils.validators import validate_password, validate_username
from utils.auth_helpers import get_animal_list, is_valid_animal
from utils.decorators import login_required
from config.config import Config

blp = Blueprint("Auth", "auth", url_prefix="/api/auth", description="Enhanced Authentication routes")

# Animal list endpoint
@blp.route("/animals", methods=["GET"])
def get_animals():
    """Get the list of animals for password hints"""
    return {"animals": get_animal_list()}, 200

# Password hint endpoint with rate limiting (simplified for demo)
@blp.route("/hint", methods=["GET"])
def get_password_hint():
    """Get password hint for a user by email"""
    email = request.args.get('email')
    if not email:
        return {"error": "Email parameter is required"}, 400
    
    # Basic email validation
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return {"error": "Invalid email format"}, 400
    
    user = User.query.filter_by(email=email.lower()).first()
    if not user:
        # Don't reveal if user exists or not for security
        return {"hint": "What's your favorite animal?", "animals": get_animal_list()}, 200
    
    if user.password_hint_type == PasswordHintType.ANIMAL_LIST:
        return {
            "hint": "What's your favorite animal?",
            "animals": get_animal_list()
        }, 200
    
    return {"hint": "What's your favorite animal?", "animals": get_animal_list()}, 200

# Enhanced register with animal hint
@blp.route("/register", methods=["POST"])
def register():
    """Register a new user with optional animal hint"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return {"error": "Missing required fields", "missing_fields": missing_fields}, 400
        
        username = data['username'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        
        # Validate input formats
        username_valid, username_msg = validate_username(username)
        if not username_valid:
            return {"error": username_msg}, 400
        
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            return {"error": "Invalid email format"}, 400
        
        password_valid, password_msg = validate_password(password)
        if not password_valid:
            return {"error": password_msg}, 400
        
        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return {"error": "Username already exists"}, 409
        
        if User.query.filter_by(email=email).first():
            return {"error": "Email already registered"}, 409
        
        # Create new user
        user = User(
            username=username,
            email=email,
            first_name=data.get('first_name', '').strip(),
            last_name=data.get('last_name', '').strip(),
            role=UserRole.USER,
            password_hint_type=PasswordHintType.ANIMAL_LIST  # Set hint type
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        # Create session
        session['user_id'] = user.id
        session['username'] = user.username
        
        return {
            "message": "User registered successfully",
            "user": user.to_dict(),
            "hint_info": {
                "hint": "Remember: Your password can be your favorite animal",
                "animals": get_animal_list()
            }
        }, 201
        
    except Exception as e:
        db.session.rollback()
        return {"error": "Registration failed", "details": str(e)}, 500

# Enhanced login with remember me
@blp.route("/login", methods=["POST"])
def login():
    """Login user with remember me option"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('username') or not data.get('password'):
            return {"error": "Username and password are required"}, 400
        
        username_or_email = data['username'].strip()
        password = data['password']
        remember_me = data.get('remember_me', False)
        
        # Find user by username or email
        user = User.query.filter(
            (User.username == username_or_email) | 
            (User.email == username_or_email.lower())
        ).first()
        
        if not user:
            return {"error": "Invalid credentials"}, 401
        
        if not user.is_active:
            return {"error": "Account is deactivated"}, 401
        
        if not user.check_password(password):
            return {"error": "Invalid credentials"}, 401
        
        # Update last login
        user.update_last_login()
        
        # Create session
        session['user_id'] = user.id
        session['username'] = user.username
        
        response_data = {
            "message": "Login successful",
            "user": user.to_dict()
        }
        
        response = make_response(jsonify(response_data))
        
        # Handle remember me functionality
        if remember_me:
            # Create refresh token (simplified - in production use proper JWT)
            refresh_payload = {
                'user_id': user.id,
                'exp': datetime.utcnow() + timedelta(days=30),
                'type': 'refresh'
            }
            refresh_token = jwt.encode(refresh_payload, Config.SECRET_KEY, algorithm='HS256')
            
            # Set secure refresh cookie
            response.set_cookie(
                'refresh_token',
                refresh_token,
                max_age=30 * 24 * 60 * 60,  # 30 days
                httponly=True,
                secure=False,  # Set to True in production with HTTPS
                samesite='Lax'
            )
        
        return response
        
    except Exception as e:
        return {"error": "Login failed", "details": str(e)}, 500

# Enhanced change password with animal hint
@blp.route("/change-password", methods=["POST"])
@login_required
def change_password():
    """Change user password with animal hint support"""
    try:
        user = User.query.get(session['user_id'])
        if not user:
            session.clear()
            return {"error": "User not found"}, 404
        
        data = request.get_json()
        
        if not data.get('current_password') or not data.get('new_password'):
            return {"error": "Current password and new password are required"}, 400
        
        # Verify current password
        if not user.check_password(data['current_password']):
            return {"error": "Current password is incorrect"}, 401
        
        # Validate new password
        password_valid, password_msg = validate_password(data['new_password'])
        if not password_valid:
            return {"error": password_msg}, 400
        
        # Update password
        user.set_password(data['new_password'])
        db.session.commit()
        
        return {
            "message": "Password changed successfully",
            "hint_info": {
                "hint": "Remember: Your password can be your favorite animal",
                "animals": get_animal_list()
            }
        }, 200
        
    except Exception as e:
        db.session.rollback()
        return {"error": "Password change failed", "details": str(e)}, 500

# Token refresh endpoint for remember me
@blp.route("/refresh", methods=["POST"])
def refresh_token():
    """Refresh access token using refresh token"""
    try:
        refresh_token = request.cookies.get('refresh_token')
        if not refresh_token:
            return {"error": "Refresh token not found"}, 401
        
        try:
            payload = jwt.decode(refresh_token, Config.SECRET_KEY, algorithms=['HS256'])
            if payload.get('type') != 'refresh':
                return {"error": "Invalid token type"}, 401
                
            user = User.query.get(payload['user_id'])
            if not user or not user.is_active:
                return {"error": "Invalid user"}, 401
            
            # Create new session
            session['user_id'] = user.id
            session['username'] = user.username
            
            return {
                "message": "Token refreshed successfully",
                "user": user.to_dict()
            }, 200
            
        except jwt.ExpiredSignatureError:
            return {"error": "Refresh token expired"}, 401
        except jwt.InvalidTokenError:
            return {"error": "Invalid refresh token"}, 401
            
    except Exception as e:
        return {"error": "Token refresh failed", "details": str(e)}, 500

# Logout with cookie cleanup
@blp.route("/logout", methods=["POST"])
def logout():
    """Logout user and clear all tokens"""
    try:
        response_data = {"message": "Logout successful"}
        response = make_response(jsonify(response_data))
        
        if 'user_id' in session:
            session.clear()
        
        # Clear refresh token cookie
        response.set_cookie('refresh_token', '', expires=0)
        
        return response
        
    except Exception as e:
        return {"error": "Logout failed", "details": str(e)}, 500

# Enhanced session check
@blp.route("/check-session", methods=["GET"])
def check_session():
    """Check if user session is valid with auto-refresh support"""
    try:
        if 'user_id' in session:
            user = User.query.get(session['user_id'])
            if user and user.is_active:
                return {
                    "authenticated": True,
                    "user": user.to_dict()
                }, 200
            else:
                session.clear()
        
        # Try to refresh from cookie if no active session
        refresh_token = request.cookies.get('refresh_token')
        if refresh_token:
            try:
                payload = jwt.decode(refresh_token, Config.SECRET_KEY, algorithms=['HS256'])
                if payload.get('type') == 'refresh':
                    user = User.query.get(payload['user_id'])
                    if user and user.is_active:
                        # Auto-refresh session
                        session['user_id'] = user.id
                        session['username'] = user.username
                        return {
                            "authenticated": True,
                            "user": user.to_dict(),
                            "auto_refreshed": True
                        }, 200
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                pass
        
        return {"authenticated": False}, 200
        
    except Exception as e:
        return {"error": "Session check failed", "details": str(e)}, 500