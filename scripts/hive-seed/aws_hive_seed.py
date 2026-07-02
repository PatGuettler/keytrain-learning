#!/usr/bin/env python3
"""
Seed KeyTrain Hive DynamoDB tables with test data for KTL dashboard QA.

Writes comprehensive sample data (default: 5 orgs × 10 users × 3 months):
  - KeyTrainHiveIndicators:  BATCH# monthly host uploads + legacy TS# rows
  - KeyTrainHiveSignatures:  SIG# with approved / pending / rejected mix
  - KeyTrainHiveTrendReports:  TREND#YYYY-MM#<epoch> (metrics reconcile to batches)
  - KeyTrainTrainingAssignments:  TRAINING#YYYY-MM#<uuid>

Requires AWS credentials with dynamodb:PutItem (and BatchWriteItem) on us-east-2 tables.
Do NOT use ktl-hive-readonly — create a separate seed IAM user or use your admin profile.

Usage:
  cd scripts/hive-seed
  python3 -m venv venv && source venv/bin/activate
  pip install -r requirements.txt
  export AWS_REGION=us-east-2
  export AWS_ACCESS_KEY_ID=...
  export AWS_SECRET_ACCESS_KEY=...
  python aws_hive_seed.py
  python aws_hive_seed.py --dry-run
  python aws_hive_seed.py --orgs hive-test-alpha hive-test-beta
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any, TYPE_CHECKING

from seed_catalog import DEFAULT_ORGS, build_all_items, summary_text

if TYPE_CHECKING:
    from botocore.exceptions import ClientError

REGION = "us-east-2"

TABLES = {
    "indicators": "KeyTrainHiveIndicators",
    "signatures": "KeyTrainHiveSignatures",
    "trends": "KeyTrainHiveTrendReports",
    "assignments": "KeyTrainTrainingAssignments",
}


def write_table(dynamo: Any, table_name: str, items: list[dict[str, Any]], dry_run: bool) -> int:
    if dry_run:
        return len(items)
    table = dynamo.Table(table_name)
    written = 0
    with table.batch_writer(overwrite_by_pkeys=["pk", "sk"]) as batch:
        for item in items:
            batch.put_item(Item=item)
            written += 1
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed KeyTrain Hive DynamoDB test data")
    parser.add_argument("--dry-run", action="store_true", help="Print plan only; do not write")
    parser.add_argument("--region", default=REGION, help=f"AWS region (default: {REGION})")
    parser.add_argument(
        "--orgs",
        nargs="*",
        default=DEFAULT_ORGS,
        help=f"Org ids to seed (default: {len(DEFAULT_ORGS)} hive-test-* orgs)",
    )
    args = parser.parse_args()

    org_ids = args.orgs
    try:
        items = build_all_items(org_ids)
    except KeyError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(summary_text(org_ids, items))
    print(f"  Region: {args.region}")
    for key, table in TABLES.items():
        print(f"  {table}: {len(items[key])} items")

    if args.dry_run:
        batch_sample = next(i for i in items["indicators"] if str(i["sk"]).startswith("BATCH#"))
        trend_sample = items["trends"][0]
        print("\nDry run — sample host batch:")
        print(json.dumps(batch_sample, indent=2, default=str))
        print("\nDry run — sample trend report raw_metrics keys:")
        print(json.dumps(list(trend_sample["raw_metrics"].keys()), indent=2))
        return 0

    try:
        import boto3
        from botocore.exceptions import ClientError
    except ImportError:
        print("Install dependencies: pip install -r requirements.txt", file=sys.stderr)
        return 1

    session = boto3.Session(region_name=args.region)
    dynamo = session.resource("dynamodb")

    try:
        for key, table_name in TABLES.items():
            count = write_table(dynamo, table_name, items[key], dry_run=False)
            print(f"Wrote {count} items to {table_name}")
    except ClientError as exc:
        print(f"\nAWS error: {exc}", file=sys.stderr)
        print(
            "\nCommon fixes:\n"
            "  - Use credentials with dynamodb:PutItem / BatchWriteItem (not read-only)\n"
            "  - Confirm region us-east-2 and table names exist in the console\n"
            "  - export AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION=us-east-2",
            file=sys.stderr,
        )
        return 1

    print("\nDone. In KTL Hive tab you should see orgs:", ", ".join(org_ids))
    print("Optional Supabase secret: HIVE_ORG_IDS=" + ",".join(org_ids))
    return 0


if __name__ == "__main__":
    sys.exit(main())
