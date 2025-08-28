#!/usr/bin/env python3
"""
Simplified Achievement Seeding Script
"""

import os
import sys
from datetime import datetime

# Add the backend directory to the path
# --- Asegura que /app está en el PYTHONPATH ---
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app import create_app
from models.user.user import db
from models.achievement.achievement import Achievement



def seed_achievements():
    """Create simplified achievements"""
    
    # Clear existing achievements first
    try:
        Achievement.query.delete()
        db.session.commit()
        print("Cleared existing achievements")
    except Exception as e:
        print(f"Error clearing achievements: {e}")
        db.session.rollback()
    
    achievements_data = [
        {
            "title": "Primera Actividad", 
            "description": "Te uniste a tu primera actividad. ¡Buen comienzo!", 
            "points_reward": 50
        },
        {
            "title": "Explorador Social", 
            "description": "Te uniste a tu primer grupo. Así conocerás gente con tus intereses.", 
            "points_reward": 75
        },
        {
            "title": "Creador de Grupo", 
            "description": "Has creado tu primer grupo. ¡Bien hecho! Ahora otros pueden unirse a ti.", 
            "points_reward": 100
        },
        {
            "title": "Organizador Nato", 
            "description": "Creaste tu primera actividad. ¡Gracias por proponer un plan!", 
            "points_reward": 125
        },
        {
            "title": "Constancia en Grupos", 
            "description": "Has creado 3 grupos. ¡Qué gran iniciativa para reunir a más amigos!", 
            "points_reward": 200
        },
        {
            "title": "Estrella ActivAmigos", 
            "description": "Llegaste al nivel 3. ¡Eres un/a crack!", 
            "points_reward": 250
        }
    ]
    
    print("Creating simplified achievements...")
    
    for i, achievement_data in enumerate(achievements_data, 1):
        print(f"Processing: {achievement_data['title']}")
        
        # Create achievement without icon
        achievement = Achievement(
            title=achievement_data["title"],
            description=achievement_data["description"],
            icon_url=None,  # No icon for now
            points_reward=achievement_data["points_reward"]
        )
        
        db.session.add(achievement)
        print(f"Created achievement: {achievement.title} ({achievement.points_reward} points)")
    
    try:
        db.session.commit()
        print("\n✅ Successfully seeded simplified achievements!")
    except Exception as e:
        db.session.rollback()
        print(f"\n❌ Error seeding achievements: {e}")

def main():
    """Main function to run the seeding process"""
    print("🌱 Starting simplified achievements seeding...")
    
    app = create_app()
    
    with app.app_context():
        # Seed achievements
        seed_achievements()
        
        # Display final stats
        total_achievements = Achievement.query.count()
        print(f"\n📊 Total achievements in database: {total_achievements}")
        
        # List all achievements
        achievements = Achievement.query.all()
        print("\n🏆 Created achievements:")
        for achievement in achievements:
            print(f"  - {achievement.title}: {achievement.points_reward} points")

if __name__ == "__main__":
    main()