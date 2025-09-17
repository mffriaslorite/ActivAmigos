"""Sprint 2: Chat enhancements, warnings system, and memberships

Revision ID: sprint2_chat_warnings_memberships
Revises: sprint1_roles_hints_points
Create Date: 2025-01-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'sprint2_chat_warnings_memberships'
down_revision = 'sprint1_roles_hints_points'
branch_labels = None
depends_on = None

def upgrade():
    # Create enum types
    message_type = postgresql.ENUM('USER', 'SYSTEM', 'WARNING', 'BAN', name='messagetype')
    message_type.create(op.get_bind())
    
    membership_status = postgresql.ENUM('ACTIVE', 'BANNED', name='membershipstatus')
    membership_status.create(op.get_bind())
    
    # Update messages table
    op.add_column('messages', sa.Column('message_type', message_type, nullable=False, server_default='USER'))
    op.add_column('messages', sa.Column('context_type', sa.String(20), nullable=True))
    op.add_column('messages', sa.Column('context_id', sa.Integer(), nullable=False, server_default='0'))
    
    # Make sender_id nullable for system messages
    op.alter_column('messages', 'sender_id', nullable=True)
    
    # Create warnings table
    op.create_table('warnings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('context_type', sa.String(20), nullable=False),
        sa.Column('context_id', sa.Integer(), nullable=False),
        sa.Column('target_user_id', sa.Integer(), nullable=False),
        sa.Column('issued_by', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['issued_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create group_memberships table
    op.create_table('group_memberships',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('warning_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', membership_status, nullable=False, server_default='ACTIVE'),
        sa.Column('joined_at', sa.DateTime(), nullable=False),
        sa.Column('role', sa.String(20), nullable=False, server_default='member'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_chat_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'group_id')
    )
    
    # Create activity_memberships table
    op.create_table('activity_memberships',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('activity_id', sa.Integer(), nullable=False),
        sa.Column('warning_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', membership_status, nullable=False, server_default='ACTIVE'),
        sa.Column('joined_at', sa.DateTime(), nullable=False),
        sa.Column('role', sa.String(20), nullable=False, server_default='participant'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_chat_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'activity_id')
    )
    
    # Migrate existing group_members data to group_memberships
    op.execute("""
        INSERT INTO group_memberships (user_id, group_id, joined_at, role, is_active)
        SELECT user_id, group_id, joined_at, role, is_active
        FROM group_members
    """)
    
    # Note: For activity participants, we would need to migrate from activity_participants
    # This assumes there's an activity_participants table similar to group_members
    # If not, this migration might need to be adjusted based on the actual schema

def downgrade():
    # Drop new tables
    op.drop_table('activity_memberships')
    op.drop_table('group_memberships')
    op.drop_table('warnings')
    
    # Revert messages table changes
    op.drop_column('messages', 'context_id')
    op.drop_column('messages', 'context_type')
    op.drop_column('messages', 'message_type')
    op.alter_column('messages', 'sender_id', nullable=False)
    
    # Drop enum types
    membership_status = postgresql.ENUM('ACTIVE', 'BANNED', name='membershipstatus')
    membership_status.drop(op.get_bind())
    
    message_type = postgresql.ENUM('USER', 'SYSTEM', 'WARNING', 'BAN', name='messagetype')
    message_type.drop(op.get_bind())