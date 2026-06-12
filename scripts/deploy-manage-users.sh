#!/usr/bin/env bash
# Deploy manage-users Edge Function (verify_jwt=false in supabase/config.toml).
# Requires: supabase CLI, SUPABASE_ACCESS_TOKEN, and SUPABASE_PROJECT_REF.
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-${PROJECT_REF:-}}"
if [ -z "$PROJECT_REF" ]; then
  echo "Error: set SUPABASE_PROJECT_REF (e.g. rzrsudrdpnabpseatclm)" >&2
  exit 1
fi

INVITE_URL="${INVITE_REDIRECT_URL:-https://patguettler.github.io/guardian-md/login}"

echo "Setting INVITE_REDIRECT_URL=$INVITE_URL"
supabase secrets set "INVITE_REDIRECT_URL=$INVITE_URL" --project-ref "$PROJECT_REF"

echo "Deploying manage-users (JWT verified inside function, not at gateway)…"
supabase functions deploy manage-users --project-ref "$PROJECT_REF"

echo "Done. Test from https://patguettler.github.io/guardian-md/ — Add user should work."
