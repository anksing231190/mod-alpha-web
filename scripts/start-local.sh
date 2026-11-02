#!/usr/bin/env bash
# =============================================================================
#  Mod Alpha — start everything locally (macOS / Linux)
#
#    ./scripts/start-local.sh            start (first run sets everything up)
#    ./scripts/start-local.sh --reset    back up, then wipe the local database and reload reference data
#    ./scripts/start-local.sh --no-open  don't open the browser
#    ./scripts/start-local.sh --jobs     also run the background-jobs worker
#
#  Press Ctrl+C to stop. Logs: var/logs/{api,web,jobs}.log
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

RESET=0; OPEN=1; JOBS=0
for a in "$@"; do case "$a" in
  --reset) RESET=1 ;; --no-open) OPEN=0 ;; --jobs) JOBS=1 ;;
  -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
  *) echo "Unknown option: $a"; exit 1 ;;
esac; done

B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; N=$'\033[0m'
step() { echo; echo "${B}▶ $*${N}"; }
ok()   { echo "  ${G}✓${N} $*"; }
warn() { echo "  ${Y}!${N} $*"; }
die()  { echo "  ${R}✗ $*${N}"; exit 1; }

# ---------------------------------------------------------------- 1. Node.js
step "Checking Node.js"
command -v node >/dev/null || die "Node.js is not installed. Install Node 22 from https://nodejs.org (or: brew install node@22)"
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 20 ] || die "Node $NODE_MAJOR found — Node 20 or newer is required (22 recommended)"
ok "Node $(node -v)"

# ---------------------------------------------------------------- 2. settings file
step "Local settings (.env.local)"
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  # Homebrew / Postgres.app use your login name with no password
  sed -i.bak "s#^DATABASE_URL=.*#DATABASE_URL=postgres://${USER}@localhost:5432/modalpha#" .env.local && rm -f .env.local.bak
  ok "created .env.local (database user: ${USER})"
else
  ok ".env.local exists"
  if ! grep -q "^ADMIN_BOOTSTRAP_MOBILE=" .env.local; then echo "ADMIN_BOOTSTRAP_MOBILE=+919900000001" >> .env.local; ok "added ADMIN_BOOTSTRAP_MOBILE (admins confirm an SMS code at sign-in)"; fi
fi
set -a; . ./.env.local; set +a
API_PORT="${PORT:-8080}"; WEB_PORT=8081

# ---------------------------------------------------------------- 3. dependencies
step "Installing dependencies"
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules ]; then
  npm ci --no-audit --no-fund --loglevel=error && touch node_modules
  ok "installed"
else
  ok "already installed"
fi

# ---------------------------------------------------------------- 4. PostgreSQL
step "Checking PostgreSQL"
if node scripts/local/db.mjs check; then
  ok "PostgreSQL is running"
else
  if command -v brew >/dev/null; then
    FORMULA=$(brew list --formula 2>/dev/null | grep -E '^postgresql(@[0-9]+)?$' | tail -1 || true)
    if [ -z "$FORMULA" ]; then
      warn "PostgreSQL is not installed."
      read -r -p "  Install PostgreSQL 16 with Homebrew now? [Y/n] " ans
      [[ "${ans:-Y}" =~ ^[Yy]$ ]] || die "PostgreSQL is required. See RUN_LOCALLY.md"
      brew install postgresql@16; FORMULA=postgresql@16
    fi
    echo "  starting $FORMULA …"
    brew services start "$FORMULA" >/dev/null
    BIN="$(brew --prefix "$FORMULA")/bin"; export PATH="$BIN:$PATH"
  elif [ -d "/Applications/Postgres.app" ]; then
    open -a Postgres; echo "  opened Postgres.app — click Initialize/Start if asked"
  else
    die "PostgreSQL is not running. Start it (e.g. 'sudo service postgresql start') or install it — see RUN_LOCALLY.md"
  fi
  for i in $(seq 1 30); do node scripts/local/db.mjs check && break; sleep 1; done
  if ! node scripts/local/db.mjs check; then
    SUGGEST="postgres://${USER}@localhost:5432/modalpha"
    if [ "$DATABASE_URL" != "$SUGGEST" ]; then
      warn "Could not connect with DATABASE_URL=$DATABASE_URL"
      read -r -p "  Switch .env.local to $SUGGEST (your Mac user, no password)? [Y/n] " ans
      if [[ "${ans:-Y}" =~ ^[Yy]$ ]]; then
        sed -i.bak "s#^DATABASE_URL=.*#DATABASE_URL=${SUGGEST}#" .env.local && rm -f .env.local.bak
        export DATABASE_URL="$SUGGEST"
      fi
    fi
    node scripts/local/db.mjs check || die "Could not connect to PostgreSQL using DATABASE_URL in .env.local ($DATABASE_URL). Check the user name and port."
  fi
  ok "PostgreSQL is running"
fi

# ---------------------------------------------------------------- 5. database + data
step "Database"
if [ "$RESET" = 1 ]; then
  # keep a copy first: users and subscribers are never re-created from test data (restore: npm run db:restore -- latest)
  if node scripts/local/db.mjs seeded && command -v pg_dump >/dev/null; then bash scripts/db/backup.sh --label before-reset >/dev/null && ok "backup saved in var/backups (restore: npm run db:restore -- latest)"; fi
  node scripts/local/db.mjs reset
fi
node scripts/local/db.mjs ensure || die "Could not create the database"
if node scripts/local/db.mjs seeded; then
  npm run --silent seed >/dev/null            # applies new migrations, keeps data
  ok "database ready (existing data kept)"
else
  echo "  loading reference data (funds, 10 years of NAV, SIP dates, holidays; no users or subscribers) — about 30 seconds…"
  npm run --silent seed:test >/dev/null
  ok "reference data loaded — users and subscribers come from sign-ups, or from a backup (npm run db:restore)"
fi

# ---------------------------------------------------------------- 6. ports
port_busy() { (command -v lsof >/dev/null && lsof -iTCP:"$1" -sTCP:LISTEN -t >/dev/null 2>&1) || (echo >/dev/tcp/127.0.0.1/"$1") >/dev/null 2>&1; }
for p in "$API_PORT" "$WEB_PORT"; do
  if port_busy "$p"; then die "Port $p is already in use. Stop the other program (lsof -i :$p) or an earlier Mod Alpha run."; fi
done

# ---------------------------------------------------------------- 7. start
step "Starting Mod Alpha"
mkdir -p var/logs
PIDS=()
kill_tree() { local c; for c in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$c"; done; kill "$1" 2>/dev/null || true; }
STOPPED=0
cleanup() { [ "$STOPPED" = 1 ] && return; STOPPED=1; echo; echo "Stopping…"; for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill_tree "$p"; done; sleep 1; echo "Stopped."; }
trap cleanup INT TERM EXIT

npm run --silent dev:api > var/logs/api.log 2>&1 & PIDS+=($!)
npm run --silent dev:web > var/logs/web.log 2>&1 & PIDS+=($!)
if [ "$JOBS" = 1 ]; then npm run --silent jobs > var/logs/jobs.log 2>&1 & PIDS+=($!); fi

for i in $(seq 1 60); do curl -fs "http://localhost:$API_PORT/health" >/dev/null 2>&1 && break; sleep 1; done
curl -fs "http://localhost:$API_PORT/health" >/dev/null || { tail -20 var/logs/api.log; die "API did not start — see var/logs/api.log"; }
ok "API      http://localhost:$API_PORT"
for i in $(seq 1 30); do curl -fs "http://localhost:$WEB_PORT/" >/dev/null 2>&1 && break; sleep 1; done
curl -fs "http://localhost:$WEB_PORT/" >/dev/null || { tail -20 var/logs/web.log; die "Website did not start — see var/logs/web.log"; }
ok "Website  http://localhost:$WEB_PORT"
[ "$JOBS" = 1 ] && ok "Jobs worker running"

cat <<MSG

  ${B}Mod Alpha is running → http://localhost:$WEB_PORT${N}

  Admin login   ${ADMIN_BOOTSTRAP_EMAIL:-admin@modalpha.local} / ${ADMIN_BOOTSTRAP_PASSWORD:-Admin-password-123}
  New user      click "Get Started" and sign up with any email
  Mock emails   Admin → Notifications → Mock outbox
  Logs          var/logs/

  Press ${B}Ctrl+C${N} to stop.
MSG

if [ "$OPEN" = 1 ]; then (command -v open >/dev/null && open "http://localhost:$WEB_PORT") || (command -v xdg-open >/dev/null && xdg-open "http://localhost:$WEB_PORT" >/dev/null 2>&1) || true; fi

# keep running until Ctrl+C or a process exits
while true; do
  for p in "${PIDS[@]}"; do kill -0 "$p" 2>/dev/null || { echo "${R}A process stopped unexpectedly — see var/logs/.${N}"; exit 1; }; done
  sleep 2
done
