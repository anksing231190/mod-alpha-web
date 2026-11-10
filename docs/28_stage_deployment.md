# 28 · Stage hosting — complete step-by-step guide

This is the exact path used to bring up **stage** for Mod Alpha, in order, including the problems hit on the way
and how they were solved. Follow it top to bottom for a new stage server; each step says what you should see.

**What stage is:** one Linux server running Docker with five containers — PostgreSQL (`db`), the API (`api`), the
background-jobs worker (`jobs`), the website (`web`, nginx) and Caddy (`caddy`, automatic HTTPS).
Files: `infra/stage/` — `docker-compose.yml`, `Caddyfile` (domain mode), `Caddyfile.temp` (temporary mode),
`deploy.sh`, `backup.sh`, `env.stage.example`. Images are built by GitHub Actions on every push to `main`
(`.github/workflows/deploy.yml`) and stored in GitHub Container Registry (`ghcr.io/anksing231190/mod-alpha-api`,
`…/mod-alpha-web`).

**Current stage values**

| Item | Value |
|---|---|
| Code repository | https://github.com/anksing231190/mod-alpha-web (`main`) — old prototype kept on branch `prototype-archive` |
| AWS account / plan | "Ctrl Shift Create", project "Mod Alpha", **Free plan** ($100 credits, 6 months) |
| Region | **Asia Pacific (Sydney) `ap-southeast-2`** — the Free plan locks the project to one region (see Step 1, problem A) |
| Server | EC2 `modalpha-stage`, **t3.small** (2 vCPU, 2 GB), Ubuntu 24.04, 30 GB gp3 |
| Elastic IP | **52.65.52.22** |
| Address (live) | **https://stage.modalpha.in** (website) and **https://api.stage.modalpha.in** (API) — HTTPS by Let's Encrypt via Caddy, renewed automatically |
| Address (used while the domain was on hold) | https://52-65-52-22.sslip.io — retired after Step 13 |

---

## Step 1 — AWS account and region
1. Sign in at https://console.aws.amazon.com.
2. Secure the account: account name (top right) → **Security credentials** → **Assign MFA device** (authenticator app).
3. Cost guard: search **Budgets** → **Create budget** → *Monthly cost budget* → ₹5,000 with an email alert.
4. Open EC2 directly in a region with a link (the Console Home and billing pages are global and show **no region
   selector** — that is normal):
   - Mumbai: `https://ap-south-1.console.aws.amazon.com/ec2/home?region=ap-south-1`
   - Sydney: `https://ap-southeast-2.console.aws.amazon.com/ec2/home?region=ap-southeast-2`

**Problem A — "Region Asia Pacific (Mumbai) unavailable".** On the AWS **Free plan** a project is locked to one
region (ours was assigned Sydney). Options: (1) stay free and use Sydney for stage — chosen, stage holds only test
data; (2) **Activate advanced features** (paid plan; credits still apply) to use Mumbai; (3) create a new project and
see whether Mumbai is offered. **Production must run in Mumbai** (Indian data residency) — upgrade before prod.

## Step 2 — Key pair (login key)
EC2 → **Network & Security → Key Pairs → Create key pair**: name `modalpha-stage`, type **ED25519**, format **.pem**
(Windows PowerShell / Mac / Linux) or **.ppk** (PuTTY). The file downloads once — store it safely.

## Step 3 — Launch the server
EC2 → **Instances → Launch instances**:

| Field | Value |
|---|---|
| Name | `modalpha-stage` |
| Image | **Ubuntu Server 24.04 LTS (HVM), SSD**, 64-bit (x86) — "Free tier eligible" (26.04 is offered first; 24.04 is the tested one) |
| Instance type | **t3.small** (default is t3.micro, 1 GB — too small for db + api + jobs + web) |
| Key pair | `modalpha-stage` |
| Network settings → **Edit** | Auto-assign public IP **Enable**; **Create security group** `modalpha-stage-sg` |
| Inbound rules | SSH 22 — Source **My IP**; HTTP 80 — **Anywhere**; HTTPS 443 — **Anywhere** |
| Storage | **30 GiB gp3** (default 8; 30 is within the free tier) |

**Launch instance** → **Instances** → wait for **Running** and **2/2 checks passed**.

## Step 4 — Elastic IP (permanent address)
The auto-assigned IP (was `13.239.86.49`) changes on stop/start. EC2 → **Network & Security → Elastic IPs →
Allocate Elastic IP address → Allocate** → select it → **Actions → Associate Elastic IP address** → Instance
`modalpha-stage` → **Associate**. Result: **52.65.52.22**. Use only this IP from now on.

## Step 5 — Log in from Windows (PowerShell)
```powershell
cd $HOME\Downloads
icacls .\modalpha-stage.pem /inheritance:r
icacls .\modalpha-stage.pem /grant:r "$($env:USERNAME):(R)"
ssh -i .\modalpha-stage.pem ubuntu@52.65.52.22
```
Answer `yes` to the fingerprint question; the prompt becomes `ubuntu@ip-172-31-43-102:~$`.
*Connection timed out* → your internet IP changed: EC2 → Security Groups → `modalpha-stage-sg` → Edit inbound rules →
SSH → Source **My IP** → Save.

## Step 6 — Docker and swap (on the server)
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
exit
```
Log in again (Step 5, last line), then `docker run --rm hello-world` → **"Hello from Docker!"**.

## Step 7 — Domain DNS (GoDaddy)
GoDaddy → **My Products → modalpha.in → DNS → DNS Records → Add New Record**, twice:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `stage` | 52.65.52.22 | 600 seconds |
| A | `api.stage` | 52.65.52.22 | 600 seconds |

Do not change the `@` (Parked), `www`, NS records, Forwarding or Nameservers. Check:
`nslookup stage.modalpha.in 8.8.8.8` and `nslookup api.stage.modalpha.in 8.8.8.8` → 52.65.52.22.

**Problem B — no "Add New Record" button; banner "This domain has been placed on a status hold".** The registrant
(WHOIS) verification was not completed, so GoDaddy locked DNS and the domain stops resolving. Fix: complete the
verification email (check spam) or call GoDaddy (040-49187600) to verify the registrant details
(**Registration Settings → Contact information**); for `.in` domains they may ask for ID / company documents. After
the hold is lifted the button appears. **Until then, stage runs on the temporary address (Step 9, temporary mode).**

## Step 8 — GitHub
1. **Code:** https://github.com/anksing231190/mod-alpha-web, branch `main` (CI and Deploy run on every push).
2. **Environment:** repo → **Settings → Environments → New environment** `stage` → **Environment variables → Add variable**:
   - `WEB_API_BASE_URL` = `https://52-65-52-22.sslip.io` (temporary) — later `https://api.stage.modalpha.in`.

   The website image has this address built in, so after setting or changing it run **Actions → Deploy → Run
   workflow → stage** and wait for the green tick.
3. **Token for the server:** profile photo → **Settings → Developer settings → Personal access tokens → Tokens
   (classic) → Generate new token (classic)**: note `modalpha-stage-server`, expiry 90 days, scopes **repo** and
   **read:packages**. Copy the `ghp_…` token (shown once; never paste it in chat or commit it).
4. *(Later, optional)* automatic roll-out on push: variables `STAGE_SSH_HOST`, `STAGE_SSH_USER` and secret
   `STAGE_SSH_KEY` in the `stage` environment. This needs SSH reachable from GitHub's runners, so it is off for now;
   deploys are run on the server with `./deploy.sh`.

## Step 9 — Prepare the server
```bash
git clone --depth 1 https://<TOKEN>@github.com/anksing231190/mod-alpha-web.git ~/mod-alpha-web
mkdir -p ~/modalpha-stage/seed && cp ~/mod-alpha-web/infra/stage/* ~/modalpha-stage/ \
  && cp ~/mod-alpha-web/web/data/mod-alpha-test-data.xlsx ~/modalpha-stage/seed/ && cd ~/modalpha-stage && ls
cp env.stage.example .env.stage && chmod 600 .env.stage
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|; s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 48)|" .env.stage
echo <TOKEN> | docker login ghcr.io -u anksing231190 --password-stdin     # → Login Succeeded
nano .env.stage
```
In `.env.stage` set (Ctrl+O, Enter, Ctrl+X to save and exit):

**Temporary mode (now — domain on hold):**
```
CADDYFILE=Caddyfile.temp
STAGE_HOST=52-65-52-22.sslip.io
WEB_API_BASE_URL=https://52-65-52-22.sslip.io
PUBLIC_APP_URL=https://52-65-52-22.sslip.io
API_PUBLIC_URL=https://52-65-52-22.sslip.io
CORS_ORIGINS=https://52-65-52-22.sslip.io
COOKIE_DOMAIN=
ADMIN_BOOTSTRAP_EMAIL=<your email>
ADMIN_BOOTSTRAP_PASSWORD=<strong password, 12+ characters>
ADMIN_BOOTSTRAP_MOBILE=+91XXXXXXXXXX
```
**Domain mode (after Step 7 works):**
```
CADDYFILE=
STAGE_HOST=
WEB_API_BASE_URL=https://api.stage.modalpha.in
PUBLIC_APP_URL=https://stage.modalpha.in
API_PUBLIC_URL=https://api.stage.modalpha.in
CORS_ORIGINS=https://stage.modalpha.in
COOKIE_DOMAIN=.stage.modalpha.in
```
Rules for this file: one `KEY=value` per line, **no comments after a value** (Docker would keep them as part of the
value), never commit it.

**Security:** the `ghp_…` token gives read access to the code. Never show it in a screenshot or chat. If it is exposed,
delete it (GitHub → Settings → Developer settings → Tokens (classic)), create a new one, run the `docker login` line
again with it, and run `cd ~/mod-alpha-web && git remote set-url origin https://github.com/anksing231190/mod-alpha-web.git`
so the old token is not kept in git's settings.

## Step 10 — First deploy
```bash
cd ~/modalpha-stage
./deploy.sh                       # pulls images, starts all containers, waits for the API → "✓ stage is up"
docker compose --env-file .env.stage exec api node dist/cli/seed.js --workbook=/seed/mod-alpha-test-data.xlsx
```
The seed loads funds, 10 years of NAV, SIP dates and holidays — **no users or subscribers** (those come only from
sign-ups or a backup restore, docs/27).

**Test accounts (optional, stage only — refused in prod).** One account per situation the website shows; all
use the password `Demo@12345`. Payments, KYC, email and SMS stay on the mock providers.
```bash
docker compose --env-file .env.stage exec api node dist/cli/seed.js --demo-accounts
```
| Email | What you see |
|---|---|
| demo.free@modalpha.test | Free plan, KYC not started (checkout asks for KYC first) |
| demo.pro@modalpha.test | Pro active, renews in 20 days; Help → My requests has one answered and one in-progress request |
| demo.pastdue@modalpha.test | Renewal payment failed 3 days ago: red banner, features kept until the grace period ends (7 days) |
| demo.cancelling@modalpha.test | Premium cancelled, ends in 9 days: "Keep my plan" banner |
| demo.unverified@modalpha.test | Email not verified: yellow banner with "Resend link" (the link lands in Admin → Notifications → Mock outbox) |

Running the command again resets these accounts to the states above.

**Checkout on stage** opens Mod Alpha's checkout screens with a *Test mode* strip: pick Success, Failure or Pending
(Pending → "Check status" completes it). Test card 4111 1111 1111 1111 · 12/30 · 123, test UPI ID success@razorpay.

**Maintenance mode.** Set `MAINTENANCE_MODE=true` (and optionally `MAINTENANCE_UNTIL=10:30 PM IST`) in `.env.stage`
and run `./deploy.sh`: every page shows "Down for maintenance" and checks again each minute. Set it back to
`false` and deploy to reopen. `/health` and `/ready` keep answering.

**Problem C — `./.env.stage: line 43: Alpha: command not found`.** Older `deploy.sh` / `backup.sh` loaded
`.env.stage` as a shell script, so a value with spaces (`INVOICE_SELLER_NAME=Mod Alpha Ventures LLP`) broke it.
Fixed in git: the scripts now let Docker Compose read the file. On a server with the old scripts:
`sed -i '/^set -a; \. \.\/\.env\.stage; set +a$/d' deploy.sh backup.sh` and run `./deploy.sh` again.

**Problem D — login says "Failed to fetch"; `/config/env.js` shows `https://api.stage.modalpha.in`.** The website
was built with the default API address (the GitHub variable did not reach the build — it showed as
`--build-arg WEB_API_BASE_URL=""` in the Deploy log, which happens when it is saved as a *secret* or under another
name). Fixed for good: the website container now reads **`WEB_API_BASE_URL` from `.env.stage` when it starts**
(`infra/web-runtime-config.sh`), so no rebuild is needed to change the address. The GitHub variable is optional.

**Problem E — signs in, then immediately "Your session has ended"; API log shows 401 on every call and on
`/auth/refresh`.** `.env.stage` still had `COOKIE_DOMAIN=.stage.modalpha.in` while running on the sslip.io address,
so the browser rejected the sign-in cookies. Fix: `sed -i 's|^COOKIE_DOMAIN=.*|COOKIE_DOMAIN=|' .env.stage && ./deploy.sh`.
Since this release the API also ignores a `COOKIE_DOMAIN` that does not match `API_PUBLIC_URL` (with a warning in
the log), so this cannot break sign-in again.

Check:
- `https://52-65-52-22.sslip.io/config/env.js` → `"API_BASE_URL":"https://52-65-52-22.sslip.io"`
- `https://52-65-52-22.sslip.io/api/v1/plans` → JSON with the plans
- `https://52-65-52-22.sslip.io` → the website (the first visit can take ~30 s while Caddy obtains the certificate)
- **Login** with the bootstrap admin → enter the two codes shown on screen (email and SMS are mocked on stage) →
  Admin console. Then change the password, delete `ADMIN_BOOTSTRAP_PASSWORD` from `.env.stage`, run `./deploy.sh`,
  and add other admins in **Admin → Users → Add admin**.

## Step 11 — Nightly backups
```bash
crontab -e
30 21 * * * ~/modalpha-stage/backup.sh >> ~/modalpha-stage/backup.log 2>&1
```
03:00 IST nightly, 14 days kept in `~/modalpha-stage/backups`; also copied to S3 when `BACKUP_S3_URI` is set and the
aws CLI is installed. Restore: docs/27.

## Step 12 — Day-to-day
| Task | How |
|---|---|
| Release | push / merge to `main` → wait for **Deploy** ✓ → on the server `cd ~/modalpha-stage && ./deploy.sh` |
| Roll back | `./deploy.sh <older-git-sha>` (every commit's images are kept in GHCR) |
| Logs | `docker compose --env-file .env.stage logs -f --tail=100 api` (or `jobs`, `web`, `caddy`, `db`) |
| Status | `docker compose --env-file .env.stage ps` |
| Change a setting | edit `.env.stage` → `./deploy.sh` |
| Update stage files after they change in git | `cd ~/mod-alpha-web && git pull && cp infra/stage/{docker-compose.yml,Caddyfile,Caddyfile.temp,deploy.sh,backup.sh} ~/modalpha-stage/` |
| Pause costs | EC2 → Instance state → **Stop** (disk + IP still billed; do not Terminate) |

## Step 13 — Switch from the temporary address to stage.modalpha.in (done)
1. Domain hold lifted and both A records resolve to 52.65.52.22 (Step 7).
2. (Address now comes from `.env.stage`; the GitHub variable is optional.)
3. `.env.stage` → the **domain mode** block (Step 9) → `./deploy.sh`. Caddy fetches certificates for both names.
4. Everyone signs in again (cookies are per address). Data needs no copying — same server, same database.
5. Check: `docker compose --env-file .env.stage logs --tail=20 caddy | grep -iE "certificate obtained|error"` shows
   **certificate obtained successfully** for both names. A warning *"no OCSP stapling … no OCSP server specified"* is
   harmless (Let's Encrypt no longer runs OCSP).

## Smoke test after each deploy
Sign up (email and mobile) · Login rejects unknown numbers · KYC with a test PAN · mock payment → Pro → best SIP
date unlocks → GST invoice PDF · Admin: publish a SIP date, add an Instagram reel, view the audit log · inactivity
sign-out notice · phone layout.

## Notes
- All outside providers (payments, KYC, email, SMS, …) stay **mock** on stage until sandbox keys arrive (docs/23);
  switch one at a time in `.env.stage` → `./deploy.sh`.
- Run exactly **one** `jobs` container (two would send every reminder twice).
- Production does **not** use this single-server setup: Mumbai region, managed database (RDS) and managed containers
  (TODO §4).
