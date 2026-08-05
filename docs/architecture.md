# Architecture

## Overview

The Digital Evidence Locker is built entirely from managed AWS services
— there is no server to patch or scale. A single S3 bucket holds both
the files being monitored and the audit trail describing them; a single
Lambda function does all the processing.

## Data Flow

```
User uploads file
        |
        v
S3 incoming/
        |
        v
S3 ObjectCreated event
        |
        v
Lambda: DigitalEvidenceProcessor
        |
        +--> Read metadata (size, content-type)
        |
        +--> Calculate SHA-256 (streamed, 1MB chunks)
        |
        +--> Look up audit/current/<file_id>.json
        |
        +--> Compare hashes -> ORIGINAL / UNCHANGED / MODIFIED
        |
        +--> Look up latest audit/history/<file_id>/ record's hash
        |
        +--> Build new audit record, hash it
        |
        +--> Write audit/history/<file_id>/<timestamp>.json
        |
        +--> Overwrite audit/current/<file_id>.json
        |
        v
CloudWatch Logs (every step logged)
```

## S3 Layout

```
incoming/                            <- files land here to trigger processing
audit/
  current/<file_id>.json             <- latest known state, one file per logical file
  history/<file_id>/<timestamp>.json <- full append-only history per logical file
```

`file_id` is a SHA-256 hash of the object's S3 key, not the filename
directly. This keeps the S3 key space flat and safe (no issues with
special characters, length limits, or key collisions across folders)
while still being deterministic — the same `incoming/` key always maps
to the same `file_id`.

## Audit Record Format

Each audit record (used for both `audit/current/` and
`audit/history/`) is a JSON object with the following fields:

| Field | Description |
|---|---|
| `filename` | Original filename (last path segment of the S3 key) |
| `bucket` | S3 bucket the file was uploaded to |
| `key` | Full S3 object key |
| `size` | File size in bytes |
| `content_type` | MIME type reported by S3 |
| `sha256` | SHA-256 hash of the file contents |
| `received_at` | UTC timestamp of when this record was created |
| `status` | `ORIGINAL`, `UNCHANGED`, or `MODIFIED` |
| `file_id` | Stable logical file identifier (see above) |
| `previous_record_hash` | `audit_record_hash` of the prior history entry, or `null` if this is the first record |
| `audit_record_hash` | SHA-256 hash of this record itself (computed after all other fields are set, with keys sorted for determinism) |

## Why a Hash Chain?

A single "last known hash" stored per file is vulnerable to silent
tampering — if someone can overwrite that one value, there's no way to
detect it after the fact.

Instead, each new audit record includes `previous_record_hash`, which
is the `audit_record_hash` of the most recent history entry *before*
this one. Because `audit_record_hash` is computed over the entire
record (including its own `previous_record_hash`), every record is
cryptographically bound to the one before it:

```
Record 1 (ORIGINAL)
  audit_record_hash = H(record_1_contents)

Record 2 (UNCHANGED)
  previous_record_hash = Record 1's audit_record_hash
  audit_record_hash = H(record_2_contents, including previous_record_hash)

Record 3 (MODIFIED)
  previous_record_hash = Record 2's audit_record_hash
  audit_record_hash = H(record_3_contents, including previous_record_hash)
```

If anyone alters Record 1 after the fact, its `audit_record_hash`
changes — which no longer matches the `previous_record_hash` stored in
Record 2, making the tampering evident. This is the same core idea
behind blockchain-style hash chaining, applied to a simple audit log
rather than a distributed ledger.

## Classification Logic

On each upload to `incoming/`, the Lambda function looks up
`audit/current/<file_id>.json`:

- **No current record exists** → status is `ORIGINAL`. This is the
  first time this logical file has been seen.
- **Current record exists, hash matches** → status is `UNCHANGED`. The
  file is byte-for-byte identical to what was last recorded.
- **Current record exists, hash differs** → status is `MODIFIED`. The
  file's contents have changed since it was last recorded.

## IAM Permissions Required

The Lambda execution role needs, at minimum:

- `s3:GetObject`, `s3:HeadObject` on the `incoming/*` prefix
- `s3:GetObject`, `s3:PutObject`, `s3:ListBucket` on the `audit/*` prefix
- CloudWatch Logs write permissions (standard Lambda basic execution role)

In the original AWS Academy Learner Lab demonstration, the pre-existing
`LabRole` was used, which grants broad permissions suitable for a
sandbox but broader than the minimum above. See
[`deployment/README.md`](../deployment/README.md) for guidance on
scoping this down in a production account.

## CLI Design

`locker.py` is a read-only client — it never writes to S3. It discovers
the bucket automatically by name prefix
(`digital-evidence-locker-<account-id>`) rather than requiring a
hardcoded bucket name, so the same script works against any deployment
of this project without modification.
