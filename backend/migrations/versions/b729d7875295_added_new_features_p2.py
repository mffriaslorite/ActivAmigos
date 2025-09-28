"""Added new features_p2

Revision ID: b729d7875295
Revises: df9071a955c0
Create Date: 2025-09-24 19:07:02.828382

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b729d7875295'
down_revision = 'df9071a955c0'
branch_labels = None
depends_on = None


def upgrade():
    warning_context_type_enum = postgresql.ENUM('GROUP', 'ACTIVITY', name='warningcontexttype')
    membership_status_enum = postgresql.ENUM('ACTIVE', 'BANNED', name='membershipstatus')
    message_context_type_enum = postgresql.ENUM('GROUP', 'ACTIVITY', name='messagecontexttype')

    bind = op.get_bind()
    warning_context_type_enum.create(bind, checkfirst=True)
    membership_status_enum.create(bind, checkfirst=True)
    message_context_type_enum.create(bind, checkfirst=True)

    warning_context_type_use = postgresql.ENUM(name='warningcontexttype', create_type=False)
    membership_status_use = postgresql.ENUM(name='membershipstatus', create_type=False)
    message_context_type_use = postgresql.ENUM(name='messagecontexttype', create_type=False)

    op.add_column('messages', sa.Column('context_type', message_context_type_use, nullable=True))
    op.add_column('messages', sa.Column('context_id', sa.Integer(), nullable=True))

    op.execute("""
        UPDATE messages SET 
            context_type = 'GROUP',
            context_id = group_id
        WHERE group_id IS NOT NULL
    """)
    op.execute("""
        UPDATE messages SET 
            context_type = 'ACTIVITY',
            context_id = activity_id
        WHERE activity_id IS NOT NULL
    """)

    op.alter_column('messages', 'context_type', nullable=False)
    op.alter_column('messages', 'context_id', nullable=False)
    op.alter_column('messages', 'timestamp', new_column_name='created_at')

    op.drop_column('messages', 'group_id')
    op.drop_column('messages', 'activity_id')

    op.create_table(
        'warnings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('context_type', warning_context_type_use, nullable=False),
        sa.Column('context_id', sa.Integer(), nullable=False),
        sa.Column('target_user_id', sa.Integer(), nullable=False),
        sa.Column('issued_by', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['issued_by'], ['users.id']),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )

    op.add_column('group_members', sa.Column('warning_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('group_members', sa.Column('status', membership_status_use, nullable=False, server_default='ACTIVE'))

    op.add_column('activity_participants', sa.Column('warning_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('activity_participants', sa.Column('status', membership_status_use, nullable=False, server_default='ACTIVE'))

    op.alter_column('group_members', 'warning_count', server_default=None)
    op.alter_column('group_members', 'status', server_default=None)
    op.alter_column('activity_participants', 'warning_count', server_default=None)
    op.alter_column('activity_participants', 'status', server_default=None)


def downgrade():
    bind = op.get_bind()

    op.drop_column('activity_participants', 'status')
    op.drop_column('activity_participants', 'warning_count')
    op.drop_column('group_members', 'status')
    op.drop_column('group_members', 'warning_count')

    op.drop_table('warnings')

    op.add_column('messages', sa.Column('group_id', sa.Integer(), nullable=True))
    op.add_column('messages', sa.Column('activity_id', sa.Integer(), nullable=True))

    op.execute("""
        UPDATE messages SET 
            group_id = context_id
        WHERE context_type = 'GROUP'
    """)
    op.execute("""
        UPDATE messages SET 
            activity_id = context_id
        WHERE context_type = 'ACTIVITY'
    """)

    op.alter_column('messages', 'created_at', new_column_name='timestamp')

    op.drop_column('messages', 'context_id')
    op.drop_column('messages', 'context_type')

    postgresql.ENUM(name='messagecontexttype').drop(bind, checkfirst=True)
    postgresql.ENUM(name='membershipstatus').drop(bind, checkfirst=True)
    postgresql.ENUM(name='warningcontexttype').drop(bind, checkfirst=True)
