# Simulation sites (Cloudflare Pages)

Deploy these static pages on a **separate custom domain** for production phishing simulations.

For local / GitHub Pages testing, use the bundled page at `public/phishing-sim/login.html` instead.

## Production setup

1. Buy a convincing domain (e.g. `ithelpdeskportal.com`).
2. Copy `public/phishing-sim/login.html` into a **private** GitHub repo.
3. Deploy to [Cloudflare Pages](https://pages.cloudflare.com) with no build command.
4. Attach your custom domain in Cloudflare Pages → Custom domains.
5. Set the campaign **Fake login page URL** in GuardianMD to `https://your-domain.com/`.

The send function appends `?token=...&track=...` automatically. Passwords submitted on the fake login form are **never stored** — only a `credential_submission` event is logged.

## Training interstitial

Users are redirected to the main GuardianMD app at `/phishing-training?token=...` (hosted on GitHub Pages). No extra hosting required for that page.
