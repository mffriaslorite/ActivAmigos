import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "postgresql://activamigos:activamigos123@localhost:5432/activamigos_db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    BCRYPT_LOG_ROUNDS = int(os.getenv("BCRYPT_LOG_ROUNDS", 12))
    
    # Session
    SESSION_COOKIE_SECURE = os.getenv("FLASK_ENV") == "production"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
