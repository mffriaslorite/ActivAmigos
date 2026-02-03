#!/usr/bin/env python3
"""
Simplified Achievement Seeding Script (No External Dependencies)
"""

import os
import sys
from datetime import datetime

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models.user.user import db
from models.achievement.achievement import Achievement

def seed_achievements():
    """Create simplified achievements without icon downloads"""
    
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
            "description": "¡Felicidades! Te has unido a tu primera actividad en ActivAmigos. Este es solo el comienzo de tu aventura.", 
            "points_reward": 50
        },
        {
            "title": "Explorador Social", 
            "description": "Te has unido a tu primer grupo. ¡Genial! Ahora puedes conocer personas con intereses similares.", 
            "points_reward": 75
        },
        {
            "title": "Estrella en Ascenso", 
            "description": "Has alcanzado el nivel 5. Tu dedicación a mantenerte activo es admirable.", 
            "points_reward": 100
        },
        {
            "title": "Organizador Nato", 
            "description": "Has creado tu primera actividad. ¡Excelente liderazgo! Otros usuarios podrán unirse y disfrutar gracias a ti.", 
            "points_reward": 125
        },
        {
            "title": "Maestro de la Consistencia", 
            "description": "Has creado 10 actividades. Tu constancia es inspiradora y un ejemplo para la comunidad.", 
            "points_reward": 200
        },
        {
            "title": "Embajador ActivAmigos", 
            "description": "Has alcanzado el nivel 10. Eres un verdadero embajador de la vida activa y saludable.", 
            "points_reward": 300
        }
    ]
    
    print("Creating simplified achievements...")
    
    for i, achievement_data in enumerate(achievements_data, 1):
        print(f"Processing: {achievement_data['title']}")
        
        # Create achievement without icon for now
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
    
    app, _ = create_app()
    
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