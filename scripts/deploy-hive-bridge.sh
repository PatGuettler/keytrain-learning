#!/usr/bin/env bash
# Deploy RailNet Edge Functions (verify_jwt=false in supabase/config.toml):
#   aws-hive-bridge (read) + aws-railnet-signatures (approve/reject write)
#
# Requires Supabase secrets (set once in dashboard or via CLI):
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION=us-east-2
#
# IAM (one user for both edge functions, e.g. ktl-hive-write):
#   Read:  dynamodb:Query, dynamodb:Scan, dynamodb:GetItem on Hive tables
#   Write: dynamodb:PutItem, dynamodb:UpdateItem on Indicators + Signatures
#   "Invalid security token" = wrong key pair in Supabase secrets, not missing Query.
# Optional: HIVE_ORG_IDS=church001,KeyTrainAdmins (comma-separated; omit to scan all ORG# rows)
#
# Non-interactive:
#   export SUPABASE_ACCESS_TOKEN='sbp_...'
#   export SUPABASE_PROJECT_REF=rzrsudrdpnabpseatclm
#   bash scripts/deploy-hive-bridge.sh
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-${PROJECT_REF:-}}"
if [ -z "$PROJECT_REF" ]; then
  echo "Error: set SUPABASE_PROJECT_REF (e.g. rzrsudrdpnabpseatclm)" >&2
  exit 1
fi

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
    cat >&2 <<'EOF'
Error: not authenticated with Supabase.

  export SUPABASE_ACCESS_TOKEN='sbp_...'
  export SUPABASE_PROJECT_REF=rzrsudrdpnabpseatclm
  npm run deploy:hive-bridge
EOF
    exit 1
  fi
fi

echo "Linking project and pushing config…"
"${SUPABASE_CMD[@]}" link --project-ref "$PROJECT_REF" --yes || true
"${SUPABASE_CMD[@]}" config push --yes || true

echo "Deploying aws-hive-bridge…"
"${SUPABASE_CMD[@]}" functions deploy aws-hive-bridge --project-ref "$PROJECT_REF" --no-verify-jwt --use-api

echo "Deploying aws-railnet-signatures…"
"${SUPABASE_CMD[@]}" functions deploy aws-railnet-signatures --project-ref "$PROJECT_REF" --no-verify-jwt --use-api

echo ""
echo "Verify AWS secrets are set in Supabase Dashboard → Edge Functions → Secrets:"
echo "  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION=us-east-2"
echo "  (signatures write needs DynamoDB UpdateItem on KeyTrainHiveSignatures)"
echo ""
for fn in aws-hive-bridge aws-railnet-signatures; do
  echo "OPTIONS check $fn…"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
    "https://${PROJECT_REF}.supabase.co/functions/v1/${fn}" \
    -H "Origin: https://keytrainlearning.com" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: authorization,content-type,apikey")

  if [ "$HTTP_CODE" = "404" ]; then
    echo "ERROR: ${fn} still returns 404." >&2
    exit 1
  fi
  echo "  $fn OPTIONS returned $HTTP_CODE"
done

echo "RailNet edge functions deploy looks good."
