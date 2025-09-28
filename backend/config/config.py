import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecret")
    
    # Configuración de sesión para desarrollo local
    SESSION_TYPE = "filesystem"
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    SESSION_KEY_PREFIX = "activamigos:"
    SESSION_COOKIE_NAME = "session"
    SESSION_COOKIE_DOMAIN = None
    SESSION_COOKIE_PATH = "/"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = False  # False para HTTP en desarrollo
    SESSION_COOKIE_SAMESITE = "Lax"  # Lax para desarrollo local
    
    # Mejorar configuración de sesiones para WebSocket
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hora
    SESSION_REFRESH_EACH_REQUEST = True

    # MinIO Configuration
    MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
    MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"
    MINIO_BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "activamigos")

    # Upload settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size