from .auth_routes import auth_routes

def register_routes(app):
    """Register all route blueprints with the Flask app"""
    app.register_blueprint(auth_routes)
    
    # Future route registrations will go here
    # app.register_blueprint(group_routes)
    # app.register_blueprint(activity_routes)