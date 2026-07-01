#!/usr/bin/env python3
"""
Seed KeyTrain Hive DynamoDB tables with test data for KTL dashboard QA.

Target model (no table schema migration required — DynamoDB is schemaless per item):
  - KeyTrainHiveIndicators:  BATCH#<epoch> monthly host uploads (5 hosts × 3 orgs)
  - KeyTrainHiveSignatures:  SIG#<id> with approval_status
  - KeyTrainHiveTrendReports:  TREND#YYYY-MM#<epoch>
  - KeyTrainTrainingAssignments: TRAINING#YYYY-MM#training-<uuid>

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
  python aws_hive_seed.py --dry-run   # print counts only, no writes
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from typing import Any, TYPE_CHECKING
from decimal import Decimal

if TYPE_CHECKING:
    from botocore.exceptions import ClientError

REGION = "us-east-2"
REPORTING_PERIOD = "2026-06"

TABLES = {
    "indicators": "KeyTrainHiveIndicators",
    "signatures": "KeyTrainHiveSignatures",
    "trends": "KeyTrainHiveTrendReports",
    "assignments": "KeyTrainTrainingAssignments",
}

TEST_ORGS = ["hive-test-alpha", "hive-test-beta", "hive-test-church"]

# Five host profiles per org — different alert/risk/training shapes for dashboard spread.
HOST_PROFILES: list[dict[str, Any]] = [
    {
        "suffix": "host-01",
        "label": "healthy-baseline",
        "alert_metrics": {"Critical": 0, "High": 1, "Normal": 12, "Suspicious": 2},
        "performance_metrics": {"cpu_avg_pct": 22, "memory_avg_pct": 48, "disk_free_pct": 61},
        "training_metrics": {"average_score": 92, "modules_completed": 8, "weak_domains": []},
        "domain_metrics": {"email_security": 3, "endpoint_protection": 2, "network": 1},
        "candidate_iocs": [],
        "software_findings": [],
    },
    {
        "suffix": "host-02",
        "label": "high-critical-alerts",
        "alert_metrics": {"Critical": 8, "High": 14, "Normal": 4, "Suspicious": 6},
        "performance_metrics": {"cpu_avg_pct": 71, "memory_avg_pct": 82, "disk_free_pct": 19},
        "training_metrics": {"average_score": 54, "modules_completed": 3, "weak_domains": ["phishing", "password_hygiene"]},
        "domain_metrics": {"email_security": 18, "endpoint_protection": 9, "network": 5},
        "candidate_iocs": [
            {"indicator": "185.220.101.5", "indicator_type": "malicious_ip", "severity": "High"},
            {"indicator": "malware-dropper.exe", "indicator_type": "file_hash", "severity": "Critical"},
        ],
        "software_findings": [
            {"product": "Adobe Reader", "version": "2019.008", "severity": "High"},
            {"product": "Chrome", "version": "118.0.0", "severity": "Medium"},
        ],
    },
    {
        "suffix": "host-03",
        "label": "suspicious-heavy",
        "alert_metrics": {"Critical": 1, "High": 3, "Normal": 6, "Suspicious": 22},
        "performance_metrics": {"cpu_avg_pct": 45, "memory_avg_pct": 55, "disk_free_pct": 44},
        "training_metrics": {"average_score": 68, "modules_completed": 5, "weak_domains": ["email_security"]},
        "domain_metrics": {"email_security": 24, "endpoint_protection": 4, "network": 2},
        "candidate_iocs": [
            {"indicator": "urgent wire transfer", "indicator_type": "phishing_phrase", "severity": "High"},
        ],
        "software_findings": [{"product": "Java Runtime", "version": "8u251", "severity": "Medium"}],
    },
    {
        "suffix": "host-04",
        "label": "outdated-software",
        "alert_metrics": {"Critical": 2, "High": 5, "Normal": 9, "Suspicious": 4},
        "performance_metrics": {"cpu_avg_pct": 38, "memory_avg_pct": 62, "disk_free_pct": 28},
        "training_metrics": {"average_score": 61, "modules_completed": 4, "weak_domains": ["vulnerability_management"]},
        "domain_metrics": {"email_security": 5, "endpoint_protection": 11, "network": 3},
        "candidate_iocs": [],
        "software_findings": [
            {"product": "Windows 10", "version": "21H1", "severity": "High"},
            {"product": "Office", "version": "2016", "severity": "High"},
            {"product": "OpenSSL", "version": "1.0.2", "severity": "Critical"},
        ],
    },
    {
        "suffix": "host-05",
        "label": "weak-training",
        "alert_metrics": {"Critical": 0, "High": 2, "Normal": 7, "Suspicious": 8},
        "performance_metrics": {"cpu_avg_pct": 31, "memory_avg_pct": 41, "disk_free_pct": 52},
        "training_metrics": {"average_score": 41, "modules_completed": 1, "weak_domains": ["phishing", "social_engineering", "data_handling"]},
        "domain_metrics": {"email_security": 9, "endpoint_protection": 3, "network": 1},
        "candidate_iocs": [
            {"indicator": "10.0.0.44", "indicator_type": "internal_scan", "severity": "Medium"},
        ],
        "software_findings": [{"product": "Firefox ESR", "version": "102.0", "severity": "Low"}],
    },
]

SIGNATURE_TEMPLATES: dict[str, list[dict[str, Any]]] = {
    "hive-test-alpha": [
        {"signature_id": "alpha-phish-001", "phrase": "urgent wire transfer", "domain": "email_security", "signature_type": "phishing_phrase", "severity": "High", "approval_status": "approved"},
        {"signature_id": "alpha-mal-002", "phrase": "185.220.101.5", "domain": "network", "signature_type": "malicious_ip", "severity": "Critical", "approval_status": "approved"},
        {"signature_id": "alpha-pend-003", "phrase": "click here immediately", "domain": "email_security", "signature_type": "phishing_phrase", "severity": "Medium", "approval_status": "pending"},
    ],
    "hive-test-beta": [
        {"signature_id": "beta-phish-001", "phrase": "password expired", "domain": "email_security", "signature_type": "phishing_phrase", "severity": "High", "approval_status": "pending"},
        {"signature_id": "beta-mal-002", "phrase": "evil-payload.dll", "domain": "endpoint_protection", "signature_type": "file_hash", "severity": "Critical", "approval_status": "pending"},
        {"signature_id": "beta-ok-003", "phrase": "known-good-updater.com", "domain": "network", "signature_type": "domain", "severity": "Low", "approval_status": "approved"},
        {"signature_id": "beta-pend-004", "phrase": "free gift card", "domain": "email_security", "signature_type": "phishing_phrase", "severity": "Medium", "approval_status": "pending"},
    ],
    "hive-test-church": [
        {"signature_id": "church-phish-001", "phrase": "pastor needs gift cards", "domain": "email_security", "signature_type": "phishing_phrase", "severity": "High", "approval_status": "approved"},
        {"signature_id": "church-ok-002", "phrase": "church-office.org", "domain": "network", "signature_type": "domain", "severity": "Low", "approval_status": "approved"},
        {"signature_id": "church-pend-003", "phrase": "volunteer schedule update", "domain": "email_security", "signature_type": "phishing_phrase", "severity": "Medium", "approval_status": "pending"},
    ],
}

ORG_RISK_PROFILES: dict[str, dict[str, Any]] = {
    "hive-test-alpha": {
        "risk_scores": {"overall": 78, "human": 62, "technical": 84},
        "weak_domains": ["phishing", "password_hygiene", "vulnerability_management"],
        "assignment_type": "targeted_multi_domain_training",
    },
    "hive-test-beta": {
        "risk_scores": {"overall": 55, "human": 48, "technical": 61},
        "weak_domains": ["email_security", "endpoint_protection"],
        "assignment_type": "targeted_multi_domain_training",
    },
    "hive-test-church": {
        "risk_scores": {"overall": 34, "human": 29, "technical": 41},
        "weak_domains": ["phishing", "social_engineering"],
        "assignment_type": "awareness_refresh_training",
    },
}


def org_pk(org_id: str) -> str:
    return org_id if org_id.startswith("ORG#") else f"ORG#{org_id}"


def sample_questions(org_id: str, weak_domains: list[str]) -> list[dict[str, Any]]:
    domains = weak_domains or ["email_security"]
    questions = []
    for i, domain in enumerate(domains[:3], start=1):
        correct = "Report it to IT"
        questions.append(
            {
                "id": f"SEED-{org_id[:8]}-{i:02d}",
                "domain": domain,
                "question": f"[{domain}] What should you do if you receive a suspicious email?",
                "options": ["Click the link to verify", "Reply with your password", "Report it to IT", "Forward to coworkers"],
                "correct_answer": correct,
                "Explain": "Suspicious emails should be reported; never share credentials.",
                "Severity": "Medium",
                "Potential Criticality": "High",
            }
        )
    return questions


def aggregate_org_metrics(org_id: str) -> dict[str, Any]:
    alerts: dict[str, int] = {"Critical": 0, "High": 0, "Normal": 0, "Suspicious": 0}
    domain_counts: dict[str, int] = {}
    software_findings: list[dict[str, Any]] = []
    training_scores: list[int] = []
    all_weak: set[str] = set()

    for profile in HOST_PROFILES:
        for key, value in profile["alert_metrics"].items():
            alerts[key] = alerts.get(key, 0) + int(value)
        for key, value in profile["domain_metrics"].items():
            domain_counts[key] = domain_counts.get(key, 0) + int(value)
        software_findings.extend(profile["software_findings"])
        training_scores.append(int(profile["training_metrics"]["average_score"]))
        for d in profile["training_metrics"]["weak_domains"]:
            all_weak.add(d)

    risk = ORG_RISK_PROFILES[org_id]["risk_scores"]
    return {
        "alert_counts": alerts,
        "risk_scores": risk,
        "domain_counts": domain_counts,
        "software_findings": software_findings[:8],
        "training_summary": {
            "average_score": Decimal(str(round(sum(training_scores) / len(training_scores), 1))),
            "weak_domains": sorted(all_weak),
            "host_count": len(HOST_PROFILES),
        },
        "ioc_summary": {"candidate_count": sum(len(p["candidate_iocs"]) for p in HOST_PROFILES)},
    }


def build_items(org_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
    base_epoch = int(time.time())
    items: dict[str, list[dict[str, Any]]] = {
        "indicators": [],
        "signatures": [],
        "trends": [],
        "assignments": [],
    }

    for org_index, org_id in enumerate(org_ids):
        pk = org_pk(org_id)
        trend_epoch = base_epoch + org_index * 1000
        trend_sk = f"TREND#{REPORTING_PERIOD}#{trend_epoch}"
        assignment_id = str(uuid.uuid4())
        assignment_sk = f"TRAINING#{REPORTING_PERIOD}#{assignment_id}"
        weak_domains = ORG_RISK_PROFILES[org_id]["weak_domains"]
        questions = sample_questions(org_id, weak_domains)

        for host_index, profile in enumerate(HOST_PROFILES):
            host_id = f"{org_id}-{profile['suffix']}"
            batch_epoch = base_epoch + org_index * 100 + host_index
            items["indicators"].append(
                {
                    "pk": pk,
                    "sk": f"BATCH#{batch_epoch}",
                    "org_id": org_id,
                    "host_id": host_id,
                    "host_profile": profile["label"],
                    "reporting_period": REPORTING_PERIOD,
                    "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(batch_epoch)),
                    "performance_metrics": profile["performance_metrics"],
                    "alert_metrics": profile["alert_metrics"],
                    "domain_metrics": profile["domain_metrics"],
                    "training_metrics": profile["training_metrics"],
                    "candidate_iocs": profile["candidate_iocs"],
                    "software_findings": profile["software_findings"],
                    "seed_tag": "ktl-hive-test-data",
                }
            )

        for sig in SIGNATURE_TEMPLATES[org_id]:
            items["signatures"].append(
                {
                    "pk": pk,
                    "sk": f"SIG#{sig['signature_id']}",
                    "org_id": org_id,
                    "signature_id": sig["signature_id"],
                    "phrase": sig["phrase"],
                    "domain": sig["domain"],
                    "signature_type": sig["signature_type"],
                    "severity": sig["severity"],
                    "approval_status": sig["approval_status"],
                    "Explain": f"Test signature for {org_id}: {sig['phrase']}",
                    "reputation_score": Decimal("0.82") if sig["approval_status"] == "approved" else Decimal("0.41"),
                    "usage_count": 12 + org_index,
                    "seed_tag": "ktl-hive-test-data",
                }
            )

        raw_metrics = aggregate_org_metrics(org_id)
        items["trends"].append(
            {
                "pk": pk,
                "sk": trend_sk,
                "org_id": org_id,
                "reporting_period": REPORTING_PERIOD,
                "raw_metrics": raw_metrics,
                "ai_report": {
                    "raw_ai_output": {
                        "note": "Stub AI output for KTL dashboard seed data",
                        "leadership_brief": f"{org_id} monthly summary — overall risk {raw_metrics['risk_scores']['overall']}/100.",
                    }
                },
                "seed_tag": "ktl-hive-test-data",
            }
        )

        items["assignments"].append(
            {
                "pk": pk,
                "sk": assignment_sk,
                "org_id": org_id,
                "assignment_id": assignment_id,
                "assignment_type": ORG_RISK_PROFILES[org_id]["assignment_type"],
                "reporting_period": REPORTING_PERIOD,
                "trend_report_sk": trend_sk,
                "focus_domains": weak_domains[:2],
                "priority_domains": weak_domains,
                "weak_domains": weak_domains,
                "focus_question_counts": {d: 1 for d in weak_domains[:2]},
                "total_question_count": len(questions),
                "questions": questions,
                "seed_tag": "ktl-hive-test-data",
            }
        )

    return items


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
        default=TEST_ORGS,
        help="Org ids to seed (default: three hive-test-* orgs)",
    )
    args = parser.parse_args()

    org_ids = args.orgs

    items = build_items(org_ids)
    print("KeyTrain Hive seed plan")
    print(f"  Region: {args.region}")
    print(f"  Orgs: {', '.join(org_ids)}")
    for key, table in TABLES.items():
        print(f"  {table}: {len(items[key])} items")

    if args.dry_run:
        print("\nDry run — sample indicator item:")
        print(json.dumps(items["indicators"][0], indent=2))
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
