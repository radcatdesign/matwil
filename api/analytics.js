// CRM endpoint (passcode required): engagement analytics for a date range, with the previous period for comparison.
// Raw event batches are rolled up per Pacific day; finished days are compacted so reads stay fast.
import { json, checkAuth, sleep, listLeads, laDay, laParts, shiftDay, analyticsBackend, readRollups, readEvents, compactDay } from './_lib.js';

const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex|brave|startpage|kagi)\./;
const SOCIAL = /(^|\.)(linkedin|lnkd|facebook|fb|instagram|t\.co|x\.com|twitter|youtube|reddit|threads|tiktok|pinterest)\./;
const SELF = /(mattwil\.com|matwil\.vercel\.app|radcatdesign\.github\.io)$/;
const CHAT_STEPS = ['pain', 'painDetail', 'companySize', 'role', 'duration', 'name', 'company', 'email', 'phone', 'nextStep'];

function sourceOf(pv) {
  const m = (pv.um || '').toLowerCase(), s = (pv.us || '').toLowerCase(), ref = (pv.ref || '').replace(/^www\./, '');
  if (/cpc|ppc|paid|display|ads?$/.test(m)) return 'Paid';
  if (/email|newsletter/.test(m)) return 'Email';
  if (/social/.test(m) || SOCIAL.test(s + '.') || SOCIAL.test(ref + '.')) return 'Social';
  if (SEARCH.test(ref + '.') || SEARCH.test(s + '.')) return 'Organic search';
  if (ref && !SELF.test(ref)) return 'Referral';
  if (s) return 'Campaign';
  return 'Direct';
}
const inc = (o, k, n = 1) => { if (k) o[k] = (o[k] || 0) + n; };
const add = (arr, v) => { if (v && !arr.includes(v)) arr.push(v); };

function emptyRollup() {
  return {
    visitors: [], newVisitors: [], sessions: 0, engagedSessions: 0, pageviews: 0, activeMs: 0,
    scroll: { n: 0, sum: 0, r25: 0, r50: 0, r75: 0, r100: 0 },
    pages: {}, sources: {}, referrers: {}, campaigns: {}, devices: {}, countries: {}, landing: {}, heat: {},
    ctas: {}, intents: {},
    chat: { nudgeShown: 0, nudgeClick: 0, opens: 0, openSessions: 0, origins: {}, steps: {}, completes: 0 },
    check: { pageSessions: 0, starts: 0, answers: {}, completes: 0, captures: 0 },
    guide: { pageSessions: 0, clicks: 0, sends: 0, skips: 0 },
    forms: Object.fromEntries(['contact', 'booking', 'partner', 'application', 'cohort', 'membership'].map((f) => [f, { pageSessions: 0, starts: 0, submits: 0, errors: 0 }])),
    plans: { pageSessions: 0 },
    leadSessions: 0, leadsBySrc: {},
  };
}

// Build one day's rollup from raw batches.
function rollup(records) {
  const r = emptyRollup();
  const sessions = {};
  for (const rec of records) {
    const skew = (rec.at || 0) - (rec.cn || rec.at || 0);
    const S = (sessions[rec.s] ||= { v: rec.v, country: rec.country, pvs: [], pvMap: {}, ev: [] });
    for (const e of rec.e || []) { e.when = (e.ts || rec.at) + skew; S.ev.push(e); }
  }
  for (const S of Object.values(sessions)) {
    S.ev.sort((a, b) => a.when - b.when);
    const pvs = S.ev.filter((e) => e.t === 'pv');
    if (!pvs.length) continue; // a stray engagement batch without its pageview is ignored
    r.sessions++; add(r.visitors, S.v);
    if (pvs.some((p) => p.nv)) add(r.newVisitors, S.v);
    const first = pvs[0], src = sourceOf(first);
    inc(r.sources, src); inc(r.devices, first.dev || 'desktop'); inc(r.countries, S.country || 'Unknown'); inc(r.landing, first.p);
    const refHost = (first.ref || '').replace(/^www\./, ''); if (refHost && !SELF.test(refHost)) inc(r.referrers, refHost);
    if (first.uc) inc(r.campaigns, first.uc);
    // pageviews + engagement
    const byPv = {};
    let activeMs = 0;
    pvs.forEach((p, k) => {
      r.pageviews++;
      const pg = (r.pages[p.p] ||= { views: 0, visitors: [], activeMs: 0, n: 0, sdSum: 0, r75: 0, entries: 0, exits: 0 });
      pg.views++; add(pg.visitors, S.v);
      if (k === 0) pg.entries++;
      if (k === pvs.length - 1) pg.exits++;
      const { wd, hr } = laParts(new Date(p.when)); inc(r.heat, wd + '-' + hr);
      byPv[p.pv] = { p: p.p, ms: 0, sd: 0, seen: false };
    });
    for (const e of S.ev) {
      if (e.t === 'eng' && byPv[e.pv]) { const b = byPv[e.pv]; b.ms += e.ms; b.sd = Math.max(b.sd, e.sd); b.seen = true; }
    }
    for (const b of Object.values(byPv)) {
      activeMs += b.ms;
      if (!b.seen) continue;
      const pg = r.pages[b.p]; pg.activeMs += b.ms; pg.n++; pg.sdSum += b.sd; if (b.sd >= 75) pg.r75++;
      r.scroll.n++; r.scroll.sum += b.sd;
      if (b.sd >= 25) r.scroll.r25++; if (b.sd >= 50) r.scroll.r50++; if (b.sd >= 75) r.scroll.r75++; if (b.sd >= 98) r.scroll.r100++;
    }
    r.activeMs += activeMs;
    // conversions and tool usage, counted once per session where it matters
    const leads = S.ev.filter((e) => e.t === 'lead');
    if (leads.length) { r.leadSessions++; leads.forEach((l) => inc(r.leadsBySrc, l.src || 'unknown')); }
    const engaged = pvs.length >= 2 || activeMs >= 10000 || leads.length > 0;
    if (engaged) r.engagedSessions++;
    const paths = pvs.map((p) => p.p);
    if (paths.some((p) => /\/bottleneck-check\/$/.test(p))) r.check.pageSessions++;
    if (paths.some((p) => /\/downloadable-guides\/$/.test(p))) r.guide.pageSessions++;
    if (paths.some((p) => /\/contact-matt\/$/.test(p))) r.forms.contact.pageSessions++;
    if (paths.some((p) => /\/book-a-session\/$/.test(p))) r.forms.booking.pageSessions++;
    if (paths.some((p) => /\/get-started\/$/.test(p))) { r.plans.pageSessions++; r.forms.partner.pageSessions++; r.forms.cohort.pageSessions++; r.forms.membership.pageSessions++; }
    if (paths.some((p) => /\/get-started\/apply\/$/.test(p))) r.forms.application.pageSessions++;
    const steps = new Set(), answers = new Set(), formStarts = new Set();
    let opened = false;
    for (const e of S.ev) {
      if (e.t === 'cta') { inc(r.ctas, (e.k || 'cta') + '|' + (e.l || '')); if (e.k === 'email' || e.k === 'phone') inc(r.intents, e.k); }
      if (e.t === 'chat') {
        if (e.a === 'nudge_shown') r.chat.nudgeShown++;
        if (e.a === 'nudge_click') r.chat.nudgeClick++;
        if (e.a === 'open') { r.chat.opens++; opened = true; inc(r.chat.origins, e.o || 'launcher'); }
        if (e.a === 'step' && CHAT_STEPS.includes(e.st)) steps.add(e.st);
        if (e.a === 'complete') r.chat.completes++;
      }
      if (e.t === 'check') {
        if (e.a === 'start') r.check.starts++;
        if (e.a === 'answer' && e.i >= 1 && e.i <= 8) answers.add(e.i);
        if (e.a === 'complete') r.check.completes++;
        if (e.a === 'capture') r.check.captures++;
      }
      if (e.t === 'guide') { if (e.a === 'click') r.guide.clicks++; if (e.a === 'send') r.guide.sends++; if (e.a === 'skip') r.guide.skips++; }
      if (e.t === 'form' && r.forms[e.f]) {
        if (e.a === 'start' && !formStarts.has(e.f)) { formStarts.add(e.f); r.forms[e.f].starts++; }
        if (e.a === 'submit') r.forms[e.f].submits++;
        if (e.a === 'error') r.forms[e.f].errors++;
      }
    }
    if (opened) r.chat.openSessions++;
    steps.forEach((st) => inc(r.chat.steps, st));
    answers.forEach((i) => inc(r.check.answers, String(i)));
  }
  return r;
}

// Sum numbers, union id lists, recurse into objects.
function merge(a, b) {
  for (const [k, v] of Object.entries(b)) {
    if (Array.isArray(v)) { const set = new Set(a[k] || []); v.forEach((x) => set.add(x)); a[k] = [...set]; }
    else if (v && typeof v === 'object') a[k] = merge(a[k] || {}, v);
    else if (typeof v === 'number') a[k] = (a[k] || 0) + v;
    else if (!(k in a)) a[k] = v;
  }
  return a;
}
// Replace id lists with counts before sending to the browser.
function finalize(r) {
  const out = JSON.parse(JSON.stringify(r));
  out.visitors = r.visitors.length; out.newVisitors = r.newVisitors.length;
  for (const pg of Object.values(out.pages)) pg.visitors = pg.visitors.length;
  return out;
}

async function loadDays(days, today) {
  const result = await readRollups(days);
  // raw batches only exist for today and for finished days nobody has opened Analyze since
  const yesterday = shiftDay(today, -1);
  const rawDays = days.filter((d) => !result[d] || d >= yesterday);
  const raw = await readEvents(rawDays);
  for (const d of Object.keys(raw)) {
    const fresh = rollup(raw[d]);
    const combined = result[d] ? merge(JSON.parse(JSON.stringify(result[d])), fresh) : fresh;
    if (d < today) await compactDay(d, combined); // the day is over: keep the summary, drop the raw batches
    result[d] = combined;
  }
  return result;
}

export default {
  async fetch(request) {
    const auth = checkAuth(request);
    if (!auth.ok) { if (auth.status === 401) await sleep(500); return json({ error: auth.error }, auth.status); }
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
    if (!analyticsBackend) return json({ setup: true });
    try {
      const url = new URL(request.url);
      const n = [7, 30, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 30;
      const today = laDay();
      const cur = Array.from({ length: n }, (_, i) => shiftDay(today, -(n - 1) + i));
      const prev = Array.from({ length: n }, (_, i) => shiftDay(cur[0], -n + i));
      const byDay = await loadDays(prev.concat(cur), today);
      const sum = (days) => days.reduce((acc, d) => (byDay[d] ? merge(acc, JSON.parse(JSON.stringify(byDay[d]))) : acc), emptyRollup());
      const leads = await listLeads();
      const leadDay = (l) => laDay(new Date(l.createdAt));
      const inRange = (days) => { const s = new Set(days); return leads.filter((l) => s.has(leadDay(l))); };
      const lc = inRange(cur), lp = inRange(prev);
      const bySrc = {}; lc.forEach((l) => inc(bySrc, l.source));
      const daily = cur.map((d) => {
        const r = byDay[d];
        return { day: d, visitors: r ? r.visitors.length : 0, sessions: r ? r.sessions : 0, pageviews: r ? r.pageviews : 0, leads: lc.filter((l) => leadDay(l) === d).length };
      });
      return json({
        range: { days: n, start: cur[0], end: today, prevStart: prev[0], prevEnd: prev[prev.length - 1] },
        current: finalize(sum(cur)), previous: finalize(sum(prev)), daily,
        leads: { current: lc.length, previous: lp.length, bySource: bySrc, won: lc.filter((l) => l.stage === 'won').length },
        firstData: Object.keys(byDay).sort()[0] || null,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('analytics failed', err);
      return json({ error: 'Couldn’t build the analytics right now. Try again in a moment.' }, 500);
    }
  },
};
