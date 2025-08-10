#!/usr/bin/env python3
"""
Test Achievement Triggers

This script tests that achievements are automatically triggered
when users perform actions in the ActivAmigos platform.
"""

import requests
import json
import sys

# Test configuration
BASE_URL = "http://localhost:5000/api"
TEST_USER = {
    "username": "achievement_test_user",
    "email": "test_achievements@example.com",
    "password": "TestPassword123!"
}

def test_achievement_system():
    """Test the complete achievement triggering system"""
    print("🧪 Testing Achievement Trigger System")
    print("=" * 50)
    
    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})
    
    try:
        # 1. Register user
        print("\n1️⃣ Registering test user...")
        response = session.post(f"{BASE_URL}/auth/register", json=TEST_USER)
        if response.status_code == 201:
            print("✅ User registered successfully")
            user_data = response.json()
            user_id = user_data['user']['id']
        else:
            print(f"❌ Registration failed: {response.text}")
            return
        
        # 2. Check initial achievements
        print("\n2️⃣ Checking initial achievements...")
        response = session.get(f"{BASE_URL}/user/achievements")
        if response.status_code == 200:
            initial_state = response.json()
            print(f"✅ Initial state: {initial_state['points']} points, {len(initial_state['earned_achievements'])} achievements")
        
        # 3. Test manual achievement check
        print("\n3️⃣ Testing manual achievement check...")
        response = session.post(f"{BASE_URL}/user/achievements/check-all")
        if response.status_code == 200:
            after_check = response.json()
            print(f"✅ After check: {after_check['points']} points, {len(after_check['earned_achievements'])} achievements")
            if len(after_check['earned_achievements']) > len(initial_state['earned_achievements']):
                print(f"🏆 New achievements found!")
                for achievement in after_check['earned_achievements']:
                    print(f"   - {achievement['achievement']['title']}: {achievement['achievement']['points_reward']} points")
        
        # 4. Test adding points manually
        print("\n4️⃣ Testing manual points addition...")
        points_data = {"points": 150}  # Should trigger level 1
        response = session.post(f"{BASE_URL}/user/achievements", json=points_data)
        if response.status_code == 200:
            points_state = response.json()
            print(f"✅ After adding points: {points_state['points']} points, level {points_state['level']}")
            
        # 5. Test level achievement triggering
        print("\n5️⃣ Testing level achievement triggering...")
        level_points_data = {"points": 350}  # Should reach level 5 and trigger "Estrella en Ascenso"
        response = session.post(f"{BASE_URL}/user/achievements", json=level_points_data)
        if response.status_code == 200:
            level_state = response.json()
            print(f"✅ After level-up: {level_state['points']} points, level {level_state['level']}")
            if len(level_state['earned_achievements']) > len(points_state['earned_achievements']):
                print(f"🏆 Level achievement unlocked!")
        
        # 6. Final summary
        print("\n6️⃣ Final achievement summary...")
        response = session.get(f"{BASE_URL}/user/achievements")
        if response.status_code == 200:
            final_state = response.json()
            print(f"📊 Final state:")
            print(f"   Points: {final_state['points']}")
            print(f"   Level: {final_state['level']}")
            print(f"   Progress: {final_state['progress_to_next_level']:.2%}")
            print(f"   Achievements: {len(final_state['earned_achievements'])}")
            
            if final_state['earned_achievements']:
                print(f"\n🏆 Earned Achievements:")
                for achievement in final_state['earned_achievements']:
                    print(f"   - {achievement['achievement']['title']}: {achievement['achievement']['points_reward']} points")
        
        print("\n✅ Achievement trigger test completed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

def main():
    print("🚀 ActivAmigos Achievement Trigger Test")
    print("Make sure the backend server is running on localhost:5000")
    print("Press Enter to continue...")
    input()
    
    test_achievement_system()

if __name__ == "__main__":
    main()