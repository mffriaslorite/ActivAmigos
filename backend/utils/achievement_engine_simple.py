"""
Simplified Achievement Engine

This simplified version focuses on reliability and clarity.
Updated for accessibility - achievements designed for people with cognitive difficulties:
- "Primera Actividad": Join first activity
- "Explorador Social": Join first group  
- "Creador de Grupo": Create first group
- "Organizador Nato": Create first activity
- "Constancia en Grupos": Create 3 groups
- "Estrella ActivAmigos": Reach level 3
"""

from typing import List
from models.user.user import User, db
from models.achievement.achievement import Achievement
from models.associations.achievement_associations import UserAchievement, UserPoints
from models.associations.group_associations import group_members
from models.associations.activity_associations import activity_participants
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def get_or_create_user_points(user_id: int) -> UserPoints:
    """Get or create UserPoints record for a user"""
    user_points = UserPoints.query.filter_by(user_id=user_id).first()
    if not user_points:
        user_points = UserPoints(user_id=user_id, points=0)
        db.session.add(user_points)
        db.session.flush()
    return user_points

def award_achievement(user_id: int, achievement_title: str) -> bool:
    """Award a specific achievement to a user if they don't already have it"""
    try:
        # Find the achievement
        achievement = Achievement.query.filter_by(title=achievement_title).first()
        if not achievement:
            logger.warning(f"Achievement '{achievement_title}' not found")
            return False
        
        # Check if user already has this achievement
        existing = UserAchievement.query.filter_by(
            user_id=user_id, 
            achievement_id=achievement.id
        ).first()
        
        if existing:
            return False  # Already has achievement
        
        # Award the achievement
        user_achievement = UserAchievement(
            user_id=user_id,
            achievement_id=achievement.id,
            date_earned=datetime.utcnow()
        )
        db.session.add(user_achievement)
        
        # Add points reward
        if achievement.points_reward > 0:
            user_points = get_or_create_user_points(user_id)
            user_points.add_points(achievement.points_reward)
        
        logger.info(f"Awarded achievement '{achievement_title}' to user {user_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error awarding achievement '{achievement_title}' to user {user_id}: {e}")
        return False

def check_group_achievements(user_id: int) -> List[str]:
    """Check and award group-related achievements"""
    try:
        # Count user's groups
        group_count = db.session.query(group_members).filter_by(user_id=user_id).count()
        
        achievements_awarded = []
        
        # First group achievement: "Explorador Social"
        if group_count == 1:
            if award_achievement(user_id, "Explorador Social"):
                achievements_awarded.append("Explorador Social")
        
        return achievements_awarded
        
    except Exception as e:
        logger.error(f"Error checking group achievements for user {user_id}: {e}")
        return []

def check_group_creation_achievements(user_id: int) -> List[str]:
    """Check and award group creation achievements"""
    try:
        # Import here to avoid circular imports
        from models.group.group import Group
        
        # Count groups created by user
        group_count = Group.query.filter_by(creator_id=user_id).count()
        
        achievements_awarded = []
        
        # First group creation: "Creador de Grupo"
        if group_count == 1:
            if award_achievement(user_id, "Creador de Grupo"):
                achievements_awarded.append("Creador de Grupo")
        
        # 3 group creations: "Constancia en Grupos"
        elif group_count == 3:
            if award_achievement(user_id, "Constancia en Grupos"):
                achievements_awarded.append("Constancia en Grupos")
        
        return achievements_awarded
        
    except Exception as e:
        logger.error(f"Error checking group creation achievements for user {user_id}: {e}")
        return []

def check_activity_creation_achievements(user_id: int) -> List[str]:
    """Check and award activity creation achievements"""
    try:
        # Import here to avoid circular imports
        from models.activity.activity import Activity
        
        # Count activities created by user
        activity_count = Activity.query.filter_by(creator_id=user_id).count()
        
        achievements_awarded = []
        
        # First activity creation: "Organizador Nato"
        if activity_count == 1:
            if award_achievement(user_id, "Organizador Nato"):
                achievements_awarded.append("Organizador Nato")
        
        return achievements_awarded
        
    except Exception as e:
        logger.error(f"Error checking activity creation achievements for user {user_id}: {e}")
        return []

def check_activity_join_achievements(user_id: int) -> List[str]:
    """Check and award activity join achievements"""
    try:
        # Count activities user has joined
        participation_count = db.session.query(activity_participants).filter_by(user_id=user_id).count()
        
        achievements_awarded = []
        
        # First activity join: "Primera Actividad"
        if participation_count == 1:
            if award_achievement(user_id, "Primera Actividad"):
                achievements_awarded.append("Primera Actividad")
        
        return achievements_awarded
        
    except Exception as e:
        logger.error(f"Error checking activity join achievements for user {user_id}: {e}")
        return []

def check_level_achievements(user_id: int) -> List[str]:
    """Check and award level-based achievements"""
    try:
        user_points = UserPoints.query.filter_by(user_id=user_id).first()
        if not user_points:
            return []
        
        current_level = user_points.level
        achievements_awarded = []
        
        # Level 3 achievement: "Estrella ActivAmigos" 
        if current_level >= 3:
            if award_achievement(user_id, "Estrella ActivAmigos"):
                achievements_awarded.append("Estrella ActivAmigos")
        
        return achievements_awarded
        
    except Exception as e:
        logger.error(f"Error checking level achievements for user {user_id}: {e}")
        return []

def check_all_achievements(user_id: int) -> List[str]:
    """Check all possible achievements for a user"""
    try:
        all_achievements = []
        
        # Check all achievement types
        all_achievements.extend(check_group_achievements(user_id))
        all_achievements.extend(check_group_creation_achievements(user_id))
        all_achievements.extend(check_activity_creation_achievements(user_id))
        all_achievements.extend(check_activity_join_achievements(user_id))
        all_achievements.extend(check_level_achievements(user_id))
        
        # Commit all changes if any achievements were awarded
        if all_achievements:
            db.session.commit()
            logger.info(f"User {user_id} earned achievements: {all_achievements}")
        
        return all_achievements
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error checking all achievements for user {user_id}: {e}")
        return []

# Convenience functions for easy integration
def trigger_group_join(user_id: int) -> List[str]:
    """Trigger when user joins a group"""
    achievements = check_group_achievements(user_id)
    if achievements:
        db.session.commit()
    return achievements

def trigger_group_creation(user_id: int) -> List[str]:
    """Trigger when user creates a group"""
    achievements = check_group_creation_achievements(user_id)
    if achievements:
        db.session.commit()
    return achievements

def trigger_activity_creation(user_id: int) -> List[str]:
    """Trigger when user creates an activity"""
    achievements = check_activity_creation_achievements(user_id)
    if achievements:
        db.session.commit()
    return achievements

def trigger_activity_join(user_id: int) -> List[str]:
    """Trigger when user joins an activity"""
    achievements = check_activity_join_achievements(user_id)
    if achievements:
        db.session.commit()
    return achievements

def trigger_points_update(user_id: int) -> List[str]:
    """Trigger when user gains points (check for level achievements)"""
    achievements = check_level_achievements(user_id)
    if achievements:
        db.session.commit()
    return achievements