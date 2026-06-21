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
| **Daily verse / prayer (025)** | Verified in SQL: `has_025 = true` (`profiles.daily_verse_enabled`) |
| **Lockout clear on reset (026)** | Verified in SQL: `has_026 = true` (`on_auth_user_password_change` trigger) |
| **Org-aware templates (027)** | Verified in SQL: `has_027 = true` on `it_helpdesk` template |
| **Phishing edge functions** | `send-phishing-campaign` and `track-phishing-event` deployed |
| **Resend for phishing** | `RESEND_API_KEY` set; dry-run disabled (real sends attempted) |
| **Org-aware send logic** | Per-recipient sender names/addresses in app + edge function code |
| **Fake login + training URLs** | `keytrainlearning.com/phishing-sim/login.html` and `/phishing-training` |
| **Custom SMTP (Resend)** | Enabled — `noreply@keytrainlearning.com`, `smtp.resend.com:465`, user `resend` |
| **Reset password email template** | Uses `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery` |
| **Password reset live test** | Email from `noreply@keytrainlearning.com`; link opens reset page; login with new password works |
| **Frontend deploy** | Pushed to `main`; GitHub Actions Pages deploy succeeds |
| **Frontend verified in browser** | Hard refresh + login; no console errors; daily verse loads (client-side) |

### Email routing (reference)

| Email type | From address | Mechanism |
|------------|--------------|-----------|
| Invites, password reset, auth | `noreply@keytrainlearning.com` | Supabase Auth → Resend SMTP |
| Profile → Contact form | `support@keytrainlearning.com` | Edge function `send-support-request` |
| Phishing simulations | Per-campaign `@keytrainlearning.com` | Edge function `send-phishing-campaign` |

One Resend API key (`re_...`) with **Sending access** covers all `@keytrainlearning.com` senders — no per-address registration in Resend.

### Reauthentication email template

Default Supabase template (`{{ .Token }}` in subject/body) is fine — no change needed unless you want branded copy later.

---

## Remaining work

Complete in order. Check each box when done.

### 1 — Secrets & edge functions (verify)

- [ ] `RESEND_API_KEY`, `RESEND_FROM`, `SUPPORT_TO_EMAIL`, `INVITE_REDIRECT_URL`, `PHISHING_TRAINING_URL` set
- [ ] `PHISHING_SIMULATION_DRY_RUN` unset or `false`
- [ ] `send-support-request`, `manage-users`, `send-phishing-campaign`, `track-phishing-event` deployed (redeploy if unsure: `npm run deploy:phishing`)

---

### 2 — Phishing production validation

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

### 3 — End-to-end verification

| Test | Done |
|------|------|
| `npm run test:resend-support` returns HTTP 200 | [ ] |
| Profile → Contact → delivered to `SUPPORT_TO_EMAIL` | [ ] |
| Invite user → from `noreply@keytrainlearning.com`, link opens keytrainlearning.com | [ ] |
| Password reset → same | [x] |
| Phishing test send → from campaign sender on your domain | [ ] |
| Resend → **Logs** shows Delivered (no unexpected bounces) | [ ] |

---

### 4 — Phishing inbox placement (deliverability)

Inbox placement needs **authentication + sane URLs + customer IT allowlisting**. Content realism (templates, org names, fake login) is already in place.

#### 4.1 — Customer IT allowlisting (required for hospitals on M365)

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

#### 4.2 — DMARC

SPF and DKIM are done. DMARC is not.

- [ ] Add at Cloudflare:

```
_dmarc.keytrainlearning.com  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@keytrainlearning.com"
```

- [ ] Resend → **Domains** shows SPF, DKIM, and DMARC green

#### 4.3 — Tracking URLs (replace supabase.co in email links)

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

#### 4.4 — Campaign & pilot practices

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
- [ ] **Migration history baselined** — optional, so future `db push` works (schema 001–027 already applied; do not rerun SQL):

```bash
npx supabase migration repair --status applied \
  001 002 003 004 005 006 007 008 009 010 \
  011 012 013 014 015 016 017 018 019 020 \
  021 022 023 024 025 026 027
```

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| `401 Unauthorized` on phishing send | Sign out/in; hard-refresh for latest frontend bundle |
| CORS on `get-daily-verse` | Hard-refresh — client-side verse should not call edge function |
| `422` on `auth/v1/user` after login | Harmless if dashboard loads; fixed by removing redundant `getUser()` on daily verse |
| Resend 403 | Domain not verified, or `From` not on verified domain |
| Phishing “dry run” | Unset `PHISHING_SIMULATION_DRY_RUN`; set `RESEND_API_KEY` |
| Auth mail from `@supabase.co` | Custom SMTP is on — confirm **Save changes** was clicked; send test reset |
| Invite link goes to wrong host | Set `INVITE_REDIRECT_URL`; rebuild with `VITE_APP_URL` |
| `db push` fails on 001 | Schema already exists — use migration repair (Optional), don't rerun 001–027 |
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

*Last updated: frontend verified in browser (no console errors, daily verse loads).*
