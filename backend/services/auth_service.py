from flask_smorest import Blueprint
from flask import session
from sqlalchemy.exc import IntegrityError
from models.user.user import User, db
from models.user.user_schema import UserSchema
from schemas.auth_schema import RegisterSchema, LoginSchema, ChangePasswordSchema
from utils.validators import validate_password, validate_username

blp = Blueprint("Auth", "auth", url_prefix="/api/auth", description="Authentication routes")

# ✅ Register
@blp.route("/register", methods=["POST"])
@blp.arguments(RegisterSchema)
@blp.response(201, UserSchema)
def register(args):
    username = args["username"]
    email = args["email"]
    password = args["password"]

    username_valid, username_msg = validate_username(username)
    if not username_valid:
        blp.abort(400, message=username_msg)

    password_valid, password_msg = validate_password(password)
    if not password_valid:
        blp.abort(400, message=password_msg)

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
        blp.abort(409, message="Username or email already exists")

# ✅ Login
@blp.route("/login", methods=["POST"])
@blp.arguments(LoginSchema)
@blp.response(200, UserSchema)
def login(args):
    username_or_email = args["username"]
    password = args["password"]

    user = User.query.filter(
        (User.username == username_or_email) | (User.email == username_or_email)
    ).first()

    if not user or not user.check_password(password):
        blp.abort(401, message="Invalid credentials")

    if not user.is_active:
        blp.abort(403, message="Account is inactive")

    user.update_last_login()
    session["user_id"] = user.id

    return user

# ✅ Logout
@blp.route("/logout", methods=["POST"])
def logout():
    if "user_id" in session:
        session.clear()
        return {"message": "Logout successful"}, 200
    blp.abort(400, message="No active session")

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
    
