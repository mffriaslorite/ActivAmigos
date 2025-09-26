import re

def validate_username(username):
    if len(username) < 3:
        return False, "Username must be at least 3 characters long"
    if len(username) > 20:
        return False, "Username must be no more than 20 characters long"
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return False, "Username can only contain letters, numbers, hyphens, and underscores"
    return True, "Username is valid"

def validate_password(password):
    if len(password) < 2:
        return False, "Password must be at least 2 characters long"
    return True, "Password is valid"
