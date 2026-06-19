#!/usr/bin/env bash
# Deploy manage-users Edge Function (verify_jwt=false in supabase/config.toml).
#
# Non-interactive (recommended):
#   1. Create a token: https://supabase.com/dashboard/account/tokens
#   2. export SUPABASE_ACCESS_TOKEN='sbp_...'
#   3. export SUPABASE_PROJECT_REF=rzrsudrdpnabpseatclm
#   4. bash scripts/deploy-manage-users.sh
#
# Interactive alternative: npx supabase@latest login  (finish browser + verification code)
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

Option A — dashboard token (recommended for scripts):
  1. https://supabase.com/dashboard/account/tokens → Generate new token
  2. export SUPABASE_ACCESS_TOKEN='sbp_...'
  3. export SUPABASE_PROJECT_REF=rzrsudrdpnabpseatclm
  4. npm run deploy:manage-users

Option B — CLI login (interactive):
  npx supabase@latest login
  npm run deploy:manage-users
EOF
    exit 1
  fi
  echo "Using Supabase CLI login session."
fi

INVITE_URL="${INVITE_REDIRECT_URL:-https://keytrainlearning.com/accept-invite}"

echo "Linking project and pushing auth config (Site URL + redirect URLs)…"
"${SUPABASE_CMD[@]}" link --project-ref "$PROJECT_REF" --yes || true
if ! "${SUPABASE_CMD[@]}" config push --yes; then
  echo ""
  echo "WARNING: config push failed. Manually set in Supabase Dashboard → Authentication → URL configuration:"
  echo "  Site URL: https://keytrainlearning.com"
  echo "  Redirect URLs: https://keytrainlearning.com/**"
  echo ""
fi

echo "Setting INVITE_REDIRECT_URL=$INVITE_URL"
"${SUPABASE_CMD[@]}" secrets set "INVITE_REDIRECT_URL=$INVITE_URL" --project-ref "$PROJECT_REF"

echo "Deploying manage-users (JWT checked inside function, not at gateway)…"
"${SUPABASE_CMD[@]}" functions deploy manage-users --project-ref "$PROJECT_REF" --no-verify-jwt

echo ""
echo "Verifying deployment…"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
  "https://${PROJECT_REF}.supabase.co/functions/v1/manage-users" \
  -H "Origin: https://patguettler.github.io" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type,apikey")

if [ "$HTTP_CODE" = "404" ]; then
  echo "ERROR: manage-users still returns 404. Check dashboard → Edge Functions." >&2
  exit 1
fi

echo "OPTIONS returned $HTTP_CODE — deploy looks good."
echo "Try Add user on https://keytrainlearning.com/"
