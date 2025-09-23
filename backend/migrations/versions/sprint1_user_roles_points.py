"""Sprint 1: Add user roles, password hints, and points ledger

Revision ID: sprint1_user_roles_points
Revises: dbde74c6d122
Create Date: 2025-01-23 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'sprint1_user_roles_points'
down_revision = 'dbde74c6d122'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types
    user_role_enum = postgresql.ENUM('USER', 'ORGANIZER', 'SUPERADMIN', name='userrole')
    user_role_enum.create(op.get_bind())
    
    password_hint_type_enum = postgresql.ENUM('ANIMAL_LIST', name='passwordhinttype')
    password_hint_type_enum.create(op.get_bind())
    
    # Add new columns to users table
    op.add_column('users', sa.Column('role', sa.Enum('USER', 'ORGANIZER', 'SUPERADMIN', name='userrole'), nullable=False, server_default='USER'))
    op.add_column('users', sa.Column('password_hint_type', sa.Enum('ANIMAL_LIST', name='passwordhinttype'), nullable=True))
    op.add_column('users', sa.Column('password_hint_value', sa.String(255), nullable=True))
    
    # Create points_ledger table
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


def downgrade():
    # Drop points_ledger table
    op.drop_table('points_ledger')
    
    # Remove new columns from users table
    op.drop_column('users', 'password_hint_value')
    op.drop_column('users', 'password_hint_type')
    op.drop_column('users', 'role')
    
    # Drop enum types
    op.execute('DROP TYPE passwordhinttype')
    op.execute('DROP TYPE userrole')