"""Add activity image and points display mode

Revision ID: e4a1d2c3b5f6
Revises: c8f9b7e42a11
Create Date: 2026-04-06 18:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e4a1d2c3b5f6'
down_revision = 'c8f9b7e42a11'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('activities', schema=None) as batch_op:
        batch_op.add_column(sa.Column('image_url', sa.String(length=255), nullable=True))

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('points_display_mode', sa.String(length=10), nullable=False, server_default='XP'))

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('points_display_mode', server_default=None)


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('points_display_mode')

    with op.batch_alter_table('activities', schema=None) as batch_op:
        batch_op.drop_column('image_url')
