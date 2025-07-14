from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from config.config import Config
from routes import register_routes
from dotenv import load_dotenv
import os

load_dotenv()

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    db.init_app(app)

    with app.app_context():
        from models import user  # importa modelos aquí
        db.create_all()

    register_routes(app)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
