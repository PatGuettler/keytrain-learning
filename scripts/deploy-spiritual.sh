#!/usr/bin/env bash
# Deploy daily verse + prayer request Edge Functions (verify_jwt=false in supabase/config.toml).
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-rzrsudrdpnabpseatclm}"

if command -v supabase >/dev/null 2>&1; then
  SUPABASE_CMD=(supabase)
else
  echo "Using npx supabase@latest"
  SUPABASE_CMD=(npx --yes supabase@latest)
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] && [ -f "${HOME}/.supabase/access-token" ]; then
  export SUPABASE_ACCESS_TOKEN="$(tr -d '[:space:]' < "${HOME}/.supabase/access-token")"
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "SUPABASE_ACCESS_TOKEN not set — checking Supabase CLI login session…"
  if ! "${SUPABASE_CMD[@]}" projects list >/dev/null 2>&1; then
    echo "Error: set SUPABASE_ACCESS_TOKEN or run: npx supabase@latest login" >&2
    exit 1
  fi
fi

echo "Linking project and pushing auth config…"
"${SUPABASE_CMD[@]}" link --project-ref "$PROJECT_REF" --yes || true
"${SUPABASE_CMD[@]}" config push --yes || true

echo "Deploying get-daily-verse…"
"${SUPABASE_CMD[@]}" functions deploy get-daily-verse --project-ref "$PROJECT_REF" --no-verify-jwt --use-api

echo "Deploying submit-prayer-request…"
"${SUPABASE_CMD[@]}" functions deploy submit-prayer-request --project-ref "$PROJECT_REF" --no-verify-jwt --use-api

echo ""
echo "Done. Daily verse text is bundled in get-daily-verse/references.json (World English Bible)."
echo "Ensure migration 025_daily_verse_and_prayer.sql is applied (prayer_requests table)."
