from functools import wraps
from flask_smorest import abort
from flask import session
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
