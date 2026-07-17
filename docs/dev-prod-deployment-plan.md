# Dev / Prod deployment plan (KeyTrain Learning)

Plan for going live with the current stack (React/Vite SPA + Supabase + GitHub Pages) while supporting **PR → staging test → merge → production**.

**Live prod today:** [https://keytrainlearning.com/](https://keytrainlearning.com/) via `.github/workflows/deploy.yml` on `main`.

---

## Why GitHub Pages alone is not enough

GitHub Pages gives **one site per repo**. Your current workflow already deploys `main` → `keytrainlearning.com`.

Pages does **not** provide:

- A second stable staging URL from the same repo
- Automatic per-PR preview environments (like Netlify / Cloudflare Pages)

So: **keep Pages for production**, and add a second host (or preview service) for staging.

---

## Target architecture

| | **Staging (dev)** | **Production** |
|---|---|---|
| **Git** | `develop` (and/or PR previews) | `main` |
| **Frontend URL** | `staging.keytrainlearning.com` (or host preview URL) | `keytrainlearning.com` |
| **Frontend host** | Cloudflare Pages or Netlify | GitHub Pages (keep current) |
| **Backend** | Separate Supabase project | Current prod Supabase project |
| **Build secrets** | Staging `VITE_SUPABASE_*`, staging `VITE_APP_URL` | Existing prod Actions secrets |
| **Auth redirects** | Staging accept-invite / reset URLs | Prod URLs (already configured) |

### Critical rule

**Do not** point a staging frontend at production Supabase for real testing.

Staging will invite users, mutate assignments, run phishing sims, etc. That must stay off prod data.

---

## Recommended git flow

```text
feature/*  →  PR into develop  →  auto-deploy staging  →  test on staging
                 ↓
            PR develop → main  →  auto-deploy prod (existing deploy.yml)
```

### Day-to-day

1. Create a feature branch from `develop`.
2. Open a PR into `develop`.
3. CI builds and deploys **staging** (shared URL and/or per-PR preview).
4. Verify on staging.
5. Open a PR `develop` → `main` (optional: require reviewer / environment approval).
6. Merge to `main` → existing GitHub Pages workflow ships production.

---

## Staging hosting options

### Option A (recommended): Cloudflare Pages or Netlify for staging + previews

- Keep **GitHub Pages** for prod exactly as today.
- Connect the same repo to Cloudflare Pages or Netlify for:
  - Deploy on push to `develop` → stable `staging.keytrainlearning.com`
  - Optional: deploy every PR → unique preview URL
- Free tiers are enough for this SPA.

### Option B: GitHub-only

Possible but awkward (second repo, or hacky path deploys). Not recommended if you want a clean staging subdomain and PR previews.

**Recommendation:** Option A.

---

## Setup checklist

### 1. Branches

- [ ] Create `develop` from current `main`
- [ ] Protect `main`: require PR, optionally require approval
- [ ] Protect `develop`: require PR (optional but useful)

### 2. Staging Supabase project

- [ ] Create a new Supabase project (e.g. `keytrain-learning-staging`)
- [ ] Apply the same migrations as prod (`supabase db push` / migration workflow)
- [ ] Configure Auth URL allow-list for staging frontend:
  - Site URL: `https://staging.keytrainlearning.com`
  - Redirects: `https://staging.keytrainlearning.com/**` (and accept-invite / reset paths)
- [ ] Deploy Edge Functions to the **staging** project
- [ ] Set staging function secrets (`INVITE_REDIRECT_URL`, Resend, phishing URLs, etc.) so emails never deep-link to prod

### 3. GitHub Environments

In the repo: **Settings → Environments**

| Environment | Purpose | Secrets (examples) |
|-------------|---------|-------------------|
| `staging` | Staging frontend builds | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, staging deploy tokens |
| `production` / `github-pages` | Prod Pages deploy | Existing prod secrets; optional required reviewers |

Suggested staging build env:

```text
GITHUB_PAGES=true          # only if still using Pages-style SPA fallback; otherwise host-specific
GH_PAGES_BASE=/
VITE_APP_URL=https://staging.keytrainlearning.com
VITE_SUPABASE_URL=<staging project url>
VITE_SUPABASE_ANON_KEY=<staging anon key>
```

Prod (already in `deploy.yml`):

```text
GITHUB_PAGES=true
GH_PAGES_BASE=/
VITE_APP_URL=https://keytrainlearning.com
VITE_SUPABASE_URL=<prod>
VITE_SUPABASE_ANON_KEY=<prod>
```

### 4. DNS

- [ ] Keep `keytrainlearning.com` → GitHub Pages
- [ ] Add `staging.keytrainlearning.com` → Cloudflare Pages / Netlify

### 5. Workflows

- [ ] **Prod:** keep `.github/workflows/deploy.yml` triggered only on `main` (current behavior)
- [ ] **Staging:** add workflow or host-native deploy on:
  - push to `develop`
  - optionally `pull_request` for preview deploys
- [ ] **Edge functions:** either duplicate deploy workflow for staging project ref, or run staging deploys manually until automation exists
- [ ] Do **not** let staging pushes deploy prod Pages

### 6. Seed / test data (staging only)

- [ ] Create a small staging org + admin/manager/employee test users
- [ ] Publish a sample course
- [ ] Confirm invite, login, course play, unlock, and PDF export on staging before prod merge

---

## PR previews vs shared staging

| Approach | Pros | Cons |
|----------|------|------|
| **Shared staging (`develop`)** | One stable URL for the team | PRs overwrite each other until merged |
| **Per-PR preview URLs** | Isolated review per change | Slightly more setup; still use **staging** Supabase |

You can use both: previews for review, `develop` as the integration environment.

---

## Suggested promotion path (go-live habit)

1. Develop and open PR → `develop`
2. Test on staging (real auth, real staging DB)
3. Merge to `develop`
4. Smoke-test staging again if needed
5. PR `develop` → `main`
6. Merge → prod GitHub Pages deploy
7. Smoke-test production (login, one course, invite redirect)

For database changes:

1. Write migration in repo
2. Apply to **staging** Supabase first
3. Verify app on staging
4. Apply same migration to **prod** Supabase before or as part of the prod release (never only in code without applying SQL)

---

## What stays the same

- Vite + React SPA
- Supabase Auth / RLS / Edge Functions model
- Prod host: GitHub Pages + custom domain
- Prod workflow: `.github/workflows/deploy.yml`

## What changes

- Add `develop` branch
- Add staging Supabase project
- Add staging frontend host (Cloudflare Pages or Netlify)
- Split secrets by environment
- Promote via PR, not by pushing straight to `main` for untested work

---

## Decision needed before implementation

Pick one staging host:

1. **Cloudflare Pages**
2. **Netlify**

Then implement:

- Staging project + secrets
- `develop` branch protections
- Staging deploy workflow / host config
- Short README section linking here

---

## Out of scope (for later)

- Blue/green prod cutovers
- Automated migration apply on merge (possible, but higher risk — start manual)
- Separate staging Resend domain/reputation (optional; can share Resend account with staging from-address if needed)

---

## Quick reference

```text
Frontend:  Pages = prod only | Cloudflare/Netlify = staging + previews
Data:      two Supabase projects
Git:       feature → develop (test) → main (live)
```
