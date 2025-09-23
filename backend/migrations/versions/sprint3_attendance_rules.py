"""Sprint 3: Add attendance tracking and rules system

Revision ID: sprint3_attendance_rules
Revises: sprint2_chat_warnings
Create Date: 2025-01-23 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'sprint3_attendance_rules'
down_revision = 'sprint2_chat_warnings'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types
    rule_type_enum = postgresql.ENUM('GROUP', 'ACTIVITY', 'BOTH', name='ruletype')
    rule_type_enum.create(op.get_bind())
    
    # Create activity_attendance table
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
    
    # Create rules_templates table
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
    
    # Create group_rules association table
    op.create_table('group_rules',
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('rule_template_id', sa.Integer(), nullable=False),
        sa.Column('added_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
        sa.ForeignKeyConstraint(['rule_template_id'], ['rules_templates.id'], ),
        sa.PrimaryKeyConstraint('group_id', 'rule_template_id')
    )
    
    # Create activity_rules association table
    op.create_table('activity_rules',
        sa.Column('activity_id', sa.Integer(), nullable=False),
        sa.Column('rule_template_id', sa.Integer(), nullable=False),
        sa.Column('added_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ),
        sa.ForeignKeyConstraint(['rule_template_id'], ['rules_templates.id'], ),
        sa.PrimaryKeyConstraint('activity_id', 'rule_template_id')
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


def downgrade():
    # Drop association tables
    op.drop_table('activity_rules')
    op.drop_table('group_rules')
    
    # Drop main tables
    op.drop_table('rules_templates')
    op.drop_table('activity_attendance')
    
    # Drop enum types
    op.execute('DROP TYPE ruletype')