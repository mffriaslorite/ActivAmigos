from flask_smorest import Blueprint
from flask import session
from models.points.points import PointsLedger
from models.associations.achievement_associations import UserPoints
from models.user.user import User, db
from utils.decorators import login_required

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
        
        # Actualizamos el saldo (evitamos negativos totales en el nivel si lo prefieres)
        # max(0, ...) asegura que la barra de nivel no sea negativa, aunque el historial registre la resta
        user_points.points = max(0, user_points.points + points_delta)
        return user_points

    @staticmethod
    def award_points(user_id, points, reason, context_type=None, context_id=None):
        """Dar puntos: Guarda en historial Y suma al nivel"""
        # 1. Historial
        PointsLedger.award_points(user_id, points, reason, context_type, context_id)
        
        # 2. Nivel
        PointsService._update_user_level_balance(user_id, abs(points))
        
        db.session.commit()
        
        # ✅ TRIGGER: Verificar logro "Gran Experto" (Nivel 5)
        try:
            from utils.achievement_engine_simple import trigger_points_update
            trigger_points_update(user_id)
        except ImportError:
            pass # Evitar error si hay ciclo de importación
        except Exception as e:
            print(f"Error checking level achievements: {e}")
            
        return True
    
    @staticmethod
    def deduct_points(user_id, points, reason, context_type=None, context_id=None):
        """Quitar puntos: Guarda en historial Y resta al nivel (Penalización)"""
        # 1. Historial (se guarda como negativo)
        PointsLedger.deduct_points(user_id, points, reason, context_type, context_id)
        
        # 2. Nivel
        PointsService._update_user_level_balance(user_id, -abs(points))
        
        db.session.commit()
        return True
    
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