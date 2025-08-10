"""
Achievement Engine - Automatic Achievement Triggering System

This module contains the logic for automatically awarding achievements
when users perform specific actions in the ActivAmigos platform.
"""

from typing import List, Optional
from sqlalchemy import func
from models.user.user import User, db
from models.achievement.achievement import Achievement
from models.associations.achievement_associations import UserAchievement, UserPoints
from models.associations.group_associations import group_members
from models.associations.activity_associations import activity_participants
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class AchievementEngine:
    """
    Engine for automatically triggering achievements based on user actions
    """
    
    @staticmethod
    def get_or_create_user_points(user_id: int) -> UserPoints:
        """Get or create UserPoints record for a user"""
        user_points = UserPoints.query.filter_by(user_id=user_id).first()
        if not user_points:
            user_points = UserPoints(user_id=user_id, points=0)
            db.session.add(user_points)
            db.session.flush()
        return user_points
    
    @staticmethod
    def award_achievement(user_id: int, achievement_title: str) -> bool:
        """
        Award a specific achievement to a user if they don't already have it
        Returns True if achievement was awarded, False if already had it
        """
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
                user_points = AchievementEngine.get_or_create_user_points(user_id)
                user_points.add_points(achievement.points_reward)
            
            logger.info(f"Awarded achievement '{achievement_title}' to user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error awarding achievement '{achievement_title}' to user {user_id}: {e}")
            return False
    
    @staticmethod
    def trigger_group_join_achievements(user_id: int):
        """Trigger achievements related to joining groups"""
        try:
            # Count user's groups
            group_count = db.session.query(group_members).filter_by(user_id=user_id).count()
            
            achievements_awarded = []
            
            # First group achievement
            if group_count == 1:
                if AchievementEngine.award_achievement(user_id, "Explorador Social"):
                    achievements_awarded.append("Explorador Social")
            
            # Commit the changes
            if achievements_awarded:
                db.session.commit()
                logger.info(f"User {user_id} earned achievements for joining groups: {achievements_awarded}")
            
            return achievements_awarded
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error triggering group join achievements for user {user_id}: {e}")
            return []
    
    @staticmethod
    def trigger_activity_creation_achievements(user_id: int):
        """Trigger achievements related to creating activities"""
        try:
            # Import here to avoid circular imports
            from models.activity.activity import Activity
            
            # Count activities created by user
            activity_count = Activity.query.filter_by(creator_id=user_id).count()
            
            achievements_awarded = []
            
            # First activity creation achievement
            if activity_count == 1:
                if AchievementEngine.award_achievement(user_id, "Organizador Nato"):
                    achievements_awarded.append("Organizador Nato")
            
            # Commit the changes
            if achievements_awarded:
                db.session.commit()
                logger.info(f"User {user_id} earned achievements for creating activities: {achievements_awarded}")
            
            return achievements_awarded
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error triggering activity creation achievements for user {user_id}: {e}")
            return []
    
    @staticmethod
    def trigger_activity_participation_achievements(user_id: int):
        """Trigger achievements related to participating in activities"""
        try:
            # Count activities user has participated in
            participation_count = db.session.query(activity_participants).filter_by(user_id=user_id).count()
            
            achievements_awarded = []
            
            # First activity participation
            if participation_count == 1:
                if AchievementEngine.award_achievement(user_id, "Primera Actividad"):
                    achievements_awarded.append("Primera Actividad")
            
            # 10 activities participation
            elif participation_count == 10:
                if AchievementEngine.award_achievement(user_id, "Maestro de la Consistencia"):
                    achievements_awarded.append("Maestro de la Consistencia")
            
            # Commit the changes
            if achievements_awarded:
                db.session.commit()
                logger.info(f"User {user_id} earned achievements for activity participation: {achievements_awarded}")
            
            return achievements_awarded
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error triggering activity participation achievements for user {user_id}: {e}")
            return []
    
    @staticmethod
    def trigger_level_achievements(user_id: int):
        """Trigger achievements related to reaching specific levels"""
        try:
            user_points = UserPoints.query.filter_by(user_id=user_id).first()
            if not user_points:
                return []
            
            current_level = user_points.level
            achievements_awarded = []
            
            # Level 5 achievement
            if current_level >= 5:
                if AchievementEngine.award_achievement(user_id, "Estrella en Ascenso"):
                    achievements_awarded.append("Estrella en Ascenso")
            
            # Level 10 achievement
            if current_level >= 10:
                if AchievementEngine.award_achievement(user_id, "Embajador ActivAmigos"):
                    achievements_awarded.append("Embajador ActivAmigos")
            
            # Commit the changes
            if achievements_awarded:
                db.session.commit()
                logger.info(f"User {user_id} earned level achievements: {achievements_awarded}")
            
            return achievements_awarded
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error triggering level achievements for user {user_id}: {e}")
            return []
    
    @staticmethod
    def trigger_points_achievements(user_id: int):
        """
        Trigger level-based achievements when points are added
        This should be called after points are added to check for level-ups
        """
        return AchievementEngine.trigger_level_achievements(user_id)
    
    @staticmethod
    def check_all_achievements(user_id: int):
        """
        Check all possible achievements for a user
        Useful for retroactive achievement awarding
        """
        try:
            all_achievements = []
            
            # Check group achievements
            all_achievements.extend(AchievementEngine.trigger_group_join_achievements(user_id))
            
            # Check activity achievements
            all_achievements.extend(AchievementEngine.trigger_activity_creation_achievements(user_id))
            all_achievements.extend(AchievementEngine.trigger_activity_participation_achievements(user_id))
            
            # Check level achievements
            all_achievements.extend(AchievementEngine.trigger_level_achievements(user_id))
            
            return all_achievements
            
        except Exception as e:
            logger.error(f"Error checking all achievements for user {user_id}: {e}")
            return []

# Convenience functions for easy integration
def award_achievement_for_group_join(user_id: int):
    """Award achievements when user joins a group"""
    return AchievementEngine.trigger_group_join_achievements(user_id)

def award_achievement_for_activity_creation(user_id: int):
    """Award achievements when user creates an activity"""
    return AchievementEngine.trigger_activity_creation_achievements(user_id)

def award_achievement_for_activity_participation(user_id: int):
    """Award achievements when user participates in an activity"""
    return AchievementEngine.trigger_activity_participation_achievements(user_id)

def award_achievement_for_points_gained(user_id: int):
    """Award achievements when user gains points (level-ups)"""
    return AchievementEngine.trigger_points_achievements(user_id)