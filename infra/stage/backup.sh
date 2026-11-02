#!/usr/bin/env bash
# Nightly stage database backup (cron: 30 21 * * * = 03:00 IST). Keeps 14 days locally; also copies to S3
# when BACKUP_S3_URI is set in .env.stage and the aws CLI is installed. Restore: see docs/27.
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env.stage; set +a
mkdir -p backups && chmod 700 backups
F="backups/modalpha-stage-$(date +%Y%m%d-%H%M%S).dump"
docker compose --env-file .env.stage exec -T db pg_dump -U modalpha --format=custom --compress=9 modalpha > "$F"
chmod 600 "$F"
[ -n "${BACKUP_S3_URI:-}" ] && command -v aws >/dev/null && aws s3 cp "$F" "${BACKUP_S3_URI%/}/" --sse aws:kms --only-show-errors || true
ls -1t backups/*.dump | tail -n +15 | xargs -r rm -f
echo "✓ $F"
