# Deployment Guide

This guide walks through recreating the Digital Evidence Locker in your
own AWS account. It assumes no prior AWS setup beyond an active account.

> **Note on the original demonstration:** This project was originally
> built and demonstrated in an **AWS Academy Learner Lab (sandbox)**
> environment. That environment provides a temporary account and a
> pre-existing `LabRole` IAM role with broad permissions. These sandbox
> resources are temporary and are torn down when the lab session ends —
> this repository does **not** depend on that sandbox. The steps below
> use a standard AWS account instead.

## Reference Configuration

Sanitized copies of the actual configuration used are included in this
folder for reference:

- [`AWS_CONFIGURATION.txt`](AWS_CONFIGURATION.txt) — bucket layout, region, services used
- [`lambda-configuration.json`](lambda-configuration.json) — Lambda function settings

Replace every `<YOUR_ACCOUNT_ID>` placeholder with your own 12-digit AWS
account ID as you go.

## Prerequisites

- An AWS account with permissions to create S3 buckets, Lambda
  functions, and IAM roles
- AWS CLI configured locally (`aws configure`), or access to AWS
  CloudShell
- Python 3.9+ locally, for running `locker.py`

## 1. Create the S3 bucket

Bucket names must be globally unique. Suffixing with your account ID is
a reliable convention:

```bash
aws s3 mb s3://digital-evidence-locker-<YOUR_ACCOUNT_ID> --region us-east-1
```

## 2. Create the required folder structure

S3 doesn't have real folders, but you can create the prefixes explicitly
so they're visible in the console:

```bash
aws s3api put-object --bucket digital-evidence-locker-<YOUR_ACCOUNT_ID> --key incoming/
aws s3api put-object --bucket digital-evidence-locker-<YOUR_ACCOUNT_ID> --key audit/current/
aws s3api put-object --bucket digital-evidence-locker-<YOUR_ACCOUNT_ID> --key audit/history/
```

## 3. Create an IAM role for the Lambda function

The original demo used the AWS Academy sandbox's built-in `LabRole`,
which is not available outside that environment. In a standard account,
create a role with:

- Trust policy allowing `lambda.amazonaws.com` to assume it
- `AWSLambdaBasicExecutionRole` (managed policy, for CloudWatch Logs)
- An inline policy granting, scoped to your bucket:
  - `s3:GetObject`, `s3:HeadObject` on `arn:aws:s3:::digital-evidence-locker-<YOUR_ACCOUNT_ID>/incoming/*`
  - `s3:GetObject`, `s3:PutObject`, `s3:ListBucket` on `arn:aws:s3:::digital-evidence-locker-<YOUR_ACCOUNT_ID>/audit/*` and the bucket itself

This is intentionally narrower than the sandbox's `LabRole` — see
[`docs/architecture.md`](../docs/architecture.md#iam-permissions-required)
for the exact permission list.

## 4. Create the Lambda function

```bash
cd src
zip function.zip lambda_function.py
aws lambda create-function \
  --function-name DigitalEvidenceProcessor \
  --runtime python3.12 \
  --role arn:aws:iam::<YOUR_ACCOUNT_ID>:role/<your-role-name> \
  --handler lambda_function.lambda_handler \
  --timeout 30 \
  --memory-size 256 \
  --zip-file fileb://function.zip
```

> The original deployment used `python3.14`. Use whichever current
> Python runtime is available in your account/region at deploy time.

## 5. Configure the S3 → Lambda trigger

Grant S3 permission to invoke the function, then configure the
`ObjectCreated` event notification (scoped to the `incoming/` prefix) to
target it — either via the Lambda console's "Add trigger" flow, or:

```bash
aws lambda add-permission \
  --function-name DigitalEvidenceProcessor \
  --statement-id s3invoke \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::digital-evidence-locker-<YOUR_ACCOUNT_ID>

aws s3api put-bucket-notification-configuration \
  --bucket digital-evidence-locker-<YOUR_ACCOUNT_ID> \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [{
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:<YOUR_ACCOUNT_ID>:function:DigitalEvidenceProcessor",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {"Key": {"FilterRules": [{"Name": "prefix", "Value": "incoming/"}]}}
    }]
  }'
```

## 6. Upload a test file

```bash
aws s3 cp examples/modified/demo-evidence.txt \
  s3://digital-evidence-locker-<YOUR_ACCOUNT_ID>/incoming/demo-evidence.txt
```

## 7. Observe processing

Check CloudWatch Logs for the function to confirm it ran and see the
`ORIGINAL` classification for a first-time upload:

```bash
aws logs tail /aws/lambda/DigitalEvidenceProcessor --follow
```

## 8. Run the CLI

```bash
cd src
pip install boto3
python3 locker.py dashboard
python3 locker.py list
python3 locker.py verify
python3 locker.py history
```

The CLI auto-discovers the bucket by its `digital-evidence-locker-`
prefix, so no configuration is needed as long as your AWS credentials
are set up (`aws configure` or environment variables).

## 9. Test the modification detection

Upload the same file again — this time with different contents — to
the same `incoming/` key, and re-run `python3 locker.py verify` to see
the status change to `MODIFIED`, along with both the old and new
SHA-256 values.
