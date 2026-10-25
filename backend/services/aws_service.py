import os
import json
import time
import hashlib
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from werkzeug.utils import secure_filename

from config import Config


class AWSService:
    def __init__(self):
        self.region = Config.AWS_REGION
        self.bucket_name = Config.EVIDENCE_BUCKET
        self.lambda_name = Config.LAMBDA_FUNCTION_NAME

    def get_s3_client(self):
        return boto3.client("s3", region_name=self.region)

    def get_sts_client(self):
        return boto3.client("sts", region_name=self.region)

    def get_lambda_client(self):
        return boto3.client("lambda", region_name=self.region)

    def resolve_bucket(self) -> str:
        """
        Verify configured bucket exists, or auto-discover a bucket with prefix
        'digital-evidence-locker-'.
        """
        s3 = self.get_s3_client()
        if self.bucket_name:
            try:
                s3.head_bucket(Bucket=self.bucket_name)
                return self.bucket_name
            except ClientError as e:
                # If head_bucket fails (e.g. 404 or 301), fallback to discovery
                pass

        try:
            response = s3.list_buckets()
            for b in response.get("Buckets", []):
                name = b["Name"]
                if name.startswith("digital-evidence-locker-"):
                    self.bucket_name = name
                    return name
        except Exception:
            pass

        return self.bucket_name

    def compute_file_id(self, key: str) -> str:
        """Identical to Lambda: SHA-256 hash of the S3 key."""
        return hashlib.sha256(key.encode("utf-8")).hexdigest()

    def compute_audit_record_hash(self, record_dict: Dict[str, Any]) -> str:
        """
        Computes the audit_record_hash exactly as Lambda does:
        Only hashes the 10 core fields present when Lambda computed the hash.
        """
        core_fields = [
            "filename", "bucket", "key", "size", "content_type",
            "sha256", "received_at", "status", "file_id", "previous_record_hash"
        ]
        payload = {k: record_dict[k] for k in core_fields if k in record_dict}
        record_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
        return hashlib.sha256(record_bytes).hexdigest()

    def get_current_records(self) -> List[Dict[str, Any]]:
        """Retrieve all records under audit/current/."""
        bucket = self.resolve_bucket()
        s3 = self.get_s3_client()
        records = []

        paginator = s3.get_paginator("list_objects_v2")
        pages = paginator.paginate(Bucket=bucket, Prefix=Config.AUDIT_CURRENT_PREFIX)

        for page in pages:
            for obj in page.get("Contents", []):
                key = obj["Key"]
                if not key.endswith(".json"):
                    continue
                try:
                    response = s3.get_object(Bucket=bucket, Key=key)
                    data = json.loads(response["Body"].read().decode("utf-8"))
                    records.append(data)
                except Exception as ex:
                    print(f"Error reading {key}: {ex}")
                    continue

        return records

    def get_dashboard_data(self) -> Dict[str, Any]:
        """Aggregate metrics and recent activity for the overview dashboard."""
        records = self.get_current_records()

        status_counts = {
            "ORIGINAL": 0,
            "UNCHANGED": 0,
            "MODIFIED": 0,
            "UNKNOWN": 0
        }
        for r in records:
            st = r.get("status", "UNKNOWN")
            status_counts[st] = status_counts.get(st, 0) + 1

        recent_history = self.get_recent_history(limit=8)

        total_files = len(records)

        distribution = [
            {"name": "Original", "value": status_counts["ORIGINAL"], "color": "#10B981"},
            {"name": "Unchanged", "value": status_counts["UNCHANGED"], "color": "#3B82F6"},
            {"name": "Modified", "value": status_counts["MODIFIED"], "color": "#EF4444"}
        ]

        return {
            "total_files": total_files,
            "original_count": status_counts["ORIGINAL"],
            "unchanged_count": status_counts["UNCHANGED"],
            "modified_count": status_counts["MODIFIED"],
            "status_distribution": distribution,
            "recent_activity": recent_history,
            "bucket_name": self.bucket_name,
            "region": self.region,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    def get_evidence_detail(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Get the current audit record for a given file_id."""
        bucket = self.resolve_bucket()
        s3 = self.get_s3_client()
        key = f"{Config.AUDIT_CURRENT_PREFIX}{file_id}.json"
        try:
            resp = s3.get_object(Bucket=bucket, Key=key)
            return json.loads(resp["Body"].read().decode("utf-8"))
        except s3.exceptions.NoSuchKey:
            return None
        except Exception as e:
            print(f"Error retrieving {key}: {e}")
            return None

    def get_evidence_history(self, file_id: str) -> Dict[str, Any]:
        """
        Get full chronological audit history for a file_id,
        verifying the cryptographic hash links between consecutive records.
        """
        bucket = self.resolve_bucket()
        s3 = self.get_s3_client()
        prefix = f"{Config.AUDIT_HISTORY_PREFIX}{file_id}/"

        paginator = s3.get_paginator("list_objects_v2")
        pages = paginator.paginate(Bucket=bucket, Prefix=prefix)

        history_records = []
        for page in pages:
            for obj in page.get("Contents", []):
                key = obj["Key"]
                if not key.endswith(".json"):
                    continue
                try:
                    resp = s3.get_object(Bucket=bucket, Key=key)
                    data = json.loads(resp["Body"].read().decode("utf-8"))
                    data["s3_key"] = key
                    history_records.append(data)
                except Exception as ex:
                    print(f"Error parsing history {key}: {ex}")

        # Sort chronologically by received_at
        history_records.sort(key=lambda r: r.get("received_at", ""))

        # Verify hash link chain
        is_chain_valid = True
        broken_links = []
        for i, rec in enumerate(history_records):
            rec_hash = rec.get("audit_record_hash")
            prev_hash = rec.get("previous_record_hash")

            # Check internal record integrity
            expected_hash = self.compute_audit_record_hash(rec)
            rec["is_hash_authentic"] = (rec_hash == expected_hash)
            if not rec["is_hash_authentic"]:
                is_chain_valid = False
                broken_links.append({
                    "index": i,
                    "reason": "Audit record hash does not match computed record contents",
                    "timestamp": rec.get("received_at")
                })

            # Check linkage to previous record
            if i == 0:
                rec["is_link_valid"] = (prev_hash is None)
            else:
                prev_audit_hash = history_records[i - 1].get("audit_record_hash")
                rec["is_link_valid"] = (prev_hash == prev_audit_hash)
                if not rec["is_link_valid"]:
                    is_chain_valid = False
                    broken_links.append({
                        "index": i,
                        "reason": f"previous_record_hash ({prev_hash}) does not match prior record hash ({prev_audit_hash})",
                        "timestamp": rec.get("received_at")
                    })

        return {
            "file_id": file_id,
            "total_records": len(history_records),
            "is_chain_valid": is_chain_valid,
            "broken_links": broken_links,
            "records": history_records
        }

    def verify_file_integrity(self, file_id: str) -> Dict[str, Any]:
        """
        Deep cryptographic verification of an evidence file and its audit trail.
        Distinguishes between:
        1. MODIFIED file content (legitimate or unauthorized file content change recorded by locker)
        2. TAMPERED audit records (corrupted/altered audit JSON where SHA-256 no longer matches)
        """
        current_record = self.get_evidence_detail(file_id)
        if not current_record:
            return {
                "found": False,
                "file_id": file_id,
                "message": f"No audit record found for file_id: {file_id}"
            }

        # Verify current record hash
        stored_hash = current_record.get("audit_record_hash", "")
        computed_hash = self.compute_audit_record_hash(current_record)
        is_record_authentic = (stored_hash == computed_hash)

        # Verify full history chain
        history_result = self.get_evidence_history(file_id)
        is_chain_valid = history_result["is_chain_valid"]
        records = history_result["records"]

        status = current_record.get("status", "UNKNOWN")
        filename = current_record.get("filename", "unknown")

        # Educational forensics explanation
        forensic_analysis = []
        if is_record_authentic and is_chain_valid:
            if status == "ORIGINAL":
                verdict = "VERIFIED_ORIGINAL"
                explanation = "This file was observed for the first time. The audit record is authentic and untampered."
            elif status == "UNCHANGED":
                verdict = "VERIFIED_UNCHANGED"
                explanation = "File contents match the previously recorded SHA-256 fingerprint. The audit trail is fully intact."
            elif status == "MODIFIED":
                verdict = "VERIFIED_MODIFIED"
                explanation = (
                    "INTEGRITY ALERT: File contents have changed from their original baseline. "
                    "Notice: The audit record itself is cryptographically authentic and untampered, "
                    "correctly preserving evidence of the file content change."
                )
            else:
                verdict = "UNKNOWN_STATUS"
                explanation = "Record has unknown status but audit record hash is authentic."
        else:
            verdict = "AUDIT_TAMPERED"
            explanation = (
                "CRITICAL WARNING: Tampering or corruption detected in the audit records! "
                "The stored SHA-256 audit hash does not match the actual record contents, "
                "or the chain of previous_record_hash links has been broken."
            )

        return {
            "found": True,
            "file_id": file_id,
            "filename": filename,
            "status": status,
            "sha256": current_record.get("sha256"),
            "size": current_record.get("size"),
            "content_type": current_record.get("content_type"),
            "received_at": current_record.get("received_at"),
            "stored_audit_hash": stored_hash,
            "computed_audit_hash": computed_hash,
            "is_record_authentic": is_record_authentic,
            "is_chain_valid": is_chain_valid,
            "chain_length": len(records),
            "verdict": verdict,
            "explanation": explanation,
            "broken_links": history_result.get("broken_links", []),
            "history_summary": [
                {
                    "received_at": r.get("received_at"),
                    "status": r.get("status"),
                    "sha256": r.get("sha256"),
                    "audit_record_hash": r.get("audit_record_hash")
                }
                for r in records
            ]
        }

    def get_recent_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch latest audit events across all files."""
        bucket = self.resolve_bucket()
        s3 = self.get_s3_client()
        paginator = s3.get_paginator("list_objects_v2")
        pages = paginator.paginate(Bucket=bucket, Prefix=Config.AUDIT_HISTORY_PREFIX)

        items = []
        for page in pages:
            for obj in page.get("Contents", []):
                key = obj["Key"]
                if not key.endswith(".json"):
                    continue
                items.append({
                    "key": key,
                    "last_modified": obj["LastModified"]
                })

        # Sort by S3 LastModified descending and take the top N
        items.sort(key=lambda x: x["last_modified"], reverse=True)
        recent_objects = items[:limit]

        records = []
        for item in recent_objects:
            try:
                resp = s3.get_object(Bucket=bucket, Key=item["key"])
                data = json.loads(resp["Body"].read().decode("utf-8"))
                records.append(data)
            except Exception as e:
                print(f"Error reading recent history {item['key']}: {e}")

        # Sort by received_at descending
        records.sort(key=lambda r: r.get("received_at", ""), reverse=True)
        return records

    def upload_evidence(self, file_storage, filename: str) -> Dict[str, Any]:
        """
        Uploads a file to S3 incoming/<filename>.
        Never touches audit/ prefixes directly.
        Polls for Lambda to finish processing and produce audit/current/<file_id>.json.
        """
        # Sanitize filename
        safe_name = secure_filename(filename)
        if not safe_name:
            safe_name = f"evidence_{int(time.time())}.dat"

        bucket = self.resolve_bucket()
        s3 = self.get_s3_client()
        key = f"{Config.INCOMING_PREFIX}{safe_name}"
        file_id = self.compute_file_id(key)

        # Read content to stream to S3
        file_bytes = file_storage.read()
        file_size = len(file_bytes)

        if file_size > Config.MAX_CONTENT_LENGTH:
            raise ValueError(f"File size ({file_size} bytes) exceeds maximum allowed {Config.MAX_UPLOAD_SIZE_MB}MB")

        content_type = file_storage.content_type or "application/octet-stream"

        # Record upload start timestamp to compare with new audit record
        upload_time = datetime.now(timezone.utc)

        # Upload to incoming/
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type
        )

        # Poll for Lambda to finish processing
        # Lambda execution typically takes ~1-3 seconds.
        poll_start = time.time()
        timeout = Config.POLL_TIMEOUT_SECONDS
        record = None

        while time.time() - poll_start < timeout:
            time.sleep(0.75)
            record = self.get_evidence_detail(file_id)
            if record:
                # Check if this record is fresh (received_at around or after upload_time)
                rec_time_str = record.get("received_at")
                if rec_time_str:
                    try:
                        rec_dt = datetime.fromisoformat(rec_time_str.replace("Z", "+00:00"))
                        if rec_dt >= upload_time:
                            return {
                                "success": True,
                                "processed": True,
                                "file_id": file_id,
                                "filename": safe_name,
                                "key": key,
                                "size": file_size,
                                "status": record.get("status"),
                                "sha256": record.get("sha256"),
                                "audit_record": record,
                                "message": f"Evidence file uploaded and classified as {record.get('status')}."
                            }
                    except Exception:
                        pass

        # If poll timed out, return accepted/processing state so frontend can show progress
        return {
            "success": True,
            "processed": bool(record),
            "file_id": file_id,
            "filename": safe_name,
            "key": key,
            "size": file_size,
            "status": record.get("status") if record else "PROCESSING",
            "sha256": record.get("sha256") if record else None,
            "audit_record": record,
            "message": "File uploaded to S3 incoming/. Processing is completing in background."
        }

    def get_system_status(self) -> Dict[str, Any]:
        """
        Collects real system health and AWS configuration diagnostics
        without exposing any credentials.
        """
        s3 = self.get_s3_client()
        sts = self.get_sts_client()
        lmb = self.get_lambda_client()

        # 1. AWS Identity Check
        identity_info = {"status": "UNKNOWN", "details": None}
        try:
            caller = sts.get_caller_identity()
            identity_info = {
                "status": "CONNECTED",
                "account_id": caller.get("Account"),
                "arn": caller.get("Arn"),
                "user_id": caller.get("UserId")
            }
        except Exception as e:
            identity_info = {
                "status": "ERROR",
                "error": str(e)
            }

        # 2. S3 Bucket Check
        bucket_info = {"status": "UNKNOWN", "bucket_name": self.bucket_name}
        try:
            resolved = self.resolve_bucket()
            s3.head_bucket(Bucket=resolved)
            # Count incoming/ objects
            incoming_resp = s3.list_objects_v2(Bucket=resolved, Prefix=Config.INCOMING_PREFIX, MaxKeys=5)
            incoming_count = len(incoming_resp.get("Contents", []))
            bucket_info = {
                "status": "HEALTHY",
                "bucket_name": resolved,
                "region": self.region,
                "sample_incoming_count": incoming_count
            }
        except Exception as e:
            bucket_info = {
                "status": "ERROR",
                "bucket_name": self.bucket_name,
                "error": str(e)
            }

        # 3. Lambda Check
        lambda_info = {"status": "UNKNOWN", "function_name": self.lambda_name}
        try:
            fn = lmb.get_function(FunctionName=self.lambda_name)
            config = fn.get("Configuration", {})
            lambda_info = {
                "status": "ACTIVE",
                "function_name": config.get("FunctionName"),
                "runtime": config.get("Runtime"),
                "state": config.get("State", "Active"),
                "last_modified": config.get("LastModified"),
                "memory_size": config.get("MemorySize"),
                "timeout": config.get("Timeout"),
                "role": config.get("Role")
            }
        except Exception as e:
            lambda_info = {
                "status": "LIMITED_OR_UNAVAILABLE",
                "function_name": self.lambda_name,
                "note": "Lambda details could not be retrieved directly via IAM policy (this is normal if IAM policy is restricted to S3/CloudWatch).",
                "error": str(e)
            }

        return {
            "api_status": "ONLINE",
            "server_time": datetime.now(timezone.utc).isoformat(),
            "region": self.region,
            "aws_identity": identity_info,
            "s3_storage": bucket_info,
            "lambda_processor": lambda_info,
            "security_advisory": {
                "tamper_evident": True,
                "tamper_proof": False,
                "notice": (
                    "The Digital Evidence Locker uses cryptographic hash chaining to detect any tampering "
                    "with historical audit records. However, hash-linked records alone do not establish legal "
                    "chain of custody without certified administrative controls and immutable access policies."
                )
            }
        }
