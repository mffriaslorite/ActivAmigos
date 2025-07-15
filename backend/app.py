from flask import Flask
from flask_cors import CORS
from config.config import Config
from routes import register_routes
from dotenv import load_dotenv
import os

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configure CORS to allow credentials (for session cookies)
    CORS(app, supports_credentials=True, origins=['http://localhost:4200'])
    
    # Initialize database
    from models.user import db
    db.init_app(app)

    with app.app_context():
        # Import models to ensure they are registered
        from models import user
        db.create_all()

    register_routes(app)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
