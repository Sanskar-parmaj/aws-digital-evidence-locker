import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-2")
    EVIDENCE_BUCKET = os.getenv("EVIDENCE_BUCKET", "digital-evidence-locker-dv2026-8472")
    LAMBDA_FUNCTION_NAME = os.getenv("LAMBDA_FUNCTION_NAME", "DigitalEvidenceProcessor")

    # Upload limits
    MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
    MAX_CONTENT_LENGTH = MAX_UPLOAD_SIZE_MB * 1024 * 1024  # in bytes

    # Allowed prefixes
    INCOMING_PREFIX = "incoming/"
    AUDIT_CURRENT_PREFIX = "audit/current/"
    AUDIT_HISTORY_PREFIX = "audit/history/"

    # Polling wait timeout for Lambda processing after upload
    POLL_TIMEOUT_SECONDS = int(os.getenv("POLL_TIMEOUT_SECONDS", "10"))

    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
