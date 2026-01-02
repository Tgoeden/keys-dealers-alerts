#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class KeyFlowAPITester:
    def __init__(self, base_url="https://keytrack-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.owner_token = None
        self.demo_token = None
        self.dealership_id = None
        self.user_id = None
        self.key_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, use_owner_token=False, use_demo_token=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Use appropriate token
        if use_demo_token:
            token = self.demo_token
        elif use_owner_token:
            token = self.owner_token
        else:
            token = self.token
            
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test basic API health"""
        # Remove /api from endpoint since it's already in base_url
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "",  # This will hit /api/ endpoint
            404  # Expecting 404 since there's no root endpoint defined
        )
        return success

    def test_owner_login(self):
        """Test owner login with PIN 9988"""
        success, response = self.run_test(
            "Owner Login",
            "POST",
            "auth/owner-login",
            200,
            data={"pin": "9988"}
        )
        if success and 'access_token' in response:
            self.owner_token = response['access_token']
            print(f"   Owner token obtained: {self.owner_token[:20]}...")
            return True
        return False

    def test_demo_login(self):
        """Test demo login (no credentials needed)"""
        success, response = self.run_test(
            "Demo Login",
            "POST",
            "auth/demo-login",
            200,
            data={}  # No credentials needed
        )
        if success and 'access_token' in response:
            self.demo_token = response['access_token']
            print(f"   Demo token obtained: {self.demo_token[:20]}...")
            return True
        return False

    def test_demo_limits(self):
        """Test demo limits endpoint"""
        if not hasattr(self, 'demo_token') or not self.demo_token:
            print("❌ No demo token available for demo limits test")
            return False
            
        success, response = self.run_test(
            "Demo Limits",
            "GET",
            "demo-limits",
            200,
            use_demo_token=True
        )
        
        if success and response.get('is_demo'):
            print(f"   Demo limits: {response.get('current_keys', 0)}/{response.get('max_keys', 0)} keys, {response.get('current_users', 0)}/{response.get('max_users', 0)} users")
            return True
        return False

    def test_create_dealership(self):
        """Create a test dealership as owner"""
        success, response = self.run_test(
            "Create Dealership",
            "POST",
            "dealerships",
            200,
            data={
                "name": "Test Auto Dealership",
                "dealership_type": "automotive",
                "address": "123 Test St",
                "phone": "555-0123"
            },
            use_owner_token=True
        )
        if success and 'id' in response:
            self.dealership_id = response['id']
            print(f"   Dealership created: {self.dealership_id}")
            return True
        return False

    def test_user_registration(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": "admin@dealership.com",
                "password": "password123",
                "name": "Test Admin",
                "role": "dealership_admin",
                "dealership_id": self.dealership_id
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   User registered: {self.user_id}")
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": "admin@dealership.com",
                "password": "password123"
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Login successful, token: {self.token[:20]}...")
            return True
        return False

    def test_create_user_under_dealership(self):
        """Create a regular user under the dealership"""
        success, response = self.run_test(
            "Create User Under Dealership",
            "POST",
            "users",
            200,
            data={
                "email": "user@dealership.com",
                "password": "password123",
                "name": "Test User",
                "role": "user",
                "dealership_id": self.dealership_id
            }
        )
        return success

    def test_create_key(self):
        """Create a test key"""
        success, response = self.run_test(
            "Create Key",
            "POST",
            "keys",
            200,
            data={
                "stock_number": "TEST-001",
                "vehicle_model": "2024 Ford F-150",
                "vehicle_year": 2024,
                "vehicle_vin": "1FTFW1ET5DFC12345",
                "dealership_id": self.dealership_id
            }
        )
        if success and 'id' in response:
            self.key_id = response['id']
            print(f"   Key created: {self.key_id}")
            return True
        return False

    def test_checkout_key(self):
        """Test key checkout"""
        if not self.key_id:
            print("❌ No key available for checkout test")
            return False
            
        success, response = self.run_test(
            "Checkout Key",
            "POST",
            f"keys/{self.key_id}/checkout",
            200,
            data={
                "reason": "test_drive",
                "notes": "Test checkout for API testing"
            }
        )
        return success

    def test_return_key(self):
        """Test key return"""
        if not self.key_id:
            print("❌ No key available for return test")
            return False
            
        success, response = self.run_test(
            "Return Key",
            "POST",
            f"keys/{self.key_id}/return",
            200,
            data={
                "notes": "Test return for API testing"
            }
        )
        return success

    def test_create_sales_goal(self):
        """Test creating sales goal"""
        success, response = self.run_test(
            "Create Sales Goal",
            "POST",
            "sales-goals",
            200,
            data={
                "year": 2024,
                "yearly_sales_target": 100,
                "yearly_leads_target": 1000,
                "yearly_writeups_target": 500,
                "yearly_appointments_target": 400
            }
        )
        return success

    def test_log_daily_activity(self):
        """Test logging daily activity"""
        success, response = self.run_test(
            "Log Daily Activity",
            "POST",
            "daily-activities",
            200,
            data={
                "date": "2024-01-15",
                "leads_walk_in": 5,
                "leads_phone": 3,
                "leads_internet": 2,
                "writeups": 4,
                "sales": 1,
                "appointments_scheduled": 3,
                "appointments_shown": 2,
                "notes": "Good day for testing"
            }
        )
        return success

    def test_get_sales_progress(self):
        """Test getting sales progress"""
        if not self.user_id:
            print("❌ No user ID available for sales progress test")
            return False
            
        success, response = self.run_test(
            "Get Sales Progress",
            "GET",
            f"sales-progress/{self.user_id}",
            200
        )
        return success

    def test_get_keys(self):
        """Test getting keys list"""
        success, response = self.run_test(
            "Get Keys List",
            "GET",
            "keys",
            200
        )
        return success

    def test_get_dealerships(self):
        """Test getting dealerships list"""
        success, response = self.run_test(
            "Get Dealerships",
            "GET",
            "dealerships",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard stats"""
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "stats/dashboard",
            200
        )
        return success

def main():
    print("🚀 Starting KeyFlow API Tests")
    print("=" * 50)
    
    tester = KeyFlowAPITester()
    
    # Test sequence
    tests = [
        ("API Health Check", tester.test_health_check),
        ("Owner Login", tester.test_owner_login),
        ("Create Dealership", tester.test_create_dealership),
        ("User Registration", tester.test_user_registration),
        ("User Login", tester.test_user_login),
        ("Create User Under Dealership", tester.test_create_user_under_dealership),
        ("Create Key", tester.test_create_key),
        ("Checkout Key", tester.test_checkout_key),
        ("Return Key", tester.test_return_key),
        ("Create Sales Goal", tester.test_create_sales_goal),
        ("Log Daily Activity", tester.test_log_daily_activity),
        ("Get Sales Progress", tester.test_get_sales_progress),
        ("Get Keys List", tester.test_get_keys),
        ("Get Dealerships", tester.test_get_dealerships),
        ("Dashboard Stats", tester.test_dashboard_stats),
    ]
    
    print(f"\nRunning {len(tests)} tests...\n")
    
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            tester.failed_tests.append({
                'name': test_name,
                'error': str(e)
            })
    
    # Print results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {len(tester.failed_tests)}")
    print(f"Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if tester.failed_tests:
        print("\n❌ FAILED TESTS:")
        for i, failure in enumerate(tester.failed_tests, 1):
            print(f"{i}. {failure['name']}")
            if 'error' in failure:
                print(f"   Error: {failure['error']}")
            else:
                print(f"   Expected: {failure.get('expected')}, Got: {failure.get('actual')}")
                if failure.get('response'):
                    print(f"   Response: {failure['response']}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())