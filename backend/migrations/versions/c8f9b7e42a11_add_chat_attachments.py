"""Add chat attachments

Revision ID: c8f9b7e42a11
Revises: 4b7a9e1c2d11
Create Date: 2026-04-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c8f9b7e42a11'
down_revision = '4b7a9e1c2d11'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.alter_column('content', existing_type=sa.Text(), nullable=True)
        batch_op.add_column(sa.Column('message_type', sa.String(length=20), nullable=False, server_default='TEXT'))
        batch_op.add_column(sa.Column('attachment_object_name', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('attachment_content_type', sa.String(length=120), nullable=True))

    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.alter_column('message_type', server_default=None)


def downgrade():
    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.drop_column('attachment_content_type')
        batch_op.drop_column('attachment_object_name')
        batch_op.drop_column('message_type')
        batch_op.alter_column('content', existing_type=sa.Text(), nullable=False)
