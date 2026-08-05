"""
AWS Digital Evidence Locker — CLI
==================================

A command-line dashboard for the Digital Evidence Locker. Reads audit
records written by the Lambda handler (see src/lambda_function.py) and
presents them in a human-readable form.

Commands:
    python3 locker.py dashboard   Summary counts (original/unchanged/modified)
    python3 locker.py list        Table of all monitored files
    python3 locker.py verify      Detailed per-file integrity report
    python3 locker.py history     Full chronological audit trail

Configuration assumptions:
    - AWS credentials are available via the standard boto3 credential
      chain (environment variables, ~/.aws/credentials, or an
      instance/role profile).
    - The evidence bucket is discovered automatically by name prefix
      (digital-evidence-locker-<account-id>), so no bucket name needs
      to be hardcoded here.
"""

import boto3
import json
import sys
from collections import Counter

from botocore.exceptions import NoCredentialsError, ClientError


REGION = "us-east-1"

s3 = boto3.client(
    "s3",
    region_name=REGION
)


def get_bucket():
    """Find the Digital Evidence Locker bucket by its name prefix."""

    try:
        response = s3.list_buckets()

    except NoCredentialsError:
        print(
            "ERROR: No AWS credentials found.\n"
            "Configure credentials via environment variables, "
            "~/.aws/credentials, or an instance/role profile, then "
            "try again."
        )
        sys.exit(1)

    except ClientError as error:
        print(
            f"ERROR: Could not reach AWS: {error}"
        )
        sys.exit(1)

    buckets = [
        bucket["Name"]
        for bucket in response.get("Buckets", [])
        if bucket["Name"].startswith(
            "digital-evidence-locker-"
        )
    ]

    if not buckets:
        print(
            "ERROR: Evidence Locker bucket not found.\n"
            "Make sure the bucket has been created and follows the "
            "digital-evidence-locker-<account-id> naming convention "
            "(see deployment/README.md)."
        )
        sys.exit(1)

    return buckets[0]


def get_current_records(bucket):
    """Retrieve the latest record for every monitored file."""

    records = []

    paginator = s3.get_paginator(
        "list_objects_v2"
    )

    pages = paginator.paginate(
        Bucket=bucket,
        Prefix="audit/current/"
    )

    for page in pages:

        for obj in page.get("Contents", []):

            key = obj["Key"]

            if not key.endswith(".json"):
                continue

            response = s3.get_object(
                Bucket=bucket,
                Key=key
            )

            try:
                data = json.loads(
                    response["Body"]
                    .read()
                    .decode("utf-8")
                )
            except json.JSONDecodeError:
                print(
                    f"WARNING: skipping unreadable record at {key}"
                )
                continue

            records.append(data)

    return records


def show_dashboard():
    """Display a summary of the current evidence locker."""

    bucket = get_bucket()

    records = get_current_records(bucket)

    statuses = Counter(
        record.get("status", "UNKNOWN")
        for record in records
    )

    print()
    print(
        "╔════════════════════════════════════════════╗"
    )
    print(
        "║         DIGITAL EVIDENCE LOCKER            ║"
    )
    print(
        "╠════════════════════════════════════════════╣"
    )

    print(
        f"║ Files monitored:       "
        f"{len(records):<16}║"
    )

    print(
        f"║ Original status:       "
        f"{statuses.get('ORIGINAL', 0):<16}║"
    )

    print(
        f"║ Unchanged status:      "
        f"{statuses.get('UNCHANGED', 0):<16}║"
    )

    print(
        f"║ Integrity warnings:    "
        f"{statuses.get('MODIFIED', 0):<16}║"
    )

    print(
        "╚════════════════════════════════════════════╝"
    )
    print()


def list_files():
    """List all currently monitored files."""

    bucket = get_bucket()

    records = get_current_records(bucket)

    print()
    print("=" * 80)
    print("                    MONITORED FILES")
    print("=" * 80)

    if not records:

        print("No evidence files registered.")

        return

    print(
        f"{'FILE':30} "
        f"{'SIZE':12} "
        f"{'STATUS':12} "
        f"{'SHA-256':20}"
    )

    print("-" * 80)

    for record in records:

        filename = record.get("filename", "unknown")

        size = record.get("size", 0)

        status = record.get("status", "UNKNOWN")

        sha256 = record.get("sha256", "")[:16]

        print(
            f"{filename[:30]:30} "
            f"{size:<12} "
            f"{status:<12} "
            f"{sha256}..."
        )

    print("=" * 80)
    print()


def verify():
    """Display detailed integrity information."""

    bucket = get_bucket()

    records = get_current_records(bucket)

    print()
    print("=" * 80)
    print("                     INTEGRITY REPORT")
    print("=" * 80)

    if not records:

        print("No files to verify.")

        return

    for record in records:

        print()
        print(
            f"FILE: {record.get('filename', 'unknown')}"
        )

        print(
            f"STATUS: {record.get('status', 'UNKNOWN')}"
        )

        print(
            f"SHA-256: {record.get('sha256', 'N/A')}"
        )

        print(
            f"SIZE: {record.get('size', 0)} bytes"
        )

        print(
            f"CONTENT TYPE: {record.get('content_type', 'unknown')}"
        )

        print(
            f"RECEIVED: {record.get('received_at', 'unknown')}"
        )

        if record.get("previous_record_hash"):

            print(
                "PREVIOUS AUDIT HASH: "
                f"{record['previous_record_hash']}"
            )

        print(
            "AUDIT RECORD HASH: "
            f"{record.get('audit_record_hash', 'N/A')}"
        )

    print()
    print("=" * 80)


def show_history():
    """Display the complete audit history."""

    bucket = get_bucket()

    paginator = s3.get_paginator(
        "list_objects_v2"
    )

    print()
    print("=" * 100)
    print("                         AUDIT HISTORY")
    print("=" * 100)

    found = False

    pages = paginator.paginate(
        Bucket=bucket,
        Prefix="audit/history/"
    )

    for page in pages:

        for obj in page.get("Contents", []):

            key = obj["Key"]

            if not key.endswith(".json"):
                continue

            response = s3.get_object(
                Bucket=bucket,
                Key=key
            )

            try:
                record = json.loads(
                    response["Body"]
                    .read()
                    .decode("utf-8")
                )
            except json.JSONDecodeError:
                print(
                    f"WARNING: skipping unreadable history record at {key}"
                )
                continue

            found = True

            print(
                f"{record.get('received_at', 'unknown')} | "
                f"{record.get('filename', 'unknown')} | "
                f"{record.get('status', 'UNKNOWN')} | "
                f"{record.get('sha256', '')[:16]}..."
            )

            print(
                f"    Audit hash: "
                f"{record.get('audit_record_hash', 'N/A')[:32]}..."
            )

            previous_hash = record.get(
                "previous_record_hash"
            )

            if previous_hash:

                print(
                    f"    Previous:   "
                    f"{previous_hash[:32]}..."
                )

            else:

                print(
                    "    Previous:   NONE (first record)"
                )

    if not found:

        print("No audit history found.")

    print("=" * 100)
    print()


def main():

    if len(sys.argv) < 2:

        show_dashboard()

        print("Commands:")
        print("  python3 locker.py dashboard")
        print("  python3 locker.py list")
        print("  python3 locker.py verify")
        print("  python3 locker.py history")
        print()

        return

    command = sys.argv[1].lower()

    if command == "list":

        list_files()

    elif command == "verify":

        verify()

    elif command == "history":

        show_history()

    elif command == "dashboard":

        show_dashboard()

    else:

        print(
            f"Unknown command: {command}"
        )

        print(
            "Available commands: "
            "dashboard, list, verify, history"
        )


if __name__ == "__main__":
    main()
