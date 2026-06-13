#!/usr/bin/env bash
# Set passwords for test Auth users via Supabase Admin API.
#
# Loads .env from project root if present. You still must provide the service role key
# (do not commit it — export for this session or add to .env locally only):
#
#   export SUPABASE_SERVICE_ROLE_KEY='eyJ...'
#   npm run set-test-passwords
#
# Optional:
#   TEST_EMAILS='employee@test.com'
#   TEST_PASSWORD='asdf1234ASDF!@#$'
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"

if [ -z "${SUPABASE_URL:-}" ]; then
  echo "Error: missing project URL." >&2
  echo "  Add VITE_SUPABASE_URL to .env (copy from .env.example), or:" >&2
  echo "  export SUPABASE_URL='https://YOUR_PROJECT.supabase.co'" >&2
  exit 1
fi

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "Error: missing SUPABASE_SERVICE_ROLE_KEY." >&2
  echo "  Supabase Dashboard → Settings → API → service_role → Reveal → copy" >&2
  echo "  export SUPABASE_SERVICE_ROLE_KEY='eyJ...'" >&2
  echo "  npm run set-test-passwords" >&2
  exit 1
fi

exec node scripts/set-test-passwords.mjs
