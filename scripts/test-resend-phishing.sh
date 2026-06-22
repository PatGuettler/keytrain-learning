#!/usr/bin/env bash
# Test Resend delivery with a phishing-style From address (run locally).
#
# Usage:
#   export RESEND_API_KEY='re_...'
#   export TEST_TO_EMAIL='patguettler@gmail.com'
#   bash scripts/test-resend-phishing.sh
#
# If this fails, the issue is Resend (domain, From address, or API key) — not Supabase.
set -euo pipefail

TO="${TEST_TO_EMAIL:-patguettler@gmail.com}"
FROM_NAME="${TEST_FROM_NAME:-Memorial Hospital IT Support}"
FROM_EMAIL="${TEST_FROM_EMAIL:-memorial-hospital-it-support@keytrainlearning.com}"

if [ -z "${RESEND_API_KEY:-}" ]; then
  echo "Error: set RESEND_API_KEY (same key as Supabase SMTP / secrets)" >&2
  exit 1
fi

PAYLOAD=$(cat <<EOF
{
  "from": "${FROM_NAME} <${FROM_EMAIL}>",
  "to": ["${TO}"],
  "subject": "KeyTrain phishing send test",
  "html": "<p>If you received this, Resend accepts phishing-style From addresses.</p>",
  "text": "If you received this, Resend accepts phishing-style From addresses."
}
EOF
)

HTTP=$(curl -sS -w "\n%{http_code}" -X POST 'https://api.resend.com/emails' \
  -H "Authorization: Bearer ${RESEND_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD")
BODY=$(echo "$HTTP" | head -n -1)
CODE=$(echo "$HTTP" | tail -n 1)

echo "HTTP $CODE"
echo "$BODY"

if [ "$CODE" = "200" ] || [ "$CODE" = "201" ]; then
  echo "OK — check ${TO} (inbox + spam)."
  exit 0
fi

echo "Failed — fix Resend/domain/From before debugging Supabase." >&2
exit 1
