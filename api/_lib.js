// Shared helpers for the lead API. Files starting with "_" are not deployed as functions.
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PLANS } from './_plans.js';

export const STAGES = ['new', 'contacted', 'discovery', 'proposal', 'won', 'lost'];
export const SOURCES = ['conversation', 'bottleneck-check', 'guide', 'contact', 'booking', 'partner', 'application', 'cohort', 'membership', 'story', 'manual'];

const PUBLIC_ORIGINS = ['https://radcatdesign.github.io', 'https://matwil.vercel.app'];

/* ---------- responses */
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

// CORS only for the public capture endpoint, and only for our own sites.
export function publicCors(request) {
  const origin = request.headers.get('origin') || '';
  const ok = PUBLIC_ORIGINS.includes(origin) || /^https:\/\/matwil-[a-z0-9-]+\.vercel\.app$/.test(origin) || /^http:\/\/localhost:\d+$/.test(origin);
  return ok
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', Vary: 'Origin' }
    : { Vary: 'Origin' };
}

/* ---------- auth for the CRM */
function digest(s) { return crypto.createHash('sha256').update(String(s)).digest(); }

export function checkAuth(request) {
  const pass = process.env.CRM_PASSCODE;
  if (!pass) return { ok: false, status: 503, error: 'The CRM passcode is not configured yet.' };
  const header = request.headers.get('authorization') || '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  const ok = given.length > 0 && crypto.timingSafeEqual(digest(given), digest(pass));
  return ok ? { ok: true } : { ok: false, status: 401, error: 'That passcode didn’t work.' };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- cleaning input */
export function clean(v, max = 500) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}
export function cleanList(v, maxItems = 20, maxLen = 60) {
  return Array.isArray(v) ? v.slice(0, maxItems).map((x) => clean(x, maxLen)).filter(Boolean) : [];
}
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

export function newId() {
  return 'ld_' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}
export const validId = (id) => /^ld_[a-z0-9]{8,40}$/.test(id || '');

/* ---------- storage
   Leads live in Redis (Upstash via the Vercel Marketplace) when it's connected, otherwise in private
   Vercel Blob. Redis is preferred: Blob's Hobby quota is 2,000 writes a month and going over locks the
   store for 30 days, which daily CRM use can reach. In development everything goes to a local folder. */
const LOCAL = process.env.LEADS_LOCAL_DIR;
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
export const leadsBackend = LOCAL ? 'local' : REDIS_URL && REDIS_TOKEN ? 'redis' : 'blob';
let blobMod;
async function blob() { return (blobMod ||= await import('@vercel/blob')); }
const keyFor = (id) => `leads/${id}.json`;

export async function redis(commands) {
  const res = await fetch(REDIS_URL.replace(/\/$/, '') + '/pipeline', {
    method: 'POST', headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const out = await res.json();
  const bad = out.find((r) => r && r.error); if (bad) throw new Error(bad.error);
  return out.map((r) => r.result);
}
const parse = (s) => { try { return JSON.parse(s); } catch { return null; } };

async function readPath(pathname) {
  if (LOCAL) {
    try { return JSON.parse(await fs.readFile(path.join(LOCAL, pathname), 'utf8')); } catch { return null; }
  }
  const { get } = await blob();
  const res = await get(pathname, { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return null;
  return JSON.parse(await new Response(res.stream).text());
}
async function putBlob(pathname, body) {
  const { put } = await blob();
  await put(pathname, body, { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
}

/* A version marker changes whenever any lead changes. The CRM sends the version it has and only
   reloads when it moved, so leaving the portal open costs one tiny read every few minutes.
   Writes return { version, prev }: prev is the version just before this write (Redis only), which lets
   the CRM adopt its own edit without missing a lead that arrived from the site in between. */
const VERSION_KEY = 'meta/version.json';
async function bumpFileVersion() {
  const v = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  const body = JSON.stringify({ v });
  if (LOCAL) { await fs.mkdir(path.join(LOCAL, 'meta'), { recursive: true }); await fs.writeFile(path.join(LOCAL, VERSION_KEY), body); }
  else await putBlob(VERSION_KEY, body);
  return { version: v, prev: null };
}
export async function readVersion() {
  if (leadsBackend === 'redis') { const [v] = await redis([['GET', 'leads:ver']]); return String(v || '0'); }
  const r = await readPath(VERSION_KEY).catch(() => null);
  return (r && r.v) || (await bumpFileVersion()).version;
}

export async function saveLead(lead) {
  const body = JSON.stringify(lead);
  if (leadsBackend === 'redis') {
    const [, n] = await redis([['HSET', 'leads', lead.id, body], ['INCR', 'leads:ver']]);
    return { version: String(n), prev: String(n - 1) };
  }
  if (LOCAL) {
    await fs.mkdir(path.join(LOCAL, 'leads'), { recursive: true });
    await fs.writeFile(path.join(LOCAL, keyFor(lead.id)), body);
  } else await putBlob(keyFor(lead.id), body);
  return bumpFileVersion();
}

export async function readLead(id) {
  if (leadsBackend === 'redis') { const [v] = await redis([['HGET', 'leads', id]]); return v ? parse(v) : null; }
  return readPath(keyFor(id));
}

const leadCache = new Map(); // Blob only: pathname -> { stamp, lead }, so a reload fetches only what changed
async function listBlobLeads() {
  let items = [];
  if (LOCAL) {
    try { items = (await fs.readdir(path.join(LOCAL, 'leads'))).filter((f) => f.endsWith('.json')).map((f) => ({ pathname: 'leads/' + f, stamp: '' })); } catch { items = []; }
  } else {
    const { list } = await blob();
    let cursor;
    do {
      const page = await list({ prefix: 'leads/', cursor, limit: 1000 });
      items.push(...page.blobs.map((b) => ({ pathname: b.pathname, stamp: String(b.uploadedAt) + b.size })));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }
  const out = [];
  for (let i = 0; i < items.length; i += 25) {
    const batch = await Promise.all(items.slice(i, i + 25).map(async (it) => {
      const hit = it.stamp && leadCache.get(it.pathname);
      if (hit && hit.stamp === it.stamp) return hit.lead;
      const lead = await readPath(it.pathname).catch(() => null);
      if (lead && it.stamp) leadCache.set(it.pathname, { stamp: it.stamp, lead });
      return lead;
    }));
    out.push(...batch.filter(Boolean));
  }
  return JSON.parse(JSON.stringify(out));
}

// First time Redis is used, bring over anything already captured in Blob.
async function importFromBlob() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) { await redis([['SET', 'leads:imported', '1']]); return; }
  const old = await listBlobLeads();
  const cmds = old.filter((l) => l && validId(l.id)).map((l) => ['HSETNX', 'leads', l.id, JSON.stringify(l)]);
  for (let i = 0; i < cmds.length; i += 200) await redis(cmds.slice(i, i + 200));
  await redis([['SET', 'leads:imported', '1'], ['INCR', 'leads:ver']]);
}

export async function listLeads() {
  let out;
  if (leadsBackend === 'redis') {
    let [imported, flat] = await redis([['GET', 'leads:imported'], ['HGETALL', 'leads']]);
    if (!imported) { await importFromBlob(); [flat] = await redis([['HGETALL', 'leads']]); }
    out = [];
    for (let i = 1; i < (flat || []).length; i += 2) { const l = parse(flat[i]); if (l) out.push(l); }
  } else out = await listBlobLeads();
  return out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function deleteLead(id) {
  if (leadsBackend === 'redis') { const [, n] = await redis([['HDEL', 'leads', id], ['INCR', 'leads:ver']]); return { version: String(n), prev: String(n - 1) }; }
  if (LOCAL) await fs.rm(path.join(LOCAL, keyFor(id)), { force: true });
  else { const { del } = await blob(); await del(keyFor(id)); leadCache.delete(keyFor(id)); }
  return bumpFileVersion();
}

/* ---------- building a lead record from a public submission */
export function buildLead(body, request) {
  const now = new Date().toISOString();
  const source = SOURCES.includes(body.source) && body.source !== 'manual' ? body.source : 'contact';
  const transcript = Array.isArray(body.transcript)
    ? body.transcript.slice(0, 60).map((m) => ({ from: m.from === 'matt' ? 'matt' : 'them', text: clean(m.text, 1200) })).filter((m) => m.text)
    : [];
  const answers = Array.isArray(body.answers)
    ? body.answers.slice(0, 20).map((a) => ({ q: clean(a.q, 200), a: clean(a.a, 80), v: Number(a.v) || 0, area: clean(a.area, 40) }))
    : [];
  const scores = body.scores && typeof body.scores === 'object'
    ? Object.fromEntries(Object.entries(body.scores).slice(0, 10).map(([k, v]) => [clean(k, 40), Number(v) || 0]))
    : null;
  // application answers and other question/answer pairs from plan forms
  const qa = Array.isArray(body.qa)
    ? body.qa.slice(0, 20).map((x) => ({ q: clean(x && x.q, 120), a: clean(x && x.a, 2000) })).filter((x) => x.q && x.a)
    : [];
  const plan = PLANS[body.plan] ? body.plan : '';
  // a client story sent through /share-your-story/: never published until Matt turns it on in the CRM
  const story = source === 'story'
    ? { quote: clean(body.quote, 600), consent: ['full', 'anon', 'private'].includes(body.consent) ? body.consent : 'private' }
    : null;
  const utm = body.utm && typeof body.utm === 'object'
    ? Object.fromEntries(['source', 'medium', 'campaign', 'term', 'content'].map((k) => [k, clean(body.utm[k], 120)]).filter(([, v]) => v))
    : {};
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    name: clean(body.name, 120),
    email: clean(body.email, 160).toLowerCase(),
    phone: clean(body.phone, 40),
    company: clean(body.company, 160),
    role: clean(body.role, 80),
    companySize: clean(body.companySize, 40),
    pain: { category: clean(body.painCategory, 60), label: clean(body.painLabel, 120), detail: clean(body.painDetail, 2000) },
    duration: clean(body.duration, 60),
    nextStep: clean(body.nextStep, 80),
    preferredContact: clean(body.preferredContact, 20),
    availability: clean(body.availability, 300),
    message: clean(body.message, 4000),
    interest: plan ? PLANS[plan].name : clean(body.interest, 80),
    plan,
    qa,
    ...(story ? { story, published: false } : {}),
    guide: clean(body.guide, 200),
    score: Number(body.score) || null,
    scores,
    constraint: clean(body.constraint, 80),
    answers,
    transcript,
    source,
    page: clean(body.page, 300),
    landing: clean(body.landing, 300),
    referrer: clean(body.referrer, 300),
    utm,
    stage: 'new',
    value: plan ? PLANS[plan].value : 0,
    followUp: '',
    tags: plan ? [PLANS[plan].name] : story ? ['Client story'] : [],
    notes: [],
    activity: [{ at: now, type: 'created', text: story ? 'Shared a client story' : plan ? `${{ partner: 'Asked for a private conversation about', application: 'Applied for', cohort: 'Requested a seat in', membership: 'Asked to join' }[source] || 'Interested in'} ${PLANS[plan].name}` : `Came in through ${source.replace('-', ' ')}` }],
    country: request.headers.get('x-vercel-ip-country') || '',
    region: request.headers.get('x-vercel-ip-country-region') || '',
    city: decodeURIComponent(request.headers.get('x-vercel-ip-city') || ''),
  };
}

/* ---------- analytics storage
   Engagement events never touch the Blob store that holds leads (Blob's Hobby quota is small and
   going over it would also stop lead capture). They go to Redis (Upstash via the Vercel Marketplace,
   free tier) when it's connected, to a local folder in development, and nowhere otherwise. */
const TZ = 'America/Los_Angeles';
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const partFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', hourCycle: 'h23' });
export function laDay(d = new Date()) { return dayFmt.format(d); }
export function laParts(d) {
  const p = Object.fromEntries(partFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { wd: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday), hr: Number(p.hour) % 24 };
}
export function shiftDay(day, n) {
  const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}

export const analyticsBackend = leadsBackend === 'blob' ? null : leadsBackend;
const DAY_CAP = 25000;                 // most batches kept per day, so a flood can't fill the database
const RAW_TTL = 60 * 60 * 24 * 14;     // raw batches are compacted the next time Analyze opens; this is a backstop
const ROLLUP_TTL = 60 * 60 * 24 * 400; // daily summaries kept for 400 days

export async function saveEventBatch(day, record) {
  const body = JSON.stringify(record);
  if (analyticsBackend === 'local') {
    const dir = path.join(LOCAL, 'events', day); await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`), body); return;
  }
  if (analyticsBackend === 'redis') await redis([['RPUSH', `ev:${day}`, body], ['LTRIM', `ev:${day}`, 0, DAY_CAP - 1], ['EXPIRE', `ev:${day}`, RAW_TTL]]);
}
// Stored daily summaries for the given days: { day: rollup }
export async function readRollups(days) {
  const out = {};
  if (!days.length) return out;
  if (analyticsBackend === 'local') {
    for (const d of days) { try { out[d] = JSON.parse(await fs.readFile(path.join(LOCAL, 'rollups', d + '.json'), 'utf8')).data; } catch {} }
  } else if (analyticsBackend === 'redis') {
    const [vals] = await redis([['MGET', ...days.map((d) => `ru:${d}`)]]);
    vals.forEach((v, i) => { const r = v && parse(v); if (r) out[days[i]] = r.data; });
  }
  return out;
}
// Raw batches for the given days: { day: [record, ...] }
export async function readEvents(days) {
  const out = {};
  if (!days.length) return out;
  if (analyticsBackend === 'local') {
    for (const d of days) {
      let files = []; try { files = await fs.readdir(path.join(LOCAL, 'events', d)); } catch {}
      const recs = []; for (const f of files) { try { recs.push(JSON.parse(await fs.readFile(path.join(LOCAL, 'events', d, f), 'utf8'))); } catch {} }
      if (recs.length) out[d] = recs;
    }
  } else if (analyticsBackend === 'redis') {
    const res = await redis(days.map((d) => ['LRANGE', `ev:${d}`, 0, -1]));
    res.forEach((list, i) => { const recs = (list || []).map(parse).filter(Boolean); if (recs.length) out[days[i]] = recs; });
  }
  return out;
}
// Store a finished day's summary and clear its raw batches.
export async function compactDay(day, rollup) {
  const body = JSON.stringify({ day, data: rollup });
  if (analyticsBackend === 'local') {
    await fs.mkdir(path.join(LOCAL, 'rollups'), { recursive: true });
    await fs.writeFile(path.join(LOCAL, 'rollups', day + '.json'), body);
    await fs.rm(path.join(LOCAL, 'events', day), { recursive: true, force: true }); return;
  }
  if (analyticsBackend === 'redis') await redis([['SET', `ru:${day}`, body, 'EX', ROLLUP_TTL], ['DEL', `ev:${day}`]]);
}
