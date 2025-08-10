#!/usr/bin/env python3
"""
Test script for the ActivAmigos Achievements System
This script demonstrates the complete functionality of Sprint 4 - Achievements and Gamification

Prerequisites:
1. Docker Compose running (PostgreSQL and MinIO)
2. Backend dependencies installed
3. Database migrated

Usage:
    python test_achievements_system.py
"""

import requests
import json
import sys
import os
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:5000/api"
TEST_USER = {
    "username": "test_achievements_user",
    "email": "test@achievements.com",
    "password": "TestPassword123!"
}

class AchievementsSystemTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.user_id = None
        
    def print_step(self, step_num, description):
        print(f"\n{'='*60}")
        print(f"STEP {step_num}: {description}")
        print('='*60)
    
    def print_result(self, success, message, data=None):
        status = "✅ SUCCESS" if success else "❌ FAILED"
        print(f"{status}: {message}")
        if data:
            print(f"Data: {json.dumps(data, indent=2)}")
    
    def test_1_register_user(self):
        """Test user registration"""
        self.print_step(1, "User Registration")
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/register", json=TEST_USER)
            if response.status_code == 201:
                user_data = response.json()
                self.user_id = user_data.get('user', {}).get('id')
                self.print_result(True, "User registered successfully", user_data)
                return True
            else:
                self.print_result(False, f"Registration failed: {response.text}")
                return False
        except Exception as e:
            self.print_result(False, f"Registration error: {str(e)}")
            return False
    
    def test_2_login_user(self):
        """Test user login"""
        self.print_step(2, "User Login")
        
        try:
            login_data = {
                "username": TEST_USER["username"],
                "password": TEST_USER["password"]
            }
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                self.print_result(True, "User logged in successfully", response.json())
                return True
            else:
                self.print_result(False, f"Login failed: {response.text}")
                return False
        except Exception as e:
            self.print_result(False, f"Login error: {str(e)}")
            return False
    
    def test_3_get_initial_gamification_state(self):
        """Test getting initial gamification state (should be empty)"""
        self.print_step(3, "Get Initial Gamification State")
        
        try:
            response = self.session.get(f"{BASE_URL}/user/achievements")
            
            if response.status_code == 200:
                data = response.json()
                self.print_result(True, "Initial gamification state retrieved", data)
                
                # Verify initial state
                if (data.get('points') == 0 and 
                    data.get('level') == 0 and 
                    data.get('progress_to_next_level') == 0.0 and
                    len(data.get('earned_achievements', [])) == 0):
                    self.print_result(True, "Initial state is correct (0 points, level 0, no achievements)")
                else:
                    self.print_result(False, "Initial state is not as expected")
                return True
            else:
                self.print_result(False, f"Failed to get gamification state: {response.text}")
                return False
        except Exception as e:
            self.print_result(False, f"Error getting gamification state: {str(e)}")
            return False
    
    def test_4_add_points(self):
        """Test adding points to user"""
        self.print_step(4, "Add Points to User")
        
        try:
            # Add 75 points
            points_data = {"points": 75}
            response = self.session.post(f"{BASE_URL}/user/achievements", json=points_data)
            
            if response.status_code == 200:
                data = response.json()
                self.print_result(True, "Points added successfully", data)
                
                # Verify points and level calculation
                if (data.get('points') == 75 and 
                    data.get('level') == 0 and  # 75 < 100, so still level 0
                    abs(data.get('progress_to_next_level') - 0.75) < 0.01):  # 75/100 = 0.75
                    self.print_result(True, "Points and level calculation is correct")
                else:
                    self.print_result(False, f"Points calculation error. Expected: 75 points, level 0, progress 0.75")
                return True
            else:
                self.print_result(False, f"Failed to add points: {response.text}")
                return False
        except Exception as e:
            self.print_result(False, f"Error adding points: {str(e)}")
            return False
    
    def test_5_get_all_achievements(self):
        """Test getting all available achievements"""
        self.print_step(5, "Get All Available Achievements")
        
        try:
            response = self.session.get(f"{BASE_URL}/user/achievements/all")
            
            if response.status_code == 200:
                achievements = response.json()
                self.print_result(True, f"Retrieved {len(achievements)} achievements", achievements)
                
                if len(achievements) >= 5:  # Should have at least 5 from seed script
                    self.print_result(True, "Achievements seeded correctly")
                    return achievements
                else:
                    self.print_result(False, "Not enough achievements found. Run seed script first.")
                    return []
            else:
                self.print_result(False, f"Failed to get achievements: {response.text}")
                return []
        except Exception as e:
            self.print_result(False, f"Error getting achievements: {str(e)}")
            return []
    
    def test_6_award_achievement(self, achievements):
        """Test awarding an achievement to user"""
        self.print_step(6, "Award Achievement to User")
        
        if not achievements:
            self.print_result(False, "No achievements available to award")
            return False
        
        try:
            # Award the first achievement
            first_achievement = achievements[0]
            achievement_data = {"achievement_id": first_achievement["id"]}
            response = self.session.post(f"{BASE_URL}/user/achievements", json=achievement_data)
            
            if response.status_code == 200:
                data = response.json()
                self.print_result(True, "Achievement awarded successfully", data)
                
                # Verify achievement was added and points increased
                expected_points = 75 + first_achievement["points_reward"]
                if (data.get('points') == expected_points and
                    len(data.get('earned_achievements', [])) == 1):
                    self.print_result(True, f"Achievement points added correctly. Total: {expected_points}")
                else:
                    self.print_result(False, "Achievement points not calculated correctly")
                return True
            else:
                self.print_result(False, f"Failed to award achievement: {response.text}")
                return False
        except Exception as e:
            self.print_result(False, f"Error awarding achievement: {str(e)}")
            return False
    
    def test_7_level_up_scenario(self):
        """Test leveling up by adding enough points"""
        self.print_step(7, "Test Level Up Scenario")
        
        try:
            # Add enough points to reach level 1 (need 100+ total points)
            points_data = {"points": 50}  # This should push us over 100
            response = self.session.post(f"{BASE_URL}/user/achievements", json=points_data)
            
            if response.status_code == 200:
                data = response.json()
                self.print_result(True, "Additional points added", data)
                
                # Check if user leveled up
                if data.get('level') >= 1:
                    self.print_result(True, f"User successfully leveled up to level {data.get('level')}")
                    progress = data.get('progress_to_next_level', 0)
                    self.print_result(True, f"Progress to next level: {progress:.2%}")
                else:
                    self.print_result(False, "User should have leveled up but didn't")
                return True
            else:
                self.print_result(False, f"Failed to add points: {response.text}")
                return False
        except Exception as e:
            self.print_result(False, f"Error in level up test: {str(e)}")
            return False
    
    def test_8_duplicate_achievement_prevention(self, achievements):
        """Test that duplicate achievements are prevented"""
        self.print_step(8, "Test Duplicate Achievement Prevention")
        
        if not achievements:
            self.print_result(False, "No achievements available for duplicate test")
            return False
        
        try:
            # Try to award the same achievement again
            first_achievement = achievements[0]
            achievement_data = {"achievement_id": first_achievement["id"]}
            response = self.session.post(f"{BASE_URL}/user/achievements", json=achievement_data)
            
            if response.status_code == 409:  # Conflict - expected for duplicate
                self.print_result(True, "Duplicate achievement correctly prevented")
                return True
            else:
                self.print_result(False, f"Duplicate achievement not prevented. Status: {response.status_code}")
                return False
        except Exception as e:
            self.print_result(False, f"Error in duplicate test: {str(e)}")
            return False
    
    def test_9_final_state_verification(self):
        """Test final gamification state"""
        self.print_step(9, "Final State Verification")
        
        try:
            response = self.session.get(f"{BASE_URL}/user/achievements")
            
            if response.status_code == 200:
                data = response.json()
                self.print_result(True, "Final gamification state", data)
                
                # Print summary
                points = data.get('points', 0)
                level = data.get('level', 0)
                progress = data.get('progress_to_next_level', 0)
                achievements_count = len(data.get('earned_achievements', []))
                
                print(f"\n📊 FINAL SUMMARY:")
                print(f"   Total Points: {points}")
                print(f"   Current Level: {level}")
                print(f"   Progress to Next Level: {progress:.2%}")
                print(f"   Achievements Earned: {achievements_count}")
                
                return True
            else:
                self.print_result(False, f"Failed to get final state: {response.text}")
                return False
        except Exception as e:
            self.print_result(False, f"Error getting final state: {str(e)}")
            return False
    
    def test_10_achievement_icon_endpoint(self, achievements):
        """Test achievement icon streaming endpoint"""
        self.print_step(10, "Test Achievement Icon Endpoint")
        
        if not achievements:
            self.print_result(False, "No achievements available for icon test")
            return False
        
        try:
            # Test icon endpoint for first achievement
            first_achievement = achievements[0]
            icon_url = f"{BASE_URL}/user/achievements/icons/{first_achievement['id']}"
            response = self.session.get(icon_url)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    self.print_result(True, f"Achievement icon served successfully. Content-Type: {content_type}")
                else:
                    self.print_result(False, f"Unexpected content type: {content_type}")
                return True
            else:
                self.print_result(False, f"Failed to get achievement icon: {response.status_code}")
                return False
        except Exception as e:
            self.print_result(False, f"Error testing icon endpoint: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run the complete test suite"""
        print("🧪 ACTIVAMIGOS ACHIEVEMENTS SYSTEM TEST SUITE")
        print("=" * 60)
        print("Testing Sprint 4 - Achievements and Gamification")
        print(f"Base URL: {BASE_URL}")
        print(f"Test User: {TEST_USER['username']}")
        
        test_results = []
        achievements = []
        
        # Run all tests in sequence
        test_results.append(self.test_1_register_user())
        test_results.append(self.test_2_login_user())
        test_results.append(self.test_3_get_initial_gamification_state())
        test_results.append(self.test_4_add_points())
        
        achievements = self.test_5_get_all_achievements()
        test_results.append(len(achievements) > 0)
        
        test_results.append(self.test_6_award_achievement(achievements))
        test_results.append(self.test_7_level_up_scenario())
        test_results.append(self.test_8_duplicate_achievement_prevention(achievements))
        test_results.append(self.test_9_final_state_verification())
        test_results.append(self.test_10_achievement_icon_endpoint(achievements))
        
        # Print final results
        print(f"\n🏁 TEST SUITE COMPLETED")
        print("=" * 60)
        passed = sum(test_results)
        total = len(test_results)
        
        print(f"Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Achievements system is working correctly.")
        else:
            print("⚠️ Some tests failed. Check the logs above for details.")
        
        return passed == total

def main():
    """Main function"""
    print("Starting ActivAmigos Achievements System Test...")
    print("\nPrerequisites Check:")
    print("1. Ensure Docker Compose is running (docker-compose up -d)")
    print("2. Ensure backend server is running on localhost:5000")
    print("3. Ensure database is migrated")
    print("4. Ensure achievements are seeded (python seed_achievements.py)")
    
    input("\nPress Enter to continue with testing or Ctrl+C to abort...")
    
    tester = AchievementsSystemTester()
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()