# 28 · Stage deployment (step by step)

Stage = **https://stage.modalpha.in** (website) + **https://api.stage.modalpha.in** (API), on one server in
AWS Mumbai running Docker: PostgreSQL, API, jobs worker, website and Caddy (automatic HTTPS).
Every push to `main` builds new images in GitHub Actions and rolls them out to the server.
Files: `infra/stage/` (docker-compose.yml, Caddyfile, deploy.sh, backup.sh, env.stage.example).

## 0. What you need
- GitHub access for this session/your machine (to push the code) and admin rights on the repository.
- An AWS account (or any VPS provider with an Indian region).
- DNS access for `modalpha.in`.
- 30–45 minutes.

## 1. Server (AWS EC2, Mumbai)
1. EC2 → Launch instance, region **ap-south-1 (Mumbai)**: Ubuntu 24.04 LTS, **t3.medium** (2 vCPU, 4 GB), 40 GB gp3 disk.
2. Security group: inbound **22** (your office IP only), **80** and **443** (anywhere).
3. Allocate an **Elastic IP** and attach it to the instance.
4. SSH in and install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker ubuntu && newgrp docker
   ```

## 2. DNS
Two **A records** → the Elastic IP: `stage.modalpha.in` and `api.stage.modalpha.in`. Wait until `dig +short stage.modalpha.in` shows the IP (Caddy needs this to get certificates).

## 3. GitHub
1. Push the code and merge the work branch into `main` (stage deploys from `main`).
2. Settings → Environments → **New environment: `stage`**:
   - Variables: `WEB_API_BASE_URL` = `https://api.stage.modalpha.in`, `STAGE_SSH_HOST` = the Elastic IP, `STAGE_SSH_USER` = `ubuntu`
   - Secret: `STAGE_SSH_KEY` = a private key whose public key is in the server's `~/.ssh/authorized_keys` (make a separate deploy key: `ssh-keygen -t ed25519 -f modalpha-deploy`)
3. A **personal access token (classic)** with only `read:packages`, for the server to pull the images.

## 4. Prepare the server (once)
```bash
mkdir -p ~/modalpha-stage/seed && cd ~/modalpha-stage
# copy infra/stage/* from the repo here (scp, or git clone and copy)
cp env.stage.example .env.stage && chmod 600 .env.stage
nano .env.stage          # fill POSTGRES_PASSWORD, JWT_SECRET, ADMIN_BOOTSTRAP_* (see the comments)
echo <TOKEN> | docker login ghcr.io -u <github-user> --password-stdin
# reference data workbook (funds, NAV, SIP dates — no users):
#   copy apps/web/data/mod-alpha-test-data.xlsx to ~/modalpha-stage/seed/
```
Random values: `openssl rand -base64 32` (database password), `openssl rand -base64 48` (JWT secret).

## 5. First deploy
1. Push to `main` (or GitHub → Actions → **Deploy** → Run workflow → `stage`). The workflow builds `mod-alpha-api` and `mod-alpha-web`, pushes them to GHCR and runs `./deploy.sh <sha>` on the server over SSH.
   Without the SSH settings, run it yourself on the server: `./deploy.sh`.
2. Load the reference data once:
   ```bash
   docker compose --env-file .env.stage exec api node dist/cli/seed.js --workbook=/seed/mod-alpha-test-data.xlsx
   ```
3. Check: `https://api.stage.modalpha.in/health` → `{"ok":true,"env":"stage"}`, and open `https://stage.modalpha.in`.
4. Sign in as the bootstrap admin. While email/SMS are mocked, the two sign-in codes are shown on screen.
   Then change the password and remove `ADMIN_BOOTSTRAP_PASSWORD` from `.env.stage`; add more admins from Admin → Users → Add admin.

## 6. Backups
```bash
crontab -e
# 03:00 IST every night:
30 21 * * * ~/modalpha-stage/backup.sh >> ~/modalpha-stage/backup.log 2>&1
```
Keeps 14 days in `~/modalpha-stage/backups`; also uploads to S3 if `BACKUP_S3_URI` is set and the aws CLI is installed. Restore: docs/27.

## 7. Every next release
- Merge to `main` → deployed automatically (about 5 minutes).
- Roll back: on the server `./deploy.sh <older-git-sha>` (images are kept per commit in GHCR).
- Logs: `docker compose --env-file .env.stage logs -f --tail=100 api` (or `jobs`, `web`, `caddy`).

## 8. Smoke test after each deploy
Sign up (email + mobile) · login-only rejects unknown numbers · KYC with a test PAN · mock payment → Pro → best date unlocks → GST invoice PDF · admin: publish a SIP date, add an Instagram reel, view audit log · inactivity sign-out notice · phone layout.

## Notes
- Stage keeps all providers on **mock** until vendor sandbox keys arrive (docs/23); switch one at a time in `.env.stage` and run `./deploy.sh`.
- Run exactly **one** `jobs` container (reminders would otherwise be sent twice).
- Prod will not use this single-server setup: it moves to RDS + ECS (or similar) per TODO §4.
