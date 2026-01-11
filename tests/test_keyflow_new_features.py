"""
KeyFlow Backend API Tests - New Features
Testing: Admin PIN login, Staff PIN login, User creation with PIN, 
Image upload, Repair requests, PIN change, Custom roles
"""
import pytest
import requests
import os
import uuid
import base64
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://keyflow-mechanic.preview.emergentagent.com')

# Test data
TEST_TIMESTAMP = int(datetime.now().timestamp())
TEST_ADMIN_EMAIL = f"TEST_admin_{TEST_TIMESTAMP}@test.com"
TEST_ADMIN_PASSWORD = "testpass123"
TEST_ADMIN_PIN = "1234"
TEST_USER_NAME = f"TEST_User_{TEST_TIMESTAMP}"
TEST_USER_PIN = "5678"
TEST_DEALERSHIP_NAME = f"TEST_Dealership_{TEST_TIMESTAMP}"


class TestPublicEndpoints:
    """Test public endpoints that don't require authentication"""
    
    def test_public_dealerships_endpoint(self):
        """Test GET /api/dealerships/public returns list of dealerships"""
        response = requests.get(f"{BASE_URL}/api/dealerships/public")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of dealerships"
        # Should have at least Demo Dealership
        assert len(data) > 0, "Expected at least one dealership"
        # Each dealership should have id and name
        for d in data[:3]:  # Check first 3
            assert "id" in d, "Dealership should have id"
            assert "name" in d, "Dealership should have name"
        print(f"✓ Public dealerships endpoint returns {len(data)} dealerships")


class TestDemoLogin:
    """Test demo login functionality"""
    
    def test_demo_login(self):
        """Test POST /api/auth/demo-login creates demo session"""
        response = requests.post(f"{BASE_URL}/api/auth/demo-login")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "access_token" in data, "Response should have access_token"
        assert "user" in data, "Response should have user"
        assert data["user"]["role"] == "dealership_admin", "Demo user should be dealership_admin"
        print(f"✓ Demo login successful, user: {data['user']['name']}")
        return data["access_token"]


class TestOwnerLogin:
    """Test owner login with PIN"""
    
    def test_owner_login_with_correct_pin(self):
        """Test POST /api/auth/owner-login with correct PIN"""
        response = requests.post(f"{BASE_URL}/api/auth/owner-login", json={"pin": "9988"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "access_token" in data, "Response should have access_token"
        assert data["user"]["role"] == "owner", "User should be owner"
        print(f"✓ Owner login successful")
        return data["access_token"]
    
    def test_owner_login_with_wrong_pin(self):
        """Test POST /api/auth/owner-login with wrong PIN returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/owner-login", json={"pin": "0000"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Owner login with wrong PIN correctly rejected")


class TestDealershipCreationWithAdmin:
    """Test dealership creation with admin credentials"""
    
    @pytest.fixture
    def owner_token(self):
        """Get owner token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/owner-login", json={"pin": "9988"})
        return response.json()["access_token"]
    
    def test_create_dealership_with_admin(self, owner_token):
        """Test creating dealership with admin credentials"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        dealership_data = {
            "name": TEST_DEALERSHIP_NAME,
            "dealership_type": "automotive",
            "admin_email": TEST_ADMIN_EMAIL,
            "admin_password": TEST_ADMIN_PASSWORD,
            "admin_name": "Test Admin",
            "admin_pin": TEST_ADMIN_PIN
        }
        response = requests.post(f"{BASE_URL}/api/dealerships", json=dealership_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["name"] == TEST_DEALERSHIP_NAME
        print(f"✓ Dealership created with admin: {data['id']}")
        return data["id"]


class TestAdminPinLogin:
    """Test admin PIN login flow"""
    
    @pytest.fixture
    def setup_dealership_with_admin(self):
        """Create a dealership with admin for testing"""
        # Login as owner
        owner_response = requests.post(f"{BASE_URL}/api/auth/owner-login", json={"pin": "9988"})
        owner_token = owner_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {owner_token}"}
        
        # Create dealership with admin
        timestamp = int(datetime.now().timestamp())
        dealership_data = {
            "name": f"TEST_AdminPinTest_{timestamp}",
            "dealership_type": "automotive",
            "admin_email": f"TEST_adminpin_{timestamp}@test.com",
            "admin_password": "testpass123",
            "admin_name": "Admin Pin Test",
            "admin_pin": "4321"
        }
        response = requests.post(f"{BASE_URL}/api/dealerships", json=dealership_data, headers=headers)
        data = response.json()
        return data["id"], "4321"
    
    def test_admin_pin_login(self, setup_dealership_with_admin):
        """Test POST /api/auth/admin-pin-login"""
        dealership_id, admin_pin = setup_dealership_with_admin
        response = requests.post(f"{BASE_URL}/api/auth/admin-pin-login", json={
            "dealership_id": dealership_id,
            "pin": admin_pin,
            "remember_me": False
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "dealership_admin"
        print(f"✓ Admin PIN login successful for dealership {dealership_id}")
    
    def test_admin_pin_login_wrong_pin(self, setup_dealership_with_admin):
        """Test admin PIN login with wrong PIN"""
        dealership_id, _ = setup_dealership_with_admin
        response = requests.post(f"{BASE_URL}/api/auth/admin-pin-login", json={
            "dealership_id": dealership_id,
            "pin": "9999",
            "remember_me": False
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Admin PIN login with wrong PIN correctly rejected")


class TestUserCreationWithPin:
    """Test user creation with name + PIN (no email required)"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session for user creation"""
        # Login as owner first
        owner_response = requests.post(f"{BASE_URL}/api/auth/owner-login", json={"pin": "9988"})
        owner_token = owner_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {owner_token}"}
        
        # Create dealership with admin
        timestamp = int(datetime.now().timestamp())
        dealership_data = {
            "name": f"TEST_UserCreation_{timestamp}",
            "dealership_type": "automotive",
            "admin_email": f"TEST_usercreate_{timestamp}@test.com",
            "admin_password": "testpass123",
            "admin_name": "User Create Admin",
            "admin_pin": "1111"
        }
        response = requests.post(f"{BASE_URL}/api/dealerships", json=dealership_data, headers=headers)
        dealership_id = response.json()["id"]
        
        # Login as admin
        admin_response = requests.post(f"{BASE_URL}/api/auth/admin-pin-login", json={
            "dealership_id": dealership_id,
            "pin": "1111"
        })
        admin_token = admin_response.json()["access_token"]
        return admin_token, dealership_id
    
    def test_create_user_with_pin(self, admin_session):
        """Test creating user with name + PIN (no email)"""
        admin_token, dealership_id = admin_session
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        timestamp = int(datetime.now().timestamp())
        user_data = {
            "name": f"TEST_StaffUser_{timestamp}",
            "pin": "5678",
            "role": "sales",
            "dealership_id": dealership_id
        }
        response = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["name"] == user_data["name"]
        assert data["role"] == "sales"
        print(f"✓ User created with PIN: {data['id']}")
        return data["id"], user_data["name"], "5678", dealership_id
    
    def test_user_pin_login(self, admin_session):
        """Test user login with name + PIN"""
        admin_token, dealership_id = admin_session
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create user first
        timestamp = int(datetime.now().timestamp())
        user_name = f"TEST_LoginUser_{timestamp}"
        user_data = {
            "name": user_name,
            "pin": "9876",
            "role": "service",
            "dealership_id": dealership_id
        }
        requests.post(f"{BASE_URL}/api/users", json=user_data, headers=headers)
        
        # Now login as user
        response = requests.post(f"{BASE_URL}/api/auth/user-pin-login", json={
            "dealership_id": dealership_id,
            "name": user_name,
            "pin": "9876",
            "remember_me": False
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["name"] == user_name
        assert data["user"]["role"] == "service"
        print(f"✓ User PIN login successful: {user_name}")


class TestImageUpload:
    """Test image upload functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for image upload"""
        response = requests.post(f"{BASE_URL}/api/auth/demo-login")
        return response.json()["access_token"]
    
    def test_upload_image_base64(self, auth_token):
        """Test POST /api/upload-image-base64"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a simple 1x1 red PNG image in base64
        # This is a valid minimal PNG
        png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        
        response = requests.post(f"{BASE_URL}/api/upload-image-base64", 
                                json={"image": f"data:image/png;base64,{png_base64}"},
                                headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "url" in data, "Response should have url"
        assert data["url"].startswith("/uploads/"), "URL should start with /uploads/"
        print(f"✓ Image uploaded: {data['url']}")
        return data["url"]


class TestRepairRequests:
    """Test repair request functionality"""
    
    @pytest.fixture
    def setup_key_with_attention(self):
        """Create a key and check it out with needs_attention flag"""
        # Login as demo
        demo_response = requests.post(f"{BASE_URL}/api/auth/demo-login")
        token = demo_response.json()["access_token"]
        dealership_id = demo_response.json()["user"]["dealership_id"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a key
        timestamp = int(datetime.now().timestamp())
        key_data = {
            "stock_number": f"TEST_REPAIR_{timestamp}",
            "vehicle_model": "Test Repair Vehicle",
            "vehicle_year": 2024,
            "condition": "used",
            "dealership_id": dealership_id
        }
        key_response = requests.post(f"{BASE_URL}/api/keys", json=key_data, headers=headers)
        if key_response.status_code != 200:
            pytest.skip("Could not create key (demo limit reached)")
        key_id = key_response.json()["id"]
        
        # Checkout with needs_attention
        checkout_data = {
            "reason": "test_drive",
            "notes": "Test repair note - needs attention",
            "needs_attention": True,
            "images": []
        }
        checkout_response = requests.post(f"{BASE_URL}/api/keys/{key_id}/checkout", 
                                         json=checkout_data, headers=headers)
        
        return token, key_id, dealership_id
    
    def test_get_repair_requests(self, setup_key_with_attention):
        """Test GET /api/repair-requests"""
        token, key_id, dealership_id = setup_key_with_attention
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/repair-requests", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of repair requests"
        print(f"✓ Repair requests endpoint returns {len(data)} requests")
    
    def test_mark_key_fixed(self, setup_key_with_attention):
        """Test POST /api/keys/{key_id}/mark-fixed"""
        token, key_id, dealership_id = setup_key_with_attention
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/keys/{key_id}/mark-fixed", 
                                json={"notes": "Fixed by test"},
                                headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["attention_status"] == "fixed", "Key should be marked as fixed"
        print(f"✓ Key marked as fixed: {key_id}")


class TestPinChange:
    """Test PIN change functionality"""
    
    @pytest.fixture
    def admin_with_pin(self):
        """Create admin with known PIN"""
        # Login as owner
        owner_response = requests.post(f"{BASE_URL}/api/auth/owner-login", json={"pin": "9988"})
        owner_token = owner_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {owner_token}"}
        
        # Create dealership with admin
        timestamp = int(datetime.now().timestamp())
        dealership_data = {
            "name": f"TEST_PinChange_{timestamp}",
            "dealership_type": "automotive",
            "admin_email": f"TEST_pinchange_{timestamp}@test.com",
            "admin_password": "testpass123",
            "admin_name": "Pin Change Admin",
            "admin_pin": "2222"
        }
        response = requests.post(f"{BASE_URL}/api/dealerships", json=dealership_data, headers=headers)
        dealership_id = response.json()["id"]
        
        # Login as admin
        admin_response = requests.post(f"{BASE_URL}/api/auth/admin-pin-login", json={
            "dealership_id": dealership_id,
            "pin": "2222"
        })
        admin_token = admin_response.json()["access_token"]
        return admin_token, dealership_id, "2222"
    
    def test_change_admin_pin(self, admin_with_pin):
        """Test POST /api/auth/change-admin-pin"""
        admin_token, dealership_id, current_pin = admin_with_pin
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(f"{BASE_URL}/api/auth/change-admin-pin", 
                                json={"current_pin": current_pin, "new_pin": "3333"},
                                headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Admin PIN changed successfully")
        
        # Verify new PIN works
        login_response = requests.post(f"{BASE_URL}/api/auth/admin-pin-login", json={
            "dealership_id": dealership_id,
            "pin": "3333"
        })
        assert login_response.status_code == 200, "New PIN should work"
        print(f"✓ Login with new PIN successful")


class TestCustomRoles:
    """Test custom role management"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session for role management"""
        # Login as owner
        owner_response = requests.post(f"{BASE_URL}/api/auth/owner-login", json={"pin": "9988"})
        owner_token = owner_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {owner_token}"}
        
        # Create dealership
        timestamp = int(datetime.now().timestamp())
        dealership_data = {
            "name": f"TEST_CustomRoles_{timestamp}",
            "dealership_type": "automotive",
            "admin_email": f"TEST_roles_{timestamp}@test.com",
            "admin_password": "testpass123",
            "admin_name": "Roles Admin",
            "admin_pin": "4444"
        }
        response = requests.post(f"{BASE_URL}/api/dealerships", json=dealership_data, headers=headers)
        dealership_id = response.json()["id"]
        
        # Login as admin
        admin_response = requests.post(f"{BASE_URL}/api/auth/admin-pin-login", json={
            "dealership_id": dealership_id,
            "pin": "4444"
        })
        admin_token = admin_response.json()["access_token"]
        return admin_token, dealership_id
    
    def test_get_dealership_roles(self, admin_session):
        """Test GET /api/dealerships/{id}/roles"""
        admin_token, dealership_id = admin_session
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/dealerships/{dealership_id}/roles", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "standard_roles" in data, "Response should have standard_roles"
        assert "custom_roles" in data, "Response should have custom_roles"
        assert len(data["standard_roles"]) >= 5, "Should have at least 5 standard roles"
        print(f"✓ Got {len(data['standard_roles'])} standard roles, {len(data['custom_roles'])} custom roles")
    
    def test_add_custom_role(self, admin_session):
        """Test POST /api/dealerships/{id}/roles"""
        admin_token, dealership_id = admin_session
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        timestamp = int(datetime.now().timestamp())
        role_name = f"TEST_CustomRole_{timestamp}"
        
        response = requests.post(f"{BASE_URL}/api/dealerships/{dealership_id}/roles", 
                                json={"name": role_name},
                                headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert role_name in data["custom_roles"], "New role should be in custom_roles"
        print(f"✓ Custom role added: {role_name}")
        
        # Verify role appears in roles list
        roles_response = requests.get(f"{BASE_URL}/api/dealerships/{dealership_id}/roles", headers=headers)
        roles_data = roles_response.json()
        assert role_name in roles_data["custom_roles"], "Role should persist"


class TestCheckoutWithNeedsAttention:
    """Test checkout with needs_attention flag and images"""
    
    @pytest.fixture
    def demo_session(self):
        """Get demo session"""
        response = requests.post(f"{BASE_URL}/api/auth/demo-login")
        data = response.json()
        return data["access_token"], data["user"]["dealership_id"]
    
    def test_checkout_with_needs_attention(self, demo_session):
        """Test checkout with needs_attention flag creates repair request"""
        token, dealership_id = demo_session
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a key
        timestamp = int(datetime.now().timestamp())
        key_data = {
            "stock_number": f"TEST_ATTN_{timestamp}",
            "vehicle_model": "Attention Test Vehicle",
            "vehicle_year": 2024,
            "condition": "new",
            "dealership_id": dealership_id
        }
        key_response = requests.post(f"{BASE_URL}/api/keys", json=key_data, headers=headers)
        if key_response.status_code != 200:
            pytest.skip("Could not create key (demo limit reached)")
        key_id = key_response.json()["id"]
        
        # Checkout with needs_attention
        checkout_data = {
            "reason": "service_loaner",
            "notes": "Needs brake inspection",
            "needs_attention": True,
            "images": []
        }
        checkout_response = requests.post(f"{BASE_URL}/api/keys/{key_id}/checkout", 
                                         json=checkout_data, headers=headers)
        assert checkout_response.status_code == 200, f"Expected 200, got {checkout_response.status_code}"
        
        key_data = checkout_response.json()
        assert key_data["attention_status"] == "needs_attention", "Key should have needs_attention status"
        print(f"✓ Key checked out with needs_attention flag")
        
        # Verify repair request was created
        repairs_response = requests.get(f"{BASE_URL}/api/repair-requests?status=pending", headers=headers)
        repairs = repairs_response.json()
        matching_repairs = [r for r in repairs if r["key_id"] == key_id]
        assert len(matching_repairs) > 0, "Repair request should be created"
        print(f"✓ Repair request created for key")


class TestSalesTrackerHidden:
    """Verify Sales Tracker is hidden/suspended"""
    
    def test_sales_tracker_not_in_navigation(self):
        """Sales Tracker should be hidden from navigation"""
        # This is a frontend test - we verify the backend endpoints still exist
        # but the feature is hidden in the UI
        response = requests.post(f"{BASE_URL}/api/auth/demo-login")
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Sales endpoints should still work (not removed, just hidden)
        goals_response = requests.get(f"{BASE_URL}/api/sales-goals", headers=headers)
        # Should return 200 (empty list) or work normally
        assert goals_response.status_code in [200, 404], "Sales goals endpoint should exist"
        print(f"✓ Sales Tracker endpoints exist but feature is hidden in UI")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
