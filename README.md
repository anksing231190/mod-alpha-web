# Mod Alpha

Mutual-fund analytics and monthly SIP-date intelligence. The repository holds the website, the backend API, infrastructure and documentation, and deploys to two environments: **stage** and **prod**.

| Part | Path | Stack |
|---|---|---|
| Website | `apps/web` | static HTML/CSS/JS, served by nginx |
| API + jobs worker | `apps/api` | Node 22, TypeScript, Fastify, PostgreSQL 16 |
| Infra | `infra/`, `.github/workflows/` | Docker, docker-compose, GitHub Actions |
| Docs | `docs/` | see the index below |

## Quick start (local)

```bash
npm ci
```

```bash
cp .env.stage.example .env.stage
```

```bash
docker compose -f infra/docker-compose.yml --env-file .env.stage up --build
```

```bash
docker compose -f infra/docker-compose.yml --env-file .env.stage run --rm api node dist/cli/seed.js --workbook=/seed/mod-alpha-test-data.xlsx
```

Website: http://localhost:8081 · API: http://localhost:8080/health. Log in with `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`.

To run the tests (needs PostgreSQL; set `TEST_DATABASE_URL`):

```bash
npm test
```

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
