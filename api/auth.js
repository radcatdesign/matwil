// Checks the CRM passcode so the portal can show a friendly sign-in screen.
import { json, checkAuth, sleep } from './_lib.js';

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const auth = checkAuth(request);
    if (!auth.ok) { await sleep(700); return json({ error: auth.error }, auth.status); }
    return json({ ok: true });
  },
};
