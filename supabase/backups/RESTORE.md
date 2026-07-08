# Disaster recovery for KeyTrain Supabase

Backups produced by [`scripts/backup-supabase.sh`](../../scripts/backup-supabase.sh) land as timestamped folders and `.tar.gz` archives **in this directory**. Those dumps are gitignored (PII + credentials risk).

This file is the restore runbook. Keep it in git.

---

## What a backup contains

| Path | Contents | Restorable? |
|------|----------|-------------|
| `schema/public.sql` | Public DDL | Yes |
| `data/public_data.sql` | All app rows (orgs, users profiles, courses, modules, assignments, phishing templates/campaigns, certificates, etc.) | Yes |
| `auth/auth_*.sql` | Auth users / identities | Yes (with care) |
| `schema/storage.sql` | Storage DDL | Yes |
| `storage/objects/**` | Uploaded images/videos/PDFs (if service role was set) | Yes |
| `migrations/` | Copy of repo migrations at backup time | Rebuild path |
| `functions/` | Edge Function source snapshot | Redeploy |
| `meta/secret_names.txt` | Secret **names** only | Values must come from password manager |
| `meta/config.toml` | Function JWT flags / auth URL hints | Redeploy config |

**Not recoverable from Supabase dumps**

- Edge Function **secret values** (Resend, RailNet, etc.) — store offline
- Custom SMTP password / Auth email HTML if only edited in dashboard — export/screenshots separate
- Dashboard-only toggles not in dump — re-check after restore

---

## Create a backup

```bash
cd /path/to/keytrain-learning
export SUPABASE_ACCESS_TOKEN='sbp_...'
export SUPABASE_PROJECT_REF='rzrsudrdpnabpseatclm'
export SUPABASE_DB_PASSWORD='...'          # Settings → Database
export SUPABASE_SERVICE_ROLE_KEY='...'     # Settings → API (storage download)
export VITE_SUPABASE_URL='https://rzrsudrdpnabpseatclm.supabase.co'

bash scripts/backup-supabase.sh
# or inventory-only storage (faster CI):
bash scripts/backup-supabase.sh --skip-storage-download
```

Outputs:

- `supabase/backups/<UTC-timestamp>/`
- `supabase/backups/keytrain-supabase-<ref>-<timestamp>.tar.gz`
- matching `.sha256`

GitHub Actions workflow [`.github/workflows/supabase-backup.yml`](../../.github/workflows/supabase-backup.yml) uploads the archive as a private Actions artifact (not public Pages). Artifact retention ≠ long-term DR — also copy archives to cold storage periodically.

---

## Restore strategy (choose path)

### Path A — Same project, recover data (preferred if project still exists)

1. Prefer restoring from a point-in-time / dashboard backup if your Supabase plan includes it.
2. Otherwise restore selectively with `psql` against the **session pooler or direct** connection string (Settings → Database).

```bash
# Example — dry-run review first
less backups/<ts>/data/public_data.sql

# Apply data (destructive if tables already populated — truncate or restore to empty schemas carefully)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backups/<ts>/schema/public.sql   # only if objects missing
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backups/<ts>/data/public_data.sql
```

3. Auth restore (only if `auth.users` was emptied / new project):

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backups/<ts>/auth/auth_schema.sql  # usually skip if auth exists
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backups/<ts>/auth/auth_data.sql
```

Auth restores can conflict with live GoTrue. Prefer:

- New empty project → apply migrations from git → load public data → load auth data; **or**
- Invite users again if only a few accounts.

4. Storage objects: for each file under `storage/objects/<bucket>/`:

```bash
# Pseudo: filename used __ for / in object keys
supabase storage cp ./file "ss:///bucket/path"   # or use Storage API / dashboard upload
```

Or write a small uploader with the service role (mirror of the backup downloader).

5. Redeploy Edge Functions + secrets:

```bash
bash scripts/deploy-manage-users.sh
# … other deploy scripts / npm run deploy:*

supabase secrets set RESEND_API_KEY=... INVITE_REDIRECT_URL=... # from password manager
```

6. Re-link migration history if you rebuilt from migrations + data:

```bash
supabase migration repair --status applied 001 002 … 042
```

### Path B — Brand new Supabase project

1. Create project (Terraform or dashboard).
2. `supabase link --project-ref <new>`
3. `supabase db push` (or run migrations 001→latest in order).
4. Load `data/public_data.sql`.
5. Load `auth/auth_data.sql` **or** re-invite users.
6. Recreate storage buckets (migrations 031/033/042) then upload objects.
7. Deploy all functions; set secrets; configure SMTP / Auth URLs to match `config.toml`.
8. Update GitHub secrets / `VITE_SUPABASE_*` and redeploy frontend.

### Path C — Frontend / function code only

Code is already in git. Backup `functions/` is a safety net if the git host is also lost — clone from the tarball.

---

## Verification checklist after restore

- [ ] Admin can sign in
- [ ] Employee invite / accept-invite works
- [ ] Required Training lists courses; player loads modules
- [ ] Phishing templates visible under admin
- [ ] Course images/videos/PDFs load
- [ ] RailNet / support / prayer edge functions respond (if used)
- [ ] Certificate issue path works (migration 042)

---

## Operational recommendations

1. Run local backup after major schema changes and before risky `db push`.
2. Keep at least one offline copy of the latest `.tar.gz` (encrypted disk / S3).
3. Store secret values in 1Password/Bitwarden with the same names as `meta/secret_names.txt`.
4. Do not commit anything under `supabase/backups/` except this restore guide / `.gitkeep`.
5. Treat backup archives as **confidential** (emails, PII, training records).

---

## Quick inventory of public data (sanity)

After dump, spot-check:

```bash
grep -c "COPY public.organizations" supabase/backups/*/data/public_data.sql
grep -c "COPY public.phishing_templates" supabase/backups/*/data/public_data.sql
grep -c "COPY public.courses" supabase/backups/*/data/public_data.sql
grep -c "COPY auth.users" supabase/backups/*/auth/auth_data.sql
```
