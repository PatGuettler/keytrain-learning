#!/usr/bin/env python3
"""
Delete KTL Hive test seed data (items with seed_tag = ktl-hive-test-data).

Also deletes by org prefix for the three default test orgs if --by-org is passed
(useful if seed_tag was missing on older runs).

Usage:
  python aws_railnet_seed_cleanup.py --dry-run
  python aws_railnet_seed_cleanup.py --confirm
"""

from __future__ import annotations

import argparse
import sys

try:
    import boto3
    from boto3.dynamodb.conditions import Attr
    from botocore.exceptions import ClientError
except ImportError:
    print("Install dependencies: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)

REGION = "us-east-2"
SEED_TAG = "ktl-hive-test-data"
DEFAULT_ORGS = [
    "hive-test-alpha",
    "hive-test-beta",
    "hive-test-church",
    "hive-test-delta",
    "hive-test-epsilon",
]

TABLES = [
    "KeyTrainHiveIndicators",
    "KeyTrainHiveTrendReports",
    "KeyTrainTrainingAssignments",
    "KeyTrainHiveSignatures",
]


def org_pk(org_id: str) -> str:
    return org_id if org_id.startswith("ORG#") else f"ORG#{org_id}"


def delete_items(table, items: list[dict]) -> int:
    deleted = 0
    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(Key={"pk": item["pk"], "sk": item["sk"]})
            deleted += 1
    return deleted


def scan_seed_items(table, org_ids: list[str] | None) -> list[dict]:
    items: list[dict] = []
    scan_kwargs: dict = {
        "ProjectionExpression": "pk, sk, seed_tag",
    }

    if org_ids:
        filters = [Attr("pk").eq(org_pk(org_id)) for org_id in org_ids]
        expr = filters[0]
        for f in filters[1:]:
            expr = expr | f
        scan_kwargs["FilterExpression"] = expr
    else:
        scan_kwargs["FilterExpression"] = Attr("seed_tag").eq(SEED_TAG)

    response = table.scan(**scan_kwargs)
    items.extend(response.get("Items", []))
    while "LastEvaluatedKey" in response:
        scan_kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]
        response = table.scan(**scan_kwargs)
        items.extend(response.get("Items", []))

    if org_ids:
        return items
    return [i for i in items if i.get("seed_tag") == SEED_TAG]


def main() -> int:
    parser = argparse.ArgumentParser(description="Remove Hive test seed data from DynamoDB")
    parser.add_argument("--dry-run", action="store_true", help="Count items only")
    parser.add_argument("--confirm", action="store_true", help="Required to actually delete")
    parser.add_argument("--by-org", action="store_true", help="Delete all items under default test org pks")
    parser.add_argument("--region", default=REGION)
    args = parser.parse_args()

    if not args.dry_run and not args.confirm:
        print("Pass --confirm to delete, or --dry-run to preview.", file=sys.stderr)
        return 1

    org_ids = DEFAULT_ORGS if args.by_org else None
    dynamo = boto3.resource("dynamodb", region_name=args.region)
    total = 0

    for table_name in TABLES:
        table = dynamo.Table(table_name)
        try:
            items = scan_seed_items(table, org_ids)
        except ClientError as exc:
            print(f"{table_name}: scan failed — {exc}", file=sys.stderr)
            return 1

        print(f"{table_name}: {len(items)} item(s) to delete")
        if args.dry_run:
            total += len(items)
            continue

        if items:
            deleted = delete_items(table, items)
            print(f"  deleted {deleted}")
            total += deleted

    print(f"\n{'Would delete' if args.dry_run else 'Deleted'} {total} item(s) total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
