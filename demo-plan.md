# KTL Demo Plan — LMS only

Living doc for the LMS-only product demo. Update as setup, accounts, and talk track change.

## Goal

Show KeyTrain Learning portal training (assignments, roles, multi-org admin, reporting) **without** RailNet or phishing.

## Personas

| Role | What they do in the demo |
|------|---------------------------|
| **Org admin** | Multi-org: create/list orgs, manage users per org, training reports/stats |
| **Manager** | Takes required training; sees employee status on My Team |
| **Employee** | Required Training only; completes a course; progress visible to manager + org admin |

---

## How it maps to the product

| Beat | Where to show it | Notes |
|------|------------------|--------|
| Org admin · multi-org | Organizations list, create org, header org switcher | Users live **per org**; switch (or open an org) before managing users |
| Users in org | Organizations → click org → directory / invite / import | |
| Reports / stats | Training reports → filter org → open a person | Completion, avg score, overdue; drill into course-level detail |
| Manager | Required Training + My Team | Sees only **direct reports** (`manager_id`). Takes training like staff. |
| Employee | Required Training only | No team/reports. Finish a course → updates manager team + org-admin reports |

**LMS-only means:** for every demo org, leave **RailNet** and **Phishing** off. Nav stays LMS-focused (Dashboard, Organizations, Training reports, Billing, Required Training).

---

## Prep (once before the demo)

### 1. Environment

- [ ] Migrations applied through **050** (inclusive Standard billing) and **049** (feature flags / phishing add-on column).
- [ ] App deployed / running against that project.

### 2. Paid features (KTL admin)

For each demo org: **Organizations** → org → **Paid features**:

- [ ] Training (LMS) **on**
- [ ] RailNet **off**
- [ ] Phishing **off**
- [ ] If billing still shows old per-role seats: **Apply current Standard pricing ($60 / 20 users)**

### 3. Accounts

Prefer one **primary org** (e.g. UAB) plus a second org for multi-org. Wire manager ↔ employee.

| Role | Suggested login | Purpose |
|------|-----------------|--------|
| Org admin | `orgadmin@test.com` / `asdf1234ASDF!@#$` | Multi-org, users, reports (`bootstrap-uab-org-admin.sql`) |
| Manager | Create under primary org (or align `manager@test.com` to that org) | Team + own training |
| Employee | Under that manager | Takes a course |

- [ ] Employee’s **manager** field points at the demo manager (invite UI or edit user).
- [ ] Optional second org created by org admin (e.g. “Demo East”) for create/switch.

### 4. Content

- [ ] At least one **published** course available to the primary org (publish-to-org as KTL admin, or seeded course).
- [ ] Manager + employee see it under **Required Training**.
- [ ] Prefer a short course for live completion during the demo.

### 5. Smoke checks

- [ ] Org admin: no RailNet / phishing in nav or dashboard shortcuts.
- [ ] Manager: Training + My Team only (no RailNet if license off).
- [ ] Employee: Training only.
- [ ] Complete-as-employee once offline; confirm manager team + org-admin Training reports update.

---

## Suggested talk track (~10–15 min)

### 1. Org admin (LMS)

1. Log in as org admin → call out **no RailNet / phishing**.
2. **Organizations** → existing + **New Organization** / switcher.
3. Open an org → users (manager + employee).
4. **Training reports** → filter by org → open a person → scores / not started.

### 2. Manager

1. Log in → **Required Training** (assigned course; optionally start/complete).
2. **My Team** → employee status.
3. (Optional) Back to org admin → same people in reports.

### 3. Employee → roll-up

1. Log in as employee → only training.
2. Complete a course.
3. Manager → My Team updated.
4. Org admin → Training reports → that user → complete / score.

---

## Watch-outs

- **Org admin Dashboard** defaults to **All organizations** (filter to one org for per-org stats / RailNet–phishing shortcuts). Do not treat the page title as a single org name.
- **Active org** (header switcher) still drives day-to-day manage and Required Training; open an org or use the switcher before “where are my users?”
- **Manager only sees direct reports** — missing `manager_id` → empty team.
- **Org admin’s own Required Training** is for the **active** org; staff reporting still rolls up **per org**.
- **Security catalog** is hidden for now — don’t plan “subscribe from catalog”; use a course already published to the org.
- Multi-org **billing**: each org has its own Standard subscription; admin counts toward each org’s included users, not a separate “admin seat” fee on Standard.

---

## Known bootstrap scripts

| Script | What it does |
|--------|----------------|
| `supabase/bootstrap-uab-org-admin.sql` | `orgadmin@test.com` on UAB (or creates UAB) |
| `supabase/bootstrap-test-users.sql` | `manager@test.com` / `employee@test.com` on Metro General (may need re-homing to demo org) |
| `supabase/bootstrap-admin.sql` | KTL / hospital admin bootstrap |

TODO: optional `bootstrap-lms-demo.sql` (org admin + manager + employee on one org, LMS-only license).

---

## Open questions / follow-ups

- [ ] Confirm primary demo org name and env (staging vs prod-like).
- [ ] Pin which course is used for live employee completion.
- [ ] Decide if org admin should complete training live or only show staff reports.
- [ ] Add dedicated LMS demo bootstrap SQL if accounts keep drifting.
- [ ] Later: LMS + Intelligence demo plan (RailNet / phishing on).

---

## Changelog

- **2026-07-15** — Initial LMS-only plan from demo script (org admin multi-org, manager team, employee course roll-up).
