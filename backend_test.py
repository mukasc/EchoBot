import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any

class RPGCronistaAPITester:
    def __init__(self, base_url="http://localhost:8000/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = None
        self.mapping_id = None

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, data: Dict[Any, Any] = None, files: Dict[str, Any] = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and 'id' in response_data:
                        print(f"   Response ID: {response_data['id']}")
                    elif isinstance(response_data, list) and len(response_data) > 0:
                        print(f"   Response count: {len(response_data)}")
                except:
                    pass
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")

            return success, response.json() if response.content else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_get_sessions(self):
        """Test getting all sessions"""
        success, response = self.run_test(
            "Get All Sessions",
            "GET",
            "sessions",
            200
        )
        return success, response

    def test_create_session(self):
        """Test creating a new session"""
        session_data = {
            "name": f"Test Session {datetime.now().strftime('%H%M%S')}",
            "game_system": "D&D 5e",
            "cover_image_url": "https://example.com/image.jpg"
        }
        
        success, response = self.run_test(
            "Create Session",
            "POST",
            "sessions",
            200,
            data=session_data
        )
        
        if success and 'id' in response:
            self.session_id = response['id']
            print(f"   Created session ID: {self.session_id}")
        
        return success, response

    def test_get_session_by_id(self):
        """Test getting a specific session"""
        if not self.session_id:
            print("❌ Skipping - No session ID available")
            return False
            
        success, response = self.run_test(
            "Get Session by ID",
            "GET",
            f"sessions/{self.session_id}",
            200
        )
        return success, response

    def test_update_session(self):
        """Test updating a session"""
        if not self.session_id:
            print("❌ Skipping - No session ID available")
            return False
            
        update_data = {
            "name": f"Updated Test Session {datetime.now().strftime('%H%M%S')}",
            "status": "awaiting_review"
        }
        
        success, response = self.run_test(
            "Update Session",
            "PUT",
            f"sessions/{self.session_id}",
            200,
            data=update_data
        )
        return success, response

    def test_get_character_mappings(self):
        """Test getting all character mappings"""
        success, response = self.run_test(
            "Get Character Mappings",
            "GET",
            "character-mappings",
            200
        )
        return success, response

    def test_create_character_mapping(self):
        """Test creating a character mapping"""
        mapping_data = {
            "discord_user_id": f"test_user_{datetime.now().strftime('%H%M%S')}",
            "discord_username": f"TestUser#{datetime.now().strftime('%H%M')}",
            "character_name": "Test Character",
            "character_role": "Test Role",
            "avatar_url": "https://example.com/avatar.jpg"
        }
        
        success, response = self.run_test(
            "Create Character Mapping",
            "POST",
            "character-mappings",
            200,
            data=mapping_data
        )
        
        if success and 'id' in response:
            self.mapping_id = response['id']
            print(f"   Created mapping ID: {self.mapping_id}")
        
        return success, response

    def test_get_settings(self):
        """Test getting app settings"""
        success, response = self.run_test(
            "Get Settings",
            "GET",
            "settings",
            200
        )
        return success, response

    def test_update_settings(self):
        """Test updating app settings"""
        settings_data = {
            "llm_provider": "gemini",
            "llm_model": "gemini-3-flash-preview",
            "custom_api_key": "test_key"
        }
        
        success, response = self.run_test(
            "Update Settings",
            "PUT",
            "settings",
            200,
            data=settings_data
        )
        return success, response

    def test_create_sample_session(self):
        """Test creating a sample session"""
        success, response = self.run_test(
            "Create Sample Session",
            "POST",
            "demo/create-sample-session",
            200
        )
        return success, response

    def test_get_bot_setup_instructions(self):
        """Test getting bot setup instructions"""
        success, response = self.run_test(
            "Get Bot Setup Instructions",
            "GET",
            "bot-setup-instructions",
            200
        )
        return success, response

    def test_delete_character_mapping(self):
        """Test deleting a character mapping"""
        if not self.mapping_id:
            print("❌ Skipping - No mapping ID available")
            return False
            
        success, response = self.run_test(
            "Delete Character Mapping",
            "DELETE",
            f"character-mappings/{self.mapping_id}",
            200
        )
        return success, response

    def test_delete_session(self):
        """Test deleting a session"""
        if not self.session_id:
            print("❌ Skipping - No session ID available")
            return False
            
        success, response = self.run_test(
            "Delete Session",
            "DELETE",
            f"sessions/{self.session_id}",
            200
        )
        return success, response

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting RPG Cronista API Tests")
        print(f"   Base URL: {self.base_url}")
        print("=" * 60)

        # Test basic endpoints
        self.test_root_endpoint()
        
        # Test sessions
        self.test_get_sessions()
        self.test_create_session()
        self.test_get_session_by_id()
        self.test_update_session()
        
        # Test character mappings
        self.test_get_character_mappings()
        self.test_create_character_mapping()
        
        # Test settings
        self.test_get_settings()
        self.test_update_settings()
        
        # Test demo and instructions
        self.test_create_sample_session()
        self.test_get_bot_setup_instructions()
        
        # Cleanup tests
        self.test_delete_character_mapping()
        self.test_delete_session()

        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = RPGCronistaAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())