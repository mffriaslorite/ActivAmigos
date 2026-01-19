"""
Motor de Logros Simplificado y Actualizado (ActivAmigos)
Implementa la lógica para los nuevos logros:
- "¡Hola!" (Primer mensaje)
- "Así Soy Yo" (Foto de perfil)
- "¡Me Apunto!" (Primera actividad)
- "Haciendo Amigos" (Primer grupo)
- "Soy Organizador" (Crear grupo o actividad)
- "Súper Activo" (5 actividades)
- "Gran Experto" (Nivel 5)
"""

from typing import List
from models.user.user import User, db
from models.achievement.achievement import Achievement
from models.associations.achievement_associations import UserAchievement, UserPoints
from models.associations.group_associations import group_members
from models.associations.activity_associations import activity_participants
from models.message.message import Message
from models.group.group import Group
from models.activity.activity import Activity
from services.points_service import PointsService
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def get_or_create_user_points(user_id: int) -> UserPoints:
    """Obtener o inicializar el registro de puntos del usuario"""
    user_points = UserPoints.query.filter_by(user_id=user_id).first()
    if not user_points:
        user_points = UserPoints(user_id=user_id, points=0)
        db.session.add(user_points)
        db.session.flush()
    return user_points

def award_achievement_if_new(user_id: int, achievement_title: str) -> bool:
    """
    Otorga un logro específico si el usuario no lo tiene aún.
    Registra los puntos en el historial usando PointsService.
    """
    try:
        # 1. Buscar el logro en la base de datos
        achievement = Achievement.query.filter_by(title=achievement_title).first()
        if not achievement:
            # Silencioso en producción para no llenar logs si el logro no existe (aún no se ha hecho seed)
            return False
        
        # 2. Comprobar si el usuario ya lo tiene
        existing = UserAchievement.query.filter_by(
            user_id=user_id, 
            achievement_id=achievement.id
        ).first()
        
        if existing:
            return False  # Ya lo tiene, no hacemos nada

        print(f"✅ ¡Usuario {user_id} gana el logro '{achievement_title}'!")
        
        # 3. Guardar la relación Usuario-Logro
        user_achievement = UserAchievement(
            user_id=user_id,
            achievement_id=achievement.id,
            date_earned=datetime.utcnow()
        )
        db.session.add(user_achievement)
        
        # 4. Otorgar Puntos y registrar en Historial
        if achievement.points_reward > 0:
            PointsService.award_points(
                user_id, 
                achievement.points_reward, 
                f"Logro desbloqueado: {achievement_title}",
                "ACHIEVEMENT",
                achievement.id
            )
            print(f"🎯 +{achievement.points_reward} XP añadidos al historial.")
        
        # Commit de la transacción del logro
        db.session.commit()
        
        # Opcional: Notificar al servicio de logros para avisos en tiempo real (si se implementa socket)
        # from services.achievement_service import notify_user...
        
        logger.info(f"Logro '{achievement_title}' otorgado al usuario {user_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error otorgando logro '{achievement_title}' al usuario {user_id}: {e}")
        print(f"❌ Error en el motor de logros: {e}")
        db.session.rollback()
        return False

# --- TRIGGERS: Funciones que llaman los servicios cuando ocurre una acción ---

def trigger_message_sent(user_id: int):
    """
    Llamar cuando el usuario envía un mensaje.
    Logro: "¡Hola!" (Primer mensaje)
    """
    try:
        msg_count = Message.query.filter_by(sender_id=user_id).count()
        if msg_count == 1:
            award_achievement_if_new(user_id, "¡Hola!")
    except Exception as e:
        logger.error(f"Error en trigger_message_sent: {e}")

def trigger_profile_updated(user_id: int):
    """
    Llamar cuando el usuario actualiza su perfil.
    Logro: "Así Soy Yo" (Foto de perfil subida)
    """
    try:
        user = User.query.get(user_id)
        if user and user.profile_image:
            award_achievement_if_new(user_id, "Así Soy Yo")
    except Exception as e:
        logger.error(f"Error en trigger_profile_updated: {e}")

def trigger_activity_join(user_id: int):
    """
    Llamar cuando el usuario se une a una actividad.
    Logros: 
    - "¡Me Apunto!" (1ª actividad)
    - "Súper Activo" (5 actividades)
    """
    try:
        count = db.session.query(activity_participants).filter_by(user_id=user_id).count()
        
        if count >= 1:
            award_achievement_if_new(user_id, "¡Me Apunto!")
        
        if count >= 5:
            award_achievement_if_new(user_id, "Súper Activo")
    except Exception as e:
        logger.error(f"Error en trigger_activity_join: {e}")

def trigger_group_join(user_id: int):
    """
    Llamar cuando el usuario se une a un grupo.
    Logro: "Haciendo Amigos" (1er grupo)
    """
    try:
        count = db.session.query(group_members).filter_by(user_id=user_id).count()
        if count >= 1:
            award_achievement_if_new(user_id, "Haciendo Amigos")
    except Exception as e:
        logger.error(f"Error en trigger_group_join: {e}")

def trigger_creation(user_id: int):
    """
    Llamar cuando el usuario crea un Grupo O una Actividad.
    Logro: "Soy Organizador" (Crear algo por primera vez)
    """
    try:
        g_count = Group.query.filter_by(created_by=user_id).count()
        a_count = Activity.query.filter_by(created_by=user_id).count()
        
        if (g_count + a_count) >= 1:
            award_achievement_if_new(user_id, "Soy Organizador")
    except Exception as e:
        logger.error(f"Error en trigger_creation: {e}")

def trigger_points_update(user_id: int):
    """
    Llamar cuando el usuario gana puntos.
    Logro: "Gran Experto" (Nivel 5)
    """
    try:
        # Calcular nivel actual basándonos en puntos totales
        points = PointsService.get_user_points(user_id)
        # Fórmula simple: Cada 100 puntos es 1 nivel (0-99=Lv1, 100-199=Lv2...)
        level = (points // 100) + 1
        
        if level >= 5:
            award_achievement_if_new(user_id, "Gran Experto")
    except Exception as e:
        logger.error(f"Error en trigger_points_update: {e}")

def check_all_achievements(user_id: int):
    """
    Comprobación completa de sincronización.
    Útil para llamar al iniciar sesión o en mantenimientos.
    """
    trigger_message_sent(user_id)
    trigger_profile_updated(user_id)
    trigger_activity_join(user_id)
    trigger_group_join(user_id)
    trigger_creation(user_id)
    trigger_points_update(user_id)