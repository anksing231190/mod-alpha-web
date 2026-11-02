#!/usr/bin/env bash
# Pull the newest stage images and restart. Run on the stage server from this folder:
#   ./deploy.sh            latest "stage" images
#   ./deploy.sh <git-sha>  a specific build (roll back = deploy an older sha)
set -euo pipefail
cd "$(dirname "$0")"
export TAG="${1:-stage}"
[ -f .env.stage ] || { echo "Missing .env.stage (see docs/28, step 9)"; exit 1; }
# .env.stage is read by Docker Compose (--env-file), never by the shell: values may contain spaces.
docker compose --env-file .env.stage pull api jobs web
docker compose --env-file .env.stage up -d --remove-orphans
docker image prune -f >/dev/null
echo "Waiting for the API…"
for i in $(seq 1 30); do
  if docker compose --env-file .env.stage exec -T api wget -qO- http://127.0.0.1:8080/ready >/dev/null 2>&1; then echo "✓ stage is up ($TAG)"; exit 0; fi
  sleep 2
done
echo "✗ API not ready — check: docker compose --env-file .env.stage logs --tail=100 api"; exit 1
