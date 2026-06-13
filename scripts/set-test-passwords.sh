#!/usr/bin/env bash
# Set passwords for test Auth users via Supabase Admin API.
#
#   export SUPABASE_URL='https://YOUR_PROJECT.supabase.co'
#   export SUPABASE_SERVICE_ROLE_KEY='eyJ...'
#   bash scripts/set-test-passwords.sh
#
# Defaults: employee@test.com, management@test.com → asdf1234ASDF!@#$
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -f .env ] && [ -z "${SUPABASE_URL:-}" ]; then
  SUPABASE_URL="$(grep -E '^VITE_SUPABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d "\"'" || true)"
  export SUPABASE_URL
fi

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "Error: export SUPABASE_SERVICE_ROLE_KEY (Supabase Dashboard → Settings → API → service_role secret)" >&2
  exit 1
fi

node scripts/set-test-passwords.mjs
