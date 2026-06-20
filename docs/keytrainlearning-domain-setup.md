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

- [x] Sign in at [resend.com](https://resend.com)
- [x] **Domains** → Add domain → `keytrainlearning.com`
- [x] Add DNS records at Cloudflare (SPF, DKIM on `send` subdomain) — see **Phase 9** for DMARC
- [x] Wait until Resend shows domain status **Verified**
- [x] **API Keys** → existing key with **Sending access** (e.g. `Onboarding`) — **reuse this key; no new key required**

### API key: one key for everything

**You do not need a new API key** for each sender address.

Once `keytrainlearning.com` is verified in Resend, a single API key with **Sending access** can send from **any** `@keytrainlearning.com` address. Resend does not require you to register each `From` address separately.

Use the same `re_...` key in:

| Where | What it powers |
|-------|----------------|
| Supabase **Custom SMTP** password field | Auth emails (`noreply@…`) |
| Supabase secret `RESEND_API_KEY` | Contact form + phishing edge functions |

Optional later: create a second key (e.g. `Production`) and rotate the old one — only for key hygiene, not because different senders need different keys.

---

### Sender addresses — step by step

Resend only cares that the **domain** is verified. The addresses below are configured **in your app**, not as separate entries in Resend.

| Address | Purpose | Where you set it |
|---------|---------|------------------|
| `noreply@keytrainlearning.com` | Supabase auth (invites, password resets) | Supabase Dashboard → Auth → SMTP |
| `support@keytrainlearning.com` | Contact form **outbound** (what recipients see as sender) | Supabase secret `RESEND_FROM` |
| `it-support@keytrainlearning.com` | Phishing IT Helpdesk templates | Per campaign (defaults from template) |
| `noreply@keytrainlearning.com` | Phishing DocuSign-style templates | Per campaign (defaults from template) |

#### 1. `noreply@keytrainlearning.com` — auth mail (Supabase SMTP)

Do this in **Phase 4** after the app is on the custom domain.

1. Supabase Dashboard → **Authentication** → **Email** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Set:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: your existing `re_...` API key (same as Resend dashboard)
   - Sender email: `noreply@keytrainlearning.com`
   - Sender name: `KeyTrain Learning`
4. Save
5. Test: **Authentication** → send yourself a password reset → confirm **From** is `noreply@keytrainlearning.com` and links use `https://keytrainlearning.com`

No Resend dashboard change needed beyond domain verification.

#### 2. `support@keytrainlearning.com` — contact form outbound

Do this in **Phase 5** (Supabase secrets).

1. Set the secret (same API key as above):

```bash
supabase secrets set RESEND_FROM='KeyTrain Learning <support@keytrainlearning.com>' --project-ref rzrsudrdpnabpseatclm
```

2. Set where contact messages are **delivered to** (your inbox — can be Gmail, not necessarily `@keytrainlearning.com`):

```bash
supabase secrets set SUPPORT_TO_EMAIL='your-inbox@example.com' --project-ref rzrsudrdpnabpseatclm
```

3. Redeploy the edge function:

```bash
supabase functions deploy send-support-request --project-ref rzrsudrdpnabpseatclm --no-verify-jwt
```

4. Test: sign in → Profile → Contact → submit → you receive the message; **From** in the received mail shows `support@keytrainlearning.com`

**Optional:** If you want a real mailbox at `support@keytrainlearning.com` (for replies), add a forwarder or mailbox at Cloudflare Email Routing or your registrar. The app only needs it as the outbound `From` address.

#### 3. `it-support@keytrainlearning.com` — phishing IT templates

No Resend or secret change. Configured per campaign in the admin UI.

1. Complete **Phase 5** (`RESEND_API_KEY` set, `PHISHING_SIMULATION_DRY_RUN` unset)
2. Admin → **Phishing sims** → **New campaign**
3. Choose template **IT Password Reset** (or similar)
4. **Sender email** should auto-fill to `it-support@keytrainlearning.com` (template local part `it-support` + your domain)
5. If needed, edit manually — must stay `@keytrainlearning.com`
6. **Test send** to your own email → confirm **From** is `IT Support Team <it-support@keytrainlearning.com>` (or your campaign sender name)

#### 4. `noreply@keytrainlearning.com` — phishing DocuSign-style templates

Same as above — per campaign, no extra Resend setup.

1. New campaign → choose template **DocuSign Document**
2. **Sender email** auto-fills to `noreply@keytrainlearning.com` (template local part `noreply`)
3. **Test send** → confirm **From** uses `noreply@keytrainlearning.com`

> **Note:** Auth and phishing both use `noreply@keytrainlearning.com` but for different purposes. That is fine — same verified domain, same API key, different subject/body and sending path (SMTP vs edge function).

#### Quick verification in Resend

After each test send:

1. Resend → **Logs** → confirm status **Delivered**
2. If **403** or “domain not verified”: re-check Cloudflare DNS matches Resend’s required records
3. If auth mail still from `supabase.co`: Custom SMTP not saved or wrong sender domain

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
  - `GH_PAGES_BASE: /`
  - `VITE_APP_URL: https://keytrainlearning.com`
- [ ] `package.json` — set `homepage` to `https://keytrainlearning.com/`
- [ ] `supabase/config.toml` — update `[auth]`:
  - `site_url = "https://keytrainlearning.com"`
  - `additional_redirect_urls` — include `https://keytrainlearning.com/**` (keep `localhost` entries)
- [ ] `.github/workflows/deploy-edge-functions.yml` — set `INVITE_REDIRECT_URL` to `https://keytrainlearning.com/accept-invite` (if that workflow is in use)
- [ ] Push to `main` and confirm GitHub Actions **Deploy to GitHub Pages** succeeds
- [ ] Open `https://keytrainlearning.com` — app loads, no broken assets
- [ ] Sign in works on the new domain

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

**Password reset email template (recommended for GitHub Pages):**

Supabase Dashboard → **Authentication** → **Email Templates** → **Reset password**. Replace the default link with:

```html
<a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

This sends the token in the query string (more reliable on static hosting than `#access_token` fragments). The app already handles `?token_hash=...&type=recovery`.

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

## Phase 9 — Phishing inbox placement (deliverability)

Phishing-style mail is filtered aggressively. Inbox placement needs **authentication + sane URLs + customer IT allowlisting** — not Resend API tweaks alone.

### Already done (no action)

- Resend domain `keytrainlearning.com` verified (SPF + DKIM in Cloudflare)
- Sending from verified `@keytrainlearning.com` addresses via `send-phishing-campaign`
- Org-aware templates with per-recipient sender names and addresses
- Fake login page bundled at `https://keytrainlearning.com/phishing-sim/login.html`
- Training interstitial at `https://keytrainlearning.com/phishing-training`

---

### 9.1 — Customer IT allowlisting (required for hospitals on M365)

You cannot skip this for hospital tenants and expect consistent inbox delivery.

- [ ] Ask each customer’s IT admin to configure **Microsoft Defender Advanced Delivery** for third-party phishing simulations  
  Portal: [security.microsoft.com/advanceddelivery](https://security.microsoft.com/advanceddelivery) → **Phishing simulation** tab  
  Microsoft docs: [Configure advanced delivery](https://learn.microsoft.com/en-us/defender-office-365/advanced-delivery-policy-configure)

| Field | Value for KeyTrain |
|-------|-------------------|
| **Sending domains** | `keytrainlearning.com` |
| **Sending IP ranges** | Resend outbound IPs — [Resend IP list](https://resend.com/docs/knowledge-base/what-are-resend-ip-addresses) |
| **Simulation URLs** | `keytrainlearning.com/*` (plus any dedicated sim domain you add later) |

- [ ] For **Google Workspace** customers: admin routing / spam bypass for `keytrainlearning.com` and simulation URL patterns
- [ ] Provide a one-page **IT allowlist guide** during customer onboarding (domain, Resend IPs, URL patterns) — *draft pending*

> Do **not** use broad safe-sender lists or global IP allowlists. Advanced Delivery is the scoped, supported approach for M365.

---

### 9.2 — Finish DNS authentication (DMARC)

SPF and DKIM are in place. DMARC is still outstanding.

- [ ] Add **DMARC** TXT record at Cloudflare:

```
_dmarc.keytrainlearning.com  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@keytrainlearning.com"
```

- [ ] Start with `p=none` (monitor only). After Resend reports are clean for a few weeks, consider tightening policy.
- [ ] Confirm in Resend → **Domains** that SPF, DKIM, **and** DMARC all show green.

---

### 9.3 — Fix link domains in email bodies

Spam filters weigh URLs heavily. Click-tracking links currently default to:

```
https://rzrsudrdpnabpseatclm.supabase.co/functions/v1/track-phishing-event?...
```

That is a strong junk signal: unknown `.supabase.co` URL plus urgent CTA.

| Approach | Realism | Deliverability |
|----------|---------|----------------|
| Fake login at `https://keytrainlearning.com/phishing-sim/login.html` | Moderate | Good (same domain as From) |
| Separate sim domain (e.g. `memorial-itportal.com`) on Cloudflare Pages | High | Good **if** allowlisted in Defender |

- [ ] Route tracking through your domain — set `PHISHING_TRACKING_BASE_URL` after building a reverse proxy or Cloudflare Worker on `keytrainlearning.com` that forwards to the Supabase edge function (not built yet):

```bash
supabase secrets set PHISHING_TRACKING_BASE_URL='https://keytrainlearning.com/api/phish-track' --project-ref rzrsudrdpnabpseatclm
```

- [ ] Confirm campaign **Fake login URL** stays on `keytrainlearning.com` (not `supabase.co`) until a dedicated sim domain is ready
- [ ] Optional later: dedicated lookalike domain for links/login — see [`simulation-sites/README.md`](../simulation-sites/README.md); verify in Resend and add to Defender simulation URLs

---

### 9.4 — Campaign settings and pilot sends

- [ ] Turn off the **open-tracking pixel** on production campaigns unless needed (hurts deliverability; unreliable in many clients)
- [ ] Pilot with **test sends** to Gmail, Outlook.com, and the customer’s actual M365 tenant before **Send to everyone**
- [ ] Check Resend → **Logs** for Delivered vs Bounced vs delayed; fix bounces before scaling volume
- [ ] Send test mail to yourself on Outlook and Gmail — verify message headers show SPF, DKIM, and DMARC pass

---

### 9.5 — Realism vs junk (reference)

| More realistic | More likely to hit Junk |
|----------------|-------------------------|
| Lookalike domain (`keytrain-hospital.com`) | Yes — unless verified in Resend **and** allowlisted |
| “Password expires in 24 hours” urgency | Yes |
| Display name “Memorial Hospital IT” from `@keytrainlearning.com` | Moderate — domain/name mismatch |
| Links through `supabase.co` | Yes |

For maximum realism later:

1. Dedicated simulation domain for links and login pages
2. Verify that domain in Resend if used for From addresses
3. Customer IT allowlists domain + IPs + URLs in Defender Advanced Delivery

**Inbox placement** = authentication + allowlisting + sane URLs  
**Content realism** = templates, org names, fake login pages *(already in place)*

---

### 9.6 — Deliverability rollout checklist

- [ ] Customer IT: M365 Advanced Delivery (or Google equivalent) configured
- [ ] Add DMARC in Cloudflare; confirm all green in Resend
- [ ] Replace `supabase.co` tracking URLs with `keytrainlearning.com` proxy (build + deploy worker/proxy)
- [ ] Disable open pixel on production campaigns
- [ ] Test-send to Gmail, Outlook, and customer M365; verify headers
- [ ] Small test send (“Add me for testing”) before full campaign
- [ ] Draft IT allowlist onboarding doc for hospitals

---

## Optional — other hardening

- [ ] Set up `support@keytrainlearning.com` as a real mailbox or forwarder at your registrar

---

## Troubleshooting quick reference

| Symptom | Likely fix |
|---------|------------|
| Resend 403 on support form | Domain not verified, or `RESEND_FROM` not on verified domain |
| Resend 403 on phishing send | Campaign **Sender email** must be `@keytrainlearning.com` |
| “Do I need another API key for noreply vs support?” | **No** — one `re_...` key with Sending access covers all verified-domain senders |
| Auth emails still from supabase.co | Custom SMTP not saved, or sender not on verified domain |
| Invite link goes to github.io | Redeploy `manage-users` after setting `INVITE_REDIRECT_URL`; rebuild frontend with `VITE_APP_URL` |
| Phishing says “dry run” | Unset `PHISHING_SIMULATION_DRY_RUN`; ensure `RESEND_API_KEY` is set |
| Phishing send fails on `from` | Campaign sender email must be on verified Resend domain |
| SMTP “DNS lookup” error | Remove trailing space from `smtp.resend.com` in Supabase SMTP host field |
| App assets 404 on custom domain (blank white page) | `GH_PAGES_BASE` must be `/` — redeploy after fixing `deploy.yml` |

---

## Secrets & config summary

| Name | Where | Example value |
|------|--------|----------------|
| `RESEND_API_KEY` | Supabase secrets | Same `re_...` key as Supabase SMTP password |
| `RESEND_FROM` | Supabase secrets | `KeyTrain Learning <support@keytrainlearning.com>` |
| `SUPPORT_TO_EMAIL` | Supabase secrets | your inbox |
| `INVITE_REDIRECT_URL` | Supabase secrets | `https://keytrainlearning.com/accept-invite` |
| `PHISHING_TRAINING_URL` | Supabase secrets | `https://keytrainlearning.com/phishing-training` |
| `PHISHING_TRACKING_BASE_URL` | Supabase secrets | Optional — `https://keytrainlearning.com/api/phish-track` after proxy is built |
| `VITE_APP_URL` | GitHub Actions build env | `https://keytrainlearning.com` |
| SMTP sender | Supabase Auth dashboard | `noreply@keytrainlearning.com` |

---

*Last updated: Phase 9 phishing deliverability plan added.*
