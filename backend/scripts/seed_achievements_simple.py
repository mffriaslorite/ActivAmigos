#!/usr/bin/env python3
"""
Seed de Logros - Versión Refactorizada (Calma y Claridad)
"""
import os
import sys

# Asegurar que el directorio raíz está en el path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app import create_app
from models.user.user import db
from models.achievement.achievement import Achievement

def seed_achievements():
    """Crear los nuevos logros refactorizados"""
    
    # 1. Limpiar logros antiguos
    try:
        Achievement.query.delete()
        db.session.commit()
        print("🧹 Logros antiguos eliminados.")
    except Exception as e:
        print(f"❌ Error limpiando logros: {e}")
        db.session.rollback()
        return

   # 2. Nueva Lista de Logros (Accesible y Motivadora)
    achievements_data = [
        # --- INICIACIÓN ---
        {
            "title": "¡Hola!", 
            "description": "Has enviado tu primer mensaje. ¡Qué bien saludarte!", 
            "points_reward": 50,
            "icon": "👋"
        },
        {
            "title": "Así Soy Yo", 
            "description": "Has subido tu foto. ¡Ahora todos te reconocen!", 
            "points_reward": 50,
            "icon": "📸"
        },
        
        # --- PARTICIPACIÓN ---
        {
            "title": "¡Me Apunto!", 
            "description": "Te has unido a una actividad. ¡A pasarlo bien!", 
            "points_reward": 75,
            "icon": "🚀"
        },
        {
            "title": "Haciendo Amigos", 
            "description": "Te has unido a un grupo. ¡Bienvenido!", 
            "points_reward": 75,
            "icon": "🤝"
        },

        # --- COMPROMISO ---
        {
            "title": "Soy Organizador", 
            "description": "Has creado un Grupo o Actividad. ¡Gracias por proponer planes!", 
            "points_reward": 150,
            "icon": "👑"
        },
        {
            "title": "Súper Activo", 
            "description": "Has participado en 5 actividades. ¡No paras!", 
            "points_reward": 200,
            "icon": "📅"
        },

        # --- VETERANÍA ---
        {
            "title": "Gran Experto", 
            "description": "Has llegado al Nivel 5. ¡Conoces la app mejor que nadie!", 
            "points_reward": 300,
            "icon": "⭐"
        }
    ]
    
    print("🌱 Creando nuevos logros...")
    
    for data in achievements_data:
        # Creamos el logro (asegurándonos de usar icon_url para el emoji si tu modelo lo permite, 
        # o simplemente confiando en el frontend que usará el emoji del título si quieres simplificar)
        achievement = Achievement(
            title=data["title"],
            description=data["description"],
            points_reward=data["points_reward"],
            icon_url=data["icon"] # Aprovechamos el campo icon_url para guardar el Emoji
        )
        db.session.add(achievement)
        print(f"   Created: {data['icon']} {data['title']}")
    
    try:
        db.session.commit()
        print("\n✅ ¡Nuevos logros sembrados con éxito!")
    except Exception as e:
        db.session.rollback()
        print(f"\n❌ Error guardando logros: {e}")

def main():
    print("🚀 Iniciando seed de logros...")
    app, _ = create_app() # Desempaquetado correcto
    with app.app_context():
        seed_achievements()

if __name__ == "__main__":
    main()