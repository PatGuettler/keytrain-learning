#!/usr/bin/env bash
# Test Resend delivery for the support form (run locally after exporting RESEND_API_KEY).
#
# Usage:
#   export RESEND_API_KEY='re_...'
#   export SUPPORT_TO_EMAIL='patguettler@gmail.com'   # must match Resend account email when using onboarding@resend.dev
#   bash scripts/test-resend-support.sh
set -euo pipefail

TO="${SUPPORT_TO_EMAIL:-patguettler@gmail.com}"
FROM="${RESEND_FROM:-KeyTrain Learning Support <onboarding@resend.dev>}"

if [ -z "${RESEND_API_KEY:-}" ]; then
  echo "Error: set RESEND_API_KEY (from https://resend.com/api-keys)" >&2
  exit 1
fi

echo "Sending test email to: $TO"
echo "From: $FROM"
echo ""

PAYLOAD=$(FROM="$FROM" TO="$TO" python3 - <<'PY'
import json, os
print(json.dumps({
    "from": os.environ["FROM"],
    "to": [os.environ["TO"]],
    "subject": "[KeyTrain Learning test] Support email debug",
    "text": "If you received this, Resend is configured correctly.",
}))
PY
)

HTTP=$(curl -sS -w "\n%{http_code}" -X POST 'https://api.resend.com/emails' \
  -H "Authorization: Bearer ${RESEND_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD")

BODY=$(echo "$HTTP" | sed '$d')
CODE=$(echo "$HTTP" | tail -n 1)

echo "HTTP $CODE"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

if [ "$CODE" = "403" ]; then
  echo ""
  echo "403 usually means onboarding@resend.dev can ONLY send to your Resend account email."
  echo "Fix: set SUPPORT_TO_EMAIL to that address, OR verify a domain and set RESEND_FROM."
elif [ "$CODE" = "401" ]; then
  echo ""
  echo "401: invalid RESEND_API_KEY — create one at https://resend.com/api-keys"
elif [ "$CODE" = "200" ] || [ "$CODE" = "201" ]; then
  echo ""
  echo "Success — check the inbox for $TO (and spam)."
fi

exit 0
