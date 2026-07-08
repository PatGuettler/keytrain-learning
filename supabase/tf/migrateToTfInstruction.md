# Migrating KeyTrain Supabase Infrastructure to Terraform

This guide walks you from today’s **dashboard + Supabase CLI** workflow into a **hybrid** model where Terraform owns what the [official Supabase provider](https://supabase.com/docs/guides/deployment/terraform) can manage, and the CLI continues to own everything else (schema, functions, secrets).

**Important:** The Supabase Terraform provider does **not** manage Postgres schema, migrations, Edge Function source, storage bucket objects, or most dashboard-only features. Expect a hybrid setup, not “everything in `.tf` files.”

Official refs:

- [Terraform Provider docs](https://supabase.com/docs/guides/deployment/terraform)
- [Provider tutorial](https://supabase.com/docs/guides/deployment/terraform/tutorial)
- [Registry: supabase/supabase](https://registry.terraform.io/providers/supabase/supabase/latest/docs)

---

## 0. What KeyTrain has today (inventory)

| Area | Where it lives today | Terraform? |
|------|----------------------|------------|
| Cloud project `rzrsudrdpnabpseatclm` | Dashboard | **Yes** — `supabase_project` (import) |
| PostgREST / Auth site URL & redirects | Dashboard + [`../config.toml`](../config.toml) | **Partial** — `supabase_settings` |
| SQL schema & RLS (001–042+) | [`../migrations/`](../migrations/) | **No** — keep `supabase db push` / SQL Editor |
| Storage buckets (`course-images`, `course-videos`, `course-pdfs`) | SQL migrations (031, 033, 042) | **No** — keep SQL |
| Edge Functions (10 functions) | [`../functions/`](../functions/) + GitHub Actions | **No** — keep CLI / Actions |
| Function secrets (`RESEND_*`, `INVITE_REDIRECT_URL`, …) | `supabase secrets set` | **No** — keep CLI (document in checklist) |
| Custom SMTP / email templates | Dashboard | **No** — document + optional later API |
| Frontend env (`VITE_SUPABASE_*`) | GitHub / local `.env` | Out of scope (not Supabase infra) |

Skeleton for step 1 lives in this directory:

```
supabase/tf/
├── .gitignore
├── versions.tf              # provider + terraform block
├── variables.tf
├── project.tf               # supabase_project + supabase_settings + import
├── outputs.tf
├── terraform.tfvars.example
└── migrateToTfInstruction.md  (this file)
```

---

## 1. Prerequisites

1. Install Terraform **≥ 1.5** (`terraform version`).
2. Create a personal access token: [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens).
3. Export it (never commit):

   ```bash
   export SUPABASE_ACCESS_TOKEN='sbp_...'
   ```

4. Confirm organization slug and project region in the dashboard:
   - **Org slug:** Organization Settings → General
   - **Project ref:** already `rzrsudrdpnabpseatclm`
   - **Region:** Project Settings → General (update `project_region` if not `us-east-1`)

5. Optional but recommended: keep using the Supabase CLI in parallel (`npx supabase@latest`).

---

## 2. Freeze a baseline (do this before any Terraform apply)

1. Confirm the app works against production.
2. Snapshot current migration history (SQL Editor):

   ```sql
   SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
   ```

3. Note gaps (you previously had missing rows for some versions that were applied manually). Fix history with `supabase migration repair` if needed **before** relying on `db push` in CI. Terraform will not fix migration history.

4. Export a settings dump you can compare later (CLI or dashboard screenshots):
   - Auth → URL Configuration
   - Auth → SMTP
   - Project Settings → API (schemas / max rows)
   - Edge Functions list + secrets names (not values)

---

## 3. Initialize the Terraform skeleton

```bash
cd /home/pat/dev/keytrain-learning/supabase/tf
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

- Set `organization_id` to your real org slug
- Confirm `project_ref`, `project_name`, `project_region`
- Leave `database_password` as the placeholder (it is ignored after import)

```bash
export SUPABASE_ACCESS_TOKEN='sbp_...'
terraform init
terraform validate
terraform plan
```

**Expected on first `plan`:** Terraform will **import** `supabase_project.production` and may propose updates to `supabase_settings`. Read the plan carefully.

---

## 4. Align `supabase_settings` with live reality (critical)

The skeleton ships KeyTrain **defaults** from [`../config.toml`](../config.toml). Live dashboard values may differ.

### 4a. Discover live settings

Use the Management API (token from Step 1):

```bash
# Replace PROJECT_REF if needed
PROJECT_REF=rzrsudrdpnabpseatclm

curl -s "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" | jq .

curl -s "https://api.supabase.com/v1/projects/${PROJECT_REF}" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" | jq .
```

(Exact endpoints evolve — if a path 404s, check current [Management API](https://supabase.com/docs/reference/api/introduction) docs.)

Provider tutorial alternative after import:

```bash
terraform state show supabase_settings.production
```

(Only works once the settings resource has been applied/refreshed.)

### 4b. Decide ownership of Auth URLs

Pick **one** source of truth going forward:

| Option | Pros | Cons |
|--------|------|------|
| **A. Terraform owns Auth site URL + redirects** via `supabase_settings.auth` | Drift visible in `plan` | Must update `.tf` / tfvars when URLs change |
| **B. Keep URLs only in dashboard / `config.toml` + `supabase config push`** | Matches existing scripts | Terraform `auth` block can fight the dashboard |

**Recommendation for KeyTrain:** start with **Option A** only after the first `plan` shows no unwanted auth diffs. If plan tries to wipe SMTP or providers, narrow the `auth` JSON or remove the `auth = jsonencode(...)` block until you know the exact schema the provider expects for your project.

Safe first apply: temporarily comment out `auth = jsonencode({...})` in `project.tf` and manage **only** `api` until auth JSON shape is confirmed.

### 4c. Iterate settings safely

```bash
terraform plan -out=tfplan
# Inspect → only then:
terraform apply tfplan
```

Never apply a plan that shows **destroy** of `supabase_project.production`.

---

## 5. Import flow (already wired in `project.tf`)

This repo uses a Terraform 1.5+ `import` block:

```hcl
import {
  to = supabase_project.production
  id = var.project_ref
}
```

On first successful apply:

1. Project enters state (no recreate).
2. `lifecycle.prevent_destroy = true` blocks accidental deletion.
3. `ignore_changes = [database_password]` avoids rotating the DB password via TF.

If `import` fails, fall back to:

```bash
terraform import supabase_project.production rzrsudrdpnabpseatclm
```

---

## 6. What to leave on the Supabase CLI (do not force into TF)

### 6a. Database migrations

Continue:

```bash
supabase link --project-ref rzrsudrdpnabpseatclm
supabase migration list
supabase db push   # only after history is repaired
```

Migrations stay in `supabase/migrations/`. Do **not** duplicate DDL into Terraform `postgres` providers unless you later adopt a deliberate dual-tooling strategy (Atlas / `supabase_sql` unofficial patterns). For KeyTrain, one system of record for SQL is enough.

### 6b. Edge Functions

Continue deploying with existing scripts / Actions:

- [`../../.github/workflows/deploy-edge-functions.yml`](../../.github/workflows/deploy-edge-functions.yml)
- `npm run deploy:manage-users`, `deploy:phishing`, etc.

Functions with `verify_jwt = false` are declared in [`../config.toml`](../config.toml). Keep that file.

### 6c. Secrets checklist (document; set via CLI)

Run once per environment (values from password manager — never commit):

```bash
export SUPABASE_PROJECT_REF=rzrsudrdpnabpseatclm
export SUPABASE_ACCESS_TOKEN='sbp_...'

# Auth / invites
supabase secrets set INVITE_REDIRECT_URL='https://keytrainlearning.com/accept-invite' --project-ref "$SUPABASE_PROJECT_REF"

# Support email
supabase secrets set RESEND_API_KEY='re_...' --project-ref "$SUPABASE_PROJECT_REF"
supabase secrets set RESEND_FROM='KeyTrain Learning <support@keytrainlearning.com>' --project-ref "$SUPABASE_PROJECT_REF"
supabase secrets set SUPPORT_TO_EMAIL='you@example.com' --project-ref "$SUPABASE_PROJECT_REF"

# Phishing
supabase secrets set PHISHING_TRAINING_URL='https://keytrainlearning.com/phishing-training' --project-ref "$SUPABASE_PROJECT_REF"
supabase secrets set PHISHING_TRACKING_BASE_URL='https://keytrainlearning.com/api/phish-track' --project-ref "$SUPABASE_PROJECT_REF"
# Unset dry-run in production when ready:
# supabase secrets unset PHISHING_SIMULATION_DRY_RUN --project-ref "$SUPABASE_PROJECT_REF"

# RailNet (if used) — add current names from dashboard → Edge Functions → Secrets
```

Optional future: store secret **names** in a `locals.tf` checklist and apply via a thin wrapper script invoked from CI; values still live in GitHub Secrets / 1Password.

---

## 7. Optional next resources (only if the provider supports them on your version)

After the first successful import + settings apply:

1. Run `terraform providers schema -json | jq '.provider_schemas["registry.terraform.io/supabase/supabase"].resource_schemas | keys'` to list resources your installed provider version supports.
2. Common additions as the provider grows:
   - `supabase_branch` — preview branches (if you adopt branching)
   - Additional fields on `supabase_settings` (`db`, `storage`, `network`, etc.) — only add after dumping live config
3. Do **not** invent resources for Edge Functions or migrations; wait for official support.

---

## 8. Target operating model (recommended)

```text
┌─────────────────────────────────────────────────────────────┐
│ Git repo                                                    │
│  supabase/tf/*.tf          → terraform plan/apply           │
│  supabase/migrations/*.sql → supabase db push               │
│  supabase/functions/*      → supabase functions deploy / GA │
│  supabase/config.toml      → function JWT flags + auth urls │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              Supabase project (production)
```

### Suggested ownership matrix

| Change type | Tool |
|-------------|------|
| New project / rename / region (new env) | Terraform |
| API schemas, max_rows, site_url (once stable) | Terraform |
| New table / RLS / RPC | New SQL migration + `db push` |
| New Edge Function | Code + deploy script / Actions |
| Rotate Resend / RailNet secrets | `supabase secrets set` |
| Auth email copy / SMTP password | Dashboard (document in runbook) |

---

## 9. Step-by-step adoption checklist

Use this as a runbook. Check off in order.

### Phase A — Read-only / plan only

- [ ] Install Terraform ≥ 1.5
- [ ] Create `SUPABASE_ACCESS_TOKEN`
- [ ] Fill `terraform.tfvars` from example
- [ ] `terraform init` + `validate`
- [ ] `terraform plan` — confirm **import**, no destroy
- [ ] Dump live Auth / API settings; compare to `project.tf`

### Phase B — First apply (settings)

- [ ] Narrow `supabase_settings` if plan shows dangerous auth diffs
- [ ] `terraform apply` once with approval
- [ ] Smoke-test login + invite redirects on keytrainlearning.com
- [ ] Commit `*.tf` + `terraform.tfvars.example` (never `terraform.tfvars` or state)

### Phase C — Process

- [ ] Add remote state backend (S3 / Terraform Cloud) when a second engineer needs apply rights
- [ ] Document “who may run apply” (break-glass vs CI)
- [ ] Keep migration history repaired so `db push` and Terraform docs don’t conflict
- [ ] Add a CI job that runs `terraform plan` (no apply) on PRs touching `supabase/tf/**`

### Phase D — Hardening (optional)

- [ ] Remove placeholder `database_password` from habit — only use ignore_changes
- [ ] Mirror this stack for a staging project (`staging.tf` or workspaces)
- [ ] Export auth email templates to the repo for manual restore (SQL/dashboard backup)

---

## 10. Creating a *new* environment with Terraform (later)

For a greenfield staging project (not an import):

1. Duplicate this module or use a Terraform workspace.
2. Remove the `import` block.
3. Set a real `database_password` (generate; store in a secret manager).
4. `terraform apply` → creates project.
5. `supabase link --project-ref <new_ref>`
6. `supabase db push` all migrations 001→current.
7. Deploy all Edge Functions + set secrets.
8. Point a staging frontend at the new URL / anon key.

---

## 11. Rollback / break-glass

| Problem | Action |
|---------|--------|
| Bad `supabase_settings` apply | Revert Auth URLs in dashboard immediately; `terraform apply` previous known-good config |
| Accidental project destroy attempt | Blocked by `prevent_destroy`; never remove that lifecycle rule for production |
| TF state lost | Re-`import` project by ref; re-apply settings from git |
| Schema issue | Fix with SQL migrations — Terraform is not involved |

---

## 12. Common failures

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `401` from provider | Missing/expired `SUPABASE_ACCESS_TOKEN` | New token; export env var |
| Plan wants to recreate project | Wrong `organization_id` / name / region mismatch | Match dashboard exactly; keep `import` |
| Auth settings wipe SMTP | Over-broad `auth` JSON | Remove `auth` from TF until API shape confirmed |
| `db push` tries to run 001 | Migration history empty / incomplete | `supabase migration repair --status applied …` |
| Function 404 after migrate | Function never deployed to this project | Redeploy with existing scripts |

---

## 13. Definition of done

You are “on Terraform” for KeyTrain when:

1. Production project is in Terraform state via import.
2. `terraform plan` is clean (or only intentional drifts).
3. The team knows: **TF for project/settings; CLI for SQL/functions/secrets**.
4. Remote state (or documented sole operator) prevents local state clobbering.
5. This folder stays the entrypoint: `supabase/tf/`.

You are **not** done when every migration is rewritten as HCL — that is not the provider’s job and would fight your existing workflow.

---

## 14. Quick commands cheatsheet

```bash
cd supabase/tf
export SUPABASE_ACCESS_TOKEN='sbp_...'

terraform init
terraform fmt
terraform validate
terraform plan
terraform apply

# Parallel CLI world (repo root)
export SUPABASE_PROJECT_REF=rzrsudrdpnabpseatclm
npx supabase@latest link --project-ref "$SUPABASE_PROJECT_REF"
npx supabase@latest migration list
npx supabase@latest db push
npx supabase@latest functions deploy manage-users --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt --use-api
```

---

*Last updated with skeleton supporting `supabase_project` + `supabase_settings` (provider ~> 1.0). Re-check the registry if new resources (functions, secrets, storage) appear.*
