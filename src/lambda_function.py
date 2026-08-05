"""
AWS Digital Evidence Locker — Lambda Handler
=============================================

This function is triggered by an S3 `ObjectCreated` event whenever a file
is uploaded to the `incoming/` prefix of the evidence bucket.

For every incoming file, it:
    1. Downloads the object and calculates its SHA-256 hash
    2. Derives a stable logical file ID from the S3 object key
    3. Looks up the most recent known record for that file ID
    4. Classifies the file as ORIGINAL / UNCHANGED / MODIFIED
    5. Writes a new, hash-linked record to `audit/history/`
    6. Updates the pointer record at `audit/current/`

Expected bucket layout (see docs/architecture.md for details):

    incoming/                          <- files land here to be processed
    audit/current/<file_id>.json       <- latest known state per file
    audit/history/<file_id>/<ts>.json  <- full chronological audit trail

Configuration assumptions:
    - The Lambda execution role must have s3:GetObject, s3:PutObject,
      s3:HeadObject, and s3:ListBucket permissions on the evidence bucket.
    - Region and bucket are resolved from the incoming S3 event itself,
      not hardcoded, so this function is portable across accounts/buckets.
"""

import boto3
import hashlib
import json
import urllib.parse
from datetime import datetime, timezone


s3 = boto3.client("s3")


def calculate_sha256(bucket, key):
    """
    Stream the S3 object in 1MB chunks and calculate its SHA-256 hash.

    Streaming (rather than loading the whole object into memory) keeps
    this safe for large files within the Lambda memory limit.
    """

    response = s3.get_object(
        Bucket=bucket,
        Key=key
    )

    sha256 = hashlib.sha256()

    for chunk in response["Body"].iter_chunks(
        chunk_size=1024 * 1024
    ):
        sha256.update(chunk)

    return sha256.hexdigest()


def create_file_id(key):
    """
    Derive a stable logical file ID from the S3 object key.

    Using a hash of the key (rather than the key itself) keeps audit
    paths short and filesystem/URL-safe, while still being deterministic
    for a given key.
    """

    return hashlib.sha256(
        key.encode("utf-8")
    ).hexdigest()


def get_current_record(bucket, file_id):
    """
    Retrieve the latest known record for this logical file, if one exists.

    Returns None if no current record exists yet (i.e. this is the first
    time this file has been seen).
    """

    current_key = f"audit/current/{file_id}.json"

    try:
        response = s3.get_object(
            Bucket=bucket,
            Key=current_key
        )

        content = response["Body"].read().decode("utf-8")

        return json.loads(content)

    except s3.exceptions.NoSuchKey:
        return None

    except json.JSONDecodeError:
        # A current record exists but is corrupted/unreadable.
        # Treat it as absent rather than crashing the whole invocation,
        # so processing can continue and self-heal on the next write.
        print(
            f"WARNING: current record for {file_id} is not valid JSON; "
            "treating as missing."
        )
        return None


def get_previous_record_hash(bucket, file_id):
    """
    Find the most recent history entry for this file and return its
    audit_record_hash, used to chain the new record to the previous one.

    Returns None if no prior history exists.
    """

    prefix = f"audit/history/{file_id}/"

    response = s3.list_objects_v2(
        Bucket=bucket,
        Prefix=prefix
    )

    objects = response.get("Contents", [])

    if not objects:
        return None

    latest = max(
        objects,
        key=lambda obj: obj["LastModified"]
    )

    response = s3.get_object(
        Bucket=bucket,
        Key=latest["Key"]
    )

    try:
        previous_record = json.loads(
            response["Body"].read().decode("utf-8")
        )
    except json.JSONDecodeError:
        print(
            f"WARNING: latest history record at {latest['Key']} is not "
            "valid JSON; treating chain as broken at this point."
        )
        return None

    return previous_record.get("audit_record_hash")


def lambda_handler(event, context):

    print("=" * 60)
    print("DIGITAL EVIDENCE LOCKER")
    print("=" * 60)

    for record in event.get("Records", []):

        # --------------------------------------------------
        # 1. Read S3 event information
        # --------------------------------------------------

        bucket = record["s3"]["bucket"]["name"]

        encoded_key = record["s3"]["object"]["key"]

        key = urllib.parse.unquote_plus(
            encoded_key
        )

        print(f"File received: {key}")
        print(f"Bucket: {bucket}")

        # --------------------------------------------------
        # 2. Only process incoming/ files
        #
        # This guards against reprocessing files this same function
        # writes into audit/ (which would otherwise re-trigger itself).
        # --------------------------------------------------

        if not key.startswith("incoming/"):

            print(
                f"Ignoring object outside incoming/: {key}"
            )

            continue

        filename = key.split("/")[-1]

        # --------------------------------------------------
        # 3. Read object metadata
        # --------------------------------------------------

        object_info = s3.head_object(
            Bucket=bucket,
            Key=key
        )

        size = object_info["ContentLength"]

        content_type = object_info.get(
            "ContentType",
            "application/octet-stream"
        )

        received_at = datetime.now(
            timezone.utc
        ).isoformat()

        print(f"Filename: {filename}")
        print(f"Size: {size} bytes")
        print(f"Content-Type: {content_type}")
        print(f"Received: {received_at}")

        # --------------------------------------------------
        # 4. Calculate SHA-256
        # --------------------------------------------------

        print("Calculating SHA-256...")

        current_hash = calculate_sha256(
            bucket,
            key
        )

        print(f"SHA-256: {current_hash}")

        # --------------------------------------------------
        # 5. Identify the logical file
        # --------------------------------------------------

        file_id = create_file_id(key)

        print(f"File ID: {file_id}")

        # --------------------------------------------------
        # 6. Find previous record
        # --------------------------------------------------

        previous_record = get_current_record(
            bucket,
            file_id
        )

        # --------------------------------------------------
        # 7. Determine integrity status
        # --------------------------------------------------

        if previous_record is None:

            status = "ORIGINAL"

            print("Integrity status: ORIGINAL")

        else:

            previous_hash = previous_record["sha256"]

            print(
                f"Previous SHA-256: {previous_hash}"
            )

            if previous_hash == current_hash:

                status = "UNCHANGED"

                print(
                    "Integrity status: UNCHANGED"
                )

            else:

                status = "MODIFIED"

                print(
                    "INTEGRITY WARNING"
                )

                print(
                    f"Original SHA-256: {previous_hash}"
                )

                print(
                    f"Current SHA-256: {current_hash}"
                )

        # --------------------------------------------------
        # 8. Build audit record
        #
        # Each record embeds the hash of the previous record
        # (previous_record_hash) and is itself hashed
        # (audit_record_hash). This creates a tamper-evident
        # chain: altering any past record breaks the hash of
        # every record that came after it.
        # --------------------------------------------------

        previous_record_hash = get_previous_record_hash(
            bucket,
            file_id
        )

        audit_record = {
            "filename": filename,
            "bucket": bucket,
            "key": key,
            "size": size,
            "content_type": content_type,
            "sha256": current_hash,
            "received_at": received_at,
            "status": status,
            "file_id": file_id,
            "previous_record_hash": previous_record_hash
        }

        record_data = json.dumps(
            audit_record,
            sort_keys=True
        ).encode("utf-8")

        audit_record_hash = hashlib.sha256(
            record_data
        ).hexdigest()

        audit_record["audit_record_hash"] = audit_record_hash

        # --------------------------------------------------
        # 9. Create historical audit record (append-only)
        # --------------------------------------------------

        timestamp_id = datetime.now(
            timezone.utc
        ).strftime("%Y%m%dT%H%M%S%fZ")

        history_key = (
            f"audit/history/"
            f"{file_id}/"
            f"{timestamp_id}.json"
        )

        s3.put_object(
            Bucket=bucket,
            Key=history_key,
            Body=json.dumps(
                audit_record,
                indent=2
            ).encode("utf-8"),
            ContentType="application/json"
        )

        print(
            f"Audit history created: {history_key}"
        )

        # --------------------------------------------------
        # 10. Update current record (latest-state pointer)
        # --------------------------------------------------

        current_key = (
            f"audit/current/{file_id}.json"
        )

        s3.put_object(
            Bucket=bucket,
            Key=current_key,
            Body=json.dumps(
                audit_record,
                indent=2
            ).encode("utf-8"),
            ContentType="application/json"
        )

        print(
            f"Current record updated: {current_key}"
        )

        print(
            f"FINAL STATUS: {status}"
        )

        print("=" * 60)

    return {
        "statusCode": 200,
        "body": json.dumps(
            "Evidence processed successfully"
        )
    }
