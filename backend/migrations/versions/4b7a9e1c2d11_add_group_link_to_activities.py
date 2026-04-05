"""add group link to activities

Revision ID: 4b7a9e1c2d11
Revises: 151a497b324a
Create Date: 2026-04-05 13:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4b7a9e1c2d11'
down_revision = '151a497b324a'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('activities', sa.Column('group_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_activities_group_id_groups',
        'activities',
        'groups',
        ['group_id'],
        ['id']
    )


def downgrade():
    op.drop_constraint('fk_activities_group_id_groups', 'activities', type_='foreignkey')
    op.drop_column('activities', 'group_id')
