"""Added new features

Revision ID: df9071a955c0
Revises: 6a98b138fdf9
Create Date: 2025-09-24 19:04:39.825566
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'df9071a955c0'
down_revision = '6a98b138fdf9'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()

    user_role_enum = postgresql.ENUM('USER', 'ORGANIZER', 'SUPERADMIN', name='userrole')
    password_hint_type_enum = postgresql.ENUM('ANIMAL_LIST', name='passwordhinttype')
    user_role_enum.create(bind, checkfirst=True)
    password_hint_type_enum.create(bind, checkfirst=True)

    user_role_use = postgresql.ENUM(name='userrole', create_type=False)
    password_hint_type_use = postgresql.ENUM(name='passwordhinttype', create_type=False)

    op.add_column(
        'users',
        sa.Column('role', user_role_use, nullable=False, server_default='USER')
    )
    op.add_column(
        'users',
        sa.Column('password_hint_type', password_hint_type_use, nullable=True)
    )
    op.add_column(
        'users',
        sa.Column('password_hint_value', sa.String(255), nullable=True)
    )

    op.create_table(
        'points_ledger',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('points', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(255), nullable=False),
        sa.Column('context_type', sa.String(50), nullable=True),
        sa.Column('context_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )

    op.alter_column('users', 'role', server_default=None)


def downgrade():
    bind = op.get_bind()

    op.drop_table('points_ledger')

    op.drop_column('users', 'password_hint_value')
    op.drop_column('users', 'password_hint_type')
    op.drop_column('users', 'role')

    postgresql.ENUM(name='passwordhinttype').drop(bind, checkfirst=True)
    postgresql.ENUM(name='userrole').drop(bind, checkfirst=True)
