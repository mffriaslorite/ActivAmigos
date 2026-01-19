from flask_smorest import Blueprint, abort
from flask import session, request, make_response
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta, timezone
from models.user.user import User, PasswordHintType, db
from models.user.user_schema import UserSchema
from schemas.auth_schema import RegisterSchema, LoginSchema, PasswordHintSchema
from utils.validators import validate_password, validate_username
from utils.constants import ANIMAL_LIST, REFRESH_TOKEN_EXPIRE_DAYS
import jwt
import os

blp = Blueprint("Auth", "auth", url_prefix="/api/auth", description="Authentication routes")

# ✅ Register
@blp.route("/register", methods=["POST"])
@blp.arguments(RegisterSchema)
@blp.response(201, UserSchema)
def register(args):
    username = args["username"]
    password = args["password"]

    username_valid, username_msg = validate_username(username)
    username_valid, username_msg = validate_username(username)
    if not username_valid:
        abort(400, message=username_msg)

    password_valid, password_msg = validate_password(password)
    if not password_valid:
        abort(400, message=password_msg)
    try:
        # Extraer y eliminar la contraseña
        password = args.pop('password')

        # Crear usuario sin password
        user = User(**args)
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        session['user_id'] = user.id
        session['username'] = user.username

        return user
    except IntegrityError:
        db.session.rollback()
        abort(409, message="Username or email already exists")
# ✅ Login with remember me support
@blp.route("/login", methods=["POST"])
@blp.arguments(LoginSchema)
@blp.response(200, UserSchema)
def login(args):
    username_or_email = args["username"]
    password = args["password"]
    remember_me = args.get("remember_me", False)

    user = User.query.filter(
        (User.username == username_or_email) | (User.email == username_or_email)
    ).first()

    if not user or not user.check_password(password):
        abort(401, message="Invalid credentials")

    if not user.is_active:
        abort(403, message="Account is inactive")
    user.update_last_login()
    session["user_id"] = user.id

    response = make_response(UserSchema().dump(user))
    
    if remember_me:
        # Create refresh token for remember me
        refresh_token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            'type': 'refresh'
        }, os.getenv('SECRET_KEY', 'supersecret'), algorithm='HS256')
        
        # Set secure refresh cookie
        response.set_cookie(
            'refresh_token',
            refresh_token,
            max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite='Lax'
        )

    return response

# ✅ Logout
@blp.route("/logout", methods=["POST"])
def logout():
    if "user_id" in session:
        session.clear()
        return {"message": "Logout successful"}, 200
    abort(400, message="No active session")
# ✅ Check session
@blp.route("/check-session", methods=["GET"])
@blp.response(200)
def check_session():
    """Check if the user is authenticated by verifying the session."""
    if "user_id" in session:
        user = User.query.get(session["user_id"])
        if user:
            return {"authenticated": True, "user": UserSchema().dump(user)}
    
    return {"authenticated": False}

# ✅ Get password hint for user
@blp.route("/hint", methods=["GET"])
@blp.arguments(PasswordHintSchema, location="query")
def get_password_hint(args):
    """Get password hint for a user by email"""
    email = args["email"]
    
    user = User.query.filter_by(email=email).first()
    if not user:
        # Don't reveal if user exists or not
        return {"hint_available": False}
    
    return {
        "hint_available": True,
        "hint_type": user.password_hint_type.value if user.password_hint_type else None,
        "animals": ANIMAL_LIST if user.password_hint_type == PasswordHintType.ANIMAL_LIST else None
    }

# ✅ Get available animals list
@blp.route("/animals", methods=["GET"])
def get_animals_list():
    """Get the list of available animals for password hints"""
    return {"animals": ANIMAL_LIST}

# ✅ Auto-refresh token middleware
@blp.route("/refresh", methods=["POST"])
def refresh_token():
    """Refresh access token using refresh token"""
    refresh_token = request.cookies.get('refresh_token')
    
    if not refresh_token:
        abort(401, message="No refresh token provided")
    try:
        payload = jwt.decode(refresh_token, os.getenv('SECRET_KEY', 'supersecret'), algorithms=['HS256'])
        user_id = payload['user_id']
        
        if payload.get('type') != 'refresh':
            abort(401, message="Invalid token type")
        
        user = User.query.get(user_id)
        if not user or not user.is_active:
            abort(401, message="Invalid user")
        # Update session
        session['user_id'] = user.id
        
        return {"message": "Token refreshed", "user": UserSchema().dump(user)}
        
    except jwt.ExpiredSignatureError:
        abort(401, message="Refresh token expired")
    except jwt.InvalidTokenError:
        abort(401, message="Invalid refresh token")

@blp.route("/me", methods=["GET"])
@blp.response(200, UserSchema)
def get_current_user_info():
    """
    Obtener información del usuario actual logueado.
    Se usa para persistencia de sesión al recargar el frontend.
    """
    # 1. Verificar si hay ID en la sesión
    if "user_id" not in session:
        abort(401, message="Authentication required")
    
    # 2. Buscar el usuario
    user = User.query.get(session["user_id"])
    
    # 3. Verificar que exista y esté activo
    if not user or not user.is_active:
        # Si la sesión es inválida (usuario borrado/ban), la limpiamos
        session.clear()
        abort(401, message="User not found or inactive")
        
    return user
