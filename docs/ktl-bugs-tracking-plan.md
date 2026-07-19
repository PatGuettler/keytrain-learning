# KTL bugs tracking plan

Track the bug list from the pre-launch review. **Do not push** until you have reviewed the local commits.

Repo: `keytrain-learning` · branch: `main` (14 frontend commits + 1 migration commit, local only).

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Done (local)** | Committed locally; ready to test after deploy + any DB step below |
| **Needs DB** | Migration written; you must apply it to Supabase before this item is fully testable |
| **Discuss** | Product / architecture — no code yet |
| **Needs DB (later)** | Requires new tables/RPCs; not required for the 14 frontend fixes |

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
| 5 | Org admin should not get required training | **Needs DB** | `d6760b9` + migration `056` | Client done; apply `056` (section B) |
| 21 | RailNet "Security Posture" → Signatures + view | **Done (local)** | `c76da92` | Tab rename + View dialog |
| 20 | Per-campaign phishing PDF | **Done (local)** | `41c672a` | Export on campaign detail (sent campaigns) |
| 30 | Monthly employee scores audit PDF | **Done (local)** | `0982bfe` | "Monthly scores (PDF)" on training reports / org dashboard |
| 4 / 29 | User directories need search (consistent) | **Done (local)** | `5c91ee8` | Search on all directories; column redesign still **Discuss** |

### Frontend only — no DB for these 14 except #5

None of the other 13 need a migration or edge-function deploy to test.

---

## B. DB update required to finish testing the 14 fixes

### Migration `056_exclude_org_admin_from_required_training.sql`

**Why:** Client no longer syncs required training for org admins, but the RPCs still assigned them, and existing `assignments` rows remain.

**What it does:**

1. `sync_user_required_assignments` — early-return for `org_admin` (same as `admin`)
2. `list_required_courses_for_user` — early-return for `org_admin`
3. `DELETE` existing assignments for profiles with `role = 'org_admin'`  
   (`training_sessions` / `module_attempts` cascade; `certificates.assignment_id` SET NULL)

### Commands to run (you)

From the `keytrain-learning` repo, linked to the Supabase project you want to test against (staging recommended; prod only when you are ready):

```bash
cd /home/pat/dev/keytrain-learning

# Confirm CLI is linked to the right project
npx supabase projects list
npx supabase link --project-ref <YOUR_PROJECT_REF>

# Apply pending migrations (includes 056)
npx supabase db push
```

If `db push` complains about older migrations already applied in the remote but not marked in history, use the repair approach from `docs/keytrainlearning-domain-setup.md` (do **not** re-run 001–027 SQL). Then push again.

**Verify after push** (SQL editor or `psql`):

```sql
-- Should return no rows
SELECT a.id, p.full_name, p.role
FROM assignments a
JOIN profiles p ON p.id = a.user_id
WHERE p.role = 'org_admin';

-- Smoke: sync as org_admin should be a no-op (run while signed in as org_admin, or call via RPC)
-- SELECT sync_user_required_assignments('<org_admin_user_uuid>');
```

**Optional — only if you prefer to paste SQL by hand** (e.g. dashboard SQL editor): open  
`supabase/migrations/056_exclude_org_admin_from_required_training.sql` and run the whole file, then mark it applied:

```bash
npx supabase migration repair --status applied 056
```

---

## C. Test checklist (14 fixes)

Deploy or run the frontend against the same Supabase you pushed `056` to.

- [ ] **11** Profile → Contact: select Request training → switch to Bug → message is empty (or only your edits)
- [ ] **12** Submit a support request → email / `support_requests.user_snapshot` has `org_name`
- [ ] **26** Course builder has no "Monthly security catalog" checkbox
- [ ] **10 / 19** Unlimited course (`max_attempts = 0`): card shows "unlimited", never "X of 0"; still startable
- [ ] **13 / 14** Fail once on a 3-attempt course → shows **1 of 3** (not 2); after 3 finishes, locked and cannot start again without unlock
- [ ] **9** Sorting workshop: drag cards into categories (desktop + phone long-press); can move a placed card
- [ ] **8** Mid-course refresh → resumes same module / completed set
- [ ] **7** Browser Back mid-course → confirm dialog; Cancel stays; OK goes to training list; resume works
- [ ] **6** Manager → team member: no "Assign training" card
- [ ] **5** After `056`: org admin has no Required Training nav; no new assignments after login; old org_admin assignments gone
- [ ] **21** RailNet tab "Signatures"; View opens detail + raw JSON
- [ ] **20** Sent phishing campaign → Export PDF has metrics + recipient table
- [ ] **30** Training reports / org dashboard → "Monthly scores (PDF)" downloads employee × course scores
- [ ] **4 / 29** Search works on: platform All users, org users table, Platform Admins, manager My Team

---

## D. Deferred — needs discussion (no code yet)

| # | Item | Status | Notes / decision needed |
|---|------|--------|-------------------------|
| 1 | Org admins like KTL admins (not org-bound) | **Discuss** | Today: `profiles.org_id` + `organization_memberships`. Big model change. |
| 2 | Org creation as paid add-on? | **Discuss** | Org admins can create orgs today (`create_organization_as_org_admin`). Pricing call. |
| 3 | Org admin course creation add-on vs always? | **Discuss** | RLS allows it; no org-admin builder UI. Product call. |
| 4 (rest) | Directories = name + CRUD only; click opens user page | **Discuss** | Search done. No generic user page yet — only training-detail pages. Confirm target UX. |
| 15 | Manager / org admin unlock courses? | **Discuss** + **Needs DB (later)** | Unlock is platform-admin only today. |
| 22 | RailNet Reporting "useless" | **Discuss** | What would make it useful? |
| 23 | Host uploads "useless" / view JSON usefully | **Discuss** | What view do you want? |
| 24 | Compliance reports all look the same | **Discuss** | Most sections are hardcoded boilerplate in `compliance-generator.ts`. |
| 25 | RailNet training → AI suggested courses from signatures | **Discuss** | Today: AWS assignment roll-up → staging. AI redesign. |
| 27 | Org with no paid features can still take courses | **Discuss** + **Needs DB (later)** | Learner RLS ignores `lms_enabled`. Decide: block / hide / allow. |
| 28 | RailNet link auto from AWS on signup | **Discuss** | Today: manual `organizations.railnet_org_id`. |

---

## E. Deferred — Supabase feature work (unlock + notifications)

These are **not** required for the 14 fixes. Best built as one package:

| # | Item | Status | Rough scope |
|---|------|--------|-------------|
| 16 | Denied unlock still allows re-request; user not notified | **Needs DB (later)** | Policy on re-request after deny; notify user |
| 17 | Admin message on approve/deny | **Needs DB (later)** | Column + RPC param + admin UI |
| 18 | User notifications inbox (view / delete with confirm) | **Needs DB (later)** | New `notifications` table, RLS, UI — none exists today |

Suggested order when you greenlight: **18 table → 17 message on resolve → 16 denial UX + notify**.

---

## F. Local commit list (review before push)

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
```

Plus (after this plan lands):

- migration `056_exclude_org_admin_from_required_training.sql`
- this file: `docs/ktl-bugs-tracking-plan.md`

---

## G. Next actions for you

1. [ ] Review the 14 local commits (and the migration + this plan once committed)
2. [ ] Apply **`056`** to the Supabase project you will test (`npx supabase db push`)
3. [ ] Deploy / run the frontend against that project
4. [ ] Walk the checklist in **§C**
5. [ ] Decide which **§D / §E** items to do next (I can implement once you pick)
