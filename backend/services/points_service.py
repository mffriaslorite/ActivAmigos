from flask_smorest import Blueprint
from flask import session
from models.points.points import PointsLedger
from models.user.user import User, db
from utils.decorators import login_required

blp = Blueprint("Points", "points", url_prefix="/api/points", description="Points management routes")

class PointsService:
    """Service for managing user points"""
    
    @staticmethod
    def award_points(user_id, points, reason, context_type=None, context_id=None):
        """Award points to a user"""
        return PointsLedger.award_points(user_id, points, reason, context_type, context_id)
    
    @staticmethod
    def deduct_points(user_id, points, reason, context_type=None, context_id=None):
        """Deduct points from a user"""
        return PointsLedger.deduct_points(user_id, points, reason, context_type, context_id)
    
    @staticmethod
    def get_user_points(user_id):
        """Get total points for a user"""
        return PointsLedger.get_user_total_points(user_id)
    
    @staticmethod
    def get_user_history(user_id, limit=50):
        """Get points history for a user"""
        return PointsLedger.query.filter_by(user_id=user_id)\
                                .order_by(PointsLedger.created_at.desc())\
                                .limit(limit)\
                                .all()

# REST endpoints
@blp.route("/balance", methods=["GET"])
@login_required
def get_balance():
    """Get current user's points balance"""
    user_id = session.get('user_id')
    total_points = PointsService.get_user_points(user_id)
    return {"points": total_points}

@blp.route("/history", methods=["GET"])
@login_required
def get_history():
    """Get current user's points history"""
    user_id = session.get('user_id')
    history = PointsService.get_user_history(user_id)
    
    return {
        "history": [
            {
                "id": entry.id,
                "points": entry.points,
                "reason": entry.reason,
                "context_type": entry.context_type,
                "context_id": entry.context_id,
                "created_at": entry.created_at.isoformat()
            }
            for entry in history
        ]
    }