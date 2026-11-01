/**
 * Feature modules. Each folder is one feature with its routes (and helpers):
 *   auth/          sign-up, login (password, mobile OTP, Google), admin 2-code sign-in, sessions & timeouts
 *   account/       the signed-in user's profile, preferences, consents, notifications, watchlist, data rights
 *   billing/       plans, checkout, payment webhooks, subscriptions, invoices, refunds
 *   kyc/           identity verification sessions, provider webhook, admin decisions
 *   funds/         fund list, NAV history, calculators; analytics.ts = returns / risk metrics
 *   sip/           monthly recommended SIP date: read, validate, publish
 *   data/          workbook upload → validate → publish, export; workbook.ts = the sheet rules
 *   admin/         dashboard metrics, users, subscriptions, audit log, settings, model releases
 *   notifications/ templates and announcement campaigns (email / SMS / push / in-app / WhatsApp)
 *   content/       FAQs, insights, public activity, AI assistant, support tickets
 */
import type { FastifyInstance } from 'fastify';
import auth from './auth/routes.js';
import me from './account/routes.js';
import billing from './billing/routes.js';
import kyc from './kyc/routes.js';
import funds from './funds/routes.js';
import sip from './sip/routes.js';
import data from './data/routes.js';
import admin from './admin/routes.js';
import notifications from './notifications/routes.js';
import content from './content/routes.js';

// Order does not matter for routing; it only decides the order routes are listed in logs.
export async function registerModules(api: FastifyInstance) {
  for (const m of [auth, me, billing, kyc, funds, sip, data, admin, notifications, content]) await m(api);
}
