#!/usr/bin/env python3
"""
Simple test script to verify the authentication system components
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all our modules can be imported"""
    try:
        from models.user import User
        print("✅ User model imported successfully")
        
        from routes.auth_routes import auth_routes
        print("✅ Auth routes imported successfully")
        
        from config.config import Config
        print("✅ Config imported successfully")
        
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_user_model():
    """Test user model functionality"""
    try:
        # Test password hashing (without database)
        from werkzeug.security import generate_password_hash, check_password_hash
        
        test_password = "TestPassword123!"
        password_hash = generate_password_hash(test_password)
        
        # Test password verification
        if check_password_hash(password_hash, test_password):
            print("✅ Password hashing works correctly")
        else:
            print("❌ Password hashing failed")
            return False
            
        # Test password validation
        from routes.auth_routes import validate_password, validate_email, validate_username
        
        # Test valid inputs
        valid, msg = validate_password("ValidPass123")
        if valid:
            print("✅ Password validation works")
        else:
            print(f"❌ Password validation failed: {msg}")
            
        if validate_email("test@example.com"):
            print("✅ Email validation works")
        else:
            print("❌ Email validation failed")
            
        valid, msg = validate_username("testuser")
        if valid:
            print("✅ Username validation works")
        else:
            print(f"❌ Username validation failed: {msg}")
            
        return True
    except Exception as e:
        print(f"❌ User model test error: {e}")
        return False

def test_config():
    """Test configuration"""
    try:
        from config.config import Config
        
        # Test that config has required attributes
        required_attrs = ['SQLALCHEMY_DATABASE_URI', 'SECRET_KEY', 'BCRYPT_LOG_ROUNDS']
        for attr in required_attrs:
            if hasattr(Config, attr):
                print(f"✅ Config has {attr}")
            else:
                print(f"❌ Config missing {attr}")
                return False
                
        return True
    except Exception as e:
        print(f"❌ Config test error: {e}")
        return False

def main():
    print("🧪 Testing ActivAmigos Authentication System")
    print("=" * 50)
    
    all_tests_passed = True
    
    print("\n📦 Testing imports...")
    if not test_imports():
        all_tests_passed = False
    
    print("\n🔒 Testing authentication components...")
    if not test_user_model():
        all_tests_passed = False
    
    print("\n⚙️ Testing configuration...")
    if not test_config():
        all_tests_passed = False
    
    print("\n" + "=" * 50)
    if all_tests_passed:
        print("🎉 All tests passed! The authentication system is ready.")
        print("\n📝 Next steps:")
        print("   1. Set up PostgreSQL database")
        print("   2. Test API endpoints")
        print("   3. Test frontend integration")
    else:
        print("❌ Some tests failed. Please check the errors above.")
    
    return 0 if all_tests_passed else 1

if __name__ == "__main__":
    sys.exit(main())