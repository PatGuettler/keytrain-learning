"""
Hive DynamoDB seed catalog — realistic multi-org test data for KTL dashboards.

5 orgs × 10 workstation users × 3 reporting months, plus signatures, trends,
training assignments, and legacy TS# IOC rows.
"""

from __future__ import annotations

import time
import uuid
from decimal import Decimal
from typing import Any

SEED_TAG = "ktl-hive-test-data"
REPORTING_PERIODS = ["2026-04", "2026-05", "2026-06"]

DEFAULT_ORGS = [
    "hive-test-alpha",
    "hive-test-beta",
    "hive-test-church",
    "hive-test-delta",
    "hive-test-epsilon",
]

SIGNATURE_TYPES = (
    "phishing_phrase",
    "malicious_ip",
    "file_hash",
    "domain",
    "url_pattern",
    "registry_key",
)

SECURITY_DOMAINS = (
    "email_security",
    "endpoint_protection",
    "network",
    "password_hygiene",
    "phishing",
    "social_engineering",
    "data_handling",
    "vulnerability_management",
    "remote_access",
    "insider_threat",
)

# Ten workstation personas — reused across orgs with per-org user ids.
USER_PERSONAS: list[dict[str, Any]] = [
    {
        "suffix": "user-01",
        "display_name": "Jordan Lee",
        "department": "Executive",
        "archetype": "healthy-baseline",
        "alert": {"Critical": 0, "High": 1, "Normal": 14, "Suspicious": 2},
        "training": {"average_score": 94, "modules_completed": 9, "weak_domains": []},
        "perf": {"cpu_avg_pct": 24, "memory_avg_pct": 46, "disk_free_pct": 58},
        "domains": {"email_security": 2, "endpoint_protection": 2, "network": 1},
        "iocs": [],
        "software": [],
    },
    {
        "suffix": "user-02",
        "display_name": "Sam Rivera",
        "department": "Clinical",
        "archetype": "high-critical-alerts",
        "alert": {"Critical": 9, "High": 16, "Normal": 5, "Suspicious": 7},
        "training": {"average_score": 52, "modules_completed": 2, "weak_domains": ["phishing", "password_hygiene"]},
        "perf": {"cpu_avg_pct": 78, "memory_avg_pct": 84, "disk_free_pct": 14},
        "domains": {"email_security": 22, "endpoint_protection": 11, "network": 6},
        "iocs": [
            {"indicator": "185.220.101.5", "indicator_type": "malicious_ip", "severity": "High"},
            {"indicator": "dropper-stage.exe", "indicator_type": "file_hash", "severity": "Critical"},
        ],
        "software": [
            {"product": "Adobe Reader", "version": "2019.008", "severity": "High"},
            {"product": "Chrome", "version": "118.0.0", "severity": "Medium"},
        ],
    },
    {
        "suffix": "user-03",
        "display_name": "Alex Kim",
        "department": "Finance",
        "archetype": "suspicious-heavy",
        "alert": {"Critical": 1, "High": 4, "Normal": 7, "Suspicious": 26},
        "training": {"average_score": 67, "modules_completed": 5, "weak_domains": ["email_security"]},
        "perf": {"cpu_avg_pct": 41, "memory_avg_pct": 53, "disk_free_pct": 39},
        "domains": {"email_security": 28, "endpoint_protection": 5, "network": 3},
        "iocs": [{"indicator": "urgent wire transfer", "indicator_type": "phishing_phrase", "severity": "High"}],
        "software": [{"product": "Java Runtime", "version": "8u251", "severity": "Medium"}],
    },
    {
        "suffix": "user-04",
        "display_name": "Morgan Patel",
        "department": "IT Operations",
        "archetype": "outdated-software",
        "alert": {"Critical": 3, "High": 6, "Normal": 10, "Suspicious": 5},
        "training": {"average_score": 71, "modules_completed": 6, "weak_domains": ["vulnerability_management"]},
        "perf": {"cpu_avg_pct": 36, "memory_avg_pct": 61, "disk_free_pct": 26},
        "domains": {"email_security": 6, "endpoint_protection": 14, "network": 4},
        "iocs": [],
        "software": [
            {"product": "Windows 10", "version": "21H1", "severity": "High"},
            {"product": "Microsoft Office", "version": "2016", "severity": "High"},
            {"product": "OpenSSL", "version": "1.0.2", "severity": "Critical"},
        ],
    },
    {
        "suffix": "user-05",
        "display_name": "Casey Nguyen",
        "department": "HR",
        "archetype": "weak-training",
        "alert": {"Critical": 0, "High": 3, "Normal": 8, "Suspicious": 11},
        "training": {"average_score": 38, "modules_completed": 1, "weak_domains": ["phishing", "social_engineering", "data_handling"]},
        "perf": {"cpu_avg_pct": 29, "memory_avg_pct": 44, "disk_free_pct": 51},
        "domains": {"email_security": 11, "endpoint_protection": 4, "network": 2},
        "iocs": [{"indicator": "10.0.0.44", "indicator_type": "internal_scan", "severity": "Medium"}],
        "software": [{"product": "Firefox ESR", "version": "102.0", "severity": "Low"}],
    },
    {
        "suffix": "user-06",
        "display_name": "Riley Chen",
        "department": "Billing",
        "archetype": "credential-theft",
        "alert": {"Critical": 5, "High": 8, "Normal": 6, "Suspicious": 9},
        "training": {"average_score": 58, "modules_completed": 3, "weak_domains": ["password_hygiene", "phishing"]},
        "perf": {"cpu_avg_pct": 52, "memory_avg_pct": 67, "disk_free_pct": 33},
        "domains": {"email_security": 15, "password_hygiene": 12, "network": 4},
        "iocs": [
            {"indicator": "login-verify-account.com", "indicator_type": "url_pattern", "severity": "Critical"},
            {"indicator": "LSASS memory access", "indicator_type": "process_behavior", "severity": "Critical"},
        ],
        "software": [{"product": "TeamViewer", "version": "14.2", "severity": "High"}],
    },
    {
        "suffix": "user-07",
        "display_name": "Taylor Brooks",
        "department": "Facilities",
        "archetype": "ransomware-precursors",
        "alert": {"Critical": 7, "High": 11, "Normal": 4, "Suspicious": 8},
        "training": {"average_score": 49, "modules_completed": 2, "weak_domains": ["endpoint_protection", "data_handling"]},
        "perf": {"cpu_avg_pct": 63, "memory_avg_pct": 71, "disk_free_pct": 18},
        "domains": {"endpoint_protection": 19, "network": 8, "email_security": 6},
        "iocs": [
            {"indicator": "vssadmin delete shadows", "indicator_type": "command_line", "severity": "Critical"},
            {"indicator": "198.51.100.77", "indicator_type": "malicious_ip", "severity": "High"},
        ],
        "software": [{"product": "7-Zip", "version": "19.0", "severity": "Medium"}],
    },
    {
        "suffix": "user-08",
        "display_name": "Jamie Ortiz",
        "department": "Reception",
        "archetype": "insider-threat-pattern",
        "alert": {"Critical": 2, "High": 5, "Normal": 9, "Suspicious": 14},
        "training": {"average_score": 63, "modules_completed": 4, "weak_domains": ["insider_threat", "data_handling"]},
        "perf": {"cpu_avg_pct": 34, "memory_avg_pct": 49, "disk_free_pct": 47},
        "domains": {"insider_threat": 14, "data_handling": 9, "email_security": 5},
        "iocs": [
            {"indicator": "bulk USB copy", "indicator_type": "dlp_event", "severity": "High"},
            {"indicator": "after-hours archive", "indicator_type": "file_activity", "severity": "Medium"},
        ],
        "software": [],
    },
    {
        "suffix": "user-09",
        "display_name": "Drew Martinez",
        "department": "Remote Staff",
        "archetype": "remote-worker-vpn",
        "alert": {"Critical": 1, "High": 7, "Normal": 11, "Suspicious": 6},
        "training": {"average_score": 76, "modules_completed": 7, "weak_domains": ["remote_access"]},
        "perf": {"cpu_avg_pct": 28, "memory_avg_pct": 52, "disk_free_pct": 42},
        "domains": {"remote_access": 16, "network": 9, "email_security": 4},
        "iocs": [{"indicator": "unapproved VPN client", "indicator_type": "software_policy", "severity": "High"}],
        "software": [{"product": "OpenVPN", "version": "2.4.9", "severity": "Medium"}],
    },
    {
        "suffix": "user-10",
        "display_name": "Quinn Adams",
        "department": "Lab",
        "archetype": "mixed-medium",
        "alert": {"Critical": 2, "High": 9, "Normal": 12, "Suspicious": 10},
        "training": {"average_score": 81, "modules_completed": 6, "weak_domains": ["vulnerability_management"]},
        "perf": {"cpu_avg_pct": 47, "memory_avg_pct": 58, "disk_free_pct": 35},
        "domains": {"vulnerability_management": 11, "endpoint_protection": 7, "network": 5},
        "iocs": [{"indicator": "lab-instrument-pc", "indicator_type": "asset_tag", "severity": "Low"}],
        "software": [
            {"product": "LabWorks", "version": "4.1", "severity": "Medium"},
            {"product": ".NET Framework", "version": "4.5.2", "severity": "High"},
        ],
    },
]

ORG_PROFILES: dict[str, dict[str, Any]] = {
    "hive-test-alpha": {
        "display_name": "Alpha Memorial Hospital",
        "sector": "healthcare",
        "risk_base": {"overall": 72, "human": 58, "technical": 81},
        "risk_delta_per_month": 3,
        "assignment_type": "targeted_multi_domain_training",
        "weak_domains": ["phishing", "password_hygiene", "vulnerability_management", "email_security"],
        "signature_bias": {"approved": 0.6, "pending": 0.3, "rejected": 0.1},
    },
    "hive-test-beta": {
        "display_name": "Beta Regional Clinic",
        "sector": "healthcare",
        "risk_base": {"overall": 54, "human": 47, "technical": 59},
        "risk_delta_per_month": 1,
        "assignment_type": "compliance_mandatory_training",
        "weak_domains": ["email_security", "endpoint_protection", "data_handling"],
        "signature_bias": {"approved": 0.25, "pending": 0.65, "rejected": 0.1},
    },
    "hive-test-church": {
        "display_name": "Grace Community Church",
        "sector": "nonprofit",
        "risk_base": {"overall": 31, "human": 27, "technical": 38},
        "risk_delta_per_month": -2,
        "assignment_type": "awareness_refresh_training",
        "weak_domains": ["phishing", "social_engineering"],
        "signature_bias": {"approved": 0.55, "pending": 0.35, "rejected": 0.1},
    },
    "hive-test-delta": {
        "display_name": "Delta Manufacturing Group",
        "sector": "manufacturing",
        "risk_base": {"overall": 63, "human": 51, "technical": 74},
        "risk_delta_per_month": 2,
        "assignment_type": "phishing_remediation_training",
        "weak_domains": ["phishing", "insider_threat", "remote_access", "endpoint_protection"],
        "signature_bias": {"approved": 0.4, "pending": 0.45, "rejected": 0.15},
    },
    "hive-test-epsilon": {
        "display_name": "Epsilon School District",
        "sector": "education",
        "risk_base": {"overall": 48, "human": 62, "technical": 41},
        "risk_delta_per_month": 0,
        "assignment_type": "executive_briefing_training",
        "weak_domains": ["social_engineering", "password_hygiene", "data_handling", "remote_access"],
        "signature_bias": {"approved": 0.35, "pending": 0.5, "rejected": 0.15},
    },
}

LEGACY_IOC_TEMPLATES: list[dict[str, Any]] = [
    {
        "rec_id": "legacy-phish-001",
        "indicator": "click this secure link",
        "indicator_type": "phishing_phrase",
        "severity": "High",
        "signature_id": "legacy-phish-001",
        "domain": "email_security",
    },
    {
        "rec_id": "legacy-mal-002",
        "indicator": "203.0.113.55",
        "indicator_type": "malicious_ip",
        "severity": "Critical",
        "signature_id": "legacy-mal-002",
        "domain": "network",
    },
    {
        "rec_id": "legacy-file-003",
        "indicator": "invoice_macro.xlsm",
        "indicator_type": "file_hash",
        "severity": "High",
        "signature_id": "legacy-file-003",
        "domain": "endpoint_protection",
    },
]

SIGNATURE_PHRASE_BANK: list[dict[str, str]] = [
    {"phrase": "urgent wire transfer", "domain": "email_security", "signature_type": "phishing_phrase", "severity": "High"},
    {"phrase": "password expired", "domain": "email_security", "signature_type": "phishing_phrase", "severity": "High"},
    {"phrase": "free gift card", "domain": "email_security", "signature_type": "phishing_phrase", "severity": "Medium"},
    {"phrase": "185.220.101.5", "domain": "network", "signature_type": "malicious_ip", "severity": "Critical"},
    {"phrase": "evil-payload.dll", "domain": "endpoint_protection", "signature_type": "file_hash", "severity": "Critical"},
    {"phrase": "known-good-updater.com", "domain": "network", "signature_type": "domain", "severity": "Low"},
    {"phrase": "pastor needs gift cards", "domain": "email_security", "signature_type": "phishing_phrase", "severity": "High"},
    {"phrase": "payroll adjustment", "domain": "email_security", "signature_type": "phishing_phrase", "severity": "Medium"},
    {"phrase": "vpn-update-required.net", "domain": "remote_access", "signature_type": "url_pattern", "severity": "High"},
    {"phrase": "HKLM\\Software\\Run\\Updater", "domain": "endpoint_protection", "signature_type": "registry_key", "severity": "High"},
    {"phrase": "student records download", "domain": "data_handling", "signature_type": "phishing_phrase", "severity": "Critical"},
    {"phrase": "factory-scada-bridge", "domain": "network", "signature_type": "domain", "severity": "Medium"},
]


def org_pk(org_id: str) -> str:
    return org_id if org_id.startswith("ORG#") else f"ORG#{org_id}"


def _period_index(period: str) -> int:
    return REPORTING_PERIODS.index(period) if period in REPORTING_PERIODS else 0


def _scale_alerts(alerts: dict[str, int], period: str, org_id: str) -> dict[str, int]:
    profile = ORG_PROFILES[org_id]
    month_idx = _period_index(period)
    delta = profile["risk_delta_per_month"]
    factor = 1.0 + (month_idx * delta * 0.04)
    scaled: dict[str, int] = {}
    for key, value in alerts.items():
        scaled[key] = max(0, int(round(value * factor)))
    return scaled


def _risk_scores(org_id: str, period: str) -> dict[str, int]:
    base = ORG_PROFILES[org_id]["risk_base"]
    month_idx = _period_index(period)
    delta = ORG_PROFILES[org_id]["risk_delta_per_month"]
    return {
        key: max(5, min(98, int(value + month_idx * delta)))
        for key, value in base.items()
    }


def _aggregate_batches(batches: list[dict[str, Any]]) -> dict[str, Any]:
    alerts: dict[str, int] = {"Critical": 0, "High": 0, "Normal": 0, "Suspicious": 0}
    domain_counts: dict[str, int] = {}
    software_findings: list[dict[str, Any]] = []
    training_scores: list[int] = []
    weak_domains: set[str] = set()
    ioc_count = 0

    for batch in batches:
        for key, value in batch["alert_metrics"].items():
            alerts[key] = alerts.get(key, 0) + int(value)
        for key, value in batch["domain_metrics"].items():
            domain_counts[key] = domain_counts.get(key, 0) + int(value)
        software_findings.extend(batch.get("software_findings", []))
        tm = batch.get("training_metrics", {})
        if isinstance(tm.get("average_score"), (int, float, Decimal)):
            training_scores.append(int(tm["average_score"]))
        for d in tm.get("weak_domains", []):
            weak_domains.add(str(d))
        ioc_count += len(batch.get("candidate_iocs", []))

    avg_score = round(sum(training_scores) / len(training_scores), 1) if training_scores else 0
    return {
        "alert_counts": alerts,
        "domain_counts": domain_counts,
        "software_findings": software_findings[:12],
        "training_summary": {
            "average_score": Decimal(str(avg_score)),
            "weak_domains": sorted(weak_domains),
            "host_count": len(batches),
            "modules_completed_total": sum(
                int(b.get("training_metrics", {}).get("modules_completed", 0)) for b in batches
            ),
        },
        "ioc_summary": {
            "candidate_count": ioc_count,
            "hosts_with_iocs": sum(1 for b in batches if b.get("candidate_iocs")),
        },
        "performance_summary": {
            "avg_cpu_pct": round(
                sum(b["performance_metrics"]["cpu_avg_pct"] for b in batches) / len(batches), 1
            ),
            "avg_memory_pct": round(
                sum(b["performance_metrics"]["memory_avg_pct"] for b in batches) / len(batches), 1
            ),
        },
    }


def _pick_approval_status(org_id: str, index: int) -> str:
    bias = ORG_PROFILES[org_id]["signature_bias"]
    slot = index % 10
    if slot < int(bias["approved"] * 10):
        return "approved"
    if slot < int((bias["approved"] + bias["pending"]) * 10):
        return "pending"
    return "rejected"


def _sample_questions(org_id: str, weak_domains: list[str], count: int = 6) -> list[dict[str, Any]]:
    domains = weak_domains or list(SECURITY_DOMAINS[:3])
    questions: list[dict[str, Any]] = []
    stems = [
        "What should you do if you receive a suspicious email?",
        "Which action best protects credentials?",
        "How should outdated software be handled?",
        "What is the correct response to a possible phishing link?",
        "When is it acceptable to use personal USB devices?",
        "Who should be notified about a suspected security incident?",
    ]
    options = [
        ["Click the link to verify", "Reply with your password", "Report it to IT", "Forward to coworkers"],
        ["Share via chat", "Use a password manager", "Email passwords to IT", "Write on a sticky note"],
        ["Ignore updates", "Install from random sites", "Use IT-approved patching", "Disable antivirus"],
        ["Open in private window", "Report to IT/security", "Reply to sender", "Disable logging"],
        ["Never on org devices", "Always if encrypted", "Only on Fridays", "Only for music"],
        ["No one until confirmed", "Post on social media", "IT/security lead", "External vendor first"],
    ]
    correct = [
        "Report it to IT",
        "Use a password manager",
        "Use IT-approved patching",
        "Report to IT/security",
        "Never on org devices",
        "IT/security lead",
    ]
    for i in range(count):
        domain = domains[i % len(domains)]
        questions.append(
            {
                "id": f"SEED-{org_id[:8]}-{i + 1:02d}",
                "domain": domain,
                "question": f"[{domain}] {stems[i % len(stems)]}",
                "options": options[i % len(options)],
                "correct_answer": correct[i % len(correct)],
                "Explain": f"Security awareness item for {domain}.",
                "Severity": "Medium" if i % 2 == 0 else "High",
                "Potential Criticality": "High",
            }
        )
    return questions


def _ai_report(org_id: str, period: str, metrics: dict[str, Any]) -> dict[str, Any]:
    risks = metrics.get("risk_scores", {})
    alerts = metrics.get("alert_counts", {})
    overall = risks.get("overall", "—")
    alert_text = ", ".join(f"{k}: {v}" for k, v in alerts.items())
    org_name = ORG_PROFILES[org_id]["display_name"]
    return {
        "raw_ai_output": {
            "leadership_brief": (
                f"{org_name} ({period}): overall risk {overall}/100. "
                f"Alert distribution — {alert_text}. "
                f"Prioritize weak domains: {', '.join(metrics.get('training_summary', {}).get('weak_domains', [])[:4]) or 'none flagged'}."
            ),
            "analysis": {
                "summary": f"Monthly telemetry aggregation for {org_id}.",
                "top_risks": list(metrics.get("training_summary", {}).get("weak_domains", []))[:3],
                "software_exposure": len(metrics.get("software_findings", [])),
            },
            "recommendations": [
                "Review pending signatures weekly.",
                "Target training for hosts below 70% average score.",
                "Patch critical software findings within SLA.",
            ],
            "candidate_signatures": [
                {"phrase": "payroll adjustment", "domain": "email_security", "confidence": 0.87},
                {"phrase": "secure-doc-share.net", "domain": "network", "confidence": 0.74},
            ],
        }
    }


def build_all_items(org_ids: list[str], base_epoch: int | None = None) -> dict[str, list[dict[str, Any]]]:
    epoch = base_epoch or int(time.time())
    items: dict[str, list[dict[str, Any]]] = {
        "indicators": [],
        "signatures": [],
        "trends": [],
        "assignments": [],
    }

    for org_index, org_id in enumerate(org_ids):
        if org_id not in ORG_PROFILES:
            raise KeyError(f"Unknown org id {org_id!r} — add to ORG_PROFILES in seed_catalog.py")

        pk = org_pk(org_id)
        org_profile = ORG_PROFILES[org_id]
        period_trend_sks: dict[str, str] = {}

        for period_index, period in enumerate(REPORTING_PERIODS):
            period_batches: list[dict[str, Any]] = []
            trend_epoch = epoch + org_index * 10_000 + period_index * 1_000
            trend_sk = f"TREND#{period}#{trend_epoch}"
            period_trend_sks[period] = trend_sk

            for user_index, persona in enumerate(USER_PERSONAS):
                batch_epoch = epoch + org_index * 1_000 + period_index * 100 + user_index
                host_id = f"{org_id}-{persona['suffix']}"
                user_email = f"{persona['suffix']}@{org_id.replace('hive-test-', '')}.keytrain.example"
                alert_metrics = _scale_alerts(persona["alert"], period, org_id)

                batch = {
                    "pk": pk,
                    "sk": f"BATCH#{batch_epoch}",
                    "org_id": org_id,
                    "host_id": host_id,
                    "user_display_name": persona["display_name"],
                    "user_email": user_email,
                    "department": persona["department"],
                    "host_profile": persona["archetype"],
                    "workstation_os": "Windows 11" if user_index % 3 else "Windows 10",
                    "reporting_period": period,
                    "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(batch_epoch)),
                    "performance_metrics": dict(persona["perf"]),
                    "alert_metrics": alert_metrics,
                    "domain_metrics": dict(persona["domains"]),
                    "training_metrics": dict(persona["training"]),
                    "candidate_iocs": list(persona["iocs"]),
                    "software_findings": list(persona["software"]),
                    "seed_tag": SEED_TAG,
                }
                period_batches.append(batch)
                items["indicators"].append(batch)

            raw_metrics = _aggregate_batches(period_batches)
            raw_metrics["risk_scores"] = _risk_scores(org_id, period)

            items["trends"].append(
                {
                    "pk": pk,
                    "sk": trend_sk,
                    "org_id": org_id,
                    "reporting_period": period,
                    "raw_metrics": raw_metrics,
                    "ai_report": _ai_report(org_id, period, raw_metrics),
                    "seed_tag": SEED_TAG,
                }
            )

            weak_domains = org_profile["weak_domains"]
            questions = _sample_questions(org_id, weak_domains, count=6 + (period_index % 2))
            assignment_id = str(uuid.uuid4())
            items["assignments"].append(
                {
                    "pk": pk,
                    "sk": f"TRAINING#{period}#{assignment_id}",
                    "org_id": org_id,
                    "assignment_id": assignment_id,
                    "assignment_type": org_profile["assignment_type"],
                    "reporting_period": period,
                    "trend_report_sk": trend_sk,
                    "focus_domains": weak_domains[:2],
                    "priority_domains": weak_domains,
                    "weak_domains": weak_domains,
                    "focus_question_counts": {d: 1 + (i % 2) for i, d in enumerate(weak_domains[:3])},
                    "total_question_count": len(questions),
                    "questions": questions,
                    "host_coverage": [b["host_id"] for b in period_batches[:5]],
                    "seed_tag": SEED_TAG,
                }
            )

        # Legacy TS# IOC rows (one per template, staggered timestamps)
        for legacy_index, legacy in enumerate(LEGACY_IOC_TEMPLATES):
            ts_epoch = epoch + org_index * 100 + legacy_index
            items["indicators"].append(
                {
                    "pk": pk,
                    "sk": f"TS#{ts_epoch}#REC#{legacy['rec_id']}",
                    "org_id": org_id,
                    "host_id": f"{org_id}-legacy-host",
                    "indicator": legacy["indicator"],
                    "indicator_type": legacy["indicator_type"],
                    "severity": legacy["severity"],
                    "signature_id": legacy["signature_id"],
                    "domain": legacy["domain"],
                    "reporting_period": REPORTING_PERIODS[-1],
                    "Explain": f"Legacy IOC row for migration testing ({org_id}).",
                    "seed_tag": SEED_TAG,
                }
            )

        # Signatures — 12 per org covering all major types and approval states
        for sig_index, template in enumerate(SIGNATURE_PHRASE_BANK):
            sig_id = f"{org_id.split('-')[-1]}-sig-{sig_index + 1:02d}"
            status = _pick_approval_status(org_id, sig_index)
            sig = {
                "pk": pk,
                "sk": f"SIG#{sig_id}",
                "org_id": org_id,
                "signature_id": sig_id,
                "phrase": template["phrase"],
                "domain": template["domain"],
                "signature_type": template["signature_type"],
                "severity": template["severity"],
                "approval_status": status,
                "Explain": f"Seed signature for {org_profile['display_name']}: {template['phrase']}",
                "reputation_score": Decimal("0.86") if status == "approved" else Decimal("0.42"),
                "usage_count": 8 + sig_index + org_index,
                "seed_tag": SEED_TAG,
            }
            if status == "approved":
                sig["approved_by"] = "security-admin@keytrain.example"
                sig["approved_utc"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(epoch - 86400 * (sig_index + 1)))
            items["signatures"].append(sig)

    return items


def item_counts(items: dict[str, list[dict[str, Any]]]) -> dict[str, int]:
    return {key: len(value) for key, value in items.items()}


def summary_text(org_ids: list[str], items: dict[str, list[dict[str, Any]]]) -> str:
    counts = item_counts(items)
    batches = sum(1 for i in items["indicators"] if str(i.get("sk", "")).startswith("BATCH#"))
    legacy = sum(1 for i in items["indicators"] if str(i.get("sk", "")).startswith("TS#"))
    lines = [
        "KeyTrain Hive seed plan (expanded)",
        f"  Orgs: {len(org_ids)} ({', '.join(org_ids)})",
        f"  Users per org: {len(USER_PERSONAS)}",
        f"  Reporting months: {', '.join(REPORTING_PERIODS)}",
        f"  Host batch uploads: {batches}",
        f"  Legacy TS# IOC rows: {legacy}",
        f"  Trend reports: {counts['trends']}",
        f"  Training assignments: {counts['assignments']}",
        f"  Signatures: {counts['signatures']}",
        f"  Total DynamoDB items: {sum(counts.values())}",
    ]
    return "\n".join(lines)
