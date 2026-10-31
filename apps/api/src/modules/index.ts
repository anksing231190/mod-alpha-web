import type { FastifyInstance } from 'fastify';
import auth from './auth.js';
import me from './me.js';
import billing from './billing.js';
import kyc from './kyc.js';
import funds from './funds.js';
import sip from './sip.js';
import data from './data.js';
import admin from './admin.js';
import notifications from './notifications.js';
import content from './content.js';

export async function registerModules(api: FastifyInstance) {
  for (const m of [auth, me, billing, kyc, funds, sip, data, admin, notifications, content]) await m(api);
}
