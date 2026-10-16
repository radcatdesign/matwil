// Shared helpers for the lead API. Files starting with "_" are not deployed as functions.
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const STAGES = ['new', 'contacted', 'discovery', 'proposal', 'won', 'lost'];
export const SOURCES = ['conversation', 'bottleneck-check', 'guide', 'contact', 'booking', 'manual'];

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

/* ---------- storage: private Vercel Blob in production, a local folder in development */
const LOCAL = process.env.LEADS_LOCAL_DIR;
let blobMod;
async function blob() { return (blobMod ||= await import('@vercel/blob')); }
const keyFor = (id) => `leads/${id}.json`;

export async function saveLead(lead) {
  const body = JSON.stringify(lead);
  if (LOCAL) {
    await fs.mkdir(path.join(LOCAL, 'leads'), { recursive: true });
    await fs.writeFile(path.join(LOCAL, keyFor(lead.id)), body);
    return;
  }
  const { put } = await blob();
  await put(keyFor(lead.id), body, {
    access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60,
  });
}

async function readPath(pathname) {
  if (LOCAL) {
    try { return JSON.parse(await fs.readFile(path.join(LOCAL, pathname), 'utf8')); } catch { return null; }
  }
  const { get } = await blob();
  const res = await get(pathname, { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return null;
  return JSON.parse(await new Response(res.stream).text());
}

export const readLead = (id) => readPath(keyFor(id));

export async function listLeads() {
  let paths = [];
  if (LOCAL) {
    try { paths = (await fs.readdir(path.join(LOCAL, 'leads'))).filter((f) => f.endsWith('.json')).map((f) => 'leads/' + f); } catch { paths = []; }
  } else {
    const { list } = await blob();
    let cursor;
    do {
      const page = await list({ prefix: 'leads/', cursor, limit: 1000 });
      paths.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }
  const out = [];
  for (let i = 0; i < paths.length; i += 25) {
    const batch = await Promise.all(paths.slice(i, i + 25).map((p) => readPath(p).catch(() => null)));
    out.push(...batch.filter(Boolean));
  }
  return out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function deleteLead(id) {
  if (LOCAL) { await fs.rm(path.join(LOCAL, keyFor(id)), { force: true }); return; }
  const { del } = await blob();
  await del(keyFor(id));
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
    interest: clean(body.interest, 80),
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
    value: 0,
    followUp: '',
    tags: [],
    notes: [],
    activity: [{ at: now, type: 'created', text: `Came in through ${source.replace('-', ' ')}` }],
    country: request.headers.get('x-vercel-ip-country') || '',
    region: request.headers.get('x-vercel-ip-country-region') || '',
    city: decodeURIComponent(request.headers.get('x-vercel-ip-city') || ''),
  };
}
