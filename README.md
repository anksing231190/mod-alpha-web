# Mod Alpha

Mutual-fund analytics and monthly SIP-date intelligence. The repository holds the website, the backend API, infrastructure and documentation, and deploys to two environments: **stage** and **prod**.

| Part | Path | Stack |
|---|---|---|
| Website | `apps/web` | static HTML/CSS/JS, served by nginx |
| API + jobs worker | `apps/api` | Node 22, TypeScript, Fastify, PostgreSQL 16 |
| Infra | `infra/`, `.github/workflows/` | Docker, docker-compose, GitHub Actions |
| Docs | `docs/` | see the index below |

## Run it locally

Step-by-step guide (Docker, or Node + PostgreSQL): **[RUN_LOCALLY.md](RUN_LOCALLY.md)**

One command (macOS/Linux; sets up the database, test data, API and website):

```bash
./scripts/start-local.sh
```

Or step by step, without Docker:

```bash
cp .env.local.example .env.local
```

```bash
npm ci && npm run seed:test
```

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Open http://localhost:8081 and log in as `admin@modalpha.local` / `Admin-password-123`.

## Environments

- **stage:** deployed on every push to `main`. External providers run as mocks unless switched to vendor sandboxes. The test workbook can be loaded.
- **prod:** deployed from a release tag `v*` after approval. It refuses to start with mock payments, KYC, email or SMS.

Details: `docs/24_architecture_and_environments.md`.

## Integrations

All 72 integration items are tracked in `docs/22_integration_backlog.md`. They also appear in **Admin → System Settings**, together with the live status of every provider. The providers that still run on mocks, and what replaces each one, are in **`docs/23_mocks_and_replacements.md`**.

## Docs index

- `00`–`20`: product brief, screen specs, design decisions
- `21_test_data_excel_format.md`: workbook format for the testing team
- `22_integration_backlog.md`: every API and integration, with status (generated)
- `23_mocks_and_replacements.md`: mocks today and what replaces them
- `24_architecture_and_environments.md`: code structure, environments, deploy, API reference

## Themes
Dark (Midnight, default) and light (Sand — beige + cream). Toggle in the top bar or Settings → Preferences. See `docs/25_light_theme.md`; regenerate with `npm run theme:build`.
