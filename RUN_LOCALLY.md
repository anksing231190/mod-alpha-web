# Run Mod Alpha on your computer

You get the website at **http://localhost:8081** and the API at **http://localhost:8080**. Everything external (payments, KYC, email, SMS) is mocked, so you need no vendor accounts.

Choose **one** of the two options.

---

## Option A — Docker (easiest; Windows, macOS or Linux)

**Install once:** [Docker Desktop](https://www.docker.com/products/docker-desktop/), then start it.

In a terminal, inside the unzipped `mod-alpha` folder:

1. Create your local settings file.
   ```bash
   cp .env.local.example .env.local
   ```
   On Windows PowerShell, use `copy .env.local.example .env.local` instead.

2. Build and start everything: database, API, background jobs and website. The first run takes a few minutes.
   ```bash
   docker compose -f infra/docker-compose.yml up --build -d
   ```

3. Load the test data (24 funds, 10 years of NAV, 12,568 test users). Run this once.
   ```bash
   docker compose -f infra/docker-compose.yml run --rm api node dist/cli/seed.js --workbook=/seed/mod-alpha-test-data.xlsx
   ```

4. Open **http://localhost:8081**.

To stop everything:
```bash
docker compose -f infra/docker-compose.yml down
```

To wipe the database and start over:
```bash
docker compose -f infra/docker-compose.yml down -v
```

---

## Option B — Without Docker (Node.js + PostgreSQL)

**Install once:** [Node.js 22](https://nodejs.org) and [PostgreSQL 16](https://www.postgresql.org/download/). On macOS you can use `brew install node@22 postgresql@16` and then `brew services start postgresql@16`.

1. Create the database.
   ```bash
   createdb modalpha
   ```

2. Create your local settings file.
   ```bash
   cp .env.local.example .env.local
   ```
   Open `.env.local` and set `DATABASE_URL` to your PostgreSQL user, for example `postgres://YOUR_MAC_USERNAME@localhost:5432/modalpha`.

3. Install the dependencies.
   ```bash
   npm ci
   ```

4. Create the tables and load the test data. Run this once.
   ```bash
   npm run seed:test
   ```

5. Start the API. Keep this terminal open.
   ```bash
   npm run dev:api
   ```

6. In a **second** terminal, start the website.
   ```bash
   npm run dev:web
   ```

7. Open **http://localhost:8081**.

The background-jobs worker (scheduled reminders, NAV import) is optional locally. To run it, use a third terminal:
```bash
npm run jobs
```

---

## Logging in

| Who | How |
|---|---|
| **Admin** | `admin@modalpha.local` / `Admin-password-123` (set in `.env.local` as `ADMIN_BOOTSTRAP_*`) |
| **New user** | Click **Get Started** and sign up with any email |
| **Mobile OTP** | Choose **Mobile** on the login page; the test OTP is shown under the field |
| **Google** | Click **Google** and type any email (mocked) |

## Testing mocked flows

- **Paid plan:** Subscription → Start Pro Plan → **Start KYC** → **Approve** → **Pay (test)**. An invoice appears under *Billing history*.
- **Emails and SMS** (password reset, OTP, reminders) are not sent. They appear in **Admin → Notifications → Mock outbox**.
- **Data upload:** Admin → Data Management. Upload `apps/web/data/mod-alpha-test-data.xlsx` or your own workbook (format: `docs/21_test_data_excel_format.md`).

## Troubleshooting

| Problem | Fix |
|---|---|
| `Invalid configuration … DATABASE_URL` | Check `.env.local` exists in the `mod-alpha` folder and the database URL is correct |
| `port 8080/8081/5432 already in use` | Stop the other program using the port, or change `PORT` in `.env.local` and the port in `apps/web/config/env.local.json` |
| Website loads but shows "Could not reach the Mod Alpha API" | The API is not running. Start it with `npm run dev:api` or check `docker compose … logs api` |
| Login works but you are logged out immediately | Use exactly `http://localhost:8081`, not `127.0.0.1`, so cookies match |
| Want the old static demo with no backend | Serve `apps/web` directly, for example `npx serve apps/web` |
