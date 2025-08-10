from flask import Flask
from flask_smorest import Api
from flask_cors import CORS
from flask_migrate import Migrate
from flask_session import Session
from config.config import Config
from models.user.user import db
from services.auth_service import blp as auth_blp
from services.user_service import blp as user_blp
from services.group_service import blp as group_blp
from services.activity_service import blp as activity_blp
from services.achievements_service import blp as achievements_blp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configure file upload limits
    app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH

    # Configuración CORS
    CORS(app, 
         supports_credentials=True, 
         origins=['http://localhost:4200'],
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
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
    api.register_blueprint(achievements_blp)

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
