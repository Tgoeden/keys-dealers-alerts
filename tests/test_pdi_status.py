"""
KeyFlow Backend API Tests - PDI Status Feature
Testing: PDI status update, PDI audit log, PDI filter, default PDI status
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://keyflow-mechanic.preview.emergentagent.com')

# Test data
TEST_TIMESTAMP = int(datetime.now().timestamp())


class TestPDIStatusEndpoints:
    """Test PDI Status API endpoints"""
    
    @pytest.fixture
    def admin_session(self):
        """Create admin session for PDI testing"""
        # Login as owner
        owner_response = requests.post(f"{BASE_URL}/api/auth/owner-login", json={"pin": "9988"})
        assert owner_response.status_code == 200, f"Owner login failed: {owner_response.text}"
        owner_token = owner_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {owner_token}"}
        
        # Create dealership with admin
        timestamp = int(datetime.now().timestamp())
        dealership_data = {
            "name": f"TEST_PDI_{timestamp}",
            "dealership_type": "automotive",
            "admin_email": f"TEST_pdi_{timestamp}@test.com",
            "admin_password": "testpass123",
            "admin_name": "PDI Test Admin",
            "admin_pin": "4777"
        }
        response = requests.post(f"{BASE_URL}/api/dealerships", json=dealership_data, headers=headers)
        assert response.status_code == 200, f"Dealership creation failed: {response.text}"
        dealership_id = response.json()["id"]
        
        # Login as admin
        admin_response = requests.post(f"{BASE_URL}/api/auth/admin-pin-login", json={
            "dealership_id": dealership_id,
            "pin": "4777"
        })
        assert admin_response.status_code == 200, f"Admin login failed: {admin_response.text}"
        admin_token = admin_response.json()["access_token"]
        return admin_token, dealership_id
    
    @pytest.fixture
    def key_with_default_pdi(self, admin_session):
        """Create a key and verify default PDI status"""
        admin_token, dealership_id = admin_session
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        timestamp = int(datetime.now().timestamp())
        key_data = {
            "stock_number": f"TEST_PDI_{timestamp}",
            "vehicle_model": "PDI Test Vehicle",
            "vehicle_year": 2024,
            "vehicle_make": "Test",
            "condition": "new",
            "dealership_id": dealership_id
        }
        response = requests.post(f"{BASE_URL}/api/keys", json=key_data, headers=headers)
        assert response.status_code == 200, f"Key creation failed: {response.text}"
        key = response.json()
        return admin_token, key, dealership_id
    
    def test_new_key_has_default_pdi_status(self, key_with_default_pdi):
        """Test that new keys default to 'not_pdi_yet' status"""
        admin_token, key, dealership_id = key_with_default_pdi
        
        # Verify default PDI status
        assert key.get("pdi_status") == "not_pdi_yet", f"Expected 'not_pdi_yet', got {key.get('pdi_status')}"
        assert key.get("pdi_last_updated_at") is None, "pdi_last_updated_at should be None for new key"
        assert key.get("pdi_last_updated_by_user_id") is None, "pdi_last_updated_by_user_id should be None"
        print(f"✓ New key has default PDI status 'not_pdi_yet'")
    
    def test_update_pdi_status_to_in_progress(self, key_with_default_pdi):
        """Test updating PDI status to 'in_progress'"""
        admin_token, key, dealership_id = key_with_default_pdi
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Update PDI status
        response = requests.put(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-status",
            json={"status": "in_progress", "notes": "Starting PDI inspection"},
            headers=headers
        )
        assert response.status_code == 200, f"PDI update failed: {response.text}"
        
        updated_key = response.json()
        assert updated_key["pdi_status"] == "in_progress", f"Expected 'in_progress', got {updated_key['pdi_status']}"
        assert updated_key["pdi_last_updated_at"] is not None, "pdi_last_updated_at should be set"
        assert updated_key["pdi_last_updated_by_user_name"] is not None, "pdi_last_updated_by_user_name should be set"
        print(f"✓ PDI status updated to 'in_progress'")
    
    def test_update_pdi_status_to_finished(self, key_with_default_pdi):
        """Test updating PDI status to 'finished'"""
        admin_token, key, dealership_id = key_with_default_pdi
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First update to in_progress
        requests.put(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-status",
            json={"status": "in_progress"},
            headers=headers
        )
        
        # Then update to finished
        response = requests.put(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-status",
            json={"status": "finished", "notes": "PDI complete - all checks passed"},
            headers=headers
        )
        assert response.status_code == 200, f"PDI update failed: {response.text}"
        
        updated_key = response.json()
        assert updated_key["pdi_status"] == "finished", f"Expected 'finished', got {updated_key['pdi_status']}"
        print(f"✓ PDI status updated to 'finished'")
    
    def test_same_status_update_no_duplicate_audit(self, key_with_default_pdi):
        """Test that updating to same status doesn't create duplicate audit log"""
        admin_token, key, dealership_id = key_with_default_pdi
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Update to in_progress
        requests.put(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-status",
            json={"status": "in_progress"},
            headers=headers
        )
        
        # Get audit log count
        audit_response1 = requests.get(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-audit-log",
            headers=headers
        )
        initial_count = len(audit_response1.json())
        
        # Update to same status again
        requests.put(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-status",
            json={"status": "in_progress"},
            headers=headers
        )
        
        # Get audit log count again
        audit_response2 = requests.get(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-audit-log",
            headers=headers
        )
        final_count = len(audit_response2.json())
        
        assert final_count == initial_count, f"Same status update should not create new audit log. Initial: {initial_count}, Final: {final_count}"
        print(f"✓ Same status update does not create duplicate audit log")
    
    def test_invalid_pdi_status_rejected(self, key_with_default_pdi):
        """Test that invalid PDI status is rejected"""
        admin_token, key, dealership_id = key_with_default_pdi
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-status",
            json={"status": "invalid_status"},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        print(f"✓ Invalid PDI status correctly rejected")


class TestPDIAuditLog:
    """Test PDI Audit Log functionality"""
    
    @pytest.fixture
    def admin_session_with_key(self):
        """Create admin session with a key for audit log testing"""
        # Login as owner
        owner_response = requests.post(f"{BASE_URL}/api/auth/owner-login", json={"pin": "9988"})
        owner_token = owner_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {owner_token}"}
        
        # Create dealership with admin
        timestamp = int(datetime.now().timestamp())
        dealership_data = {
            "name": f"TEST_PDIAudit_{timestamp}",
            "dealership_type": "automotive",
            "admin_email": f"TEST_pdiaudit_{timestamp}@test.com",
            "admin_password": "testpass123",
            "admin_name": "PDI Audit Admin",
            "admin_pin": "5555"
        }
        response = requests.post(f"{BASE_URL}/api/dealerships", json=dealership_data, headers=headers)
        dealership_id = response.json()["id"]
        
        # Login as admin
        admin_response = requests.post(f"{BASE_URL}/api/auth/admin-pin-login", json={
            "dealership_id": dealership_id,
            "pin": "5555"
        })
        admin_token = admin_response.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a key
        key_data = {
            "stock_number": f"TEST_AUDIT_{timestamp}",
            "vehicle_model": "Audit Test Vehicle",
            "vehicle_year": 2024,
            "condition": "new",
            "dealership_id": dealership_id
        }
        key_response = requests.post(f"{BASE_URL}/api/keys", json=key_data, headers=admin_headers)
        key = key_response.json()
        
        return admin_token, key, dealership_id
    
    def test_pdi_audit_log_created_on_status_change(self, admin_session_with_key):
        """Test that audit log is created when PDI status changes"""
        admin_token, key, dealership_id = admin_session_with_key
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Update PDI status
        requests.put(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-status",
            json={"status": "in_progress", "notes": "Test audit log creation"},
            headers=headers
        )
        
        # Get audit log
        response = requests.get(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-audit-log",
            headers=headers
        )
        assert response.status_code == 200, f"Audit log fetch failed: {response.text}"
        
        audit_logs = response.json()
        assert len(audit_logs) >= 1, "Should have at least one audit log entry"
        
        latest_log = audit_logs[0]
        assert latest_log["previous_status"] == "not_pdi_yet", f"Expected previous_status 'not_pdi_yet', got {latest_log['previous_status']}"
        assert latest_log["new_status"] == "in_progress", f"Expected new_status 'in_progress', got {latest_log['new_status']}"
        assert latest_log["notes"] == "Test audit log creation", f"Notes mismatch"
        assert latest_log["changed_by_user_name"] is not None, "changed_by_user_name should be set"
        assert latest_log["changed_at"] is not None, "changed_at should be set"
        print(f"✓ PDI audit log created correctly with all fields")
    
    def test_pdi_audit_log_tracks_multiple_changes(self, admin_session_with_key):
        """Test that audit log tracks multiple status changes"""
        admin_token, key, dealership_id = admin_session_with_key
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Make multiple status changes
        requests.put(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-status",
            json={"status": "in_progress", "notes": "First change"},
            headers=headers
        )
        requests.put(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-status",
            json={"status": "finished", "notes": "Second change"},
            headers=headers
        )
        
        # Get audit log
        response = requests.get(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-audit-log",
            headers=headers
        )
        audit_logs = response.json()
        
        assert len(audit_logs) >= 2, f"Should have at least 2 audit log entries, got {len(audit_logs)}"
        
        # Logs should be sorted by changed_at descending (most recent first)
        assert audit_logs[0]["new_status"] == "finished", "Most recent should be 'finished'"
        assert audit_logs[1]["new_status"] == "in_progress", "Second should be 'in_progress'"
        print(f"✓ PDI audit log tracks multiple changes correctly")
    
    def test_get_all_pdi_audit_logs_admin(self, admin_session_with_key):
        """Test GET /api/pdi-audit-log returns all logs for admin"""
        admin_token, key, dealership_id = admin_session_with_key
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create some audit logs
        requests.put(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-status",
            json={"status": "in_progress"},
            headers=headers
        )
        
        # Get all audit logs
        response = requests.get(
            f"{BASE_URL}/api/pdi-audit-log",
            headers=headers
        )
        assert response.status_code == 200, f"Get all audit logs failed: {response.text}"
        
        audit_logs = response.json()
        assert isinstance(audit_logs, list), "Should return a list"
        print(f"✓ Admin can get all PDI audit logs ({len(audit_logs)} entries)")


class TestPDIStatusFilter:
    """Test PDI Status filter on keys endpoint"""
    
    @pytest.fixture
    def admin_with_multiple_keys(self):
        """Create admin with multiple keys in different PDI states"""
        # Login as owner
        owner_response = requests.post(f"{BASE_URL}/api/auth/owner-login", json={"pin": "9988"})
        owner_token = owner_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {owner_token}"}
        
        # Create dealership
        timestamp = int(datetime.now().timestamp())
        dealership_data = {
            "name": f"TEST_PDIFilter_{timestamp}",
            "dealership_type": "automotive",
            "admin_email": f"TEST_pdifilter_{timestamp}@test.com",
            "admin_password": "testpass123",
            "admin_name": "PDI Filter Admin",
            "admin_pin": "6666"
        }
        response = requests.post(f"{BASE_URL}/api/dealerships", json=dealership_data, headers=headers)
        dealership_id = response.json()["id"]
        
        # Login as admin
        admin_response = requests.post(f"{BASE_URL}/api/auth/admin-pin-login", json={
            "dealership_id": dealership_id,
            "pin": "6666"
        })
        admin_token = admin_response.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create keys with different PDI statuses
        keys = []
        for i, status in enumerate(["not_pdi_yet", "in_progress", "finished"]):
            key_data = {
                "stock_number": f"TEST_FILTER_{timestamp}_{i}",
                "vehicle_model": f"Filter Test {status}",
                "vehicle_year": 2024,
                "condition": "new",
                "dealership_id": dealership_id
            }
            key_response = requests.post(f"{BASE_URL}/api/keys", json=key_data, headers=admin_headers)
            key = key_response.json()
            
            # Update PDI status if not default
            if status != "not_pdi_yet":
                requests.put(
                    f"{BASE_URL}/api/keys/{key['id']}/pdi-status",
                    json={"status": status},
                    headers=admin_headers
                )
            keys.append(key)
        
        return admin_token, keys, dealership_id
    
    def test_filter_keys_by_pdi_status_not_pdi_yet(self, admin_with_multiple_keys):
        """Test filtering keys by PDI status 'not_pdi_yet'"""
        admin_token, keys, dealership_id = admin_with_multiple_keys
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/keys",
            params={"dealership_id": dealership_id, "pdi_status": "not_pdi_yet"},
            headers=headers
        )
        assert response.status_code == 200, f"Filter failed: {response.text}"
        
        filtered_keys = response.json()
        for key in filtered_keys:
            assert key["pdi_status"] == "not_pdi_yet", f"Expected 'not_pdi_yet', got {key['pdi_status']}"
        print(f"✓ Filter by 'not_pdi_yet' works ({len(filtered_keys)} keys)")
    
    def test_filter_keys_by_pdi_status_in_progress(self, admin_with_multiple_keys):
        """Test filtering keys by PDI status 'in_progress'"""
        admin_token, keys, dealership_id = admin_with_multiple_keys
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/keys",
            params={"dealership_id": dealership_id, "pdi_status": "in_progress"},
            headers=headers
        )
        assert response.status_code == 200, f"Filter failed: {response.text}"
        
        filtered_keys = response.json()
        for key in filtered_keys:
            assert key["pdi_status"] == "in_progress", f"Expected 'in_progress', got {key['pdi_status']}"
        print(f"✓ Filter by 'in_progress' works ({len(filtered_keys)} keys)")
    
    def test_filter_keys_by_pdi_status_finished(self, admin_with_multiple_keys):
        """Test filtering keys by PDI status 'finished'"""
        admin_token, keys, dealership_id = admin_with_multiple_keys
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/keys",
            params={"dealership_id": dealership_id, "pdi_status": "finished"},
            headers=headers
        )
        assert response.status_code == 200, f"Filter failed: {response.text}"
        
        filtered_keys = response.json()
        for key in filtered_keys:
            assert key["pdi_status"] == "finished", f"Expected 'finished', got {key['pdi_status']}"
        print(f"✓ Filter by 'finished' works ({len(filtered_keys)} keys)")


class TestPDIStatusUserPermissions:
    """Test that all authenticated users can update PDI status"""
    
    @pytest.fixture
    def setup_user_and_key(self):
        """Create a regular user and a key for testing"""
        # Login as owner
        owner_response = requests.post(f"{BASE_URL}/api/auth/owner-login", json={"pin": "9988"})
        owner_token = owner_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {owner_token}"}
        
        # Create dealership
        timestamp = int(datetime.now().timestamp())
        dealership_data = {
            "name": f"TEST_PDIUser_{timestamp}",
            "dealership_type": "automotive",
            "admin_email": f"TEST_pdiuser_{timestamp}@test.com",
            "admin_password": "testpass123",
            "admin_name": "PDI User Admin",
            "admin_pin": "7777"
        }
        response = requests.post(f"{BASE_URL}/api/dealerships", json=dealership_data, headers=headers)
        dealership_id = response.json()["id"]
        
        # Login as admin
        admin_response = requests.post(f"{BASE_URL}/api/auth/admin-pin-login", json={
            "dealership_id": dealership_id,
            "pin": "7777"
        })
        admin_token = admin_response.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a regular user
        user_data = {
            "name": f"TEST_PDIStaff_{timestamp}",
            "pin": "1234",
            "role": "service",
            "dealership_id": dealership_id
        }
        requests.post(f"{BASE_URL}/api/users", json=user_data, headers=admin_headers)
        
        # Login as regular user
        user_response = requests.post(f"{BASE_URL}/api/auth/user-pin-login", json={
            "dealership_id": dealership_id,
            "name": user_data["name"],
            "pin": "1234"
        })
        user_token = user_response.json()["access_token"]
        
        # Create a key
        key_data = {
            "stock_number": f"TEST_USERPDI_{timestamp}",
            "vehicle_model": "User PDI Test",
            "vehicle_year": 2024,
            "condition": "new",
            "dealership_id": dealership_id
        }
        key_response = requests.post(f"{BASE_URL}/api/keys", json=key_data, headers=admin_headers)
        key = key_response.json()
        
        return user_token, key, dealership_id
    
    def test_regular_user_can_update_pdi_status(self, setup_user_and_key):
        """Test that regular users can update PDI status"""
        user_token, key, dealership_id = setup_user_and_key
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-status",
            json={"status": "in_progress", "notes": "User updated PDI"},
            headers=headers
        )
        assert response.status_code == 200, f"Regular user should be able to update PDI status: {response.text}"
        
        updated_key = response.json()
        assert updated_key["pdi_status"] == "in_progress"
        print(f"✓ Regular user can update PDI status")
    
    def test_regular_user_can_view_own_audit_log(self, setup_user_and_key):
        """Test that regular users can view their own PDI audit log entries"""
        user_token, key, dealership_id = setup_user_and_key
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Update PDI status
        requests.put(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-status",
            json={"status": "in_progress"},
            headers=headers
        )
        
        # Get audit log
        response = requests.get(
            f"{BASE_URL}/api/keys/{key['id']}/pdi-audit-log",
            headers=headers
        )
        assert response.status_code == 200, f"User should be able to view audit log: {response.text}"
        
        audit_logs = response.json()
        # Regular users should see their own changes
        assert len(audit_logs) >= 1, "User should see their own audit log entries"
        print(f"✓ Regular user can view PDI audit log")


class TestBulkImportWithPDI:
    """Test that bulk imported keys have default PDI status"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session for bulk import"""
        # Login as owner
        owner_response = requests.post(f"{BASE_URL}/api/auth/owner-login", json={"pin": "9988"})
        owner_token = owner_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {owner_token}"}
        
        # Create dealership
        timestamp = int(datetime.now().timestamp())
        dealership_data = {
            "name": f"TEST_BulkPDI_{timestamp}",
            "dealership_type": "automotive",
            "admin_email": f"TEST_bulkpdi_{timestamp}@test.com",
            "admin_password": "testpass123",
            "admin_name": "Bulk PDI Admin",
            "admin_pin": "8888"
        }
        response = requests.post(f"{BASE_URL}/api/dealerships", json=dealership_data, headers=headers)
        dealership_id = response.json()["id"]
        
        # Login as admin
        admin_response = requests.post(f"{BASE_URL}/api/auth/admin-pin-login", json={
            "dealership_id": dealership_id,
            "pin": "8888"
        })
        admin_token = admin_response.json()["access_token"]
        return admin_token, dealership_id
    
    def test_bulk_import_keys_have_default_pdi(self, admin_session):
        """Test that bulk imported keys have 'not_pdi_yet' status"""
        admin_token, dealership_id = admin_session
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        timestamp = int(datetime.now().timestamp())
        bulk_data = {
            "dealership_id": dealership_id,
            "keys": [
                {"condition": "new", "stock_number": f"BULK_PDI_{timestamp}_1", "vehicle_year": 2024, "vehicle_make": "Test", "vehicle_model": "Model1"},
                {"condition": "used", "stock_number": f"BULK_PDI_{timestamp}_2", "vehicle_year": 2023, "vehicle_make": "Test", "vehicle_model": "Model2"},
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/keys/bulk-import", json=bulk_data, headers=headers)
        assert response.status_code == 200, f"Bulk import failed: {response.text}"
        
        result = response.json()
        assert result["imported"] == 2, f"Expected 2 imported, got {result['imported']}"
        
        # Verify keys have default PDI status
        keys_response = requests.get(
            f"{BASE_URL}/api/keys",
            params={"dealership_id": dealership_id},
            headers=headers
        )
        keys = keys_response.json()
        
        for key in keys:
            if key["stock_number"].startswith(f"BULK_PDI_{timestamp}"):
                assert key["pdi_status"] == "not_pdi_yet", f"Bulk imported key should have 'not_pdi_yet' status"
        
        print(f"✓ Bulk imported keys have default PDI status 'not_pdi_yet'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
