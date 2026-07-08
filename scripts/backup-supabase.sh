#!/usr/bin/env bash
# Full KeyTrain Supabase backup → supabase/backups/<timestamp>/
#
# Captures what is needed to rebuild after a disaster:
#   - Postgres schema (public + storage)
#   - Postgres data (public app tables)
#   - Auth schema + auth.users data (when credentials allow)
#   - Storage object inventory + optional file download
#   - Edge Function source snapshot + secret name list
#   - Linked config.toml + migration file snapshot
#
# Usage (from repo root):
#   export SUPABASE_ACCESS_TOKEN='sbp_...'
#   export SUPABASE_PROJECT_REF='rzrsudrdpnabpseatclm'
#   export SUPABASE_DB_PASSWORD='...'   # Database password (Settings → Database)
#   # Optional for storage file download:
#   export SUPABASE_SERVICE_ROLE_KEY='...'
#   export VITE_SUPABASE_URL='https://rzrsudrdpnabpseatclm.supabase.co'
#   bash scripts/backup-supabase.sh
#
# Flags:
#   --skip-storage-download   Inventory storage only (no object bytes)
#   --keep N                  Keep only the newest N backup dirs (default: 10 local)
#   --out DIR                 Override backup root (default: supabase/backups)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_STORAGE_DOWNLOAD=0
KEEP_COUNT=10
BACKUP_ROOT="${ROOT}/supabase/backups"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-storage-download) SKIP_STORAGE_DOWNLOAD=1; shift ;;
    --keep) KEEP_COUNT="${2:-10}"; shift 2 ;;
    --out) BACKUP_ROOT="$(cd "${2}" && pwd)"; shift 2 ;;
    -h|--help)
      sed -n '2,25p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown flag: $1" >&2
      exit 1
      ;;
  esac
done

if command -v supabase >/dev/null 2>&1; then
  SUPABASE_CMD=(supabase)
else
  SUPABASE_CMD=(npx --yes supabase@latest)
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-${PROJECT_REF:-rzrsudrdpnabpseatclm}}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="${BACKUP_ROOT}/${TIMESTAMP}"
mkdir -p "$DEST"/{schema,data,auth,storage,functions,meta,migrations}

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
fail() { echo "ERROR: $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Credentials
# ---------------------------------------------------------------------------
if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" && -f "${HOME}/.supabase/access-token" ]]; then
  export SUPABASE_ACCESS_TOKEN="$(tr -d '[:space:]' < "${HOME}/.supabase/access-token")"
fi
[[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]] || fail "Set SUPABASE_ACCESS_TOKEN (dashboard Account → Access Tokens)."

DB_PASSWORD="${SUPABASE_DB_PASSWORD:-${SUPABASE_DB_PASS:-}}"
if [[ -z "$DB_PASSWORD" ]]; then
  fail "Set SUPABASE_DB_PASSWORD (Project Settings → Database → Database password)."
fi

API_URL="${VITE_SUPABASE_URL:-https://${PROJECT_REF}.supabase.co}"
SERVICE_ROLE="${SUPABASE_SERVICE_ROLE_KEY:-}"

log "Backup destination: $DEST"
log "Project: $PROJECT_REF"

# Link so --linked dumps work (idempotent).
log "Linking project…"
"${SUPABASE_CMD[@]}" link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD" --yes >/dev/null 2>&1 \
  || "${SUPABASE_CMD[@]}" link --project-ref "$PROJECT_REF" --yes || true

dump() {
  local label="$1"; shift
  log "Dumping: $label"
  if ! "${SUPABASE_CMD[@]}" db dump --linked --password "$DB_PASSWORD" "$@" ; then
    echo "WARN: dump failed for: $label" | tee -a "$DEST/meta/warnings.txt"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# 1. Schema dumps
# ---------------------------------------------------------------------------
dump "public schema" --schema public -f "$DEST/schema/public.sql" || true
dump "storage schema" --schema storage -f "$DEST/schema/storage.sql" || true
dump "roles" --role-only -f "$DEST/schema/roles.sql" || true

# ---------------------------------------------------------------------------
# 2. App data (all public tables — courses, phishing, assignments, etc.)
# ---------------------------------------------------------------------------
dump "public data" --data-only --use-copy --schema public -f "$DEST/data/public_data.sql" || true

# ---------------------------------------------------------------------------
# 3. Auth (users + identities) — needed to restore logins
# ---------------------------------------------------------------------------
dump "auth schema" --schema auth -f "$DEST/auth/auth_schema.sql" || true
dump "auth data" --data-only --use-copy --schema auth -f "$DEST/auth/auth_data.sql" || true

# High-signal CSV extract of auth users (emails) when psql-compatible URL available.
# supabase dump already has full auth; this file is for quick audit.
if [[ -f "$DEST/auth/auth_data.sql" ]]; then
  grep -E "INSERT INTO|COPY public\.|COPY auth\.users" "$DEST/auth/auth_data.sql" >/dev/null 2>&1 \
    && log "Auth data dump present ($(du -h "$DEST/auth/auth_data.sql" | awk '{print $1}'))"
fi

# ---------------------------------------------------------------------------
# 4. Repo-side recoverables (always available even if remote dump partial)
# ---------------------------------------------------------------------------
log "Snapshotting migrations + config + functions from git…"
cp -a "$ROOT/supabase/migrations/." "$DEST/migrations/"
cp -a "$ROOT/supabase/config.toml" "$DEST/meta/config.toml"
if [[ -d "$ROOT/supabase/functions" ]]; then
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --exclude='.deno' --exclude='node_modules' \
      "$ROOT/supabase/functions/" "$DEST/functions/"
  else
    cp -a "$ROOT/supabase/functions/." "$DEST/functions/"
  fi
fi

# ---------------------------------------------------------------------------
# 5. Secret *names* (values are write-only — cannot be exported)
# ---------------------------------------------------------------------------
log "Listing Edge Function secret names…"
{
  echo "# Secret values cannot be read back from Supabase."
  echo "# Restore from your password manager / GitHub Secrets."
  echo "# Attempted listing at ${TIMESTAMP}:"
  "${SUPABASE_CMD[@]}" secrets list --project-ref "$PROJECT_REF" 2>&1 || echo "(secrets list failed — list manually in dashboard)"
} > "$DEST/meta/secret_names.txt"

# ---------------------------------------------------------------------------
# 6. Storage: inventory + optional download
# ---------------------------------------------------------------------------
mkdir -p "$DEST/storage/objects"
INVENTORY="$DEST/storage/inventory.json"
: > "$DEST/storage/buckets.txt"

KNOWN_BUCKETS=(course-images course-videos course-pdfs)

if [[ -n "$SERVICE_ROLE" ]]; then
  log "Querying Storage API…"
  python3 - <<'PY' "$API_URL" "$SERVICE_ROLE" "$DEST" "$SKIP_STORAGE_DOWNLOAD" "${KNOWN_BUCKETS[@]}"
import json, os, sys, urllib.request, urllib.error

api_url, service_key, dest, skip_dl = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] == "1"
fallback_buckets = sys.argv[5:]

def req(method, path, data=None):
    url = api_url.rstrip("/") + path
    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/json",
    }
    body = None if data is None else json.dumps(data).encode()
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=120) as resp:
        return json.loads(resp.read().decode() or "null")

# List buckets
try:
    buckets = req("GET", "/storage/v1/bucket")
except Exception as e:
    print(f"WARN: bucket list failed ({e}); falling back to known names", file=sys.stderr)
    buckets = [{"id": b, "name": b} for b in fallback_buckets]

bucket_names = []
inventory = {"buckets": [], "objects": []}

def list_prefix(bucket: str, prefix: str):
    """Recursively list objects under prefix."""
    offset = 0
    while True:
        try:
            page = req(
                "POST",
                f"/storage/v1/object/list/{bucket}",
                {"prefix": prefix, "limit": 1000, "offset": offset},
            ) or []
        except Exception as e:
            print(f"WARN: list objects in {bucket}/{prefix}: {e}", file=sys.stderr)
            return
        if not page:
            return
        for obj in page:
            obj_name = obj.get("name")
            if not obj_name:
                continue
            rel = f"{prefix}{obj_name}" if prefix else obj_name
            # Folders typically have no metadata / id
            is_folder = obj.get("metadata") is None and obj.get("id") is None
            if is_folder:
                nested = rel if rel.endswith("/") else rel + "/"
                list_prefix(bucket, nested)
                continue
            inventory["objects"].append({"bucket": bucket, "path": rel, "object": obj})
            if skip_dl:
                continue
            out_dir = os.path.join(dest, "storage", "objects", bucket)
            os.makedirs(out_dir, exist_ok=True)
            out_path = os.path.join(out_dir, rel.replace("/", "__"))
            try:
                from urllib.parse import quote

                url = f"{api_url.rstrip('/')}/storage/v1/object/{bucket}/{quote(rel, safe='/')}"
                headers = {"Authorization": f"Bearer {service_key}", "apikey": service_key}
                r = urllib.request.Request(url, headers=headers, method="GET")
                with urllib.request.urlopen(r, timeout=300) as resp, open(out_path, "wb") as f:
                    f.write(resp.read())
                print(f"  downloaded {bucket}/{rel}")
            except Exception as e:
                print(f"WARN: download {bucket}/{rel}: {e}", file=sys.stderr)
        if len(page) < 1000:
            return
        offset += 1000

for b in buckets or []:
    name = b.get("name") or b.get("id")
    if not name:
        continue
    bucket_names.append(name)
    inventory["buckets"].append(b)
    list_prefix(name, "")

with open(os.path.join(dest, "storage", "buckets.txt"), "w") as f:
    f.write("\n".join(bucket_names) + ("\n" if bucket_names else ""))
with open(os.path.join(dest, "storage", "inventory.json"), "w") as f:
    json.dump(inventory, f, indent=2)
print(f"Storage buckets: {len(bucket_names)}; objects recorded: {len(inventory['objects'])}")
PY
else
  log "SUPABASE_SERVICE_ROLE_KEY not set — skipping Storage API; writing known bucket list."
  printf '%s\n' "${KNOWN_BUCKETS[@]}" > "$DEST/storage/buckets.txt"
  echo '{"note":"Set SUPABASE_SERVICE_ROLE_KEY to inventory/download objects","buckets":[]}' \
    > "$DEST/storage/inventory.json"
  echo "WARN: storage objects not downloaded (no service role key)" | tee -a "$DEST/meta/warnings.txt"
fi

# ---------------------------------------------------------------------------
# 7. Manifest + checksums
# ---------------------------------------------------------------------------
log "Writing manifest…"
{
  echo "keytrain_supabase_backup_version=1"
  echo "timestamp_utc=${TIMESTAMP}"
  echo "project_ref=${PROJECT_REF}"
  echo "api_url=${API_URL}"
  echo "hostname=$(hostname 2>/dev/null || echo unknown)"
  echo "git_commit=$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
  echo "git_branch=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  echo "includes_public_schema=$( [[ -s $DEST/schema/public.sql ]] && echo yes || echo no )"
  echo "includes_public_data=$( [[ -s $DEST/data/public_data.sql ]] && echo yes || echo no )"
  echo "includes_auth_data=$( [[ -s $DEST/auth/auth_data.sql ]] && echo yes || echo no )"
  echo "includes_storage_download=$( [[ "$SKIP_STORAGE_DOWNLOAD" -eq 0 && -n "$SERVICE_ROLE" ]] && echo yes || echo no )"
} > "$DEST/MANIFEST.txt"

(
  cd "$DEST"
  find . -type f ! -name 'SHA256SUMS' -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
) 2>/dev/null || true

cat > "$DEST/README.txt" <<EOF
KeyTrain Supabase backup — ${TIMESTAMP}
Project: ${PROJECT_REF}

Contents:
  schema/     DDL for public (+ storage) and roles
  data/       COPY/INSERT data for public schema (courses, modules, phishing, …)
  auth/       Auth schema + user data (restore passwords/sessions carefully)
  storage/    Bucket list, inventory.json, optional object files
  functions/  Edge Function source snapshot from this git checkout
  migrations/ SQL migration files from this git checkout
  meta/       config.toml, secret *names*, warnings

Restore: see supabase/backups/RESTORE.md in the repo (or this tree if copied).

Secrets: values are NOT in this backup — restore from password manager / CI secrets.
EOF

# ---------------------------------------------------------------------------
# 8. Archive
# ---------------------------------------------------------------------------
ARCHIVE="${BACKUP_ROOT}/keytrain-supabase-${PROJECT_REF}-${TIMESTAMP}.tar.gz"
log "Creating archive: $ARCHIVE"
tar -C "$BACKUP_ROOT" -czf "$ARCHIVE" "$TIMESTAMP"
(
  cd "$BACKUP_ROOT"
  sha256sum "$(basename "$ARCHIVE")" > "$(basename "$ARCHIVE").sha256"
)

# Prune old timestamp dirs / archives (keep newest KEEP_COUNT)
log "Pruning old backups (keep ${KEEP_COUNT} newest)…"
while IFS= read -r d; do
  [[ -n "$d" ]] || continue
  log "Removing old backup dir: $d"
  rm -rf "$d"
done < <(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20*' 2>/dev/null | sort -r | tail -n +"$((KEEP_COUNT + 1))" || true)

while IFS= read -r a; do
  [[ -n "$a" ]] || continue
  log "Removing old archive: $a"
  rm -f "$a" "${a}.sha256"
done < <(find "$BACKUP_ROOT" -maxdepth 1 -type f -name 'keytrain-supabase-*.tar.gz' 2>/dev/null | sort -r | tail -n +"$((KEEP_COUNT + 1))" || true)

SIZE="$(du -sh "$DEST" | awk '{print $1}')"
ARCH_SIZE="$(du -sh "$ARCHIVE" | awk '{print $1}')"
log "Done. Folder ${SIZE}; archive ${ARCH_SIZE}"
log "Path: $DEST"
log "Archive: $ARCHIVE"
if [[ -f "$DEST/meta/warnings.txt" ]]; then
  log "Warnings were recorded in meta/warnings.txt"
fi
