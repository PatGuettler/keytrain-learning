#!/usr/bin/env bash
# Deploy phishing simulation Edge Functions.
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-rzrsudrdpnabpseatclm}"

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] && [ -f "${HOME}/.supabase/access-token" ]; then
  export SUPABASE_ACCESS_TOKEN="$(tr -d '[:space:]' < "${HOME}/.supabase/access-token")"
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "Error: set SUPABASE_ACCESS_TOKEN or run supabase login" >&2
  exit 1
fi

echo "Linking project and pushing auth config (verify_jwt=false for CORS)..."
supabase link --project-ref "$PROJECT_REF" --yes 2>/dev/null || true
supabase config push --yes 2>/dev/null || true

echo "Deploying send-phishing-campaign..."
supabase functions deploy send-phishing-campaign --project-ref "$PROJECT_REF" --no-verify-jwt --use-api

echo "Deploying track-phishing-event..."
supabase functions deploy track-phishing-event --project-ref "$PROJECT_REF" --no-verify-jwt --use-api

echo "Done. Optional secrets:"
echo "  supabase secrets set PHISHING_SIMULATION_DRY_RUN=true --project-ref $PROJECT_REF"
echo "  supabase secrets set PHISHING_TRAINING_URL='https://keytrainlearning.com/phishing-training' --project-ref $PROJECT_REF"
