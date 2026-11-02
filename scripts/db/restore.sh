#!/usr/bin/env bash
# =============================================================================
#  Mod Alpha — restore the database from a backup made by db:backup (or an RDS/pg_dump custom-format dump)
#
#    npm run db:restore -- var/backups/modalpha-local-20261102-101500.dump
#    npm run db:restore -- latest              newest file in var/backups
#    ENV_FILE=.env.stage npm run db:restore -- <file>
#
#  What it does:
#    1. backs up the CURRENT database first (label "pre-restore"), so a restore can itself be undone
#    2. replaces every table with the backup's contents (pg_restore --clean)
#    3. runs the migrations, so a backup from an older version gets the newer columns
#  Refuses APP_ENV=prod unless --i-understand-this-replaces-prod is given. In prod, prefer the cloud's
#  point-in-time restore into a NEW database and switch over (see docs/27_backup_and_recovery.md).
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/../.."
FILE="${1:-}"; FORCE_PROD=0; YES=0
for a in "$@"; do case "$a" in --i-understand-this-replaces-prod) FORCE_PROD=1 ;; --yes) YES=1 ;; esac; done
[ -n "$FILE" ] || { sed -n '2,15p' "$0"; exit 1; }

ENV_FILE="${ENV_FILE:-.env.local}"
if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r k v; do
    [[ "$k" =~ ^[A-Z0-9_]+$ ]] || continue
    v="${v%%#*}"; v="$(echo "$v" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'\'']//' -e 's/["'\'']$//')"
    [ -z "${!k:-}" ] && export "$k=$v"
  done < <(grep -E '^[A-Z0-9_]+=' "$ENV_FILE")
fi
: "${DATABASE_URL:?DATABASE_URL is not set (looked in $ENV_FILE)}"
DIR="${BACKUP_DIR:-var/backups}"
if [ "$FILE" = "latest" ]; then FILE=$(ls -1t "$DIR"/*.dump 2>/dev/null | head -1 || true); [ -n "$FILE" ] || { echo "No backups in $DIR"; exit 1; }; fi
[ -f "$FILE" ] || { echo "Backup file not found: $FILE"; exit 1; }
if [ "${APP_ENV:-local}" = "prod" ] && [ "$FORCE_PROD" != 1 ]; then echo "Refusing to overwrite PROD. Use point-in-time restore (docs/27), or add --i-understand-this-replaces-prod."; exit 1; fi
pg_restore --list "$FILE" >/dev/null || { echo "Not a valid backup file: $FILE"; exit 1; }

echo "This replaces ALL data in ${DATABASE_URL%%\?*} (${APP_ENV:-local}) with $(basename "$FILE")."
if [ "$YES" != 1 ]; then read -r -p "Type RESTORE to continue: " ans; [ "$ans" = "RESTORE" ] || { echo "Cancelled."; exit 1; }; fi

echo "▶ 1/3 Safety backup of the current database"
bash scripts/db/backup.sh --label pre-restore >/dev/null && echo "  ✓ done (var/backups, label pre-restore)"
echo "▶ 2/3 Restoring"
pg_restore --clean --if-exists --no-owner --no-privileges --single-transaction --dbname="$DATABASE_URL" "$FILE"
echo "  ✓ data restored"
echo "▶ 3/3 Migrations"
npm run --silent migrate >/dev/null && echo "  ✓ schema up to date"
echo "Done. Restart the API so open sessions and caches start fresh."
