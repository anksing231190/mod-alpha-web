# 27 · Backup and recovery

## 1. Where data comes from

| Data | Comes from | Recovered from |
|---|---|---|
| Funds, NAV history, SIP dates, market holidays | Admin workbook upload / AMFI NAV import; set-up loads the bundled workbook | Re-upload, NAV re-import, or backup |
| **Users, subscriptions, payments, invoices, KYC results, consents, audit log** | Only real sign-ups, payments and KYC — **never from a spreadsheet** | **Backup only** |
| Settings, plans, notification templates | Admin screens | Backup |
| Uploaded workbooks | Admin upload (stored in the database today; S3 later) | Backup / S3 versioning |

A new database (`npm run seed:test`, `./scripts/start-local.sh --reset`) gets funds, NAV, SIP dates and holidays only, plus the bootstrap super admin. The **Users / Subscriptions sheets are skipped** at set-up and **refused** by Admin → Data upload in every environment. The only way to bring users back is a database restore.

## 2. Tools in the repository

| Command | What it does |
|---|---|
| `npm run db:backup` | `pg_dump` of the whole database (custom format, compressed) to `var/backups/modalpha-<env>-<time>.dump`, checked after writing, keeps the newest 14 (`BACKUP_KEEP`). With `BACKUP_S3_URI` set and the aws CLI installed it also uploads the file (KMS-encrypted). `--label <name>` adds a label. `ENV_FILE=.env.stage` targets another environment. |
| `npm run db:restore -- <file>` / `-- latest` | Asks you to type RESTORE, **backs up the current database first** (label `pre-restore`), replaces all data with the backup in one transaction, then runs migrations so an older backup gets newer columns. Refuses prod unless `--i-understand-this-replaces-prod`. |
| `./scripts/start-local.sh --reset` | Takes a `before-reset` backup automatically, then recreates the database without users. Undo: `npm run db:restore -- latest`. |

Tested: backup → damage (invoices deleted, users removed) → restore → all 12,585 users and 5 invoices back, safety backup written.

## 3. Production and stage plan (AWS Mumbai, see docs/24 §2)

| Layer | Setting | Gives |
|---|---|---|
| RDS PostgreSQL automated backups | On, **35-day** retention, point-in-time recovery (PITR), Multi-AZ | Restore to any second in the last 35 days; **RPO ≈ 5 minutes** |
| Daily logical backup | `npm run db:backup` as a scheduled task (ECS) at 02:30 IST → S3 bucket in `ap-south-1`, SSE-KMS, versioning, **Object Lock (compliance mode)** so nobody can delete or alter it | Survives a deleted RDS instance, a bad migration, ransomware or an admin mistake |
| Long-term retention | S3 lifecycle: daily 35 days → monthly 12 months → yearly kept **8 years** (Glacier) | GST records (6 years from the year's return) and SEBI records (≥ 5 years) |
| Second copy | Cross-region copy to `ap-south-2` (Hyderabad) — stays in India | Region outage |
| Restore drill | **Monthly**: restore last night's backup into stage, run the API tests + a smoke check, record time taken | Proves backups work; measures RTO |
| Target | **RTO 2 hours** for a full restore, **RPO 5 minutes** (PITR) / 24 hours (logical) | |
| Stage | 7-day RDS backups, daily logical backup kept 14 days | |

Users' personal data in backups: the same encryption and access rules as the live database. Only the platform owner role can read the backup bucket; every access is logged (CloudTrail). When a user's deletion is processed, their data ages out of backups with the retention above (stated in the privacy policy).

## 4. Runbooks

**A. Someone deleted or changed data by mistake (prod).**
1. Note the time just before the mistake (audit log: Admin → Audit).
2. RDS → *Restore to point in time* → a **new** instance `modalpha-prod-pitr-<date>`.
3. Copy the affected rows back (or, if the damage is wide, switch the API's `DATABASE_URL` secret to the new instance and redeploy).
4. Record it in the audit log and the incident log.

**B. Database lost / bad migration (prod).**
1. Put the site in maintenance (scale the API to 0).
2. PITR to just before the problem into a new instance — or, if RDS itself is unusable, create a new instance and `npm run db:restore -- <latest S3 dump> --i-understand-this-replaces-prod`.
3. Point `DATABASE_URL` at it, deploy the previous app version if the migration was the cause, scale back up, run the smoke check.

**C. Region outage.** Restore the newest copy in `ap-south-2` into a new RDS there, deploy the stack there (Terraform), switch DNS.

**D. Local / stage.** `npm run db:restore -- latest` (or a named file).

Incidents affecting personal data are reported to CERT-In within 6 hours, and handled under DPDP breach rules.

## 5. Still to set up (TODO §4)
- Terraform: RDS backup retention 35 d, backup bucket with Object Lock + lifecycle + cross-region replication, KMS key.
- Scheduled backup task (ECS) running `scripts/db/backup.sh` with `BACKUP_S3_URI`.
- Alert when a nightly backup is missing or smaller than 50% of the previous one.
- First restore drill on stage; write down the measured RTO.
- Move uploaded workbooks to S3 (versioned).
