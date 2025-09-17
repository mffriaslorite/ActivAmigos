"""Sprint 1: Add roles, password hints, and points ledger

Revision ID: sprint1_roles_hints_points
Revises: 
Create Date: 2025-01-17 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'sprint1_roles_hints_points'
down_revision = 'dbde74c6d122'  # Latest existing migration
branch_labels = None
depends_on = None

def upgrade():
    # Create enum types
    user_role = postgresql.ENUM('USER', 'ORGANIZER', 'SUPERADMIN', name='userrole')
    user_role.create(op.get_bind())
    
    password_hint_type = postgresql.ENUM('ANIMAL_LIST', name='passwordhinttype')
    password_hint_type.create(op.get_bind())
    
    # Add new columns to users table
    op.add_column('users', sa.Column('role', user_role, nullable=False, server_default='USER'))
    op.add_column('users', sa.Column('password_hint_type', password_hint_type, nullable=True))
    op.add_column('users', sa.Column('password_hint_value', sa.String(100), nullable=True))
    
    # Create points_ledger table
    op.create_table('points_ledger',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('points', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(255), nullable=False),
        sa.Column('context_type', sa.String(50), nullable=True),
        sa.Column('context_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    # Drop points_ledger table
    op.drop_table('points_ledger')
    
    # Remove columns from users table
    op.drop_column('users', 'password_hint_value')
    op.drop_column('users', 'password_hint_type')
    op.drop_column('users', 'role')
    
    # Drop enum types
    user_role = postgresql.ENUM('USER', 'ORGANIZER', 'SUPERADMIN', name='userrole')
    user_role.drop(op.get_bind())
    
    password_hint_type = postgresql.ENUM('ANIMAL_LIST', name='passwordhinttype')
    password_hint_type.drop(op.get_bind())