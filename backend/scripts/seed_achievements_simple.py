#!/usr/bin/env python3
"""
Simplified Achievement Seeding Script
"""

import os
import sys
from io import BytesIO
import requests
from datetime import datetime

# Add the backend directory to the path
# --- Asegura que /app está en el PYTHONPATH ---
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app import create_app
from models.user.user import db
from models.achievement.achievement import Achievement
from utils.minio_client import minio_client

def create_bucket_if_not_exists():
    """Create the achievement-icons bucket if it doesn't exist"""
    bucket_name = "achievement-icons"
    try:
        if not minio_client.bucket_exists(bucket_name):
            minio_client.make_bucket(bucket_name)
            print(f"Created bucket: {bucket_name}")
        else:
            print(f"Bucket {bucket_name} already exists")
    except Exception as e:
        print(f"Error creating bucket: {e}")

def download_placeholder_icon(achievement_name):
    """Download a placeholder icon for the achievement"""
    # Using a placeholder service that generates colorful icons
    icon_url = f"https://via.placeholder.com/128x128/4F46E5/FFFFFF?text={achievement_name[0]}"
    
    try:
        response = requests.get(icon_url, timeout=10)
        response.raise_for_status()
        return BytesIO(response.content)
    except Exception as e:
        print(f"Error downloading icon for {achievement_name}: {e}")
        return None

def upload_icon_to_minio(icon_data, filename):
    """Upload icon to MinIO"""
    try:
        # Reset stream position
        icon_data.seek(0)
        
        # Upload to MinIO
        minio_client.put_object(
            "achievement-icons",
            filename,
            icon_data,
            length=len(icon_data.getvalue()),
            content_type='image/png'
        )
        return filename
    except Exception as e:
        print(f"Error uploading icon {filename}: {e}")
        return None

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
        
        # Download and upload icon
        icon_data = download_placeholder_icon(achievement_data["title"])
        icon_filename = None
        if icon_data:
            icon_filename = f"achievement_{i}_{datetime.now().strftime('%Y%m%d')}.png"
            uploaded_filename = upload_icon_to_minio(icon_data, icon_filename)
            if uploaded_filename:
                print(f"Uploaded icon: {uploaded_filename}")
        
        # Create achievement
        achievement = Achievement(
            title=achievement_data["title"],
            description=achievement_data["description"],
            icon_url=icon_filename,
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
        # Create MinIO bucket
        create_bucket_if_not_exists()
        
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