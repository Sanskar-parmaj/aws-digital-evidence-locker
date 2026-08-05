This folder is meant to hold real, exported audit record JSON files —
one example each of an ORIGINAL, UNCHANGED, and MODIFIED record — pulled
from `audit/current/` or `audit/history/` in the S3 bucket.

These weren't included in the original upload, so they're still needed.
To populate this folder: run the pipeline once for a new file, once
unchanged, and once after modifying it, then download the three
resulting JSON records from S3 and drop them here (see Phase 7 — Add
Evidence).
