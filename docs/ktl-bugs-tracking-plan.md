# KTL bugs tracking plan

Track the bug list from the pre-launch review. **Do not push** until you have reviewed the local commits.

Repo: `keytrain-learning` · branch: `main` (local only).

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Done (local)** | Committed locally; ready to test after deploy + any DB step below |
| **Needs DB** | Migration written; you must apply it to Supabase before this item is fully testable |
| **Discuss** | Product / architecture — decision still open |
| **Pending** | Decision locked; implementation not started |
| **Needs DB (later)** | Requires new tables/RPCs beyond current migrations |

---

## A. Shipped locally (14 fixes) — ready to test

| # | Item | Status | Commit | Notes |
|---|------|--------|--------|-------|
| 11 | Contact form leaves stale "Request training" text | **Done (local)** | `bd4e94d` | Clears untouched template on category switch |
| 12 | Support email includes org name | **Done (local)** | `b8f8df9` | Client adds `org_name` to snapshot; **no edge redeploy** |
| 26 | Remove Monthly security catalog from course builder | **Done (local)** | `b125d6d` | Checkbox removed; existing `is_monthly_catalog` preserved |
| 10 / 19 | "X of 0" / unlimited attempts display | **Done (local)** | `7f98e89` | Learner card treats `max_attempts = 0` as unlimited |
| 13 / 14 | Attempts jump / retake after 3/3 | **Done (local)** | `87338a4` | Counts only `attempts_used`, not abandoned sessions |
| 9 | Sorting workshop drag broken | **Done (local)** | `978b297` | Mouse + touch long-press; placed cards re-draggable |
| 8 | Refresh restarts course | **Done (local)** | `c944758` | Progress in `localStorage`; resume on reload |
| 7 | Browser Back exits course | **Done (local)** | `6c1daef` | Confirm before leave; progress still saved |
| 6 | Remove manager assign-course UI | **Done (local)** | `f1a50e5` | Card removed; component kept for later |
| 5 | Org admin should not get required training | **Needs DB** | `d6760b9` + `c3bdd89` | Client + migration `056`; apply **056** (§B) |
| 21 | RailNet "Security Posture" → Signatures + view | **Done (local)** | `c76da92` | Tab rename + View dialog |
| 20 | Per-campaign phishing PDF | **Done (local)** | `41c672a` | Export on campaign detail (sent campaigns) |
| 30 | Monthly employee scores audit PDF | **Done (local)** | `0982bfe` | "Monthly scores (PDF)" on training reports / org dashboard |
| 4 / 29 | User directories need search (consistent) | **Done (local)** | `5c91ee8` | Search on all directories |

### Frontend only — no DB for these 14 except #5

None of the other 13 need a migration or edge-function deploy to test.

---

## B. DB updates required

### Migration `056_exclude_org_admin_from_required_training.sql` (for §A #5)

**Why:** Client no longer syncs required training for org admins, but the RPCs still assigned them, and existing `assignments` rows remain.

**What it does:**

1. `sync_user_required_assignments` — early-return for `org_admin` (same as `admin`)
2. `list_required_courses_for_user` — early-return for `org_admin`
3. `DELETE` existing assignments for profiles with `role = 'org_admin'`

```bash
cd /home/pat/dev/keytrain-learning
npx supabase db push   # or paste SQL from supabase/migrations/056_*.sql
```

**Verify:**

```sql
SELECT a.id, p.full_name, p.role
FROM assignments a
JOIN profiles p ON p.id = a.user_id
WHERE p.role = 'org_admin';
-- Should return no rows
```

---

### Migration `057_org_license_can_create_orgs.sql` (for §D #2)

**Why:** Org creation is a paid add-on; org admins should only create additional orgs when entitled.

**What it does:**

1. Adds `org_license.can_create_orgs` (default `false`)
2. Grandfathers existing rows: `UPDATE org_license SET can_create_orgs = true`
3. Updates `create_organization_as_org_admin` to require `can_create_orgs` on any org the caller administers
4. New orgs created via RPC get `can_create_orgs = false`

**Client (commit `a5d6fb8`):** KTL toggle in Org Entitlements; org admin Organizations page hides "New Organization" when not entitled.

---

### Migration `058_org_admin_unlock_requests.sql` (for §D #15)

**Why:** Org admins should approve/deny unlock requests for their org (platform admin retains full access + delete).

**What it does:**

1. Updates `approve_course_unlock` to allow `org_admin` when `auth_is_org_admin_of(request.org_id)`
2. Adds RLS policy `unlock_requests_org_admin_select` so org admins can read requests for their orgs

**Client (commit `a5d6fb8`):** `/org-admin/unlock-requests` route + nav; delete UI hidden for org admins.

---

### Apply 056–058 together

```bash
cd /home/pat/dev/keytrain-learning
npx supabase db push
```

Or paste each file from `supabase/migrations/056_*.sql`, `057_*.sql`, `058_*.sql` into the Supabase SQL editor.

---

## C. Test checklist — §A (14 fixes)

Deploy or run the frontend against the same Supabase you pushed migrations to.

- [ ] **11** Profile → Contact: select Request training → switch to Bug → message is empty (or only your edits)
- [ ] **12** Submit a support request → email / `support_requests.user_snapshot` has `org_name`
- [ ] **26** Course builder has no "Monthly security catalog" checkbox
- [ ] **10 / 19** Unlimited course (`max_attempts = 0`): card shows "unlimited", never "X of 0"
- [ ] **13 / 14** Fail once on a 3-attempt course → shows **1 of 3**; after 3 finishes, locked without unlock
- [ ] **9** Sorting workshop: drag cards (desktop + phone long-press); can move a placed card
- [ ] **8** Mid-course refresh → resumes same module / completed set
- [ ] **7** Browser Back mid-course → confirm dialog; resume works
- [ ] **6** Manager → team member: no "Assign training" card
- [ ] **5** After **056**: org admin has no Required Training nav; no org_admin assignments
- [ ] **21** RailNet tab "Signatures"; View opens detail + raw JSON
- [ ] **20** Sent phishing campaign → Export PDF has metrics + recipient table
- [ ] **30** Training reports → "Monthly scores (PDF)" downloads employee × course scores
- [ ] **4 / 29** Search works on: platform All users, org users table, Platform Admins, manager My Team

---

## D. Section D — product decisions & implementation

### D.1 Locked decisions (2026-07-20)

| # | Decision |
|---|----------|
| **1** | Keep current org admin model (`profiles.org_id` + `organization_memberships`) — no KTL-style platform role for org admins |
| **2** | Org creation = **paid add-on** via `can_create_orgs` on `org_license`; KTL admin toggles in entitlements UI |
| **3** | Org admins **can create courses** when LMS enabled — need **org-admin course builder UI** (`/org-admin/courses/*`) |
| **4** | **Generic user admin page**: profile + CRUD + training tab; platform admin and org admin scopes |
| **15** | Unlock: **platform admin + org admin** (not managers); org admins approve/deny only (no delete) |
| **23** | Host uploads: **human-readable summary cards** (alerts, weak domains, software findings) |
| **24** | Compliance: **wire real AWS data** (replace boilerplate in `compliance-generator.ts`) |
| **25** | RailNet training: **rules-based suggested training from approved signatures** (AI later) |

**Enforcement defaults (not explicitly overridden):**

- **2:** Grandfather migration sets `can_create_orgs = true` for all existing `org_license` rows; new orgs from RPC get `false`
- **27** License gating for course-taking — **deferred**
- **22** RailNet Reporting redesign — **deferred**
- **28** Auto `railnet_org_id` from AWS — **deferred**

---

### D.2 Shipped locally (Section D pass 1)

| # | Item | Status | Commit | Notes |
|---|------|--------|--------|-------|
| **2** | Org creation as paid add-on | **Needs DB** | `a5d6fb8` | Migration **057**; entitlements toggle + gated "New Organization" |
| **4** | Generic user admin page | **Done (local)** | `a5d6fb8` | `/admin/users/:userId`, `/org-admin/users/:userId`; Profile + Training tabs; directories link in |
| **15** | Org admin unlock requests | **Needs DB** | `a5d6fb8` | Migration **058**; `/org-admin/unlock-requests`; no delete for org admins |

**Key files:**

| Area | Path |
|------|------|
| User admin page | `src/pages/UserAdminPage.tsx` |
| Training tab panel | `src/components/admin/UserTrainingPanel.tsx` |
| Path helpers | `src/lib/user-admin-paths.ts` |
| Org create gate | `src/pages/org-admin/OrgAdminOrganizationsPage.tsx` |
| Entitlements toggle | `src/components/admin/OrgEntitlementsCard.tsx` |
| Unlock (org admin) | `src/pages/admin/UnlockRequestsPage.tsx` (reused with `allowDelete={false}`) |

---

### D.3 Still pending (Section D pass 2)

| # | Item | Status | Rough scope |
|---|------|--------|-------------|
| **3** | Org-admin course builder | **Pending** | Mirror `/admin/courses/*` under `/org-admin/courses/*` when LMS enabled |
| **23** | Host uploads human-readable summaries | **Pending** | `RailNetHostUploadsPanel.tsx` — summary cards from JSON |
| **24** | Compliance reports use real AWS data | **Pending** | Replace boilerplate in `compliance-generator.ts` |
| **25** | Suggested training from signatures | **Pending** | Rules from approved signatures → staging |
| **22** | RailNet Reporting redesign | **Discuss** | Deferred |
| **27** | License gating for course-taking | **Discuss** | Deferred — learner RLS ignores `lms_enabled` today |
| **28** | Auto `railnet_org_id` from AWS | **Discuss** | Deferred |

**Suggested build order:** **3 → 23 → 24 → 25**

---

## E. Deferred — unlock notifications (not in Section D pass 1)

| # | Item | Status | Rough scope |
|---|------|--------|-------------|
| **16** | Denied unlock still allows re-request; user not notified | **Needs DB (later)** | Policy on re-request after deny; notify user |
| **17** | Admin message on approve/deny | **Needs DB (later)** | Column + RPC param + admin UI |
| **18** | User notifications inbox | **Needs DB (later)** | New `notifications` table, RLS, UI |

Suggested order when greenlit: **18 table → 17 message on resolve → 16 denial UX + notify**.

---

## F. Local commit list (review before push)

**Phase 1 — 14 bug fixes:**

```
5c91ee8 Add search to all user directories
0982bfe Add monthly employee training scores audit PDF
41c672a Add per-campaign phishing results PDF export
c76da92 Rename RailNet Security Posture tab to Signatures and add signature view
d6760b9 Stop assigning required training to org admins (client)
f1a50e5 Remove manager course-assignment UI for now
6c1daef Confirm before leaving a course mid-attempt
c944758 Persist course progress so refresh resumes instead of restarting
978b297 Fix sorting workshop so cards can actually be dragged
87338a4 Count only real attempts used, not abandoned/refreshed sessions
7f98e89 Show unlimited-attempt courses correctly on learner course card
b125d6d Remove Monthly security catalog control from course builder
b8f8df9 Include organization name in support request email
bd4e94d Fix support form leaving stale training template on category switch
c3bdd89 Exclude org admins from required training at the database layer (056)
c9ed65f Add KTL bugs tracking plan
```

**Phase 2 — Section D pass 1:**

```
a5d6fb8 Section D: can_create_orgs, user admin page, org admin unlock requests (057, 058)
```

---

## G. Test checklist — §D (pass 1)

After applying **057** and **058** and running frontend from `a5d6fb8`:

- [ ] **2** KTL admin: Org detail → Paid features → toggle "Create additional organizations" off → org admin loses "New Organization" button + sees contact message
- [ ] **2** Toggle back on → org admin can create org again (RPC enforces entitlement)
- [ ] **4** Platform: All users → Manage → user page with Profile + Training tabs; Edit opens dialog; Delete works
- [ ] **4** Org admin: Organizations → org → click user name → same user page (scoped to orgs they admin)
- [ ] **4** Training tab shows course stats + directory; platform admin can drill to course detail
- [ ] **15** Org admin: Unlock requests nav → sees pending requests for their org only
- [ ] **15** Org admin can Approve/Deny; no delete checkboxes or bulk delete
- [ ] **15** Platform admin: Unlock requests still has full delete UI

---

## H. Next actions

1. [ ] Review local commits (Phase 1 + `a5d6fb8`)
2. [ ] Apply migrations **056**, **057**, **058** (`npx supabase db push`)
3. [ ] Deploy / run frontend against that Supabase project
4. [ ] Walk checklists **§C** and **§G**
5. [ ] Greenlight Section D pass 2: **3 → 23 → 24 → 25** (or reprioritize)
