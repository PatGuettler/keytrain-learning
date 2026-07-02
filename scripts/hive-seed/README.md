# Hive DynamoDB test data seed

Seeds **5 test orgs × 10 workstation users × 3 reporting months** into the KeyTrain Hive tables in `us-east-2` for KTL dashboard, reporting drill-down, and PDF testing.

## What gets seeded

| Table | Per org (default) | Total (5 orgs) |
|-------|-------------------|----------------|
| `KeyTrainHiveIndicators` `BATCH#` | 10 users × 3 months = 30 host uploads | **150** |
| `KeyTrainHiveIndicators` `TS#` (legacy) | 3 legacy IOC rows | **15** |
| `KeyTrainHiveSignatures` `SIG#` | 12 signatures (approved / pending / rejected) | **60** |
| `KeyTrainHiveTrendReports` `TREND#` | 3 monthly reports (2026-04 … 2026-06) | **15** |
| `KeyTrainTrainingAssignments` `TRAINING#` | 3 monthly assignments w/ inline `questions[]` | **15** |
| | | **~255 items** |

Trend report `alert_counts` are **aggregated from host batches** for the same org + month so KTL reconciliation tables can show matches.

### Test orgs

| Org id | Profile | Risk trend |
|--------|---------|------------|
| `hive-test-alpha` | Alpha Memorial Hospital (healthcare) | Worsening month-over-month |
| `hive-test-beta` | Beta Regional Clinic (healthcare) | Slowly rising |
| `hive-test-church` | Grace Community Church (nonprofit) | Improving |
| `hive-test-delta` | Delta Manufacturing Group | Rising technical risk |
| `hive-test-epsilon` | Epsilon School District (education) | Stable human-risk focus |

### Ten user personas per org

Each org gets the same **10 workstation personas** (different departments and archetypes): healthy baseline, critical alerts, suspicious-heavy, outdated software, weak training, credential theft, ransomware precursors, insider-threat pattern, remote VPN worker, and mixed medium risk.

Host batch fields mirror KT uploads: `performance_metrics`, `alert_metrics`, `domain_metrics`, `training_metrics`, `candidate_iocs`, `software_findings`, plus `user_display_name`, `user_email`, `department`.

## Prerequisites

1. **AWS account** `607292335442`, region **`us-east-2`**
2. **IAM credentials with write access** to the four Hive tables (not `ktl-hive-readonly`)

## Run the seed

```bash
cd scripts/hive-seed
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

export AWS_REGION=us-east-2
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...

# Preview counts + sample JSON (no writes)
python aws_hive_seed.py --dry-run

# Write all 5 orgs (~255 items)
python aws_hive_seed.py

# Subset of orgs
python aws_hive_seed.py --orgs hive-test-alpha hive-test-delta
```

Or from repo root: `npm run seed:hive:dry-run` / `npm run seed:hive`

## Verify in KTL

1. Deploy `aws-hive-bridge` if not already live
2. Log in as platform **admin** → **Hive** tab → **Refresh from AWS**
3. Org filter should list all five `hive-test-*` orgs
4. **Reporting** — pick different months; alert reconciliation should match host batch sums
5. **Host uploads** — legacy `TS#` warning should appear (15 rows total)
6. **Security Posture** — mix of approved / pending / rejected signatures
7. **Training** — 3 assignments per org when unfiltered; 1 per org per month when filtered

Optional Supabase secret for faster bridge queries:

```
HIVE_ORG_IDS=hive-test-alpha,hive-test-beta,hive-test-church,hive-test-delta,hive-test-epsilon
```

## Clean up test data

```bash
python aws_hive_seed_cleanup.py --dry-run
python aws_hive_seed_cleanup.py --confirm
```

Remove everything under all five test org partition keys:

```bash
python aws_hive_seed_cleanup.py --by-org --confirm
```

## Customize

Edit `seed_catalog.py`:

- `USER_PERSONAS` — host/user archetypes
- `ORG_PROFILES` — org risk, training focus, signature approval mix
- `REPORTING_PERIODS` — add more months for trend charts
- `SIGNATURE_PHRASE_BANK` / `LEGACY_IOC_TEMPLATES` — detection rule variety
