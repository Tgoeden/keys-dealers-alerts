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

    def decode_jwt_payload(self, token):
        """Decode JWT token payload to check expiration and remember_me field"""
        try:
            # Split token and get payload (middle part)
            parts = token.split('.')
            if len(parts) != 3:
                return None, "Invalid JWT format"
            
            # Add padding if needed for base64 decoding
            payload_b64 = parts[1]
            padding = 4 - len(payload_b64) % 4
            if padding != 4:
                payload_b64 += '=' * padding
            
            # Decode base64 and parse JSON
            payload_bytes = base64.b64decode(payload_b64)
            payload = json.loads(payload_bytes.decode('utf-8'))
            
            return payload, None
        except Exception as e:
            return None, f"JWT decode error: {str(e)}"

    def verify_token_expiration(self, token, expected_hours, tolerance_minutes=5):
        """Verify JWT token expiration is approximately the expected hours from now"""
        payload, error = self.decode_jwt_payload(token)
        if error:
            return False, error
        
        if 'exp' not in payload:
            return False, "No expiration field in token"
        
        # Convert exp timestamp to datetime
        exp_timestamp = payload['exp']
        exp_datetime = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
        now = datetime.now(timezone.utc)
        
        # Calculate actual hours until expiration
        time_diff = exp_datetime - now
        actual_hours = time_diff.total_seconds() / 3600
        
        # Check if within tolerance
        tolerance_hours = tolerance_minutes / 60
        if abs(actual_hours - expected_hours) <= tolerance_hours:
            return True, f"Token expires in {actual_hours:.2f} hours (expected ~{expected_hours})"
        else:
            return False, f"Token expires in {actual_hours:.2f} hours, expected ~{expected_hours} hours"

    def test_login_without_remember_me(self):
        """Test login WITHOUT remember_me - should get 5-hour token"""
        print("\n🔍 Testing Login WITHOUT remember_me...")
        success, response = self.run_test(
            "Login without remember_me",
            "POST",
            "auth/login",
            200,
            data={
                "email": "demo@keyflow.app",
                "password": "demo123",
                "remember_me": False
            }
        )
        
        if not success or 'access_token' not in response:
            return False
        
        token = response['access_token']
        
        # Verify token expiration is ~5 hours
        exp_valid, exp_msg = self.verify_token_expiration(token, 5)
        print(f"   Token expiration: {exp_msg}")
        
        # Verify remember_me field in token
        payload, error = self.decode_jwt_payload(token)
        if error:
            print(f"   ❌ JWT decode error: {error}")
            return False
        
        remember_me_value = payload.get('remember_me', None)
        if remember_me_value is False:
            print(f"   ✅ remember_me field correctly set to False")
        else:
            print(f"   ❌ remember_me field incorrect: {remember_me_value} (expected False)")
            return False
        
        return exp_valid

    def test_login_with_remember_me(self):
        """Test login WITH remember_me - should get 7-day token"""
        print("\n🔍 Testing Login WITH remember_me...")
        success, response = self.run_test(
            "Login with remember_me",
            "POST",
            "auth/login",
            200,
            data={
                "email": "demo@keyflow.app",
                "password": "demo123",
                "remember_me": True
            }
        )
        
        if not success or 'access_token' not in response:
            return False
        
        token = response['access_token']
        
        # Verify token expiration is ~7 days (168 hours)
        exp_valid, exp_msg = self.verify_token_expiration(token, 168)
        print(f"   Token expiration: {exp_msg}")
        
        # Verify remember_me field in token
        payload, error = self.decode_jwt_payload(token)
        if error:
            print(f"   ❌ JWT decode error: {error}")
            return False
        
        remember_me_value = payload.get('remember_me', None)
        if remember_me_value is True:
            print(f"   ✅ remember_me field correctly set to True")
        else:
            print(f"   ❌ remember_me field incorrect: {remember_me_value} (expected True)")
            return False
        
        return exp_valid

    def test_owner_login_without_remember_me(self):
        """Test owner login WITHOUT remember_me - should get 5-hour token"""
        print("\n🔍 Testing Owner Login WITHOUT remember_me...")
        success, response = self.run_test(
            "Owner login without remember_me",
            "POST",
            "auth/owner-login",
            200,
            data={
                "pin": "9988",
                "remember_me": False
            }
        )
        
        if not success or 'access_token' not in response:
            return False
        
        token = response['access_token']
        
        # Verify token expiration is ~5 hours
        exp_valid, exp_msg = self.verify_token_expiration(token, 5)
        print(f"   Token expiration: {exp_msg}")
        
        # Verify remember_me field in token
        payload, error = self.decode_jwt_payload(token)
        if error:
            print(f"   ❌ JWT decode error: {error}")
            return False
        
        remember_me_value = payload.get('remember_me', None)
        if remember_me_value is False:
            print(f"   ✅ remember_me field correctly set to False")
        else:
            print(f"   ❌ remember_me field incorrect: {remember_me_value} (expected False)")
            return False
        
        return exp_valid

    def test_owner_login_with_remember_me(self):
        """Test owner login WITH remember_me - should get 7-day token"""
        print("\n🔍 Testing Owner Login WITH remember_me...")
        success, response = self.run_test(
            "Owner login with remember_me",
            "POST",
            "auth/owner-login",
            200,
            data={
                "pin": "9988",
                "remember_me": True
            }
        )
        
        if not success or 'access_token' not in response:
            return False
        
        token = response['access_token']
        
        # Verify token expiration is ~7 days (168 hours)
        exp_valid, exp_msg = self.verify_token_expiration(token, 168)
        print(f"   Token expiration: {exp_msg}")
        
        # Verify remember_me field in token
        payload, error = self.decode_jwt_payload(token)
        if error:
            print(f"   ❌ JWT decode error: {error}")
            return False
        
        remember_me_value = payload.get('remember_me', None)
        if remember_me_value is True:
            print(f"   ✅ remember_me field correctly set to True")
        else:
            print(f"   ❌ remember_me field incorrect: {remember_me_value} (expected True)")
            return False
        
        return exp_valid

    def test_demo_login_default_expiration(self):
        """Test demo login (no remember_me option) - should default to 5 hours"""
        print("\n🔍 Testing Demo Login (default expiration)...")
        success, response = self.run_test(
            "Demo login default expiration",
            "POST",
            "auth/demo-login",
            200,
            data={}
        )
        
        if not success or 'access_token' not in response:
            return False
        
        token = response['access_token']
        
        # Verify token expiration is ~5 hours (default)
        exp_valid, exp_msg = self.verify_token_expiration(token, 5)
        print(f"   Token expiration: {exp_msg}")
        
        # Verify remember_me field in token (should be False by default)
        payload, error = self.decode_jwt_payload(token)
        if error:
            print(f"   ❌ JWT decode error: {error}")
            return False
        
        remember_me_value = payload.get('remember_me', None)
        if remember_me_value is False or remember_me_value is None:
            print(f"   ✅ remember_me field correctly set to {remember_me_value} (default)")
        else:
            print(f"   ❌ remember_me field incorrect: {remember_me_value} (expected False or None)")
            return False
        
        return exp_valid

    def test_remember_me_feature_comprehensive(self):
        """Comprehensive test of the Remember Me feature"""
        print("\n🎯 Testing Remember Me Feature Comprehensive")
        print("=" * 60)
        
        all_tests_passed = True
        
        # Test 1: Login WITHOUT remember_me
        try:
            result = self.test_login_without_remember_me()
            if result:
                print("   ✅ Login without remember_me: PASSED")
            else:
                print("   ❌ Login without remember_me: FAILED")
                all_tests_passed = False
        except Exception as e:
            print(f"   ❌ Login without remember_me: ERROR - {str(e)}")
            all_tests_passed = False
        
        # Test 2: Login WITH remember_me
        try:
            result = self.test_login_with_remember_me()
            if result:
                print("   ✅ Login with remember_me: PASSED")
            else:
                print("   ❌ Login with remember_me: FAILED")
                all_tests_passed = False
        except Exception as e:
            print(f"   ❌ Login with remember_me: ERROR - {str(e)}")
            all_tests_passed = False
        
        # Test 3: Owner login WITHOUT remember_me
        try:
            result = self.test_owner_login_without_remember_me()
            if result:
                print("   ✅ Owner login without remember_me: PASSED")
            else:
                print("   ❌ Owner login without remember_me: FAILED")
                all_tests_passed = False
        except Exception as e:
            print(f"   ❌ Owner login without remember_me: ERROR - {str(e)}")
            all_tests_passed = False
        
        # Test 4: Owner login WITH remember_me
        try:
            result = self.test_owner_login_with_remember_me()
            if result:
                print("   ✅ Owner login with remember_me: PASSED")
            else:
                print("   ❌ Owner login with remember_me: FAILED")
                all_tests_passed = False
        except Exception as e:
            print(f"   ❌ Owner login with remember_me: ERROR - {str(e)}")
            all_tests_passed = False
        
        # Test 5: Demo login (default expiration)
        try:
            result = self.test_demo_login_default_expiration()
            if result:
                print("   ✅ Demo login default expiration: PASSED")
            else:
                print("   ❌ Demo login default expiration: FAILED")
                all_tests_passed = False
        except Exception as e:
            print(f"   ❌ Demo login default expiration: ERROR - {str(e)}")
            all_tests_passed = False
        
        print("\n" + "=" * 60)
        if all_tests_passed:
            print("🎉 REMEMBER ME FEATURE: ALL TESTS PASSED!")
            print("   ✅ JWT token expiration working correctly")
            print("   ✅ remember_me field in token payload working correctly")
            print("   ✅ 5-hour expiration for remember_me=false")
            print("   ✅ 7-day expiration for remember_me=true")
            print("   ✅ Demo login defaults to 5-hour expiration")
        else:
            print("❌ REMEMBER ME FEATURE: SOME TESTS FAILED!")
        
        return all_tests_passed
        
    def test_dashboard_stats(self):
        """Test dashboard stats"""
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "stats/dashboard",
            200
        )
        return success

    def test_bulk_import_keys_success(self):
        """Test CSV bulk import for keys - successful import"""
        if not hasattr(self, 'dealership_id') or not self.dealership_id:
            print("❌ No dealership available for bulk import test")
            return False
            
        success, response = self.run_test(
            "Bulk Import Keys - Success",
            "POST",
            "keys/bulk-import",
            200,
            data={
                "dealership_id": self.dealership_id,
                "keys": [
                    {
                        "condition": "new",
                        "stock_number": "BULK-001",
                        "vehicle_year": 2024,
                        "vehicle_make": "Ford",
                        "vehicle_model": "F-150"
                    },
                    {
                        "condition": "used",
                        "stock_number": "BULK-002", 
                        "vehicle_year": 2023,
                        "vehicle_make": "Toyota",
                        "vehicle_model": "Camry"
                    },
                    {
                        "condition": "new",
                        "stock_number": "BULK-003",
                        "vehicle_year": 2024,
                        "vehicle_make": "Honda",
                        "vehicle_model": "Civic"
                    }
                ]
            }
        )
        
        if success and response.get('success') and response.get('imported') == 3:
            print(f"   ✅ Successfully imported {response.get('imported')} keys")
            print(f"   ✅ No errors: {len(response.get('errors', []))} errors")
            return True
        elif success:
            print(f"   ❌ Import response unexpected: {response}")
            return False
        return False

    def test_bulk_import_duplicate_stock_numbers(self):
        """Test bulk import error handling for duplicate stock numbers"""
        if not hasattr(self, 'dealership_id') or not self.dealership_id:
            print("❌ No dealership available for duplicate test")
            return False
            
        success, response = self.run_test(
            "Bulk Import Keys - Duplicate Stock Numbers",
            "POST",
            "keys/bulk-import",
            200,
            data={
                "dealership_id": self.dealership_id,
                "keys": [
                    {
                        "condition": "new",
                        "stock_number": "BULK-001",  # This should already exist from previous test
                        "vehicle_year": 2024,
                        "vehicle_make": "Ford",
                        "vehicle_model": "Mustang"
                    }
                ]
            }
        )
        
        if success and response.get('errors') and len(response.get('errors')) > 0:
            error = response['errors'][0]
            if 'already exists' in error.get('error', '').lower():
                print(f"   ✅ Duplicate stock number correctly rejected: {error.get('error')}")
                return True
            else:
                print(f"   ❌ Unexpected error message: {error.get('error')}")
                return False
        elif success:
            print(f"   ❌ Expected error for duplicate stock number, but got: {response}")
            return False
        return False

    def test_bulk_import_invalid_condition(self):
        """Test bulk import error handling for invalid condition"""
        if not hasattr(self, 'dealership_id') or not self.dealership_id:
            print("❌ No dealership available for invalid condition test")
            return False
            
        success, response = self.run_test(
            "Bulk Import Keys - Invalid Condition",
            "POST",
            "keys/bulk-import",
            200,
            data={
                "dealership_id": self.dealership_id,
                "keys": [
                    {
                        "condition": "excellent",  # Invalid - should be 'new' or 'used'
                        "stock_number": "INVALID-001",
                        "vehicle_year": 2024,
                        "vehicle_make": "Ford",
                        "vehicle_model": "Explorer"
                    }
                ]
            }
        )
        
        if success and response.get('errors') and len(response.get('errors')) > 0:
            error = response['errors'][0]
            if 'invalid condition' in error.get('error', '').lower():
                print(f"   ✅ Invalid condition correctly rejected: {error.get('error')}")
                return True
            else:
                print(f"   ❌ Unexpected error message: {error.get('error')}")
                return False
        elif success:
            print(f"   ❌ Expected error for invalid condition, but got: {response}")
            return False
        return False

    def test_bulk_import_demo_limits(self):
        """Test bulk import respects demo limits"""
        success, response = self.run_test(
            "Bulk Import Keys - Demo Limits",
            "POST",
            "keys/bulk-import",
            403,  # Should fail due to demo limits
            data={
                "dealership_id": self.dealership_id,
                "keys": [
                    {
                        "condition": "new",
                        "stock_number": f"DEMO-{i}",
                        "vehicle_year": 2024,
                        "vehicle_make": "Ford",
                        "vehicle_model": "F-150"
                    } for i in range(10)  # Try to import 10 keys (should exceed demo limit)
                ]
            },
            use_demo_token=True
        )
        
        if success:
            print(f"   ✅ Demo limits correctly enforced with 403 status")
            return True
        return False

    def test_notes_history_checkout_return_cycle(self):
        """Test notes history preservation through checkout/return cycle"""
        if not hasattr(self, 'dealership_id') or not self.dealership_id:
            print("❌ No dealership available for notes history test")
            return False
        
        # First create a key for testing notes history
        success, response = self.run_test(
            "Create Key for Notes History Test",
            "POST",
            "keys",
            200,
            data={
                "stock_number": "NOTES-TEST-001",
                "vehicle_year": 2024,
                "vehicle_make": "Ford",
                "vehicle_model": "F-150",
                "condition": "new",
                "dealership_id": self.dealership_id
            }
        )
        
        if not success or 'id' not in response:
            print("❌ Failed to create key for notes history test")
            return False
        
        test_key_id = response['id']
        print(f"   Created test key: {test_key_id}")
        
        # Step 1: Checkout key with notes
        success, response = self.run_test(
            "Checkout Key with Notes",
            "POST",
            f"keys/{test_key_id}/checkout",
            200,
            data={
                "reason": "test_drive",
                "notes": "First checkout - customer test drive"
            }
        )
        
        if not success:
            print("❌ Failed to checkout key with notes")
            return False
        
        # Verify notes_history contains the checkout note
        notes_history = response.get('notes_history', [])
        if len(notes_history) != 1:
            print(f"   ❌ Expected 1 note in history, got {len(notes_history)}")
            return False
        
        first_note = notes_history[0]
        if (first_note.get('note') == "First checkout - customer test drive" and 
            first_note.get('action') == 'checkout' and
            first_note.get('user_name')):
            print(f"   ✅ Checkout note correctly added to history")
        else:
            print(f"   ❌ Checkout note incorrect: {first_note}")
            return False
        
        # Step 2: Return key with notes
        success, response = self.run_test(
            "Return Key with Notes",
            "POST",
            f"keys/{test_key_id}/return",
            200,
            data={
                "notes": "Returned after test drive - customer interested"
            }
        )
        
        if not success:
            print("❌ Failed to return key with notes")
            return False
        
        # Verify notes_history contains both notes (return first, then checkout)
        notes_history = response.get('notes_history', [])
        if len(notes_history) != 2:
            print(f"   ❌ Expected 2 notes in history, got {len(notes_history)}")
            return False
        
        # Notes should be in reverse chronological order (newest first)
        return_note = notes_history[0]  # Most recent
        checkout_note = notes_history[1]  # Older
        
        if (return_note.get('note') == "Returned after test drive - customer interested" and 
            return_note.get('action') == 'return' and
            checkout_note.get('note') == "First checkout - customer test drive" and
            checkout_note.get('action') == 'checkout'):
            print(f"   ✅ Return note correctly added to history (newest first)")
        else:
            print(f"   ❌ Notes history incorrect after return: {notes_history}")
            return False
        
        # Step 3: Checkout again with different notes
        success, response = self.run_test(
            "Checkout Key Again with Different Notes",
            "POST",
            f"keys/{test_key_id}/checkout",
            200,
            data={
                "reason": "extended_test_drive",
                "notes": "Second checkout - extended test drive for family"
            }
        )
        
        if not success:
            print("❌ Failed to checkout key again with notes")
            return False
        
        # Verify notes_history contains all 3 notes
        notes_history = response.get('notes_history', [])
        if len(notes_history) != 3:
            print(f"   ❌ Expected 3 notes in history, got {len(notes_history)}")
            return False
        
        # Verify order: newest checkout, return, original checkout
        latest_checkout = notes_history[0]
        return_note = notes_history[1]
        original_checkout = notes_history[2]
        
        if (latest_checkout.get('note') == "Second checkout - extended test drive for family" and
            latest_checkout.get('action') == 'checkout' and
            return_note.get('action') == 'return' and
            original_checkout.get('action') == 'checkout'):
            print(f"   ✅ All 3 notes correctly preserved in history (newest first)")
            print(f"   ✅ Notes include: note text, user_name, action, timestamp")
            
            # Verify all required fields are present
            for i, note in enumerate(notes_history):
                if not all(key in note for key in ['note', 'user_name', 'action', 'timestamp']):
                    print(f"   ❌ Note {i+1} missing required fields: {note}")
                    return False
            
            print(f"   ✅ All notes have required fields: note, user_name, action, timestamp")
            return True
        else:
            print(f"   ❌ Notes history incorrect after second checkout: {notes_history}")
            return False

    def test_notes_history_comprehensive_flow(self):
        """Test the complete notes history flow as specified in review request"""
        print("\n🎯 Testing Notes History Comprehensive Flow")
        print("=" * 60)
        
        # Use demo login for this test
        success, response = self.run_test(
            "Demo Login for Notes History Test",
            "POST",
            "auth/demo-login",
            200,
            data={}
        )
        
        if not success or 'access_token' not in response:
            print("❌ Demo login failed for notes history test")
            return False
        
        demo_token = response['access_token']
        demo_user = response['user']
        demo_dealership_id = demo_user.get('dealership_id')
        
        if not demo_dealership_id:
            print("❌ No dealership ID from demo login")
            return False
        
        print(f"   ✅ Demo login successful, dealership: {demo_dealership_id}")
        
        # Create test keys via bulk import
        print("\nStep 1: Create test keys via bulk import")
        headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {demo_token}'}
        
        try:
            response = requests.post(f"{self.base_url}/keys/bulk-import", json={
                "dealership_id": demo_dealership_id,
                "keys": [
                    {
                        "condition": "new",
                        "stock_number": "NOTES-FLOW-001",
                        "vehicle_year": 2024,
                        "vehicle_make": "Ford",
                        "vehicle_model": "F-150"
                    }
                ]
            }, headers=headers, timeout=10)
            
            if response.status_code == 200:
                import_result = response.json()
                if import_result.get('imported') == 1:
                    print(f"   ✅ Test key imported successfully")
                else:
                    print(f"   ❌ Import failed: {import_result}")
                    return False
            else:
                print(f"   ❌ Bulk import failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"   ❌ Bulk import error: {str(e)}")
            return False
        
        # Get the created key
        print("\nStep 2: Verify key exists")
        try:
            response = requests.get(f"{self.base_url}/keys", headers=headers, timeout=10)
            if response.status_code == 200:
                keys = response.json()
                test_key = next((k for k in keys if k.get('stock_number') == 'NOTES-FLOW-001'), None)
                if test_key:
                    test_key_id = test_key['id']
                    print(f"   ✅ Test key found: {test_key_id}")
                else:
                    print(f"   ❌ Test key not found in keys list")
                    return False
            else:
                print(f"   ❌ Failed to get keys: {response.status_code}")
                return False
        except Exception as e:
            print(f"   ❌ Get keys error: {str(e)}")
            return False
        
        # Step 3: Checkout key with notes
        print("\nStep 3: Checkout key with notes")
        try:
            response = requests.post(f"{self.base_url}/keys/{test_key_id}/checkout", json={
                "reason": "test_drive",
                "notes": "Customer John Smith test drive - interested in F-150"
            }, headers=headers, timeout=10)
            
            if response.status_code == 200:
                key_data = response.json()
                notes_history = key_data.get('notes_history', [])
                if len(notes_history) == 1 and notes_history[0].get('action') == 'checkout':
                    print(f"   ✅ Checkout note added to history: {notes_history[0].get('note')}")
                else:
                    print(f"   ❌ Checkout notes history incorrect: {notes_history}")
                    return False
            else:
                print(f"   ❌ Checkout failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"   ❌ Checkout error: {str(e)}")
            return False
        
        # Step 4: Return key with notes
        print("\nStep 4: Return key with notes")
        try:
            response = requests.post(f"{self.base_url}/keys/{test_key_id}/return", json={
                "notes": "Returned - customer wants to think about it over weekend"
            }, headers=headers, timeout=10)
            
            if response.status_code == 200:
                key_data = response.json()
                notes_history = key_data.get('notes_history', [])
                if (len(notes_history) == 2 and 
                    notes_history[0].get('action') == 'return' and
                    notes_history[1].get('action') == 'checkout'):
                    print(f"   ✅ Return note added to history (newest first)")
                    print(f"   ✅ Both notes preserved: checkout + return")
                else:
                    print(f"   ❌ Return notes history incorrect: {notes_history}")
                    return False
            else:
                print(f"   ❌ Return failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"   ❌ Return error: {str(e)}")
            return False
        
        # Step 5: Checkout again with new notes
        print("\nStep 5: Checkout again with different notes")
        try:
            response = requests.post(f"{self.base_url}/keys/{test_key_id}/checkout", json={
                "reason": "extended_test_drive",
                "notes": "Customer came back - wants extended test drive with spouse"
            }, headers=headers, timeout=10)
            
            if response.status_code == 200:
                key_data = response.json()
                notes_history = key_data.get('notes_history', [])
                if len(notes_history) == 3:
                    # Verify order: newest checkout, return, original checkout
                    actions = [note.get('action') for note in notes_history]
                    if actions == ['checkout', 'return', 'checkout']:
                        print(f"   ✅ All 3 notes preserved in correct order (newest first)")
                        
                        # Verify all notes have required fields
                        all_fields_present = True
                        for note in notes_history:
                            required_fields = ['note', 'user_name', 'action', 'timestamp']
                            if not all(field in note for field in required_fields):
                                print(f"   ❌ Note missing required fields: {note}")
                                all_fields_present = False
                        
                        if all_fields_present:
                            print(f"   ✅ All notes contain required fields: note, user_name, action, timestamp")
                            print(f"   ✅ NOTES HISTORY FEATURE WORKING CORRECTLY!")
                            return True
                        else:
                            return False
                    else:
                        print(f"   ❌ Notes in wrong order. Expected [checkout, return, checkout], got {actions}")
                        return False
                else:
                    print(f"   ❌ Expected 3 notes, got {len(notes_history)}: {notes_history}")
                    return False
            else:
                print(f"   ❌ Second checkout failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"   ❌ Second checkout error: {str(e)}")
            return False

def main():
    print("🚀 Starting KeyFlow API Tests")
    print("=" * 50)
    
    tester = KeyFlowAPITester()
    
    # NEW PRIORITY: Test the two newly implemented features
    print("\n🎯 PRIORITY: Testing New Features - CSV Bulk Import & Notes History")
    print("=" * 70)
    
    # Test CSV Bulk Import Feature
    print("\n📋 Testing CSV Bulk Import for Keys")
    print("-" * 40)
    bulk_import_success = True
    
    # First need to set up authentication and dealership
    try:
        if not tester.test_demo_login():
            print("❌ Demo login failed - cannot test bulk import")
            bulk_import_success = False
        elif not tester.test_owner_login():
            print("❌ Owner login failed - cannot create dealership")
            bulk_import_success = False
        elif not tester.test_create_dealership_with_admin():
            print("❌ Dealership creation failed - cannot test bulk import")
            bulk_import_success = False
        elif not tester.test_admin_login():
            print("❌ Admin login failed - cannot test bulk import")
            bulk_import_success = False
        else:
            # Run bulk import tests
            tests_results = [
                tester.test_bulk_import_keys_success(),
                tester.test_bulk_import_duplicate_stock_numbers(),
                tester.test_bulk_import_invalid_condition(),
                tester.test_bulk_import_demo_limits()
            ]
            bulk_import_success = all(tests_results)
            
            if bulk_import_success:
                print("✅ CSV BULK IMPORT FEATURE VERIFIED SUCCESSFULLY!")
            else:
                print("❌ CSV BULK IMPORT FEATURE VERIFICATION FAILED!")
    except Exception as e:
        print(f"❌ Bulk import feature test failed with exception: {str(e)}")
        bulk_import_success = False
    
    # Test Notes History Feature
    print("\n📝 Testing Notes History Feature")
    print("-" * 40)
    notes_history_success = True
    
    try:
        # Test individual notes history functionality
        if not tester.test_notes_history_checkout_return_cycle():
            print("❌ Notes history checkout/return cycle failed")
            notes_history_success = False
        
        # Test comprehensive flow as specified in review request
        if not tester.test_notes_history_comprehensive_flow():
            print("❌ Notes history comprehensive flow failed")
            notes_history_success = False
        
        if notes_history_success:
            print("✅ NOTES HISTORY FEATURE VERIFIED SUCCESSFULLY!")
        else:
            print("❌ NOTES HISTORY FEATURE VERIFICATION FAILED!")
    except Exception as e:
        print(f"❌ Notes history feature test failed with exception: {str(e)}")
        notes_history_success = False
    
    # SECONDARY: Remember Me Feature Testing
    print("\n🎯 SECONDARY: Remember Me Feature Testing")
    print("=" * 60)
    try:
        remember_me_success = tester.test_remember_me_feature_comprehensive()
        if remember_me_success:
            print("✅ REMEMBER ME FEATURE VERIFIED SUCCESSFULLY!")
        else:
            print("❌ REMEMBER ME FEATURE VERIFICATION FAILED!")
    except Exception as e:
        print(f"❌ Remember Me feature test failed with exception: {str(e)}")
        remember_me_success = False
    
    # TERTIARY: Sales goal bug fix test
    print("\n🎯 TERTIARY: Sales Goal Bug Fix Verification")
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
    
    # Special reporting for priority features
    print("\n🎯 PRIORITY FEATURE RESULTS:")
    print(f"   CSV Bulk Import Feature: {'✅ PASSED' if bulk_import_success else '❌ FAILED'}")
    print(f"   Notes History Feature: {'✅ PASSED' if notes_history_success else '❌ FAILED'}")
    print(f"   Remember Me Feature: {'✅ PASSED' if remember_me_success else '❌ FAILED'}")
    print(f"   Sales Goal Bug Fix: {'✅ PASSED' if bug_fix_success else '❌ FAILED'}")
    
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
    
    # Overall success based on new priority features
    overall_success = bulk_import_success and notes_history_success
    return 0 if overall_success else 1

if __name__ == "__main__":
    sys.exit(main())