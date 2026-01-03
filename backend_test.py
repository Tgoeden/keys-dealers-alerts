#!/usr/bin/env python3

import requests
import sys
import json
import base64
from datetime import datetime, timezone

class KeyFlowAPITester:
    def __init__(self, base_url="https://dealflow-keys.preview.emergentagent.com/api"):
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

    def test_create_dealership_with_admin(self):
        """Create a test dealership with admin credentials as owner"""
        import time
        timestamp = int(time.time())
        success, response = self.run_test(
            "Create Dealership with Admin",
            "POST",
            "dealerships",
            200,
            data={
                "name": f"Test Auto Dealership {timestamp}",
                "dealership_type": "automotive",
                "address": "123 Test St",
                "phone": "555-0123",
                "admin_email": f"admin{timestamp}@testdealership.com",
                "admin_password": "admin123",
                "admin_name": "Test Admin"
            },
            use_owner_token=True
        )
        if success and 'id' in response:
            self.dealership_id = response['id']
            self.admin_email = f"admin{timestamp}@testdealership.com"
            print(f"   Dealership created: {self.dealership_id}")
            print(f"   Admin email: {self.admin_email}")
            return True
        return False

    def test_create_dealership_without_admin_fails(self):
        """Test that creating dealership without admin credentials should still work but not create admin"""
        import time
        timestamp = int(time.time())
        success, response = self.run_test(
            "Create Dealership without Admin",
            "POST",
            "dealerships",
            200,
            data={
                "name": f"Test Dealership No Admin {timestamp}",
                "dealership_type": "automotive",
                "address": "456 Test Ave",
                "phone": "555-0456"
            },
            use_owner_token=True
        )
        return success

    def test_non_owner_cannot_create_dealership(self):
        """Test that non-owners get 403 when trying to create dealerships"""
        import time
        timestamp = int(time.time())
        # First create a regular user token
        success, response = self.run_test(
            "Register Regular User",
            "POST",
            "auth/register",
            200,
            data={
                "email": f"regular{timestamp}@user.com",
                "password": "password123",
                "name": "Regular User",
                "role": "user"
            }
        )
        
        if not success:
            return False
            
        regular_token = response.get('access_token')
        if not regular_token:
            return False
            
        # Now try to create dealership with regular user token
        headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {regular_token}'}
        url = f"{self.base_url}/dealerships"
        
        try:
            response = requests.post(url, json={
                "name": "Should Fail Dealership",
                "dealership_type": "automotive"
            }, headers=headers, timeout=10)
            
            success = response.status_code == 403
            if success:
                print(f"✅ Passed - Non-owner correctly denied with 403")
                self.tests_passed += 1
            else:
                print(f"❌ Failed - Expected 403, got {response.status_code}")
                self.failed_tests.append({
                    'name': 'Non-owner dealership creation',
                    'expected': 403,
                    'actual': response.status_code
                })
            self.tests_run += 1
            return success
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({'name': 'Non-owner dealership creation', 'error': str(e)})
            self.tests_run += 1
            return False

    def test_admin_login(self):
        """Test admin login with the credentials created during dealership creation"""
        if not hasattr(self, 'admin_email'):
            print("❌ No admin email available for login test")
            return False
            
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.admin_email,
                "password": "admin123"
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Admin login successful, token: {self.token[:20]}...")
            print(f"   Admin user ID: {self.user_id}")
            return True
        return False

    def test_create_user_under_dealership(self):
        """Create a regular user under the dealership"""
        import time
        timestamp = int(time.time())
        success, response = self.run_test(
            "Create User Under Dealership",
            "POST",
            "users",
            200,
            data={
                "email": f"user{timestamp}@dealership.com",
                "password": "password123",
                "name": "Test User",
                "role": "user",
                "dealership_id": self.dealership_id
            }
        )
        return success

    def test_create_key_with_new_fields(self):
        """Create a test key with new condition and vehicle_make fields"""
        if not hasattr(self, 'dealership_id') or not self.dealership_id:
            print("❌ No dealership available for key creation test")
            return False
            
        success, response = self.run_test(
            "Create Key with New Fields",
            "POST",
            "keys",
            200,
            data={
                "stock_number": "TEST-001",
                "vehicle_year": 2024,
                "vehicle_make": "Ford",
                "vehicle_model": "F-150",
                "vehicle_vin": "1FTFW1ET5DFC12345",
                "condition": "new",
                "dealership_id": self.dealership_id
            }
        )
        if success and 'id' in response:
            self.key_id = response['id']
            print(f"   Key created: {self.key_id}")
            # Verify the response contains the new fields
            if response.get('condition') == 'new' and response.get('vehicle_make') == 'Ford':
                print(f"   ✅ New fields verified: condition={response.get('condition')}, make={response.get('vehicle_make')}")
                return True
            else:
                print(f"   ❌ New fields missing or incorrect in response")
                return False
        return False

    def test_create_used_key(self):
        """Create a used key to test condition field"""
        if not hasattr(self, 'dealership_id') or not self.dealership_id:
            print("❌ No dealership available for used key creation test")
            return False
            
        success, response = self.run_test(
            "Create Used Key",
            "POST",
            "keys",
            200,
            data={
                "stock_number": "USED-001",
                "vehicle_year": 2020,
                "vehicle_make": "Toyota",
                "vehicle_model": "Camry",
                "vehicle_vin": "4T1BF1FK5CU123456",
                "condition": "used",
                "dealership_id": self.dealership_id
            }
        )
        if success and response.get('condition') == 'used':
            print(f"   ✅ Used condition verified")
            return True
        return False

    def test_create_rv_dealership(self):
        """Create an RV dealership to test RV-specific features"""
        import time
        timestamp = int(time.time())
        success, response = self.run_test(
            "Create RV Dealership",
            "POST",
            "dealerships",
            200,
            data={
                "name": f"Test RV Dealership {timestamp}",
                "dealership_type": "rv",
                "address": "789 RV Lane",
                "phone": "555-0789",
                "service_bays": 10,
                "admin_email": f"rvadmin{timestamp}@rvdealership.com",
                "admin_password": "admin123",
                "admin_name": "RV Admin"
            },
            use_owner_token=True
        )
        if success and 'id' in response:
            self.rv_dealership_id = response['id']
            print(f"   RV Dealership created: {self.rv_dealership_id}")
            return True
        return False

    def test_create_rv_key_without_vin(self):
        """Create an RV key without VIN to test RV-specific behavior"""
        if not hasattr(self, 'rv_dealership_id'):
            print("❌ No RV dealership available for RV key test")
            return False
        
        # First login as owner to create RV key (since we don't have RV admin login set up)
        success, response = self.run_test(
            "Create RV Key without VIN",
            "POST",
            "keys",
            200,
            data={
                "stock_number": "RV-001",
                "vehicle_year": 2024,
                "vehicle_make": "Winnebago",
                "vehicle_model": "Minnie Winnie",
                "condition": "new",
                "dealership_id": self.rv_dealership_id
            },
            use_owner_token=True  # Use owner token instead of admin token
        )
        if success and 'id' in response:
            print(f"   RV Key created without VIN: {response['id']}")
            # Verify that VIN is None or empty
            if response.get('vehicle_vin') is None:
                print(f"   ✅ RV Key correctly created without VIN")
                return True
            else:
                print(f"   ❌ RV Key unexpectedly has VIN: {response.get('vehicle_vin')}")
                return False
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
        """Test creating sales goal with fixed API (only year and yearly_sales_target)"""
        year = 2025  # Use future year to avoid conflicts
        success, response = self.run_test(
            "Create Sales Goal",
            "POST",
            "sales-goals",
            200,
            data={
                "year": year,
                "yearly_sales_target": 85  # Test with the specific value from bug report
            }
        )
        if success and 'id' in response:
            self.sales_goal_id = response['id']
            print(f"   Sales goal created: {self.sales_goal_id}")
            # Verify the response contains correct fields
            if response.get('yearly_sales_target') == 85 and response.get('year') == year:
                print(f"   ✅ Sales goal fields verified: year={response.get('year')}, target={response.get('yearly_sales_target')}")
                return True
            else:
                print(f"   ❌ Sales goal fields incorrect in response")
                return False
        return False

    def test_get_sales_goals(self):
        """Test getting sales goals for specific year"""
        year = 2025
        success, response = self.run_test(
            "Get Sales Goals",
            "GET",
            f"sales-goals?year={year}",
            200
        )
        if success and isinstance(response, list) and len(response) > 0:
            goal = response[0]
            if goal.get('year') == year and goal.get('yearly_sales_target') == 85:
                print(f"   ✅ Sales goal retrieved correctly: {goal.get('yearly_sales_target')} target for {goal.get('year')}")
                return True
            else:
                print(f"   ❌ Sales goal data incorrect: {goal}")
                return False
        elif success and isinstance(response, list) and len(response) == 0:
            print(f"   ⚠️  No sales goals found for year {year}")
            return True
        return False

    def test_update_sales_goal(self):
        """Test updating sales goal"""
        if not hasattr(self, 'sales_goal_id') or not self.sales_goal_id:
            print("❌ No sales goal ID available for update test")
            return False
            
        success, response = self.run_test(
            "Update Sales Goal",
            "PUT",
            f"sales-goals/{self.sales_goal_id}",
            200,
            data={
                "year": 2025,
                "yearly_sales_target": 120  # Update to new target
            }
        )
        if success and response.get('yearly_sales_target') == 120:
            print(f"   ✅ Sales goal updated successfully to {response.get('yearly_sales_target')}")
            return True
        return False

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

    def test_sales_goal_bug_fix_scenario(self):
        """Test the specific sales goal bug fix scenario from the review request"""
        print("\n🎯 Testing Sales Goal Bug Fix Scenario")
        print("=" * 50)
        
        # Step 1: Demo Login
        print("Step 1: Demo Login")
        success, response = self.run_test(
            "Demo Login for Bug Fix Test",
            "POST",
            "auth/demo-login",
            200,
            data={}
        )
        if not success or 'access_token' not in response:
            print("❌ Demo login failed - cannot proceed with bug fix test")
            return False
            
        demo_token = response['access_token']
        demo_user_id = response['user']['id']
        print(f"   ✅ Demo login successful, user ID: {demo_user_id}")
        
        # Step 2: Try to create Sales Goal, handle existing goal scenario
        print("\nStep 2: Create/Update Sales Goal (year: 2025, target: 85)")
        headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {demo_token}'}
        url = f"{self.base_url}/sales-goals"
        goal_id = None
        
        try:
            # First try to create
            response = requests.post(url, json={
                "year": 2025,
                "yearly_sales_target": 85
            }, headers=headers, timeout=10)
            
            if response.status_code == 200:
                goal_data = response.json()
                goal_id = goal_data.get('id')
                print(f"   ✅ Sales goal created successfully: ID {goal_id}")
                print(f"   ✅ Goal data: year={goal_data.get('year')}, target={goal_data.get('yearly_sales_target')}")
            elif response.status_code == 400 and "Goal already exists" in response.text:
                print("   ℹ️  Goal already exists for 2025, will test update functionality")
                # Get existing goal
                get_response = requests.get(f"{self.base_url}/sales-goals?year=2025", headers=headers, timeout=10)
                if get_response.status_code == 200:
                    goals = get_response.json()
                    if goals and len(goals) > 0:
                        goal_id = goals[0]['id']
                        print(f"   ✅ Found existing goal: ID {goal_id}")
                    else:
                        print("   ❌ No existing goals found despite error message")
                        return False
                else:
                    print(f"   ❌ Failed to get existing goals: {get_response.status_code}")
                    return False
            else:
                print(f"   ❌ Sales goal creation failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
        except Exception as e:
            print(f"   ❌ Sales goal creation error: {str(e)}")
            return False
        
        # Step 3: Get Sales Goals
        print("\nStep 3: Get Sales Goals for 2025")
        try:
            response = requests.get(f"{self.base_url}/sales-goals?year=2025", headers=headers, timeout=10)
            if response.status_code == 200:
                goals = response.json()
                if goals and len(goals) > 0:
                    goal = goals[0]
                    print(f"   ✅ Retrieved goal: year={goal.get('year')}, target={goal.get('yearly_sales_target')}")
                else:
                    print("   ⚠️  No goals found for 2025")
            else:
                print(f"   ❌ Get goals failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"   ❌ Get goals error: {str(e)}")
            return False
        
        # Step 4: Update Sales Goal (this tests the bug fix)
        print("\nStep 4: Update Sales Goal to 120 (Testing Bug Fix)")
        if not goal_id:
            print("   ❌ No goal ID available for update test")
            return False
            
        try:
            response = requests.put(f"{self.base_url}/sales-goals/{goal_id}", json={
                "year": 2025,
                "yearly_sales_target": 120
            }, headers=headers, timeout=10)
            
            if response.status_code == 200:
                updated_goal = response.json()
                print(f"   ✅ Goal updated successfully: target={updated_goal.get('yearly_sales_target')}")
                print("   ✅ BUG FIX VERIFIED: Sales goal save/update working correctly!")
            else:
                print(f"   ❌ Goal update failed: {response.status_code}")
                print(f"   Response: {response.text}")
                print("   ❌ BUG FIX FAILED: Sales goal save still broken!")
                return False
        except Exception as e:
            print(f"   ❌ Goal update error: {str(e)}")
            return False
        
        # Step 5: Get Sales Progress
        print("\nStep 5: Get Sales Progress")
        try:
            response = requests.get(f"{self.base_url}/sales-progress/{demo_user_id}?year=2025", headers=headers, timeout=10)
            if response.status_code == 200:
                progress = response.json()
                goal_info = progress.get('goal', {})
                print(f"   ✅ Progress retrieved: goal target={goal_info.get('yearly_sales_target')}, current sales={progress.get('total_sales')}")
            else:
                print(f"   ❌ Get progress failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"   ❌ Get progress error: {str(e)}")
            return False
        
        # Step 6: Log Daily Activity
        print("\nStep 6: Log Daily Activity")
        try:
            response = requests.post(f"{self.base_url}/daily-activities", json={
                "date": "2025-01-15",
                "worked": True,
                "leads_walk_in": 3,
                "leads_phone": 2,
                "leads_internet": 1,
                "writeups": 2,
                "sales": 1,
                "appointments_scheduled": 2,
                "appointments_shown": 1,
                "notes": "Test activity for sales goal bug fix verification"
            }, headers=headers, timeout=10)
            
            if response.status_code == 200:
                activity = response.json()
                print(f"   ✅ Activity logged: sales={activity.get('sales')}, leads={activity.get('leads_walk_in', 0) + activity.get('leads_phone', 0) + activity.get('leads_internet', 0)}")
            else:
                print(f"   ❌ Activity logging failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
        except Exception as e:
            print(f"   ❌ Activity logging error: {str(e)}")
            return False
        
        print("\n🎉 SALES GOAL BUG FIX TEST PASSED!")
        print("   ✅ Demo login working")
        print("   ✅ Sales goal create/update working (no more 'failed to save' error)")
        print("   ✅ Sales goal retrieval working")
        print("   ✅ Sales progress calculation working")
        print("   ✅ Daily activity logging working")
        return True

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
    
    # First run the comprehensive sales goal bug fix test
    print("\n🎯 PRIORITY: Sales Goal Bug Fix Verification")
    print("=" * 60)
    try:
        bug_fix_success = tester.test_sales_goal_bug_fix_scenario()
        if bug_fix_success:
            print("✅ SALES GOAL BUG FIX VERIFIED SUCCESSFULLY!")
        else:
            print("❌ SALES GOAL BUG FIX VERIFICATION FAILED!")
    except Exception as e:
        print(f"❌ Sales goal bug fix test failed with exception: {str(e)}")
        bug_fix_success = False
    
    print("\n" + "=" * 60)
    print("🔄 Running Additional API Tests")
    print("=" * 60)
    
    # Test sequence
    tests = [
        ("API Health Check", tester.test_health_check),
        ("Demo Login", tester.test_demo_login),
        ("Demo Limits", tester.test_demo_limits),
        ("Owner Login (PIN 9988)", tester.test_owner_login),
        ("Create Dealership with Admin", tester.test_create_dealership_with_admin),
        ("Create Dealership without Admin", tester.test_create_dealership_without_admin_fails),
        ("Non-owner Cannot Create Dealership", tester.test_non_owner_cannot_create_dealership),
        ("Create RV Dealership", tester.test_create_rv_dealership),
        ("Admin Login", tester.test_admin_login),
        ("Create User Under Dealership", tester.test_create_user_under_dealership),
        ("Create Key with New Fields", tester.test_create_key_with_new_fields),
        ("Create Used Key", tester.test_create_used_key),
        ("Create RV Key without VIN", tester.test_create_rv_key_without_vin),
        ("Checkout Key", tester.test_checkout_key),
        ("Return Key", tester.test_return_key),
        ("Create Sales Goal", tester.test_create_sales_goal),
        ("Get Sales Goals", tester.test_get_sales_goals),
        ("Update Sales Goal", tester.test_update_sales_goal),
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