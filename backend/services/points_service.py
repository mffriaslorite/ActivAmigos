from flask_smorest import Blueprint
from flask import session
from models.points.points import PointsLedger
from models.associations.achievement_associations import UserPoints
from models.user.user import User, db
from utils.decorators import login_required
import logging

logger = logging.getLogger(__name__)

blp = Blueprint("Points", "points", url_prefix="/api/points", description="Points management routes")

class PointsService:
    """
    Servicio centralizado para la gestión de puntos.
    Sincroniza el Historial (Ledger) con el Nivel actual (UserPoints).
    """
    
    @staticmethod
    def _update_user_level_balance(user_id, points_delta):
        """Método interno para actualizar la tabla de Nivel (UserPoints)"""
        user_points = UserPoints.query.filter_by(user_id=user_id).first()
        if not user_points:
            user_points = UserPoints(user_id=user_id, points=0)
            db.session.add(user_points)
        
        # Actualizamos el saldo (evitamos negativos totales en el nivel)
        new_points = max(0, user_points.points + points_delta)
        
        # Log para depuración
        logger.info(f"Updating points for user {user_id}: {user_points.points} -> {new_points} (Delta: {points_delta})")
        
        user_points.points = new_points
        return user_points

    @staticmethod
    def award_points(user_id, points, reason, context_type=None, context_id=None):
        """Dar puntos: Guarda en historial Y suma al nivel de forma atómica"""
        try:
            # 1. Crear entrada en Historial (Directamente, sin commit intermedio)
            ledger_entry = PointsLedger(
                user_id=user_id,
                points=abs(points),
                reason=reason,
                context_type=context_type,
                context_id=context_id
            )
            db.session.add(ledger_entry)
            
            # 2. Actualizar Nivel (UserPoints)
            PointsService._update_user_level_balance(user_id, abs(points))
            
            # 3. Commit ÚNICO para todo
            db.session.commit()
            
            # 4. Triggers de Logros (fuera de la transacción crítica)
            try:
                from utils.achievement_engine_simple import trigger_points_update
                trigger_points_update(user_id)
            except Exception as e:
                logger.error(f"Error checking level achievements: {e}")
                
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error awarding points: {e}")
            raise e
    
    @staticmethod
    def deduct_points(user_id, points, reason, context_type=None, context_id=None):
        """Quitar puntos: Guarda en historial Y resta al nivel de forma atómica"""
        try:
            # 1. Crear entrada en Historial (Negativa)
            ledger_entry = PointsLedger(
                user_id=user_id,
                points=-abs(points),  # Aseguramos que sea negativo
                reason=reason,
                context_type=context_type,
                context_id=context_id
            )
            db.session.add(ledger_entry)
            
            # 2. Actualizar Nivel (Restando)
            PointsService._update_user_level_balance(user_id, -abs(points))
            
            # 3. Commit ÚNICO para todo
            db.session.commit()
            
            logger.info(f"Deducted {points} points from user {user_id} for: {reason}")
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deducting points: {e}")
            raise e
    
    @staticmethod
    def get_user_points(user_id):
        """Obtener puntos actuales (Nivel)"""
        user_points = UserPoints.query.filter_by(user_id=user_id).first()
        return user_points.points if user_points else 0
    
    @staticmethod
    def get_user_history(user_id, limit=50):
        """Obtener historial de transacciones"""
        return PointsLedger.query.filter_by(user_id=user_id)\
                                .order_by(PointsLedger.created_at.desc())\
                                .limit(limit)\
                                .all()

# --- Endpoints ---

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