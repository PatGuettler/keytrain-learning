# keytrainlearning.com — setup checklist

Complete these steps in order. Check each box when done.

**Domain:** `keytrainlearning.com`  
**Supabase project ref:** `rzrsudrdpnabpseatclm`  
**Goal:** Custom domain app, Resend for all email, phishing sims live, off Supabase default mailer and `onboarding@resend.dev`

---

## How email is routed (reference)

| Email type | From address | Mechanism |
|------------|--------------|-----------|
| Invites, password reset, auth | `noreply@keytrainlearning.com` | Supabase Auth → Resend SMTP |
| Profile → Contact form | `support@keytrainlearning.com` | Edge function `send-support-request` |
| Phishing simulations | Per-campaign (e.g. `it-support@keytrainlearning.com`) | Edge function `send-phishing-campaign` |

All three use the **same Resend account** and **verified domain**.

---

## Phase 1 — Resend: verify domain

- [ ] Sign in at [resend.com](https://resend.com)
- [ ] **Domains** → Add domain → `keytrainlearning.com`
- [ ] Add DNS records at your domain registrar (SPF, DKIM; add DMARC when ready)
- [ ] Wait until Resend shows domain status **Verified**
- [ ] **API Keys** → Create API Key → copy `re_...` and store securely

**Suggested sender addresses (all on verified domain):**

| Address | Purpose |
|---------|---------|
| `noreply@keytrainlearning.com` | Supabase auth (invites, resets) |
| `support@keytrainlearning.com` | Contact form outbound |
| `it-support@keytrainlearning.com` | Phishing IT templates |
| `noreply@keytrainlearning.com` | Phishing DocuSign-style templates |

---

## Phase 2 — DNS: point domain to GitHub Pages

Choose **one** canonical URL (apex or www) and use it everywhere below.

### Option A — Apex (`keytrainlearning.com`)

- [ ] Add **A records** at registrar pointing to GitHub Pages:
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`

### Option B — www (`www.keytrainlearning.com`)

- [ ] Add **CNAME**: `www` → `patguettler.github.io`

### GitHub repo

- [ ] Repo → **Settings** → **Pages** → Custom domain: `keytrainlearning.com` (or `www.keytrainlearning.com`)
- [ ] Wait for DNS check to pass
- [ ] Enable **Enforce HTTPS**

---

## Phase 3 — Repo: update build for custom domain

Update the codebase, commit, and push to `main` (triggers deploy).

- [ ] `.github/workflows/deploy.yml` — set:
  - `GH_PAGES_BASE: /` (was `/guardian-md/`)
  - `VITE_APP_URL: https://keytrainlearning.com`
- [ ] `package.json` — set `homepage` to `https://keytrainlearning.com/`
- [ ] `supabase/config.toml` — update `[auth]`:
  - `site_url = "https://keytrainlearning.com"`
  - `additional_redirect_urls` — replace `patguettler.github.io/guardian-md` URLs with `https://keytrainlearning.com/**` (keep `localhost` entries)
- [ ] `.github/workflows/deploy-edge-functions.yml` — set `INVITE_REDIRECT_URL` to `https://keytrainlearning.com/accept-invite` (if that workflow is in use)
- [ ] Push to `main` and confirm GitHub Actions **Deploy to GitHub Pages** succeeds
- [ ] Open `https://keytrainlearning.com` — app loads, no broken assets
- [ ] Sign in works on the new domain

**Optional (keep old URL working during cutover):**

- [ ] Leave `https://patguettler.github.io/guardian-md/**` in Supabase redirect URLs until cutover is done, then remove

---

## Phase 4 — Supabase Auth: custom SMTP (fixes bounces / rate limits)

Replaces Supabase’s built-in mailer (`@supabase.co` / sandbox limits).

- [ ] Supabase Dashboard → **Authentication** → **Email** → **SMTP Settings**
- [ ] Enable **Custom SMTP**
- [ ] Enter settings (no trailing spaces on host):

| Field | Value |
|-------|--------|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your `re_...` API key |
| Sender email | `noreply@keytrainlearning.com` |
| Sender name | `KeyTrain Learning` (or your app name) |

- [ ] Save SMTP settings
- [ ] **Authentication** → **URL Configuration**:
  - Site URL: `https://keytrainlearning.com`
  - Redirect URLs: `https://keytrainlearning.com/**`, `http://localhost:5173/**`
- [ ] **Authentication** → **Rate Limits** — raise invite/reset limits for your expected volume (default may be ~30/hour after SMTP switch)
- [ ] Send a test password reset to a **real** inbox you control — email arrives from `noreply@keytrainlearning.com`
- [ ] Confirm reset link opens `https://keytrainlearning.com/reset-password`

**Bounce prevention:**

- [ ] Stop sending auth mail to fake/typo addresses (e.g. `test@test.com`)
- [ ] Only invite users with deliverable email addresses

---

## Phase 5 — Supabase secrets & edge function deploy

Run in WSL (replace `re_...` and inbox email):

```bash
export SUPABASE_ACCESS_TOKEN='sbp_...'
export SUPABASE_PROJECT_REF='rzrsudrdpnabpseatclm'

supabase secrets set RESEND_API_KEY='re_...' --project-ref "$SUPABASE_PROJECT_REF"
supabase secrets set RESEND_FROM='KeyTrain Learning <support@keytrainlearning.com>' --project-ref "$SUPABASE_PROJECT_REF"
supabase secrets set SUPPORT_TO_EMAIL='your-inbox@example.com' --project-ref "$SUPABASE_PROJECT_REF"
supabase secrets set INVITE_REDIRECT_URL='https://keytrainlearning.com/accept-invite' --project-ref "$SUPABASE_PROJECT_REF"
supabase secrets set PHISHING_TRAINING_URL='https://keytrainlearning.com/phishing-training' --project-ref "$SUPABASE_PROJECT_REF"
supabase secrets unset PHISHING_SIMULATION_DRY_RUN --project-ref "$SUPABASE_PROJECT_REF"
```

- [ ] `RESEND_API_KEY` set
- [ ] `RESEND_FROM` set to verified domain address
- [ ] `SUPPORT_TO_EMAIL` set to inbox that should receive contact form mail
- [ ] `INVITE_REDIRECT_URL` set to new domain
- [ ] `PHISHING_TRAINING_URL` set to new domain
- [ ] `PHISHING_SIMULATION_DRY_RUN` removed (or set to `false`) so phishing sends real email

Deploy functions:

```bash
supabase functions deploy send-support-request --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
supabase functions deploy manage-users --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
bash scripts/deploy-phishing.sh
```

- [ ] `send-support-request` deployed
- [ ] `manage-users` deployed
- [ ] `send-phishing-campaign` deployed
- [ ] `track-phishing-event` deployed

---

## Phase 6 — Database migrations (if not already applied)

In Supabase **SQL Editor**, run in order:

- [ ] [`022_phishing_simulation.sql`](../supabase/migrations/022_phishing_simulation.sql)
- [ ] [`023_phishing_templates_seed.sql`](../supabase/migrations/023_phishing_templates_seed.sql)
- [ ] [`024_phishing_test_send.sql`](../supabase/migrations/024_phishing_test_send.sql)
- [ ] [`020_support_requests.sql`](../supabase/migrations/020_support_requests.sql) (if contact form table missing)

---

## Phase 7 — Phishing simulation on production domain

**URLs (all on keytrainlearning.com):**

| What | URL |
|------|-----|
| Admin / app | `https://keytrainlearning.com` |
| Training page (after click) | `https://keytrainlearning.com/phishing-training` |
| Fake login page | `https://keytrainlearning.com/phishing-sim/login.html` |

- [ ] Sign in as platform admin → **Phishing sims**
- [ ] New campaign → pick template
- [ ] Set **Sender email** to verified address (e.g. `it-support@keytrainlearning.com`) — not `@your-simulation-domain.com`
- [ ] Set **Fake login URL** to `https://keytrainlearning.com/phishing-sim/login.html`
- [ ] Save & build recipients
- [ ] **Test send** to your own work email
- [ ] Confirm email received (not “dry run” message)
- [ ] Click link in email → lands on training or fake login on keytrainlearning.com
- [ ] Refresh campaign results — open/click events appear
- [ ] When satisfied, **Send to everyone** for full audience

---

## Phase 8 — End-to-end verification

| Test | Done |
|------|------|
| `export RESEND_API_KEY='re_...'` then `npm run test:resend-support` returns HTTP 200 | [ ] |
| Profile → Contact → message delivered to `SUPPORT_TO_EMAIL` | [ ] |
| Invite user → email from `noreply@keytrainlearning.com`, link opens keytrainlearning.com | [ ] |
| Password reset → same | [ ] |
| Phishing test send → from campaign sender on your domain | [ ] |
| Resend dashboard → **Logs** shows Delivered (no unexpected bounces) | [ ] |
| Supabase → **Authentication** → no longer relying on default Supabase mailer | [ ] |

---

## Optional — deliverability & future hardening

- [ ] Add **DMARC** TXT record at `_dmarc.keytrainlearning.com`
- [ ] Set up `support@keytrainlearning.com` as a real mailbox or forwarder at your registrar
- [ ] Remove `patguettler.github.io/guardian-md` from Supabase redirect URLs after cutover is stable
- [ ] Later: separate lookalike domain for more realistic phishing sims (e.g. `keytrain-it.com`) — not required to go live

---

## Troubleshooting quick reference

| Symptom | Likely fix |
|---------|------------|
| Resend 403 on support form | Domain not verified, or `RESEND_FROM` not on verified domain |
| Auth emails still from supabase.co | Custom SMTP not saved, or sender not on verified domain |
| Invite link goes to github.io | Redeploy `manage-users` after setting `INVITE_REDIRECT_URL`; rebuild frontend with `VITE_APP_URL` |
| Phishing says “dry run” | Unset `PHISHING_SIMULATION_DRY_RUN`; ensure `RESEND_API_KEY` is set |
| Phishing send fails on `from` | Campaign sender email must be on verified Resend domain |
| SMTP “DNS lookup” error | Remove trailing space from `smtp.resend.com` in Supabase SMTP host field |
| App assets 404 on custom domain (blank white page) | `GH_PAGES_BASE` must be `/` not `/guardian-md/` — redeploy after fixing `deploy.yml` |

---

## Secrets & config summary

| Name | Where | Example value |
|------|--------|----------------|
| `RESEND_API_KEY` | Supabase secrets | `re_...` |
| `RESEND_FROM` | Supabase secrets | `KeyTrain Learning <support@keytrainlearning.com>` |
| `SUPPORT_TO_EMAIL` | Supabase secrets | your inbox |
| `INVITE_REDIRECT_URL` | Supabase secrets | `https://keytrainlearning.com/accept-invite` |
| `PHISHING_TRAINING_URL` | Supabase secrets | `https://keytrainlearning.com/phishing-training` |
| `VITE_APP_URL` | GitHub Actions build env | `https://keytrainlearning.com` |
| SMTP sender | Supabase Auth dashboard | `noreply@keytrainlearning.com` |

---

*Last updated for domain cutover from `patguettler.github.io/guardian-md` to `keytrainlearning.com`.*
