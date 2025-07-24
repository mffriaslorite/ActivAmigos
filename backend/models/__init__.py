# Importa modelos aquí para registrarlos
from .user.user import User
from .group.group import Group
# Import associations to ensure they're registered with SQLAlchemy
from .associations import group_members
