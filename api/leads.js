// CRM endpoint (passcode required): list, add, update and delete leads.
import { json, checkAuth, sleep, listLeads, readLead, saveLead, deleteLead, readVersion, validId, newId, clean, cleanList, isEmail, STAGES } from './_lib.js';

const STAGE_NAMES = { new: 'New', contacted: 'Contacted', discovery: 'Discovery call', proposal: 'Proposal', won: 'Client', lost: 'Not a fit' };

export default {
  async fetch(request) {
    const auth = checkAuth(request);
    if (!auth.ok) { if (auth.status === 401) await sleep(500); return json({ error: auth.error }, auth.status); }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    try {
      if (request.method === 'GET') {
        if (id) {
          if (!validId(id)) return json({ error: 'Unknown lead' }, 404);
          const lead = await readLead(id);
          return lead ? json({ lead }) : json({ error: 'Unknown lead' }, 404);
        }
        // the portal sends the version it already has; if nothing changed, skip the listing entirely
        const version = await readVersion();
        const since = url.searchParams.get('since');
        if (since && since === version) return json({ unchanged: true, version });
        return json({ leads: await listLeads(), version });
      }

      if (request.method === 'POST') {
        // Matt adds a lead by hand (referral, event, phone call).
        const b = await request.json();
        const now = new Date().toISOString();
        const email = clean(b.email, 160).toLowerCase();
        if (!clean(b.name, 120)) return json({ error: 'Add a name.' }, 422);
        if (email && !isEmail(email)) return json({ error: 'That email doesn’t look right.' }, 422);
        const lead = {
          id: newId(), createdAt: now, updatedAt: now,
          name: clean(b.name, 120), email, phone: clean(b.phone, 40), company: clean(b.company, 160),
          role: clean(b.role, 80), companySize: clean(b.companySize, 40),
          pain: { category: clean(b.painCategory, 60), label: clean(b.painLabel, 120), detail: clean(b.painDetail, 2000) },
          source: 'manual', referrer: clean(b.referredBy, 200), stage: STAGES.includes(b.stage) ? b.stage : 'new',
          value: Math.max(0, Number(b.value) || 0), followUp: clean(b.followUp, 10), tags: cleanList(b.tags),
          notes: clean(b.note, 4000) ? [{ at: now, text: clean(b.note, 4000) }] : [],
          activity: [{ at: now, type: 'created', text: 'Added by hand' }],
          transcript: [], answers: [], utm: {},
        };
        const v = await saveLead(lead);
        return json({ lead, ...v }, 201);
      }

      if (request.method === 'PATCH') {
        if (!validId(id)) return json({ error: 'Unknown lead' }, 404);
        const lead = await readLead(id);
        if (!lead) return json({ error: 'Unknown lead' }, 404);
        const b = await request.json();
        const now = new Date().toISOString();
        lead.activity = lead.activity || [];
        lead.notes = lead.notes || [];

        if (b.stage && STAGES.includes(b.stage) && b.stage !== lead.stage) {
          lead.activity.push({ at: now, type: 'stage', text: `Moved from ${STAGE_NAMES[lead.stage] || lead.stage} to ${STAGE_NAMES[b.stage]}` });
          lead.stage = b.stage;
          if (b.stage === 'won' || b.stage === 'lost') lead.closedAt = now;
        }
        if ('value' in b) lead.value = Math.max(0, Number(b.value) || 0);
        if ('followUp' in b) {
          const f = clean(b.followUp, 10);
          if (f !== lead.followUp) lead.activity.push({ at: now, type: 'followup', text: f ? `Follow-up set for ${f}` : 'Follow-up cleared' });
          lead.followUp = f;
        }
        if ('tags' in b) lead.tags = cleanList(b.tags);
        for (const k of ['name', 'phone', 'company', 'role', 'companySize']) if (k in b) lead[k] = clean(b[k], 160);
        if ('email' in b) { const e = clean(b.email, 160).toLowerCase(); if (!e || isEmail(e)) lead.email = e; }
        if (b.note && clean(b.note, 4000)) lead.notes.push({ at: now, text: clean(b.note, 4000) });
        if (b.deleteNote && typeof b.deleteNote === 'string') lead.notes = lead.notes.filter((n) => n.at !== b.deleteNote);
        if (b.logContact) lead.activity.push({ at: now, type: 'contact', text: clean(b.logContact, 200) });
        if (b.lastViewedAt) lead.lastViewedAt = now;
        if (lead.source === 'story' && lead.story) {
          if ('quote' in b && clean(b.quote, 600)) lead.story.quote = clean(b.quote, 600);
          if ('published' in b && lead.story.consent !== 'private' && !!b.published !== !!lead.published) {
            lead.published = !!b.published;
            lead.activity.push({ at: now, type: 'publish', text: lead.published ? 'Published on the site' : 'Taken off the site' });
          }
        }

        lead.updatedAt = now;
        const v = await saveLead(lead);
        return json({ lead, ...v });
      }

      if (request.method === 'DELETE') {
        if (!validId(id)) return json({ error: 'Unknown lead' }, 404);
        const v = await deleteLead(id);
        return json({ ok: true, ...v });
      }

      return json({ error: 'Method not allowed' }, 405);
    } catch (err) {
      console.error('leads endpoint failed', err);
      return json({ error: 'Something went wrong on the server. Try again in a moment.' }, 500);
    }
  },
};
