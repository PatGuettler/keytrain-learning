# keytrainlearning.com — setup status

**Domain:** `keytrainlearning.com`  
**Supabase project ref:** `rzrsudrdpnabpseatclm`  
**Goal:** Custom domain app, Resend for all email, phishing sims live, off Supabase default mailer and `onboarding@resend.dev`

---

## Completed

These are done — no further action unless something breaks.

| Area | Status |
|------|--------|
| **Resend domain** | `keytrainlearning.com` verified in Resend; SPF + DKIM in Cloudflare |
| **Live app** | `https://keytrainlearning.com` serves the app; sign-in works |
| **GitHub Pages / DNS** | Custom domain on GitHub Pages with HTTPS |
| **Repo build config** | `deploy.yml` (`GH_PAGES_BASE=/`, `VITE_APP_URL`), `package.json` homepage, `supabase/config.toml` auth URLs |
| **Phishing module (DB)** | Migrations 022–024 applied (campaigns, templates, test send work in admin UI) |
| **Phishing edge functions** | `send-phishing-campaign` and `track-phishing-event` deployed |
| **Resend for phishing** | `RESEND_API_KEY` set; dry-run disabled (real sends attempted) |
| **Org-aware send logic** | Per-recipient sender names/addresses in app + edge function code |
| **Fake login + training URLs** | `keytrainlearning.com/phishing-sim/login.html` and `/phishing-training` |

### Email routing (reference)

| Email type | From address | Mechanism |
|------------|--------------|-----------|
| Invites, password reset, auth | `noreply@keytrainlearning.com` | Supabase Auth → Resend SMTP |
| Profile → Contact form | `support@keytrainlearning.com` | Edge function `send-support-request` |
| Phishing simulations | Per-campaign `@keytrainlearning.com` | Edge function `send-phishing-campaign` |

One Resend API key (`re_...`) with **Sending access** covers all `@keytrainlearning.com` senders — no per-address registration in Resend.

---

## Remaining work

Complete in order. Check each box when done.

### 1 — Deploy latest frontend

Recent fixes (session refresh for edge calls, client-side daily verse, phishing UI) may not be live until pushed to `main`.

- [ ] Commit and push to `main` → confirm GitHub Actions **Deploy to GitHub Pages** succeeds
- [ ] Hard-refresh `https://keytrainlearning.com` — confirm new bundle (no CORS errors for `get-daily-verse` in console)
- [ ] Phishing **Send test** works without `401 Unauthorized` (sign out/in first if still failing on old bundle)

---

### 2 — Database migrations (025–027)

Do **not** rerun 001–024 — schema already exists (`db push` failed on `user_role already exists`).

Check what's missing in Supabase **SQL Editor**:

```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name = 'daily_verse_enabled'
) AS has_025;

SELECT EXISTS (
  SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_password_change'
) AS has_026;

SELECT body_html LIKE '%{{COMPANY_NAME}}%' AS has_027
FROM phishing_templates WHERE pretext = 'it_helpdesk';
```

- [ ] If `has_025` is false → run [`025_daily_verse_and_prayer.sql`](../supabase/migrations/025_daily_verse_and_prayer.sql)
- [ ] If `has_026` is false → run [`026_clear_lockout_on_password_change.sql`](../supabase/migrations/026_clear_lockout_on_password_change.sql)
- [ ] If `has_027` is false → run [`027_phishing_templates_org_aware.sql`](../supabase/migrations/027_phishing_templates_org_aware.sql)

**Optional — fix Supabase migration history** (so future `db push` works without re-running 001):

```bash
npx supabase migration repair --status applied \
  001 002 003 004 005 006 007 008 009 010 \
  011 012 013 014 015 016 017 018 019 020 \
  021 022 023 024
npx supabase db push   # applies only 025–027 if not yet recorded
```

- [ ] Migration history baselined (optional)
- [ ] Redeploy phishing after 027: `npm run deploy:phishing`

---

### 3 — Supabase Auth: custom SMTP

Confirm auth mail uses Resend, not Supabase's default mailer (`@supabase.co`).

- [ ] Supabase Dashboard → **Authentication** → **Email** → **SMTP Settings** → Custom SMTP enabled

| Field | Value |
|-------|--------|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your `re_...` API key |
| Sender email | `noreply@keytrainlearning.com` |
| Sender name | `KeyTrain Learning` |

- [ ] **URL Configuration:** Site URL `https://keytrainlearning.com`; redirect URLs include `https://keytrainlearning.com/**` and `http://localhost:5173/**`
- [ ] **Rate Limits** raised for expected invite/reset volume
- [ ] Password reset template uses query-string link (works on static hosting):

```html
<a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

- [ ] Test password reset → **From** is `noreply@keytrainlearning.com`, link opens `keytrainlearning.com/reset-password`

---

### 4 — Secrets & edge functions (verify)

- [ ] `RESEND_API_KEY` set in Supabase secrets
- [ ] `RESEND_FROM` = `KeyTrain Learning <support@keytrainlearning.com>`
- [ ] `SUPPORT_TO_EMAIL` = your inbox
- [ ] `INVITE_REDIRECT_URL` = `https://keytrainlearning.com/accept-invite`
- [ ] `PHISHING_TRAINING_URL` = `https://keytrainlearning.com/phishing-training`
- [ ] `PHISHING_SIMULATION_DRY_RUN` unset or `false`

Redeploy if secrets changed or functions are stale:

```bash
export SUPABASE_ACCESS_TOKEN='sbp_...'
export SUPABASE_PROJECT_REF='rzrsudrdpnabpseatclm'

supabase functions deploy send-support-request --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
supabase functions deploy manage-users --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
npm run deploy:phishing
npm run deploy:spiritual   # prayer + daily verse edge functions (optional)
bash scripts/deploy-manage-users.sh   # pushes config.toml verify_jwt=false
```

- [ ] `send-support-request`, `manage-users`, `send-phishing-campaign`, `track-phishing-event` deployed

---

### 5 — Phishing production validation

| URL | Purpose |
|-----|---------|
| `https://keytrainlearning.com` | Admin / app |
| `https://keytrainlearning.com/phishing-training` | Training after click |
| `https://keytrainlearning.com/phishing-sim/login.html` | Fake login page |

- [ ] Campaign **Fake login URL** set to `https://keytrainlearning.com/phishing-sim/login.html`
- [ ] **Test send** to your own email → received (not dry-run message)
- [ ] Click link → lands on fake login or training on `keytrainlearning.com`
- [ ] Campaign results show click/open events
- [ ] **Send to everyone** succeeds for a pilot org

---

### 6 — End-to-end verification

| Test | Done |
|------|------|
| `npm run test:resend-support` returns HTTP 200 | [ ] |
| Profile → Contact → delivered to `SUPPORT_TO_EMAIL` | [ ] |
| Invite user → from `noreply@keytrainlearning.com`, link opens keytrainlearning.com | [ ] |
| Password reset → same | [ ] |
| Phishing test send → from campaign sender on your domain | [ ] |
| Resend → **Logs** shows Delivered (no unexpected bounces) | [ ] |
| Auth mail no longer from `@supabase.co` | [ ] |

---

### 7 — Phishing inbox placement (deliverability)

Inbox placement needs **authentication + sane URLs + customer IT allowlisting**. Content realism (templates, org names, fake login) is already in place.

#### 7.1 — Customer IT allowlisting (required for hospitals on M365)

- [ ] Each customer's IT admin configures **Microsoft Defender Advanced Delivery** → **Phishing simulation**  
  [Configure advanced delivery](https://learn.microsoft.com/en-us/defender-office-365/advanced-delivery-policy-configure)

| Field | Value for KeyTrain |
|-------|-------------------|
| **Sending domains** | `keytrainlearning.com` |
| **Sending IP ranges** | [Resend outbound IPs](https://resend.com/docs/knowledge-base/what-are-resend-ip-addresses) |
| **Simulation URLs** | `keytrainlearning.com/*` (+ any dedicated sim domain later) |

- [ ] Google Workspace customers: admin spam/routing bypass for `keytrainlearning.com`
- [ ] Draft one-page **IT allowlist guide** for customer onboarding

> Use Advanced Delivery — not broad safe-sender or global IP allowlists.

#### 7.2 — DMARC

SPF and DKIM are done. DMARC is not.

- [ ] Add at Cloudflare:

```
_dmarc.keytrainlearning.com  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@keytrainlearning.com"
```

- [ ] Resend → **Domains** shows SPF, DKIM, and DMARC green

#### 7.3 — Tracking URLs (replace supabase.co in email links)

Click-tracking currently defaults to:

```
https://rzrsudrdpnabpseatclm.supabase.co/functions/v1/track-phishing-event?...
```

- [ ] Build Cloudflare Worker or reverse proxy on `keytrainlearning.com` that forwards to the edge function
- [ ] Set secret:

```bash
supabase secrets set PHISHING_TRACKING_BASE_URL='https://keytrainlearning.com/api/phish-track' --project-ref rzrsudrdpnabpseatclm
```

- [ ] Optional later: dedicated sim domain — [`simulation-sites/README.md`](../simulation-sites/README.md)

#### 7.4 — Campaign & pilot practices

- [ ] Disable **open-tracking pixel** on production campaigns
- [ ] Test-send to Gmail, Outlook.com, and customer M365 before full send
- [ ] Verify headers: SPF, DKIM, DMARC pass
- [ ] Monitor Resend **Logs** before scaling volume

#### Realism vs junk (reference)

| More realistic | More likely to hit Junk |
|----------------|-------------------------|
| Lookalike domain | Yes — unless verified in Resend **and** allowlisted |
| Urgent password/payroll language | Yes |
| Display name “Hospital IT” from `@keytrainlearning.com` | Moderate |
| Links through `supabase.co` | Yes |

---

### Optional

- [ ] Real mailbox or forwarder for `support@keytrainlearning.com` (replies only — outbound works without this)
- [ ] Second Resend API key for key rotation (hygiene, not required)

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| `401 Unauthorized` on phishing send | Sign out/in; deploy latest frontend (session refresh fix) |
| CORS on `get-daily-verse` | Deploy latest frontend (client-side verse lookup) |
| Resend 403 | Domain not verified, or `From` not on verified domain |
| Phishing “dry run” | Unset `PHISHING_SIMULATION_DRY_RUN`; set `RESEND_API_KEY` |
| Auth mail from `@supabase.co` | Enable Custom SMTP (§3 above) |
| Invite link goes to wrong host | Set `INVITE_REDIRECT_URL`; rebuild with `VITE_APP_URL` |
| `db push` fails on 001 | Schema already exists — use migration repair (§2), don't rerun 001–024 |
| Blank page on custom domain | `GH_PAGES_BASE` must be `/` in `deploy.yml` |
| SMTP DNS error | Remove trailing space from `smtp.resend.com` in Supabase |

---

## Secrets & config summary

| Name | Where | Example value |
|------|--------|----------------|
| `RESEND_API_KEY` | Supabase secrets | Same `re_...` key as SMTP password |
| `RESEND_FROM` | Supabase secrets | `KeyTrain Learning <support@keytrainlearning.com>` |
| `SUPPORT_TO_EMAIL` | Supabase secrets | your inbox |
| `INVITE_REDIRECT_URL` | Supabase secrets | `https://keytrainlearning.com/accept-invite` |
| `PHISHING_TRAINING_URL` | Supabase secrets | `https://keytrainlearning.com/phishing-training` |
| `PHISHING_TRACKING_BASE_URL` | Supabase secrets | After proxy built: `https://keytrainlearning.com/api/phish-track` |
| `VITE_APP_URL` | GitHub Actions build env | `https://keytrainlearning.com` |
| SMTP sender | Supabase Auth dashboard | `noreply@keytrainlearning.com` |

---

*Last updated: trimmed to remaining work; completed phases collapsed.*
