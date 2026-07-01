# Hive DynamoDB test data seed

Seeds **3 test orgs × 5 hosts** into the KeyTrain Hive tables in `us-east-2` for KTL dashboard and PDF testing.

## Do you need to fix the DynamoDB schema first?

**No table migration is required.** DynamoDB tables already exist with partition key `pk` and sort key `sk`. Items are schemaless — you only need to **write rows in the target shape**:

| Table | Sort key pattern | What the script writes |
|-------|------------------|-------------------------|
| `KeyTrainHiveIndicators` | `BATCH#<epoch>` | One monthly host upload per host (no `approval_status`) |
| `KeyTrainHiveSignatures` | `SIG#<id>` | Approved + pending test signatures |
| `KeyTrainHiveTrendReports` | `TREND#2026-06#<epoch>` | `raw_metrics` for Reporting charts |
| `KeyTrainTrainingAssignments` | `TRAINING#2026-06#<uuid>` | Sample `questions[]` linked to trend report |

What **is** separate from seeding:

- **Production Lambdas** should eventually stop writing legacy `TS#…` rows into Indicators — that is a write-path fix, not a table DDL change.
- You can leave existing production data alone; test orgs use distinct ids (`hive-test-alpha`, etc.).
- **KTL read path** (`ktl-hive-readonly`) is already fine — seeding needs **write** credentials.

## Test orgs created

| Org id | Hosts | Signature mix | Risk profile |
|--------|-------|---------------|--------------|
| `hive-test-alpha` | 5 (`…-host-01` … `host-05`) | Mostly approved | High technical (78 overall) |
| `hive-test-beta` | 5 | Mostly pending | Medium (55 overall) |
| `hive-test-church` | 5 | Mixed | Lower (34 overall) |

Each host has different `alert_metrics`, `training_metrics`, `candidate_iocs`, and `software_findings`.

All seeded items include `seed_tag: ktl-hive-test-data` for cleanup.

## Prerequisites

1. **AWS account** `607292335442`, region **`us-east-2`**
2. **IAM credentials with write access** to the four Hive tables (not `ktl-hive-readonly`)

Example minimal IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:Scan",
        "dynamodb:DeleteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-2:607292335442:table/KeyTrainHiveIndicators",
        "arn:aws:dynamodb:us-east-2:607292335442:table/KeyTrainHiveTrendReports",
        "arn:aws:dynamodb:us-east-2:607292335442:table/KeyTrainTrainingAssignments",
        "arn:aws:dynamodb:us-east-2:607292335442:table/KeyTrainHiveSignatures"
      ]
    }
  ]
}
```

Options for credentials:

- IAM user `ktl-hive-seed` with the policy above
- AWS CLI profile with admin or PowerUser access
- `aws sso login` then `export AWS_PROFILE=your-profile`

## Run the seed

```bash
cd scripts/hive-seed
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

export AWS_REGION=us-east-2
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...

# Preview counts + sample JSON (no writes)
python aws_hive_seed.py --dry-run

# Write to DynamoDB (~48 items: 15 batches + 10 sigs + 3 trends + 3 assignments + ...)
python aws_hive_seed.py
```

Or with AWS CLI profile:

```bash
export AWS_PROFILE=keytrain-admin
export AWS_REGION=us-east-2
python aws_hive_seed.py
```

## Verify in AWS Console

1. DynamoDB → Tables → `KeyTrainHiveIndicators` → Explore items  
2. Filter `pk = ORG#hive-test-alpha`  
3. Confirm 5 items with `sk` starting with `BATCH#`

Repeat for Signatures, TrendReports, TrainingAssignments.

## Verify in KTL

1. Deploy `aws-hive-bridge` if not already live  
2. Log in as platform **admin** → **Hive** tab → **Refresh from AWS**  
3. Org filter should list `hive-test-alpha`, `hive-test-beta`, `hive-test-church`  
4. Try single-org filter + **Export PDF**

Optional faster queries during dev — Supabase Edge Function secret:

```
HIVE_ORG_IDS=hive-test-alpha,hive-test-beta,hive-test-church
```

## Clean up test data

```bash
python aws_hive_seed_cleanup.py --dry-run
python aws_hive_seed_cleanup.py --confirm
```

To remove everything under the test org partition keys (broader):

```bash
python aws_hive_seed_cleanup.py --by-org --confirm
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `AccessDeniedException` | Use write IAM user, not `ktl-hive-readonly` |
| `ResourceNotFoundException` | Wrong region — must be `us-east-2` |
| Orgs not in KTL UI | Redeploy bridge; click Refresh; check Supabase `AWS_*` secrets |
| Empty Host uploads | Confirm `BATCH#` items exist under `ORG#hive-test-*` |
