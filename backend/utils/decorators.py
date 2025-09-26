from functools import wraps
from flask_smorest import abort
from flask import session, jsonify
from models.user.user import User

def require_user(func):
    """
    Decorator to ensure the user is authenticated and exists in the session.
    If the user is not authenticated, it aborts with a 401 status code.
    If the user does not exist, it aborts with a 404 status code.
    The current user is passed as a keyword argument to the decorated function.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            abort(401, message="Authentication required")

        user = User.query.get(user_id)
        if not user:
            abort(404, message="User not found")

        # Set the current user in kwargs for the decorated function
        kwargs.setdefault("current_user", user)
        return func(*args, **kwargs)
    return wrapper

def login_required(f):
    """Decorator to require user login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401

        user = User.query.get(session['user_id'])
        if not user or not user.is_active:
            session.clear()
            return jsonify({'error': 'Invalid or inactive user'}), 401

        return f(*args, **kwargs)
    return decorated_function

def role_required(roles):
    """Decorator to require specific user roles"""
    if isinstance(roles, str):
        roles = [roles]

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({'error': 'Authentication required'}), 401

            user = User.query.get(session['user_id'])
            if not user or not user.is_active:
                session.clear()
                return jsonify({'error': 'Invalid or inactive user'}), 401

            if not any(user.has_role(role) for role in roles):
                return jsonify({'error': 'Insufficient permissions'}), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator