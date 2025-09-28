"""
Script para arreglar la migración b729d7875295 que está fallando por enums duplicados
"""

# SOLUCIÓN 1: Modificar la migración problemática para que sea segura

migration_fix = """
def upgrade():
    from sqlalchemy import inspect
    connection = op.get_bind()
    inspector = inspect(connection)
    
    # Function to check if enum exists
    def enum_exists(enum_name):
        result = connection.execute(
            sa.text("SELECT 1 FROM pg_type WHERE typname = :enum_name"), 
            {"enum_name": enum_name}
        )
        return result.fetchone() is not None
    
    # Create enum types only if they don't exist
    if not enum_exists('warningcontexttype'):
        warning_context_type_enum = postgresql.ENUM('GROUP', 'ACTIVITY', name='warningcontexttype')
        warning_context_type_enum.create(op.get_bind())

    if not enum_exists('membershipstatus'):
        membership_status_enum = postgresql.ENUM('ACTIVE', 'BANNED', name='membershipstatus')
        membership_status_enum.create(op.get_bind())

    if not enum_exists('messagecontexttype'):
        message_context_type_enum = postgresql.ENUM('GROUP', 'ACTIVITY', name='messagecontexttype')
        message_context_type_enum.create(op.get_bind())

    # Rest of your migration code...
    # (continue with the table modifications)
"""

# SOLUCIÓN 2: SQL directo para limpiar los enums problemáticos

cleanup_sql = """
-- Ejecutar este SQL en PostgreSQL para limpiar enums duplicados:

-- 1. Ver qué enums existen actualmente
SELECT typname FROM pg_type WHERE typtype = 'e';

-- 2. Si necesitas eliminar enums duplicados (CUIDADO - puede romper datos existentes):
-- DROP TYPE IF EXISTS warningcontexttype CASCADE;
-- DROP TYPE IF EXISTS membershipstatus CASCADE;
-- DROP TYPE IF EXISTS messagecontexttype CASCADE;

-- 3. Después ejecutar la migración de nuevo
"""

# SOLUCIÓN 3: Comando para saltarse la migración problemática

skip_migration_commands = """
# En el terminal, desde el directorio backend:

# 1. Marcar la migración como aplicada sin ejecutarla
cd /workspace/backend
source venv/bin/activate
python -c "
from flask_migrate import stamp
from app import create_app, db
app, _ = create_app()
with app.app_context():
    stamp('b729d7875295')
"

# 2. O forzar la migración con --sql para ver qué SQL se generaría
flask db upgrade --sql

# 3. O resetear al estado anterior y aplicar solo las migraciones necesarias
flask db downgrade dbde74c6d122
flask db upgrade
"""

print("🔧 OPCIONES PARA ARREGLAR LA MIGRACIÓN:")
print("\n1. MODIFICAR LA MIGRACIÓN (más seguro):")
print(migration_fix)
print("\n2. LIMPIAR ENUMS MANUALMENTE:")
print(cleanup_sql)
print("\n3. COMANDOS DE TERMINAL:")
print(skip_migration_commands)

print("""
💡 RECOMENDACIÓN:
1. Usar la migración 'complete_activamigos_setup.py' que creé - es segura
2. O modificar tu migración b729d7875295 para verificar si los enums existen antes de crearlos
3. O ejecutar el reset_migrations.sql si estás en desarrollo y no tienes datos importantes
""")