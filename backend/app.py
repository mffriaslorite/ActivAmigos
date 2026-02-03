import eventlet
eventlet.monkey_patch()

from flask import Flask
from flask_smorest import Api
from flask_cors import CORS
from flask_migrate import Migrate
from flask_session import Session
from flask_socketio import SocketIO
from werkzeug.middleware.proxy_fix import ProxyFix
from config.config import Config
from models.user.user import db
from services.auth_service import blp as auth_blp
from services.user_service import blp as user_blp
from services.group_service import blp as group_blp
from services.activity_service import blp as activity_blp
from services.achievement_service import blp as achievement_blp
from services.chat_service import blp as chat_blp, init_socketio
from services.points_service import blp as points_blp
from services.moderation_service import blp as moderation_blp
from services.attendance_service import blp as attendance_blp
from services.rules_service import blp as rules_blp

def create_app():
    app = Flask(__name__)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)
    app.config.from_object(Config)

    # Configure file upload limits
    app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH

    # CORS Configuration
    CORS(app, 
        supports_credentials=True, 
        origins=Config.CORS_ORIGINS,
        allow_headers=['Content-Type', 'Authorization'],
        methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    )

    # Initialize SocketIO
    socketio = SocketIO(
        app, 
        cors_allowed_origins=Config.CORS_ORIGINS,
        manage_session=False,
        logger=True,
        engineio_logger=True,
        async_mode='eventlet'
    )

    # Inicializar Session (la configuración ya está en Config)
    Session(app)

    # DB y migraciones
    db.init_app(app)
    migrate = Migrate(app, db)

    with app.app_context():
        from models import user
        from models import group
        from models import activity
        from models import achievement
        from models import associations
        from models import points
        from models import warnings
        from models import attendance
        from models import rules

    # API con Swagger
    app.config["API_TITLE"] = "ActivAmigos API"
    app.config["API_VERSION"] = "v1"
    app.config["OPENAPI_VERSION"] = "3.0.3"
    app.config["OPENAPI_URL_PREFIX"] = "/"
    app.config["OPENAPI_SWAGGER_UI_PATH"] = "/swagger-ui"
    app.config["OPENAPI_SWAGGER_UI_URL"] = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"

    api = Api(app)
    api.register_blueprint(auth_blp)
    api.register_blueprint(user_blp)
    api.register_blueprint(group_blp)
    api.register_blueprint(activity_blp)
    api.register_blueprint(achievement_blp)
    api.register_blueprint(chat_blp)
    api.register_blueprint(points_blp)
    api.register_blueprint(moderation_blp)
    api.register_blueprint(attendance_blp)
    api.register_blueprint(rules_blp)

    # Initialize SocketIO with chat handlers
    init_socketio(app, socketio)

    return app, socketio

app, socketio = create_app()

if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)