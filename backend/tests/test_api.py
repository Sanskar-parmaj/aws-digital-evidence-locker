import unittest
import json
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from services.aws_service import AWSService


class DigitalEvidenceApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()
        cls.aws_service = AWSService()

    def test_health_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("status"), "healthy")

    def test_hash_computation_deterministic(self):
        """Ensure audit_record_hash logic matches Lambda handler."""
        dummy_record = {
            "filename": "test.txt",
            "bucket": "test-bucket",
            "key": "incoming/test.txt",
            "size": 100,
            "content_type": "text/plain",
            "sha256": "abcdef1234567890",
            "received_at": "2026-10-25T10:00:00+00:00",
            "status": "ORIGINAL",
            "file_id": "12345",
            "previous_record_hash": None
        }
        hash1 = self.aws_service.compute_audit_record_hash(dummy_record)

        # Including audit_record_hash inside record should not change the computed value
        dummy_record_with_hash = dict(dummy_record)
        dummy_record_with_hash["audit_record_hash"] = "temporary_dummy_hash"
        hash2 = self.aws_service.compute_audit_record_hash(dummy_record_with_hash)

        self.assertEqual(hash1, hash2)
        self.assertEqual(len(hash1), 64)

    def test_file_id_computation(self):
        """Test that file_id matches SHA-256 of S3 key."""
        key = "incoming/demo-evidence.txt"
        file_id = self.aws_service.compute_file_id(key)
        self.assertEqual(file_id, "dc2d022041c3eb793bc1f17612d1a39ecb014cc96d2a9444ff3f12257e5dc2af")

    def test_system_status_endpoint(self):
        response = self.client.get("/api/system/status")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("aws_identity", data.get("data", {}))
        self.assertIn("s3_storage", data.get("data", {}))

    def test_dashboard_endpoint(self):
        response = self.client.get("/api/dashboard")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get("success"))
        d = data.get("data", {})
        self.assertIn("total_files", d)
        self.assertIn("status_distribution", d)

    def test_evidence_endpoint(self):
        response = self.client.get("/api/evidence")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get("success"))
        self.assertIsInstance(data.get("data"), list)


if __name__ == "__main__":
    unittest.main()
