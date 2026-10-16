// Public endpoint for anonymous engagement events. No cookies, no IP storage, no personal data.
import { json, publicCors, saveEventBatch, laDay, clean, analyticsBackend } from './_lib.js';

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|vercel-|uptime|monitor/i;
const TYPES = new Set(['pv', 'eng', 'cta', 'chat', 'check', 'guide', 'form', 'lead']);

function cleanEvent(e) {
  if (!e || !TYPES.has(e.t)) return null;
  const o = { t: e.t, p: clean(e.p, 200), pv: clean(e.pv, 24), ts: Number(e.ts) || 0 };
  if (e.t === 'pv') Object.assign(o, { ref: clean(e.ref, 120).toLowerCase(), us: clean(e.us, 60), um: clean(e.um, 40), uc: clean(e.uc, 80), dev: clean(e.dev, 10), nv: !!e.nv });
  if (e.t === 'eng') Object.assign(o, { ms: Math.max(0, Math.min(Number(e.ms) || 0, 30 * 60 * 1000)), sd: Math.max(0, Math.min(Number(e.sd) || 0, 100)) });
  if (e.t === 'cta') Object.assign(o, { k: clean(e.k, 20), l: clean(e.l, 60) });
  if (['chat', 'check', 'guide', 'form'].includes(e.t)) Object.assign(o, { a: clean(e.a, 20), o: clean(e.o, 20), st: clean(e.st, 30), i: Number(e.i) || 0, f: clean(e.f, 20) });
  if (e.t === 'lead') o.src = clean(e.src, 30);
  return o;
}

export default {
  async fetch(request) {
    const cors = publicCors(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);
    // nothing to store into until Redis is connected; drop quietly
    if (!analyticsBackend || BOT.test(request.headers.get('user-agent') || '')) return new Response(null, { status: 204, headers: cors });
    let body;
    try {
      const text = await request.text();
      if (text.length > 24000) return new Response(null, { status: 413, headers: cors });
      body = JSON.parse(text);
    } catch { return new Response(null, { status: 400, headers: cors }); }
    const v = clean(body.v, 24), s = clean(body.s, 24);
    if (!/^[a-z0-9]{8,24}$/.test(v) || !/^[a-z0-9]{8,24}$/.test(s)) return new Response(null, { status: 400, headers: cors });
    const events = (Array.isArray(body.e) ? body.e.slice(0, 80) : []).map(cleanEvent).filter(Boolean);
    if (!events.length) return new Response(null, { status: 204, headers: cors });
    const now = Date.now();
    const record = { v, s, at: now, cn: Number(body.cn) || now, country: request.headers.get('x-vercel-ip-country') || '', e: events };
    try { await saveEventBatch(laDay(new Date(now)), record); } catch (err) { console.error('track save failed', err); }
    return new Response(null, { status: 204, headers: cors });
  },
};
