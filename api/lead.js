// Public endpoint: every lead-capture tool on the site posts here.
import { json, publicCors, buildLead, saveLead, isEmail } from './_lib.js';

export default {
  async fetch(request) {
    const cors = publicCors(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

    let body;
    try {
      const text = await request.text();
      if (text.length > 30000) return json({ error: 'That message is too long to send.' }, 413, cors);
      body = JSON.parse(text);
    } catch {
      return json({ error: 'We couldn’t read that submission.' }, 400, cors);
    }

    // Quiet spam filters: a hidden field people never see, and forms filled faster than a person can type.
    if (body.website) return json({ ok: true }, 200, cors);
    if (typeof body.elapsed === 'number' && body.elapsed < 1500) return json({ ok: true }, 200, cors);

    const lead = buildLead(body, request);
    if (!isEmail(lead.email)) return json({ error: 'Please add an email address so Matt can reply.' }, 422, cors);
    if (lead.source !== 'guide' && !lead.name) return json({ error: 'Please add your name.' }, 422, cors);

    try {
      await saveLead(lead);
    } catch (err) {
      console.error('saveLead failed', err);
      return json({ error: 'Something went wrong saving that. Please email matt@mattwil.com.' }, 500, cors);
    }
    return json({ ok: true, id: lead.id }, 201, cors);
  },
};
