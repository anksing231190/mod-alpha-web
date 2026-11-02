import { z } from 'zod';

/**
 * All configuration comes from environment variables (see .env.stage.example / .env.prod.example).
 * APP_ENV selects behaviour: `stage` allows mock providers; `prod` refuses mocks unless they are
 * explicitly listed in ALLOW_MOCK_PROVIDERS (used only until the real provider is contracted).
 */
const bool = z.enum(['true', 'false']).default('false').transform((v) => v === 'true');
const Env = z.object({
  APP_ENV: z.enum(['stage', 'prod', 'test']).default('stage'),
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),
  PUBLIC_APP_URL: z.string().url().default('http://localhost:8081'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:8080'),
  CORS_ORIGINS: z.string().default('http://localhost:8081'),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: bool,
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // Access token lifetime. The browser renews it silently while the session is still valid.
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().default(15),
  // Session rules: sign out after this many minutes without activity …
  SESSION_IDLE_MINUTES: z.coerce.number().positive().default(15),
  // … and in any case this many hours after signing in (users / admins).
  SESSION_MAX_HOURS_USER: z.coerce.number().positive().default(12),
  SESSION_MAX_HOURS_ADMIN: z.coerce.number().positive().default(8),
  COOKIE_DOMAIN: z.string().optional(),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(12).optional(),
  ADMIN_BOOTSTRAP_MOBILE: z.string().regex(/^\+\d{10,13}$/, 'Use +91XXXXXXXXXX').optional(),
  UPLOAD_DIR: z.string().default('./var/uploads'),
  MAX_UPLOAD_MB: z.coerce.number().default(50),
  ALLOW_MOCK_PROVIDERS: z.string().default(''),
  // provider selection
  EMAIL_PROVIDER: z.enum(['mock', 'sendgrid']).default('mock'),
  SMS_PROVIDER: z.enum(['mock', 'msg91']).default('mock'),
  PUSH_PROVIDER: z.enum(['mock', 'fcm']).default('mock'),
  WHATSAPP_PROVIDER: z.enum(['mock', 'meta']).default('mock'),
  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay']).default('mock'),
  KYC_PROVIDER: z.enum(['mock', 'digio']).default('mock'),
  AI_PROVIDER: z.enum(['mock', 'anthropic']).default('mock'),
  NAV_PROVIDER: z.enum(['mock', 'amfi']).default('mock'),
  OAUTH_GOOGLE: z.enum(['mock', 'google']).default('mock'),
  SUPPORT_PROVIDER: z.enum(['mock', 'freshdesk']).default('mock'),
  STORAGE_PROVIDER: z.enum(['db', 'local']).default('db'),
  // provider credentials (only required when the provider is selected)
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Mod Alpha <no-reply@modalpha.test>'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),
  MSG91_OTP_TEMPLATE_ID: z.string().optional(),
  MSG91_SMS_TEMPLATE_ID: z.string().optional(),
  FCM_SERVER_KEY: z.string().optional(),
  META_WA_TOKEN: z.string().optional(),
  META_WA_PHONE_ID: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  DIGIO_CLIENT_ID: z.string().optional(),
  DIGIO_CLIENT_SECRET: z.string().optional(),
  DIGIO_BASE_URL: z.string().default('https://ext.digio.in:444'),
  KYC_WEBHOOK_SECRET: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-5-5'),
  AI_MONTHLY_BUDGET_INR: z.coerce.number().default(0),
  AMFI_NAV_URL: z.string().default('https://www.amfiindia.com/spages/NAVAll.txt'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  FRESHDESK_DOMAIN: z.string().optional(),
  FRESHDESK_API_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
  // ---- GST tax invoice: the seller's registered details (printed on every invoice PDF)
  INVOICE_SELLER_NAME: z.string().default('Mod Alpha Ventures LLP'),
  INVOICE_SELLER_ADDRESS: z.string().default(''),          // registered address, one line; use " | " for line breaks
  INVOICE_SELLER_STATE_CODE: z.string().regex(/^\d{2}$/, 'Two-digit GST state code, e.g. 29').default('29'),
  INVOICE_SELLER_GSTIN: z.string().regex(/^$|^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Not a valid GSTIN').default(''),
  INVOICE_SELLER_PAN: z.string().default(''),
  INVOICE_SELLER_LLPIN: z.string().default(''),           // LLPIN / CIN
  INVOICE_SEBI_REG: z.string().default(''),               // e.g. "Research Analyst INH000000000"
  INVOICE_SAC: z.string().default('997156'),               // SAC for the service — confirm with the company's CA
  INVOICE_SUPPORT_EMAIL: z.string().default('support@modalpha.in'),
  INVOICE_PREFIX: z.string().regex(/^[A-Z0-9]{1,4}$/).default('MA'),
});
export type Config = z.infer<typeof Env> & { allowMocks: Set<string> };

// When a real provider is selected, these variables must be set — startup fails and names the missing one.
const REQUIRED: Record<string, [string, string, string[]]> = {
  email: ['EMAIL_PROVIDER', 'sendgrid', ['SENDGRID_API_KEY']],
  sms: ['SMS_PROVIDER', 'msg91', ['MSG91_AUTH_KEY', 'MSG91_SENDER_ID']],
  push: ['PUSH_PROVIDER', 'fcm', ['FCM_SERVER_KEY']],
  whatsapp: ['WHATSAPP_PROVIDER', 'meta', ['META_WA_TOKEN', 'META_WA_PHONE_ID']],
  payments: ['PAYMENT_PROVIDER', 'razorpay', ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET']],
  kyc: ['KYC_PROVIDER', 'digio', ['DIGIO_CLIENT_ID', 'DIGIO_CLIENT_SECRET', 'KYC_WEBHOOK_SECRET']],
  ai: ['AI_PROVIDER', 'anthropic', ['ANTHROPIC_API_KEY']],
  oauth_google: ['OAUTH_GOOGLE', 'google', ['GOOGLE_CLIENT_ID']],
  support: ['SUPPORT_PROVIDER', 'freshdesk', ['FRESHDESK_DOMAIN', 'FRESHDESK_API_KEY']],
};
/** Providers that must be real in prod (unless listed in ALLOW_MOCK_PROVIDERS). */
export const PROD_CRITICAL = ['email', 'sms', 'payments', 'kyc'];

// Parse and check all environment variables once at startup. Throws a readable list of every problem.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // An empty value (KEY= in an env file) means "not set", so optional settings fall back to their defaults
  // instead of failing validation (e.g. ADMIN_BOOTSTRAP_MOBILE= on stage).
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && String(v).trim() !== ''));
  const parsed = Env.safeParse(cleaned);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration:\n${msg}`);
  }
  const c = parsed.data;
  const allowMocks = new Set(c.ALLOW_MOCK_PROVIDERS.split(',').map((s) => s.trim()).filter(Boolean));
  const problems: string[] = [];
  for (const [name, [key, real, needs]] of Object.entries(REQUIRED)) {
    if ((c as any)[key] === real) for (const n of needs) if (!(c as any)[n]) problems.push(`${key}=${real} requires ${n}`);
  }
  if (c.APP_ENV === 'prod') {
    if (c.JWT_SECRET.includes('change-me')) problems.push('JWT_SECRET must be changed for prod');
    for (const k of ['INVOICE_SELLER_GSTIN', 'INVOICE_SELLER_ADDRESS'] as const) if (!c[k]) problems.push(`${k} is required in prod (printed on GST invoices)`);
    for (const p of PROD_CRITICAL) {
      const key = REQUIRED[p][0];
      if ((c as any)[key] === 'mock' && !allowMocks.has(p)) problems.push(`${key}=mock is not allowed in prod (add "${p}" to ALLOW_MOCK_PROVIDERS only as a temporary exception)`);
    }
  }
  if (problems.length) throw new Error(`Invalid configuration for APP_ENV=${c.APP_ENV}:\n- ${problems.join('\n- ')}`);
  return { ...c, allowMocks };
}
