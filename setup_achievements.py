#!/usr/bin/env python3
"""
Simple setup script for ActivAmigos Achievements System
This script creates the database tables and seeds initial achievements
"""

import os
import sys

# Add the backend directory to the path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.append(backend_dir)

def setup_database():
    """Create database tables"""
    print("🗄️ Setting up database tables...")
    
    try:
        from app import create_app
        
        app = create_app()
        with app.app_context():
            from models.user.user import db
            
            # Import all models to register them
            from models.user.user import User
            from models.achievement.achievement import Achievement
            from models.associations.achievement_associations import UserAchievement, UserPoints
            
            # Create all tables
            db.create_all()
            print("✅ Database tables created successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return False

def seed_achievements():
    """Seed initial achievements"""
    print("🌱 Seeding achievements...")
    
    try:
        # Import and run the seed script
        from seed_achievements import main
        main()
        return True
        
    except Exception as e:
        print(f"❌ Error seeding achievements: {e}")
        print("💡 Make sure MinIO is running and accessible")
        return False

def main():
    """Main setup function"""
    print("🚀 ActivAmigos Achievements Setup")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not os.path.exists('backend'):
        print("❌ Please run this script from the project root directory")
        print("   Current directory:", os.getcwd())
        return
    
    # Setup database
    if not setup_database():
        print("❌ Database setup failed. Please check your configuration.")
        return
    
    # Seed achievements
    print("\n" + "=" * 40)
    if seed_achievements():
        print("\n🎉 Setup completed successfully!")
        print("You can now start the backend server and test the achievements system.")
    else:
        print("\n⚠️ Database setup completed, but seeding failed.")
        print("You can run 'python backend/seed_achievements.py' manually later.")

if __name__ == "__main__":
    main()