"""Complete ActivAmigos setup - safe migration

Revision ID: complete_activamigos_setup
Revises: dbde74c6d122
Create Date: 2025-01-23 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = 'complete_activamigos_setup'
down_revision = 'dbde74c6d122'
branch_labels = None
depends_on = None


def enum_exists(connection, enum_name):
    """Check if an enum type exists in the database"""
    result = connection.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = :enum_name"), 
        {"enum_name": enum_name}
    )
    return result.fetchone() is not None


def column_exists(connection, table_name, column_name):
    """Check if a column exists in a table"""
    inspector = inspect(connection)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def table_exists(connection, table_name):
    """Check if a table exists"""
    inspector = inspect(connection)
    tables = inspector.get_table_names()
    return table_name in tables


def upgrade():
    connection = op.get_bind()
    
    print("🔧 Starting ActivAmigos complete setup...")
    
    # Create enum types only if they don't exist
    enums_to_create = [
        ('userrole', ['USER', 'ORGANIZER', 'SUPERADMIN']),
        ('passwordhinttype', ['ANIMAL_LIST']),
        ('warningcontexttype', ['GROUP', 'ACTIVITY']),
        ('membershipstatus', ['ACTIVE', 'BANNED']),
        ('messagecontexttype', ['GROUP', 'ACTIVITY']),
        ('ruletype', ['GROUP', 'ACTIVITY', 'BOTH'])
    ]
    
    for enum_name, values in enums_to_create:
        if not enum_exists(connection, enum_name):
            print(f"  Creating enum: {enum_name}")
            enum_type = postgresql.ENUM(*values, name=enum_name)
            enum_type.create(connection)
        else:
            print(f"  Enum already exists: {enum_name}")
    
    # Add user columns if they don't exist
    user_columns_to_add = [
        ('role', sa.Enum('USER', 'ORGANIZER', 'SUPERADMIN', name='userrole'), False, 'USER'),
        ('password_hint_type', sa.Enum('ANIMAL_LIST', name='passwordhinttype'), True, None),
        ('password_hint_value', sa.String(255), True, None)
    ]
    
    for col_name, col_type, nullable, default in user_columns_to_add:
        if not column_exists(connection, 'users', col_name):
            print(f"  Adding column: users.{col_name}")
            if default:
                op.add_column('users', sa.Column(col_name, col_type, nullable=nullable, server_default=default))
            else:
                op.add_column('users', sa.Column(col_name, col_type, nullable=nullable))
        else:
            print(f"  Column already exists: users.{col_name}")
    
    # Create points_ledger table if it doesn't exist
    if not table_exists(connection, 'points_ledger'):
        print("  Creating table: points_ledger")
        op.create_table('points_ledger',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('points', sa.Integer(), nullable=False),
            sa.Column('reason', sa.String(255), nullable=False),
            sa.Column('context_type', sa.String(50), nullable=True),
            sa.Column('context_id', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
    else:
        print("  Table already exists: points_ledger")
    
    # Update messages table safely
    if column_exists(connection, 'messages', 'timestamp') and not column_exists(connection, 'messages', 'created_at'):
        print("  Renaming messages.timestamp to created_at")
        op.alter_column('messages', 'timestamp', new_column_name='created_at')
    
    if not column_exists(connection, 'messages', 'context_type'):
        print("  Adding messages.context_type")
        op.add_column('messages', sa.Column('context_type', sa.Enum('GROUP', 'ACTIVITY', name='messagecontexttype'), nullable=True))
    
    if not column_exists(connection, 'messages', 'context_id'):
        print("  Adding messages.context_id")
        op.add_column('messages', sa.Column('context_id', sa.Integer(), nullable=True))
    
    # Migrate existing message data if old columns exist
    if column_exists(connection, 'messages', 'group_id'):
        print("  Migrating group messages data")
        op.execute("""
            UPDATE messages SET 
                context_type = 'GROUP',
                context_id = group_id
            WHERE group_id IS NOT NULL AND context_type IS NULL
        """)
        op.drop_column('messages', 'group_id')
    
    if column_exists(connection, 'messages', 'activity_id'):
        print("  Migrating activity messages data")
        op.execute("""
            UPDATE messages SET 
                context_type = 'ACTIVITY',
                context_id = activity_id
            WHERE activity_id IS NOT NULL AND context_type IS NULL
        """)
        op.drop_column('messages', 'activity_id')
    
    # Make context fields non-nullable if they have data
    if column_exists(connection, 'messages', 'context_type'):
        op.alter_column('messages', 'context_type', nullable=False)
    if column_exists(connection, 'messages', 'context_id'):
        op.alter_column('messages', 'context_id', nullable=False)
    
    # Create warnings table if it doesn't exist
    if not table_exists(connection, 'warnings'):
        print("  Creating table: warnings")
        op.create_table('warnings',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('context_type', sa.Enum('GROUP', 'ACTIVITY', name='warningcontexttype'), nullable=False),
            sa.Column('context_id', sa.Integer(), nullable=False),
            sa.Column('target_user_id', sa.Integer(), nullable=False),
            sa.Column('issued_by', sa.Integer(), nullable=False),
            sa.Column('reason', sa.String(255), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['issued_by'], ['users.id'], ),
            sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
    else:
        print("  Table already exists: warnings")
    
    # Update association tables
    association_columns = [
        ('group_members', 'warning_count', sa.Integer(), False, '0'),
        ('group_members', 'status', sa.Enum('ACTIVE', 'BANNED', name='membershipstatus'), False, 'ACTIVE'),
        ('activity_participants', 'warning_count', sa.Integer(), False, '0'),
        ('activity_participants', 'status', sa.Enum('ACTIVE', 'BANNED', name='membershipstatus'), False, 'ACTIVE')
    ]
    
    for table_name, col_name, col_type, nullable, default in association_columns:
        if not column_exists(connection, table_name, col_name):
            print(f"  Adding column: {table_name}.{col_name}")
            op.add_column(table_name, sa.Column(col_name, col_type, nullable=nullable, server_default=default))
        else:
            print(f"  Column already exists: {table_name}.{col_name}")
    
    # Create Sprint 3 tables
    if not table_exists(connection, 'activity_attendance'):
        print("  Creating table: activity_attendance")
        op.create_table('activity_attendance',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('activity_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('confirmed_at', sa.DateTime(), nullable=True),
            sa.Column('present', sa.Boolean(), nullable=True),
            sa.Column('marked_by', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ),
            sa.ForeignKeyConstraint(['marked_by'], ['users.id'], ),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('activity_id', 'user_id', name='_activity_user_attendance_uc')
        )
    else:
        print("  Table already exists: activity_attendance")
    
    if not table_exists(connection, 'rules_templates'):
        print("  Creating table: rules_templates")
        op.create_table('rules_templates',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('title', sa.String(100), nullable=False),
            sa.Column('description', sa.String(255), nullable=False),
            sa.Column('icon', sa.String(50), nullable=True),
            sa.Column('rule_type', sa.Enum('GROUP', 'ACTIVITY', 'BOTH', name='ruletype'), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        
        # Insert default rule templates
        print("  Inserting default rule templates")
        op.execute("""
            INSERT INTO rules_templates (title, description, icon, rule_type, is_active, created_at) VALUES
            ('Sé respetuoso', 'Trata a todos los miembros con respeto y cortesía', '🤝', 'BOTH', true, NOW()),
            ('No compartir información privada', 'No compartas información personal de otros miembros', '🔒', 'BOTH', true, NOW()),
            ('No insultos ni ofensas', 'Mantén un lenguaje apropiado y evita insultos', '🚫', 'BOTH', true, NOW()),
            ('Participa activamente', 'Contribuye de manera positiva a las conversaciones', '💬', 'GROUP', true, NOW()),
            ('Llega puntual', 'Respeta los horarios establecidos para la actividad', '⏰', 'ACTIVITY', true, NOW()),
            ('Confirma tu asistencia', 'Confirma si vas a asistir para ayudar con la planificación', '✅', 'ACTIVITY', true, NOW()),
            ('No spam', 'Evita enviar mensajes repetitivos o irrelevantes', '📵', 'BOTH', true, NOW()),
            ('Ayuda a otros', 'Ofrece ayuda y apoyo a otros miembros cuando sea necesario', '🤗', 'BOTH', true, NOW()),
            ('Mantén el tema', 'Mantén las conversaciones relacionadas con el grupo o actividad', '🎯', 'BOTH', true, NOW()),
            ('Diviértete', 'Disfruta de la experiencia y mantén un ambiente positivo', '🎉', 'BOTH', true, NOW())
        """)
    else:
        print("  Table already exists: rules_templates")
    
    if not table_exists(connection, 'group_rules'):
        print("  Creating table: group_rules")
        op.create_table('group_rules',
            sa.Column('group_id', sa.Integer(), nullable=False),
            sa.Column('rule_template_id', sa.Integer(), nullable=False),
            sa.Column('added_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
            sa.ForeignKeyConstraint(['rule_template_id'], ['rules_templates.id'], ),
            sa.PrimaryKeyConstraint('group_id', 'rule_template_id')
        )
    else:
        print("  Table already exists: group_rules")
    
    if not table_exists(connection, 'activity_rules'):
        print("  Creating table: activity_rules")
        op.create_table('activity_rules',
            sa.Column('activity_id', sa.Integer(), nullable=False),
            sa.Column('rule_template_id', sa.Integer(), nullable=False),
            sa.Column('added_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ),
            sa.ForeignKeyConstraint(['rule_template_id'], ['rules_templates.id'], ),
            sa.PrimaryKeyConstraint('activity_id', 'rule_template_id')
        )
    else:
        print("  Table already exists: activity_rules")
    
    print("✅ ActivAmigos setup completed successfully!")


def downgrade():
    """
    This is a comprehensive setup migration.
    For safety, we don't implement automatic downgrade.
    If you need to revert, please do it manually.
    """
    print("❌ Manual downgrade required for this migration")
    pass