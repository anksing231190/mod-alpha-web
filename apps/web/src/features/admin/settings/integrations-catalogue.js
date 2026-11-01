/* ==========================================================================
   Mod Alpha — live integration / API backlog (single source of truth)
   Rendered in Admin → System Settings → Integration readiness and exported to
   docs/22_integration_backlog.md (node tools/export_integrations.js).
   status: Pending   – not built yet
           Mock      – API built; external provider mocked — integrated later
           Manual    – interim manual process in place (e.g. Excel upload)
           Ready     – implemented
   priority: P0 launch-blocking · P1 needed for launch quality · P2 post-launch
   ========================================================================== */
window.V22_INTEGRATION_CATEGORIES=[
 ['auth','Authentication & access','key'],
 ['kyc','KYC & identity','idcard'],
 ['billing','Payments, plans & billing','rupee'],
 ['data','Market & fund data','db'],
 ['analytics','Calculations & analytics','chart'],
 ['ai','AI engine & assistant','brain'],
 ['notify','Notifications & messaging','bell'],
 ['account','User account & support','user'],
 ['admin','Admin operations','users'],
 ['public','Public website','globe'],
 ['platform','Platform & infrastructure','plug']
];
window.V22_INTEGRATIONS=[
 // ---- Authentication & access
 {id:'AUTH-01',cat:'auth',name:'Email + password sign-in / sign-up',status:'Ready',p:'P0',ui:'Login & Signup page (Login, Create Account)',api:'POST /auth/signup · POST /auth/login · POST /auth/logout',opts:'Auth0, AWS Cognito, Firebase Auth, Keycloak, custom (Argon2 + JWT)',note:'Built: bcrypt passwords, httpOnly cookie sessions.'},
 {id:'AUTH-02',cat:'auth',name:'Mobile OTP login',status:'Mock',p:'P0',ui:'Login page → Mobile tab',api:'POST /auth/otp/send · POST /auth/otp/verify',opts:'MSG91 OTP, Twilio Verify, Gupshup (DLT-registered sender)',note:'Built; SMS provider mocked (OTP shown on stage).'},
 {id:'AUTH-03',cat:'auth',name:'Forgot / reset password',status:'Mock',p:'P0',ui:'Login → “Forgot Password?”',api:'POST /auth/password/forgot · POST /auth/password/reset',opts:'Identity provider flows or signed reset tokens + email provider',note:'Built; reset email goes to the mock outbox until SendGrid is connected.'},
 {id:'AUTH-04',cat:'auth',name:'Google sign-in',status:'Mock',p:'P1',ui:'Login → Google button',api:'OAuth 2.0 / OIDC callback /auth/oauth/google',opts:'Google Identity Services',note:'Built; accepts mock:<email> tokens on stage until GOOGLE_CLIENT_ID is set.'},
 {id:'AUTH-05',cat:'auth',name:'Sign in with Apple',status:'Pending',p:'P2',ui:'Login → Apple button',api:'OIDC callback /auth/oauth/apple',opts:'Apple Developer account + Services ID'},
 {id:'AUTH-06',cat:'auth',name:'Session, refresh tokens & logout',status:'Ready',p:'P0',ui:'All signed-in pages, “Exit preview”, “Remember me”',api:'POST /auth/refresh · DELETE /auth/session',opts:'HttpOnly secure cookies, rotating refresh tokens',note:'Built: 15-min access + rotating 30-day refresh tokens with reuse detection.'},
 {id:'AUTH-07',cat:'auth',name:'Change password',status:'Ready',p:'P1',ui:'Settings → Profile → Change Password',api:'POST /me/password',opts:'Identity provider'},
 {id:'AUTH-08',cat:'auth',name:'Email & mobile verification',status:'Mock',p:'P1',ui:'Settings → Personal details (email locked, mobile number)',api:'POST /me/verify-email · POST /me/verify-mobile',opts:'Identity provider + OTP provider',note:'Built; delivery via mocked email/SMS.'},
 {id:'AUTH-09',cat:'auth',name:'Admin roles (RBAC) & MFA',status:'Pending',p:'P0',ui:'Admin console access, System Settings → Access & security',api:'GET /admin/me · role claims in token · TOTP/WebAuthn enrolment',opts:'Identity provider MFA, Okta/Azure AD SSO for staff',note:'RBAC built (user/admin/superadmin). TOTP MFA pending.'},
 {id:'AUTH-10',cat:'auth',name:'Admin profile view',status:'Ready',p:'P2',ui:'Admin top bar → profile name',api:'GET /admin/me · PATCH /admin/me',opts:'—',note:'Built.'},

 // ---- KYC
 {id:'KYC-01',cat:'kyc',name:'KYC verification (first paid subscription)',status:'Mock',p:'P0',ui:'Subscription page plan buttons, Pricing CTAs',api:'POST /kyc/sessions · GET /kyc/status',opts:'Digio, IDfy, HyperVerge, Signzy (PAN, Aadhaar offline eKYC / DigiLocker, CKYC)',note:'Built; Digio adapter ready, mock KYC page on stage.'},
 {id:'KYC-02',cat:'kyc',name:'KYC status webhook',status:'Mock',p:'P0',ui:'User Management → KYC column',api:'POST /webhooks/kyc (signed)',opts:'Provider webhooks',note:'Built; signed webhook verified.'},
 {id:'KYC-03',cat:'kyc',name:'Admin KYC review & override',status:'Ready',p:'P1',ui:'User Management → View user',api:'GET /admin/kyc/:userId · POST /admin/kyc/:userId/decision',opts:'—',note:'Built: admin decision with reason, audited.'},

 // ---- Payments, plans & billing
 {id:'BILL-01',cat:'billing',name:'Checkout / create payment order',status:'Mock',p:'P0',ui:'Pricing & Subscription → Start Pro / Premium plan',api:'POST /billing/checkout',opts:'Razorpay, Cashfree, PayU, Stripe India',note:'Built; Razorpay adapter ready, mock checkout on stage.'},
 {id:'BILL-02',cat:'billing',name:'Recurring subscriptions / mandates',status:'Mock',p:'P0',ui:'Monthly / Quarterly / Yearly billing',api:'POST /billing/subscriptions · UPI Autopay / e-mandate',opts:'Razorpay Subscriptions, Cashfree Subscriptions',note:'One order per billing cycle built; UPI Autopay mandates to add with Razorpay Subscriptions.'},
 {id:'BILL-03',cat:'billing',name:'Payment & subscription webhooks',status:'Mock',p:'P0',ui:'Subscriptions page statuses (Active, Past due, Cancelled)',api:'POST /webhooks/payments (signature verified, idempotent)',opts:'Gateway webhooks',note:'Built: signature-verified, idempotent.'},
 {id:'BILL-04',cat:'billing',name:'Pricing configuration (plans, prices, entitlements)',status:'Ready',p:'P0',ui:'Subscriptions → Manage plans / Edit plan; public Pricing section',api:'GET /plans · PUT /admin/plans/:id (versioned)',opts:'Own DB + gateway plan IDs',note:'Built: versioned plan editor, audited.'},
 {id:'BILL-05',cat:'billing',name:'Plan upgrade, downgrade & proration',status:'Ready',p:'P1',ui:'Top bar → Upgrade Plan; Subscription page',api:'POST /billing/subscriptions/:id/change',opts:'Gateway subscription APIs',note:'Built: switching plans replaces the current plan immediately (no proration yet).'},
 {id:'BILL-06',cat:'billing',name:'Cancellation & refunds',status:'Mock',p:'P1',ui:'Subscription page; Subscriptions KPIs (refunds)',api:'POST /billing/subscriptions/:id/cancel · POST /admin/refunds',opts:'Gateway refund APIs',note:'Built: cancel at period end + admin refunds (mock provider).'},
 {id:'BILL-07',cat:'billing',name:'Invoices & GST receipts',status:'Mock',p:'P1',ui:'Subscription → Billing details / history',api:'GET /billing/invoices · GET /billing/invoices/:id.pdf',opts:'Gateway invoices, Zoho Books, ClearTax GST',note:'In-app GST-inclusive invoices built; GST e-invoicing pending.'},
 {id:'BILL-08',cat:'billing',name:'Payment reconciliation & revenue reporting',status:'Ready',p:'P1',ui:'Admin dashboard revenue, Subscriptions MRR',api:'GET /admin/billing/summary?from&to',opts:'Gateway settlement reports',note:'Built from payments table.'},
 {id:'BILL-09',cat:'billing',name:'Free-plan usage limits (e.g. 1 AI query/day)',status:'Ready',p:'P1',ui:'Plan features, AI assistant',api:'Entitlement check middleware · GET /me/entitlements',opts:'—',note:'Built: AI queries/day per plan.'},

 // ---- Market & fund data
 {id:'DATA-01',cat:'data',name:'Daily NAV feed',status:'Mock',p:'P0',ui:'Fund detail, Explore, dashboards; Data Management upload',api:'Scheduled job → POST /admin/data/nav (staging → publish)',opts:'AMFI NAVAll.txt (free, daily), CAMS/KFintech, Value Research / Morningstar APIs',note:'Built: AMFI NAVAll.txt adapter + nightly job; mock feed on stage.'},
 {id:'DATA-02',cat:'data',name:'Historical NAV backfill',status:'Ready',p:'P0',ui:'5Y/10Y returns, charts',api:'Batch import job',opts:'AMFI historical NAV, licensed data vendor',note:'Built: workbook import.'},
 {id:'DATA-03',cat:'data',name:'Fund master & categories',status:'Ready',p:'P0',ui:'Explore filters, Data Management → Fund / Category Management',api:'GET/PUT /admin/funds · GET/PUT /admin/categories',opts:'AMFI scheme master, SEBI categorisation, vendor feed',note:'Built via workbook upload.'},
 {id:'DATA-04',cat:'data',name:'Benchmark / index (TRI) data',status:'Pending',p:'P1',ui:'Fund detail → Benchmark comparison',api:'GET /indices/:code/history',opts:'NSE Indices (licensed), BSE, vendor'},
 {id:'DATA-05',cat:'data',name:'Factsheet data (AUM, expense ratio, holdings)',status:'Manual',p:'P2',ui:'Fund Info tab',api:'Monthly import job',opts:'AMC factsheets, data vendor'},
 {id:'DATA-06',cat:'data',name:'Market holiday calendar',status:'Ready',p:'P1',ui:'SIP date engine, NAV validation',api:'GET /calendar/holidays',opts:'NSE/BSE holiday circulars'},
 {id:'DATA-07',cat:'data',name:'Server-side workbook ingestion (validate, stage, publish)',status:'Ready',p:'P0',ui:'Data Management → Upload / Publish / Reset / Upload history',api:'POST /admin/data/uploads · POST /admin/data/uploads/:id/publish · GET /admin/data/uploads',opts:'S3/GCS storage + worker (SheetJS/openpyxl) + Postgres staging tables',note:'Built: server-side validation, staging, publish, history.'},
 {id:'DATA-08',cat:'data',name:'Dataset export',status:'Ready',p:'P2',ui:'Data Management → Export active dataset',api:'GET /admin/data/export.xlsx',opts:'—',note:'Built.'},

 // ---- Calculations & analytics
 {id:'CALC-01',cat:'analytics',name:'Fund returns & risk metrics service',status:'Ready',p:'P0',ui:'Explore, Fund detail metrics, Top performing funds chart',api:'GET /funds · GET /funds/:id/metrics?period=',opts:'Own service over NAV tables (pre-computed nightly)',note:'Built: nightly pre-computed fund_metrics.'},
 {id:'CALC-02',cat:'analytics',name:'What-if (lump-sum) calculator API',status:'Ready',p:'P0',ui:'What If Calculator, dashboard “Run Calculation”',api:'POST /calc/lumpsum {fundId, date, amount}',opts:'Own service using actual NAV on/after date',note:'Built: uses actual NAV.'},
 {id:'CALC-03',cat:'analytics',name:'MOD Alpha SIP vs Traditional SIP simulation',status:'Ready',p:'P0',ui:'MOD Alpha SIP page, dashboard comparison',api:'POST /calc/sip-compare {fundId, amount, start, end}',opts:'Own service using NAV + published SIP dates',note:'Built: buys on published SIP dates vs fixed day.'},
 {id:'CALC-04',cat:'analytics',name:'Fund search',status:'Ready',p:'P1',ui:'Explore → Search box & category filters',api:'GET /funds/search?q=&category=',opts:'Postgres full-text, Meilisearch, OpenSearch',note:'Built: Postgres ILIKE search (move to full-text at scale).'},
 {id:'CALC-05',cat:'analytics',name:'Watchlist',status:'Ready',p:'P1',ui:'Fund detail → Add to Watchlist',api:'GET/POST/DELETE /me/watchlist',opts:'Own DB',note:'Built.'},
 {id:'CALC-06',cat:'analytics',name:'Admin dashboard metrics & date-range API',status:'Ready',p:'P0',ui:'Admin dashboard KPIs, User Growth & Subscription Trends charts, date-range picker, 7D/30D/3M/1Y',api:'GET /admin/metrics?from&to&granularity=',opts:'SQL views / warehouse (BigQuery, ClickHouse)',note:'Built: /admin/metrics with range & granularity.'},
 {id:'CALC-07',cat:'analytics',name:'Product analytics events',status:'Pending',p:'P2',ui:'Settings → Privacy → Product analytics consent',api:'Client SDK + consent gate',opts:'PostHog, Mixpanel, GA4 (consent mode)'},

 // ---- AI
 {id:'AI-01',cat:'ai',name:'SIP date recommendation engine',status:'Manual',p:'P0',ui:'SIP_Dates sheet → calendar, Best Date card, SIP Date Configuration',api:'Batch job → POST /admin/sip-dates/proposals',opts:'Own model service (Python), scheduled monthly',note:'Dates entered via workbook / admin publish; engine to be connected.'},
 {id:'AI-02',cat:'ai',name:'SIP date validation, preview & publish workflow',status:'Ready',p:'P0',ui:'SIP Date Configuration → Validate configuration → Preview & publish; dashboard “Update Date”',api:'POST /admin/sip-dates/validate · POST /admin/sip-dates/:month/publish',opts:'Own service + approval & audit trail',note:'Built: validate → publish → reminder campaign, versioned & audited.'},
 {id:'AI-03',cat:'ai',name:'Model backtesting & release gates',status:'Ready',p:'P1',ui:'AI Models & Insights → Release gates, Open release checklist',api:'POST /admin/models/:version/evaluations · POST /admin/models/:version/approve',opts:'MLflow, Weights & Biases, own',note:'Built: gates + super-admin approval; evaluation runs pending.'},
 {id:'AI-04',cat:'ai',name:'AI assistant (LLM gateway)',status:'Mock',p:'P1',ui:'“Ask Mod Alpha” chat bot (all user pages), Help → Chat with Mod Alpha',api:'POST /assistant/messages (streaming)',opts:'Anthropic Claude API via server-side gateway',note:'Built; rule-based mock until ANTHROPIC_API_KEY is set.'},
 {id:'AI-05',cat:'ai',name:'Grounding / retrieval over approved fund data',status:'Pending',p:'P1',ui:'Assistant answers, AI Insight cards',api:'Internal retrieval service',opts:'pgvector, OpenSearch, managed vector DB',note:'Basic grounding built (top funds + SIP date in prompt); vector retrieval pending.'},
 {id:'AI-06',cat:'ai',name:'AI insights feed generation',status:'Pending',p:'P2',ui:'Dashboard → Latest AI Insights, notification dropdown',api:'GET /insights · scheduled generation job',opts:'LLM + approved data, human review'},
 {id:'AI-07',cat:'ai',name:'AI safety, cost limits & usage logging',status:'Pending',p:'P1',ui:'AI Models → Model service configuration',api:'Gateway policies, per-user quotas',opts:'Gateway + secrets manager',note:'Per-plan quotas built; monthly cost cap pending.'},

 // ---- Notifications
 {id:'NOTI-01',cat:'notify',name:'Email delivery',status:'Mock',p:'P0',ui:'SIP reminders, receipts, password reset, campaigns',api:'Provider API + POST /webhooks/email (delivery, bounce)',opts:'Amazon SES, SendGrid, Postmark',note:'Built; mock outbox until SendGrid.'},
 {id:'NOTI-02',cat:'notify',name:'SMS delivery (DLT)',status:'Mock',p:'P1',ui:'SMS reminders, OTP; Notifications → SMS preview',api:'Provider API + delivery receipts',opts:'MSG91, Gupshup, Kaleyra',note:'Built; mock outbox until MSG91 (DLT).'},
 {id:'NOTI-03',cat:'notify',name:'Push / in-app notifications',status:'Mock',p:'P1',ui:'Top bar bell dropdown, “Mark all as read”, Push preview',api:'GET /me/notifications · POST /me/notifications/read · web push subscribe',opts:'Firebase Cloud Messaging, OneSignal',note:'In-app inbox built; device push mocked until FCM.'},
 {id:'NOTI-04',cat:'notify',name:'WhatsApp messages',status:'Mock',p:'P2',ui:'Footer WhatsApp link, future reminders',api:'WhatsApp Business Cloud API templates',opts:'Meta Cloud API, Gupshup, Twilio',note:'Adapter built; mocked.'},
 {id:'NOTI-05',cat:'notify',name:'SIP reminder scheduler',status:'Ready',p:'P0',ui:'“Set Reminder”, Upcoming Notifications, reminder timing setting',api:'Scheduled job reading published SIP date + user preferences',opts:'Cloud Scheduler / EventBridge + queue',note:'Built: jobs worker dispatches scheduled campaigns.'},
 {id:'NOTI-06',cat:'notify',name:'Templates & campaigns',status:'Ready',p:'P1',ui:'Notifications → Edit template, New campaign, Preview Notification',api:'CRUD /admin/notification-templates · POST /admin/campaigns',opts:'Own + provider templates',note:'Built.'},
 {id:'NOTI-07',cat:'notify',name:'Consent & unsubscribe management',status:'Ready',p:'P0',ui:'Settings → Notifications toggles, Privacy consents',api:'GET/PUT /me/preferences · one-click unsubscribe links',opts:'Own DB (DPDP Act consent records)',note:'Built: preferences + consent ledger; campaigns skip opted-out channels.'},

 // ---- User account & support
 {id:'ACC-01',cat:'account',name:'Profile & preferences save',status:'Ready',p:'P0',ui:'Settings → Save Changes / Save Preferences',api:'GET/PATCH /me · GET/PUT /me/preferences',opts:'Own API',note:'Built.'},
 {id:'ACC-02',cat:'account',name:'Data export request (DPDP)',status:'Ready',p:'P1',ui:'Settings → Data & Privacy → Request data export',api:'POST /me/data-export → emailed download link',opts:'Own job + object storage',note:'Built: request + job fulfilment.'},
 {id:'ACC-03',cat:'account',name:'Account deletion request',status:'Ready',p:'P1',ui:'Settings → Data & Privacy → Request account deletion',api:'POST /me/deletion-request (re-auth required)',opts:'Own workflow + retention rules',note:'Built: 30-day grace, then anonymised by job.'},
 {id:'ACC-04',cat:'account',name:'Support tickets',status:'Mock',p:'P1',ui:'Help & FAQ → Submit request',api:'POST /support/tickets',opts:'Freshdesk, Zendesk, Zoho Desk, HubSpot',note:'Built; Freshdesk adapter ready, mocked.'},
 {id:'ACC-05',cat:'account',name:'Help-centre content (FAQs)',status:'Ready',p:'P2',ui:'Help & FAQ, public FAQ section',api:'GET /content/faqs',opts:'Headless CMS (Sanity, Strapi, Contentful)',note:'FAQs served from DB; CMS later.'},

 // ---- Admin operations
 {id:'ADM-01',cat:'admin',name:'User management API (search, export, suspend)',status:'Ready',p:'P0',ui:'User Management → search, filters, View, Export CSV',api:'GET /admin/users?q&status&kyc&page · GET /admin/users/export.csv · PATCH /admin/users/:id',opts:'Own API (PII access audited)',note:'Built.'},
 {id:'ADM-02',cat:'admin',name:'Subscriptions admin API',status:'Ready',p:'P0',ui:'Subscriptions → table, filters, KPIs',api:'GET /admin/subscriptions?state&plan&page',opts:'Own API + gateway',note:'Built.'},
 {id:'ADM-03',cat:'admin',name:'Audit log (write, search, export)',status:'Ready',p:'P0',ui:'Audit Logs → search, filters, Export logs',api:'Append-only event store · GET /admin/audit?q&type&from&to · export',opts:'Postgres append-only table, CloudTrail-style store',note:'Built: DB trigger blocks UPDATE/DELETE.'},
 {id:'ADM-04',cat:'admin',name:'System settings edit',status:'Ready',p:'P1',ui:'System Settings → Edit',api:'GET/PUT /admin/settings',opts:'Own API + config service',note:'Built (super admin).'},
 {id:'ADM-05',cat:'admin',name:'Date-range filter for admin reports',status:'Ready',p:'P1',ui:'Admin dashboard → date-range picker',api:'Query params on /admin/metrics',opts:'—',note:'Built.'},

 // ---- Public website
 {id:'PUB-01',cat:'public',name:'Public activity feed',status:'Ready',p:'P2',ui:'Landing page “new member joined” toast',api:'GET /api/public/activity?limit=8',opts:'Own API (aggregated, no PII)',note:'Built (anonymous, last 48h).'},
 {id:'PUB-02',cat:'public',name:'Social profile links',status:'Pending',p:'P2',ui:'Footer WhatsApp, X, Instagram, YouTube, LinkedIn',api:'Static URLs (config)',opts:'—'},
 {id:'PUB-03',cat:'public',name:'Cookie consent & web analytics',status:'Pending',p:'P1',ui:'Public pages',api:'Consent banner + analytics SDK',opts:'Cookiebot, Osano, GA4 / PostHog'},
 {id:'PUB-04',cat:'public',name:'Legal pages (Privacy, Terms, disclosures)',status:'Pending',p:'P0',ui:'Footer Privacy / Terms',api:'Static content / CMS',opts:'Legal review'},

 // ---- Platform
 {id:'PLT-01',cat:'platform',name:'Backend API & database',status:'Ready',p:'P0',ui:'Everything that is local/demo today',api:'REST/GraphQL backend',opts:'Node/NestJS or Python/FastAPI + PostgreSQL',note:'Built: Fastify + PostgreSQL, Docker, CI/CD for stage & prod.'},
 {id:'PLT-02',cat:'platform',name:'File storage for uploads',status:'Manual',p:'P0',ui:'Data Management uploads',api:'Pre-signed upload URLs',opts:'Amazon S3, Google Cloud Storage',note:'Uploads stored in PostgreSQL until S3/GCS.'},
 {id:'PLT-03',cat:'platform',name:'Secrets & encryption (KMS)',status:'Pending',p:'P0',ui:'System Settings → Access & security',api:'—',opts:'AWS Secrets Manager + KMS, GCP Secret Manager',note:'Env vars from the deploy platform; secrets manager pending.'},
 {id:'PLT-04',cat:'platform',name:'Logging, monitoring & alerting',status:'Pending',p:'P0',ui:'—',api:'—',opts:'Sentry, Datadog, Grafana Cloud',note:'Structured JSON logs; monitoring/alerting pending.'},
 {id:'PLT-05',cat:'platform',name:'Rate limiting & WAF',status:'Ready',p:'P0',ui:'Login, OTP, public APIs',api:'Gateway policies',opts:'Cloudflare, AWS WAF',note:'App rate limiting built; WAF pending.'},
 {id:'PLT-06',cat:'platform',name:'Backups & disaster recovery',status:'Pending',p:'P0',ui:'—',api:'—',opts:'Managed DB snapshots, PITR',note:'Depends on hosting choice.'},
 {id:'PLT-07',cat:'platform',name:'Client-side spreadsheet parsing',status:'Ready',p:'P1',ui:'Data Management validation',api:'—',opts:'SheetJS CE (vendored)'}
];
