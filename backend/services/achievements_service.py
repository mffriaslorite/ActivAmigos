from flask_smorest import Blueprint, abort
from flask import session, request, current_app, Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload
from models.user.user import User, db
from models.achievement.achievement import Achievement
from models.associations.achievement_associations import UserPoints, UserAchievement
from models.achievement.achievement_schema import (
    GamificationStateSchema,
    UpdateGamificationSchema,
    AchievementSchema
)
from utils.decorators import require_user
from utils.minio_client import minio_client
from datetime import datetime

blp = Blueprint("Achievements", "achievements", url_prefix="/api/user/achievements", description="User achievements and gamification")

@blp.route("", methods=["GET"])
@require_user
@blp.response(200, GamificationStateSchema)
def get_achievements(current_user: User):
    """
    Get user's complete gamification state: points, level, progress, and earned achievements
    """
    # Get or create user points
    user_points = UserPoints.query.filter_by(user_id=current_user.id).first()
    if not user_points:
        user_points = UserPoints(user_id=current_user.id, points=0)
        db.session.add(user_points)
        db.session.commit()
    
    # Get user's earned achievements with achievement details
    earned_achievements = UserAchievement.query.filter_by(user_id=current_user.id)\
        .options(joinedload(UserAchievement.achievement))\
        .all()
    
    return {
        "points": user_points.points,
        "level": user_points.level,
        "progress_to_next_level": user_points.progress_to_next_level,
        "earned_achievements": earned_achievements
    }


@blp.route("", methods=["POST"])
@blp.arguments(UpdateGamificationSchema)
@require_user
@blp.response(200, GamificationStateSchema)
def update_achievements(data, current_user: User):
    """
    Update user's gamification state by adding points and/or achievements
    """
    # Get or create user points
    user_points = UserPoints.query.filter_by(user_id=current_user.id).first()
    if not user_points:
        user_points = UserPoints(user_id=current_user.id, points=0)
        db.session.add(user_points)
        db.session.flush()  # Flush to get the ID
    
    try:
        # Add points if provided
        if "points" in data and data["points"] is not None:
            points_to_add = data["points"]
            if points_to_add > 0:
                user_points.add_points(points_to_add)
        
        # Award achievement if provided
        if "achievement_id" in data and data["achievement_id"] is not None:
            achievement_id = data["achievement_id"]
            
            # Check if achievement exists
            achievement = Achievement.query.get(achievement_id)
            if not achievement:
                abort(404, message="Achievement not found")
            
            # Check if user already has this achievement
            existing_user_achievement = UserAchievement.query.filter_by(
                user_id=current_user.id, 
                achievement_id=achievement_id
            ).first()
            
            if existing_user_achievement:
                abort(409, message="User already has this achievement")
            
            # Award the achievement
            user_achievement = UserAchievement(
                user_id=current_user.id,
                achievement_id=achievement_id,
                date_earned=datetime.utcnow()
            )
            db.session.add(user_achievement)
            
            # Add achievement points reward
            if achievement.points_reward > 0:
                user_points.add_points(achievement.points_reward)
        
        db.session.commit()
        
        # Trigger level-based achievements after points are added
        try:
            from utils.achievement_engine import award_achievement_for_points_gained
            level_achievements = award_achievement_for_points_gained(current_user.id)
            if level_achievements:
                print(f"🏆 User {current_user.id} earned level achievements: {level_achievements}")
        except Exception as e:
            print(f"Error triggering level achievements: {e}")
        
        # Get updated earned achievements
        earned_achievements = UserAchievement.query.filter_by(user_id=current_user.id)\
            .options(joinedload(UserAchievement.achievement))\
            .all()
        
        return {
            "points": user_points.points,
            "level": user_points.level,
            "progress_to_next_level": user_points.progress_to_next_level,
            "earned_achievements": earned_achievements
        }
        
    except IntegrityError:
        db.session.rollback()
        abort(409, message="Database constraint violation")


@blp.route("/icons/<int:achievement_id>", methods=["GET"])
def get_achievement_icon(achievement_id: int):
    """
    Stream achievement icon from MinIO storage
    """
    achievement = Achievement.query.get(achievement_id)
    if not achievement or not achievement.icon_url:
        abort(404, message="Achievement icon not found")
    
    try:
        # Get the icon file from MinIO
        response = minio_client.get_object("achievement-icons", achievement.icon_url)
        
        def generate():
            for data in response.stream(1024):
                yield data
        
        return Response(
            generate(),
            mimetype='image/png',  # Default to PNG, could be enhanced to detect content type
            headers={
                'Cache-Control': 'public, max-age=31536000',  # Cache for 1 year
                'Content-Disposition': f'inline; filename="achievement_{achievement_id}.png"'
            }
        )
    except Exception as e:
        current_app.logger.error(f"Error streaming achievement icon {achievement_id}: {str(e)}")
        abort(404, message="Achievement icon not found")


@blp.route("/all", methods=["GET"])
@blp.response(200, AchievementSchema(many=True))
def get_all_achievements():
    """
    Get all available achievements (public endpoint for displaying achievement gallery)
    """
    achievements = Achievement.query.all()
    return achievements


@blp.route("/check-all", methods=["POST"])
@require_user
@blp.response(200, GamificationStateSchema)
def check_all_achievements(current_user: User):
    """
    Check all possible achievements for the current user
    Useful for retroactive achievement awarding
    """
    try:
        from utils.achievement_engine import AchievementEngine
        achievements_earned = AchievementEngine.check_all_achievements(current_user.id)
        if achievements_earned:
            print(f"🏆 User {current_user.id} earned achievements retroactively: {achievements_earned}")
        
        # Get updated gamification state
        user_points = UserPoints.query.filter_by(user_id=current_user.id).first()
        if not user_points:
            user_points = UserPoints(user_id=current_user.id, points=0)
            db.session.add(user_points)
            db.session.commit()
        
        earned_achievements = UserAchievement.query.filter_by(user_id=current_user.id)\
            .options(joinedload(UserAchievement.achievement))\
            .all()
        
        return {
            "points": user_points.points,
            "level": user_points.level,
            "progress_to_next_level": user_points.progress_to_next_level,
            "earned_achievements": earned_achievements
        }
        
    except Exception as e:
        current_app.logger.error(f"Error checking all achievements for user {current_user.id}: {str(e)}")
        abort(500, message="Error checking achievements")