/**
 * Insights module — the "Latest AI Insights" tile on the user dashboard.
 * An insight is either a text card or an Instagram reel. The reel stays on Instagram (it must be on a public
 * account); Mod Alpha stores only its link and shows it with Instagram's standard embed — no API key needed.
 *
 *   GET  /insights                     published items: pinned first, then by order, newest first (max 12)
 *   GET  /insights/:id/cover           optional cover image of a reel
 *   GET  /admin/insights               every item, any status (admins)
 *   POST /admin/insights               create (text or Instagram link)
 *   PUT  /admin/insights/:id           edit: title, text, link, status, pinned, order, cover
 *   DELETE /admin/insights/:id         delete
 * Every admin change is written to the audit log (INSIGHT_CREATED / _UPDATED / _DELETED).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../shared/validate.js';
import { badRequest, notFound } from '../../shared/errors.js';
import { requireAdmin } from '../auth/session.js';
import { audit } from '../../shared/audit.js';

/** Accepts instagram.com/reel/…, /reels/…, /p/… and /tv/… links; returns the canonical link and the shortcode. */
export function parseInstagram(raw: string) {
  const m = raw.trim().match(/^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\/(?:[A-Za-z0-9._]+\/)?(reels?|p|tv)\/([A-Za-z0-9_-]{5,40})\/?(?:[?#].*)?$/i);
  if (!m) return null;
  const type = m[1].toLowerCase() === 'p' ? 'p' : m[1].toLowerCase() === 'tv' ? 'tv' : 'reel';
  return { id: m[2], url: `https://www.instagram.com/${type}/${m[2]}/`, embed: `https://www.instagram.com/${type}/${m[2]}/embed/` };
}

const COVER_MAX = 600 * 1024;
const ICONS = ['trend', 'calendar', 'bulb', 'bell', 'chart', 'shield', 'target', 'video'] as const;
const fields = {
  title: z.string().trim().min(3, 'Give it a title (at least 3 characters)').max(120),
  body: z.string().trim().max(600).optional().nullable(),
  icon: z.enum(ICONS).optional(),
  status: z.enum(['Draft', 'Published', 'Hidden']).optional(),
  pinned: z.boolean().optional(),
  sort: z.number().int().min(0).max(9999).optional(),
  url: z.string().trim().max(300).optional().nullable(),
  // cover image as a data URL (PNG / JPEG / WebP), or null to remove it
  cover: z.string().max(Math.ceil(COVER_MAX * 1.4) + 100).optional().nullable(),
};

// One row as the screens use it (no image bytes; a cover URL instead).
const view = (r: any) => {
  const ig = r.kind === 'instagram' && r.url ? parseInstagram(r.url) : null;
  return { id: r.id, kind: r.kind, icon: r.icon, title: r.title, body: r.body, status: r.status, pinned: r.pinned, sort: r.sort, url: r.url, mediaId: r.media_id, embedUrl: ig?.embed ?? null, cover: r.has_cover ? `/insights/${r.id}/cover?v=${new Date(r.updated_at).getTime()}` : null, publishedAt: r.published_at, updatedAt: r.updated_at };
};
const COLS = `id, kind, icon, title, body, status, pinned, sort, url, media_id, (cover IS NOT NULL) has_cover, published_at, updated_at`;

// data:image/png;base64,… → { buf, type }
function decodeCover(s: string) {
  const m = s.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw badRequest('The cover must be a PNG, JPEG or WebP image.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > COVER_MAX) throw badRequest('The cover image must be 600 KB or smaller.');
  return { buf, type: m[1] };
}

export default async function insights(app: FastifyInstance) {
  const { db } = app.deps;

  app.get('/insights', async () => ({ items: (await db.query(`SELECT ${COLS} FROM insights WHERE status='Published' ORDER BY pinned DESC, sort, published_at DESC LIMIT 12`)).rows.map(view) }));
  app.get('/insights/:id/cover', async (req, reply) => {
    const r = (await db.query(`SELECT cover, cover_type FROM insights WHERE id=$1 AND cover IS NOT NULL`, [+(req.params as any).id || 0])).rows[0];
    if (!r) throw notFound();
    // the website (another origin) shows this image, so allow cross-origin use of this one public resource
    reply.header('content-type', r.cover_type).header('cache-control', 'public, max-age=86400').header('cross-origin-resource-policy', 'cross-origin');
    return reply.send(r.cover);
  });

  app.get('/admin/insights', async (req) => { requireAdmin(req); return { items: (await db.query(`SELECT ${COLS} FROM insights ORDER BY pinned DESC, sort, published_at DESC`)).rows.map(view) }; });

  app.post('/admin/insights', async (req) => {
    const admin = requireAdmin(req);
    const b = parse(z.object({ kind: z.enum(['text', 'instagram']), ...fields }), req.body);
    let url: string | null = null, mediaId: string | null = null;
    if (b.kind === 'instagram') {
      const ig = b.url ? parseInstagram(b.url) : null;
      if (!ig) throw badRequest('Paste the link of an Instagram reel or post, e.g. https://www.instagram.com/reel/AbC123xyz/');
      url = ig.url; mediaId = ig.id;
    } else if (!b.body) throw badRequest('Write the insight text.');
    const cover = b.cover ? decodeCover(b.cover) : null;
    const r = (await db.query(`INSERT INTO insights (kind, icon, title, body, status, pinned, sort, url, media_id, cover, cover_type, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING ${COLS}`,
      [b.kind, b.icon ?? (b.kind === 'instagram' ? 'video' : 'trend'), b.title, b.body ?? null, b.status ?? 'Draft', b.pinned ?? false, b.sort ?? 0, url, mediaId, cover?.buf ?? null, cover?.type ?? null, admin.id])).rows[0];
    await audit(db, req, { action: 'INSIGHT_CREATED', category: 'Content', resource: `${r.id} · ${b.title}`, meta: { kind: b.kind, status: r.status, url } });
    return { item: view(r) };
  });

  app.put('/admin/insights/:id', async (req) => {
    requireAdmin(req);
    const id = +(req.params as any).id || 0;
    const cur = (await db.query('SELECT * FROM insights WHERE id=$1', [id])).rows[0];
    if (!cur) throw notFound();
    const b = parse(z.object({ ...fields, title: fields.title.optional() }).strict(), req.body);
    let url = cur.url, mediaId = cur.media_id;
    if (b.url !== undefined && cur.kind === 'instagram') {
      const ig = b.url ? parseInstagram(b.url) : null;
      if (!ig) throw badRequest('Paste the link of an Instagram reel or post, e.g. https://www.instagram.com/reel/AbC123xyz/');
      url = ig.url; mediaId = ig.id;
    }
    if (cur.kind === 'text' && b.body !== undefined && !b.body) throw badRequest('Write the insight text.');
    const cover = b.cover === undefined ? undefined : b.cover === null ? null : decodeCover(b.cover);
    // publishing for the first time moves it to the top of "newest"
    const publishNow = b.status === 'Published' && cur.status !== 'Published';
    const r = (await db.query(`UPDATE insights SET title=coalesce($2,title), body=CASE WHEN $3 THEN $4 ELSE body END, icon=coalesce($5,icon), status=coalesce($6,status), pinned=coalesce($7,pinned), sort=coalesce($8,sort),
        url=$9, media_id=$10, cover=CASE WHEN $11 THEN $12 ELSE cover END, cover_type=CASE WHEN $11 THEN $13 ELSE cover_type END, published_at=CASE WHEN $14 THEN now() ELSE published_at END, updated_at=now() WHERE id=$1 RETURNING ${COLS}`,
      [id, b.title ?? null, b.body !== undefined, b.body ?? null, b.icon ?? null, b.status ?? null, b.pinned ?? null, b.sort ?? null, url, mediaId, cover !== undefined, cover?.buf ?? null, cover?.type ?? null, publishNow])).rows[0];
    await audit(db, req, { action: 'INSIGHT_UPDATED', category: 'Content', resource: `${id} · ${r.title}`, meta: { ...b, cover: b.cover === undefined ? undefined : b.cover ? 'replaced' : 'removed' } });
    return { item: view(r) };
  });

  app.delete('/admin/insights/:id', async (req) => {
    requireAdmin(req);
    const r = (await db.query('DELETE FROM insights WHERE id=$1 RETURNING id, title', [+(req.params as any).id || 0])).rows[0];
    if (!r) throw notFound();
    await audit(db, req, { action: 'INSIGHT_DELETED', category: 'Content', resource: `${r.id} · ${r.title}` });
    return { ok: true };
  });
}
