#!/usr/bin/env bash
# =============================================================================
#  Mod Alpha — database backup (all data: users, subscriptions, invoices, funds, NAV, settings, audit log)
#
#    npm run db:backup                     back up the database in .env.local
#    ENV_FILE=.env.stage npm run db:backup back up another environment
#    npm run db:backup -- --label before-upgrade
#
#  Writes a compressed PostgreSQL custom-format dump to var/backups/ (or BACKUP_DIR):
#    modalpha-<APP_ENV>-<YYYYMMDD-HHMMSS>[-label].dump
#  Keeps the newest BACKUP_KEEP files (default 14). If BACKUP_S3_URI is set (e.g. s3://modalpha-backups/stage)
#  and the aws CLI is installed, the file is also uploaded there (bucket in Mumbai, encrypted, versioned).
#  Needs pg_dump 16 (comes with PostgreSQL). Restore with: npm run db:restore -- <file>
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/../.."
LABEL=""
while [ $# -gt 0 ]; do case "$1" in --label) LABEL="-${2//[^a-zA-Z0-9_-]/}"; shift 2 ;; *) echo "Unknown option: $1"; exit 1 ;; esac; done

# settings: real environment variables win over the env file
ENV_FILE="${ENV_FILE:-.env.local}"
if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r k v; do
    [[ "$k" =~ ^[A-Z0-9_]+$ ]] || continue
    v="${v%%#*}"; v="$(echo "$v" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'\'']//' -e 's/["'\'']$//')"
    [ -z "${!k:-}" ] && export "$k=$v"
  done < <(grep -E '^[A-Z0-9_]+=' "$ENV_FILE")
fi
: "${DATABASE_URL:?DATABASE_URL is not set (looked in $ENV_FILE)}"
command -v pg_dump >/dev/null || { echo "pg_dump not found. Install PostgreSQL 16 client tools (brew install postgresql@16)."; exit 1; }

DIR="${BACKUP_DIR:-var/backups}"; KEEP="${BACKUP_KEEP:-14}"; mkdir -p "$DIR"; chmod 700 "$DIR"
FILE="$DIR/modalpha-${APP_ENV:-local}-$(date +%Y%m%d-%H%M%S)${LABEL}.dump"

echo "▶ Backing up ${DATABASE_URL%%\?*} → $FILE"
pg_dump --format=custom --compress=9 --no-owner --no-privileges --file="$FILE" "$DATABASE_URL"
chmod 600 "$FILE"
# a quick integrity check: the archive's table of contents must be readable
pg_restore --list "$FILE" >/dev/null
SIZE=$(du -h "$FILE" | cut -f1)
echo "  ✓ backup written ($SIZE)"

if [ -n "${BACKUP_S3_URI:-}" ]; then
  if command -v aws >/dev/null; then aws s3 cp "$FILE" "${BACKUP_S3_URI%/}/$(basename "$FILE")" --sse aws:kms --only-show-errors && echo "  ✓ uploaded to ${BACKUP_S3_URI%/}/"
  else echo "  ! BACKUP_S3_URI is set but the aws CLI is not installed — kept locally only"; fi
fi

# keep the newest $KEEP backups of this environment
ls -1t "$DIR"/modalpha-"${APP_ENV:-local}"-*.dump 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do rm -f "$old"; echo "  · removed old backup $(basename "$old")"; done
echo "$FILE"
