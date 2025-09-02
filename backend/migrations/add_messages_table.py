"""Add messages table for chat functionality

Revision ID: add_messages_table
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_messages_table'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create messages table
    op.create_table('messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('sender_id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=True),
        sa.Column('activity_id', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add foreign key constraints
    op.create_foreign_key('fk_messages_sender_id', 'messages', 'users', ['sender_id'], ['id'])
    op.create_foreign_key('fk_messages_group_id', 'messages', 'groups', ['group_id'], ['id'])
    op.create_foreign_key('fk_messages_activity_id', 'messages', 'activities', ['activity_id'], ['id'])
    
    # Add check constraint to ensure either group_id or activity_id is set
    op.create_check_constraint(
        'check_group_or_activity',
        'messages',
        '(group_id IS NOT NULL AND activity_id IS NULL) OR (group_id IS NULL AND activity_id IS NOT NULL)'
    )
    
    # Add indexes for better performance
    op.create_index('ix_messages_timestamp', 'messages', ['timestamp'])
    op.create_index('ix_messages_group_id', 'messages', ['group_id'])
    op.create_index('ix_messages_activity_id', 'messages', ['activity_id'])
    op.create_index('ix_messages_sender_id', 'messages', ['sender_id'])

def downgrade():
    # Remove indexes
    op.drop_index('ix_messages_sender_id', 'messages')
    op.drop_index('ix_messages_activity_id', 'messages')
    op.drop_index('ix_messages_group_id', 'messages')
    op.drop_index('ix_messages_timestamp', 'messages')
    
    # Remove check constraint
    op.drop_constraint('check_group_or_activity', 'messages')
    
    # Remove foreign key constraints
    op.drop_constraint('fk_messages_activity_id', 'messages')
    op.drop_constraint('fk_messages_group_id', 'messages')
    op.drop_constraint('fk_messages_sender_id', 'messages')
    
    # Drop table
    op.drop_table('messages')