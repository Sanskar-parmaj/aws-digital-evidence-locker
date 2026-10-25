<<<<<<< HEAD
# AWS Digital Evidence Locker

A serverless file-integrity monitoring system built with AWS.

Files uploaded to S3 are automatically fingerprinted, compared against
their last known state, and recorded in a tamper-evident, hash-linked
audit trail — with a companion CLI for inspecting the results.

---

## Problem

Once a file leaves your hands — uploaded to storage, shared, archived —
you generally have no reliable way to know later whether it's still the
same file. Manual checksums require someone to remember to run them,
compare them, and keep a record. That doesn't scale, and it's easy to
tamper with a single stored hash if there's nothing linking it to a
verifiable history.

## Solution

This project turns an S3 bucket into a self-auditing evidence locker.
Every file uploaded to `incoming/` is automatically:

1. Fingerprinted with SHA-256
2. Compared against its previous recorded state
3. Classified as `ORIGINAL`, `UNCHANGED`, or `MODIFIED`
4. Logged as a new, cryptographically-linked audit record

No manual step is required — the moment a file lands in S3, the Lambda
function processes it and the CLI can immediately report on it.

## Architecture

```
                 ┌─────────────┐
                 │     User    │
                 └──────┬──────┘
                        │
                        ▼
                ┌───────────────┐
                │   Amazon S3   │
                │   incoming/   │
                └───────┬───────┘
                        │
                  ObjectCreated
                        │
                        ▼
                ┌───────────────┐
                │ AWS Lambda    │
                │ SHA-256       │
                │ comparison    │
                └───────┬───────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
       audit/current/      audit/history/
              │                   │
              └─────────┬─────────┘
                        ▼
                 CloudWatch Logs
```

See [`docs/architecture.md`](docs/architecture.md) for a full breakdown
of the data flow, record format, and hash-chaining design.

## Demonstration

The system was tested through a complete file-integrity workflow:

1. A new file is uploaded → `ORIGINAL`
2. The same file is uploaded again → `UNCHANGED`
3. The file content is changed → `MODIFIED`
4. The CLI provides a dashboard for inspecting the resulting records

### S3 Storage

![S3 Bucket](docs/screenshots/01-s3-bucket-root.png)

### Event-Driven Processing

![Lambda Trigger Configuration](docs/screenshots/05-lambda-trigger-configuration.png)

### Original File Detection

![Original Detection](docs/screenshots/07-cloudwatch-original-detection.png)

### Unchanged File Detection

![Unchanged Detection](docs/screenshots/08-cloudwatch-unchanged-detection.png)

### Modified File Detection

![Modified Detection](docs/screenshots/10-cloudwatch-modified-detection.png)

### CLI Dashboard

![CLI Dashboard](docs/screenshots/13-cli-dashboard.png)

## Features

- **SHA-256 fingerprinting** — every file is hashed on upload by
  streaming it in chunks, so large files don't need to fit in memory
- **Automatic classification** — `ORIGINAL` (first time seen),
  `UNCHANGED` (hash matches last record), or `MODIFIED` (hash differs)
- **Tamper-evident audit chain** — each audit record embeds the hash of
  the previous record for that file (`previous_record_hash`) and is
  itself hashed (`audit_record_hash`), so altering a past record breaks
  the chain of every record after it
- **Full historical trail** — every processing event is preserved under
  `audit/history/`, in addition to a fast-access `audit/current/` pointer
  to the latest state
- **CloudWatch logging** — every step of processing is logged for
  observability and debugging
- **Python CLI dashboard** — `locker.py` reads directly from S3 and
  provides:
  - `dashboard` — summary counts by integrity status
  - `list` — table of all monitored files
  - `verify` — detailed per-file integrity report
  - `history` — full chronological audit trail, including the hash chain
- **Modern Forensics Web Dashboard** — A full-stack web application featuring:
  - **Overview**: Real-time KPI cards, Recharts status distribution donut chart, recent activity feed
  - **Evidence Files**: Filterable, searchable data table with 1-click SHA-256 copy and metadata inspection
  - **Upload Evidence**: Drag-and-drop vault ingestion with automated polling for Lambda execution feedback
  - **Integrity Verification**: Mathematical verification of audit record hashes and unbroken blockchain-style chain continuity
  - **Audit History**: Chronological visual ledger with expandable raw JSON viewer
  - **System Status**: Real-time AWS IAM, S3, and Lambda telemetry with chain-of-custody advisory

## Project Structure

```
aws-digital-evidence-locker/
├── backend/                    # Python Flask REST API
│   ├── app.py                 # Flask server initialization & CORS
│   ├── config.py              # Configuration & AWS environment settings
│   ├── requirements.txt       # Backend dependencies (Flask, boto3, etc.)
│   ├── .env.example           # Configuration template
│   ├── routes/
│   │   └── api.py             # REST endpoints (/api/dashboard, /api/evidence, /verify, etc.)
│   ├── services/
│   │   └── aws_service.py     # S3 listing, SHA-256 verification, upload & polling
│   └── tests/
│       └── test_api.py        # Automated test suite
├── frontend/                   # React + Vite + Tailwind CSS Web Application
│   ├── package.json           # Frontend dependencies (React, Lucide, Recharts)
│   ├── vite.config.js         # Vite configuration & proxy settings
│   ├── tailwind.config.js     # Forensics theme styling
│   └── src/
│       ├── App.jsx            # Main app coordinator
│       ├── components/        # Sidebar, Header, StatusBadge, Toast
│       ├── pages/             # Overview, EvidenceFiles, Upload, Verify, History, System
│       └── services/api.js    # Axios client layer
├── src/
│   ├── lambda_function.py     # S3-triggered integrity processor
│   └── locker.py              # CLI dashboard
├── docs/
│   ├── architecture.md        # Detailed cryptographic & forensic design notes
│   └── screenshots/           # Demonstration screenshots
├── examples/
│   ├── original/              # Sample "first seen" file
│   ├── modified/              # Sample files showing a modification
│   └── audit-records/         # Sample exported audit JSON
└── deployment/
    ├── README.md              # Step-by-step deployment guide
    ├── AWS_CONFIGURATION.txt  # Reference configuration
    └── lambda-configuration.json # Reference Lambda config
```

## Running the Web Application Locally

### Prerequisites
- Python 3.9+ with `boto3`, `flask`, `flask-cors`, `python-dotenv`
- Node.js v18+ and npm
- AWS CLI configured or active AWS environment credentials

### 1. Start the Flask Backend (PowerShell)
```powershell
cd D:\CloudComputing\aws-digital-evidence-locker\backend
python -m pip install -r requirements.txt
python app.py
```
Backend API will start on: **`http://localhost:5001`**

### 2. Start the React Frontend (PowerShell)
In a separate terminal:
```powershell
cd D:\CloudComputing\aws-digital-evidence-locker\frontend
npm.cmd install
npm.cmd run dev
```
Frontend will be accessible at: **`http://localhost:5173`**

### 3. Run Backend Automated Tests
```powershell
cd D:\CloudComputing\aws-digital-evidence-locker
python -m unittest discover -s backend/tests
```

## REST API Documentation

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check status |
| `/api/dashboard` | GET | Aggregated counts, status distribution chart data, recent activity |
| `/api/evidence` | GET | List all monitored evidence files with status & SHA-256 |
| `/api/evidence/<file_id>` | GET | Specific evidence current pointer record |
| `/api/evidence/<file_id>/history` | GET | Full chronological history records and hash chain validation |
| `/api/evidence/<file_id>/verify` | POST | Live cryptographic re-computation and chain integrity report |
| `/api/evidence/upload` | POST | Upload file to S3 `incoming/` and poll for Lambda classification |
| `/api/audit` | GET | Global audit log entries across all evidence objects |
| `/api/system/status` | GET | Real-time AWS IAM, S3, and Lambda diagnostic telemetry |

## Getting Started with AWS Deployment

See [`deployment/README.md`](deployment/README.md) for full setup instructions, including required IAM permissions and how to reproduce this project in your own AWS account.

## Origin

This project was originally built and demonstrated in an AWS Academy Learner Lab environment and subsequently expanded into a complete cloud-native web application.

## License

MIT — see [`LICENSE`](LICENSE).
=======
# aws-digital-evidence-locker
>>>>>>> b6df583679985f51b0ffcac7550db7fae043a461
