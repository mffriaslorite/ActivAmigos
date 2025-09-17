# Importa modelos aquí para registrarlos
from .user.user import User
from .group.group import Group
from .activity.activity import Activity
from .achievement.achievement import Achievement
from .message.message import Message
from .points.points_ledger import PointsLedger
from .warnings.warnings import Warning
from .memberships.group_membership import GroupMembership
from .memberships.activity_membership import ActivityMembership
from .associations.group_associations import group_members
from .associations.achievement_associations import UserPoints, UserAchievement
