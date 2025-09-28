"""Fix enums safely - check before creating

Revision ID: fix_enums_safe
Revises: dbde74c6d122
Create Date: 2025-01-23 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'fix_enums_safe'
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


def upgrade():
    connection = op.get_bind()
    
    # Create enum types only if they don't exist
    if not enum_exists(connection, 'userrole'):
        user_role_enum = postgresql.ENUM('USER', 'ORGANIZER', 'SUPERADMIN', name='userrole')
        user_role_enum.create(connection)
    
    if not enum_exists(connection, 'passwordhinttype'):
        password_hint_type_enum = postgresql.ENUM('ANIMAL_LIST', name='passwordhinttype')
        password_hint_type_enum.create(connection)
    
    if not enum_exists(connection, 'warningcontexttype'):
        warning_context_type_enum = postgresql.ENUM('GROUP', 'ACTIVITY', name='warningcontexttype')
        warning_context_type_enum.create(connection)
    
    if not enum_exists(connection, 'membershipstatus'):
        membership_status_enum = postgresql.ENUM('ACTIVE', 'BANNED', name='membershipstatus')
        membership_status_enum.create(connection)
    
    if not enum_exists(connection, 'messagecontexttype'):
        message_context_type_enum = postgresql.ENUM('GROUP', 'ACTIVITY', name='messagecontexttype')
        message_context_type_enum.create(connection)
    
    if not enum_exists(connection, 'ruletype'):
        rule_type_enum = postgresql.ENUM('GROUP', 'ACTIVITY', 'BOTH', name='ruletype')
        rule_type_enum.create(connection)
    
    # Check if columns exist before adding them
    inspector = sa.inspect(connection)
    
    # Add user columns if they don't exist
    user_columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'role' not in user_columns:
        op.add_column('users', sa.Column('role', sa.Enum('USER', 'ORGANIZER', 'SUPERADMIN', name='userrole'), nullable=False, server_default='USER'))
    
    if 'password_hint_type' not in user_columns:
        op.add_column('users', sa.Column('password_hint_type', sa.Enum('ANIMAL_LIST', name='passwordhinttype'), nullable=True))
    
    if 'password_hint_value' not in user_columns:
        op.add_column('users', sa.Column('password_hint_value', sa.String(255), nullable=True))
    
    # Create points_ledger table if it doesn't exist
    existing_tables = inspector.get_table_names()
    
    if 'points_ledger' not in existing_tables:
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
    
    # Update messages table if needed
    message_columns = [col['name'] for col in inspector.get_columns('messages')]
    
    if 'context_type' not in message_columns:
        op.add_column('messages', sa.Column('context_type', sa.Enum('GROUP', 'ACTIVITY', name='messagecontexttype'), nullable=True))
    
    if 'context_id' not in message_columns:
        op.add_column('messages', sa.Column('context_id', sa.Integer(), nullable=True))
    
    # Migrate existing data only if old columns exist
    if 'group_id' in message_columns:
        op.execute("""
            UPDATE messages SET 
                context_type = 'GROUP',
                context_id = group_id
            WHERE group_id IS NOT NULL
        """)
    
    if 'activity_id' in message_columns:
        op.execute("""
            UPDATE messages SET 
                context_type = 'ACTIVITY',
                context_id = activity_id
            WHERE activity_id IS NOT NULL
        """)
    
    # Make context fields non-nullable
    if 'context_type' in message_columns:
        op.alter_column('messages', 'context_type', nullable=False)
    if 'context_id' in message_columns:
        op.alter_column('messages', 'context_id', nullable=False)
    
    # Rename timestamp to created_at if needed
    if 'timestamp' in message_columns and 'created_at' not in message_columns:
        op.alter_column('messages', 'timestamp', new_column_name='created_at')
    
    # Drop old columns if they exist
    if 'group_id' in message_columns:
        op.drop_column('messages', 'group_id')
    if 'activity_id' in message_columns:
        op.drop_column('messages', 'activity_id')
    
    # Create warnings table if it doesn't exist
    if 'warnings' not in existing_tables:
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
    
    # Update association tables if columns don't exist
    group_members_columns = [col['name'] for col in inspector.get_columns('group_members')]
    
    if 'warning_count' not in group_members_columns:
        op.add_column('group_members', sa.Column('warning_count', sa.Integer(), nullable=False, server_default='0'))
    
    if 'status' not in group_members_columns:
        op.add_column('group_members', sa.Column('status', sa.Enum('ACTIVE', 'BANNED', name='membershipstatus'), nullable=False, server_default='ACTIVE'))
    
    activity_participants_columns = [col['name'] for col in inspector.get_columns('activity_participants')]
    
    if 'warning_count' not in activity_participants_columns:
        op.add_column('activity_participants', sa.Column('warning_count', sa.Integer(), nullable=False, server_default='0'))
    
    if 'status' not in activity_participants_columns:
        op.add_column('activity_participants', sa.Column('status', sa.Enum('ACTIVE', 'BANNED', name='membershipstatus'), nullable=False, server_default='ACTIVE'))
    
    # Create attendance and rules tables if they don't exist
    if 'activity_attendance' not in existing_tables:
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
    
    if 'rules_templates' not in existing_tables:
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
    
    if 'group_rules' not in existing_tables:
        op.create_table('group_rules',
            sa.Column('group_id', sa.Integer(), nullable=False),
            sa.Column('rule_template_id', sa.Integer(), nullable=False),
            sa.Column('added_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
            sa.ForeignKeyConstraint(['rule_template_id'], ['rules_templates.id'], ),
            sa.PrimaryKeyConstraint('group_id', 'rule_template_id')
        )
    
    if 'activity_rules' not in existing_tables:
        op.create_table('activity_rules',
            sa.Column('activity_id', sa.Integer(), nullable=False),
            sa.Column('rule_template_id', sa.Integer(), nullable=False),
            sa.Column('added_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ),
            sa.ForeignKeyConstraint(['rule_template_id'], ['rules_templates.id'], ),
            sa.PrimaryKeyConstraint('activity_id', 'rule_template_id')
        )


def downgrade():
    # This is a comprehensive migration, downgrade would be complex
    # For safety, we'll just pass - you'd need to manually revert if needed
    pass