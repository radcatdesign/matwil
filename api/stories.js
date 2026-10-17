// Public endpoint: client stories Matt has published from the CRM, for the testimonial walls.
// Only stories the client allowed to be shared are ever returned, and only what they allowed.
import { json, listLeads, clean } from './_lib.js';

const ORIGINS = ['https://radcatdesign.github.io', 'https://matwil.vercel.app'];

export default {
  async fetch(request) {
    const origin = request.headers.get('origin') || '';
    const cors = ORIGINS.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : { Vary: 'Origin' };
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, cors);
    // cached at the edge so a busy homepage costs almost nothing
    const cache = { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600', ...cors };
    try {
      const stories = (await listLeads())
        .filter((l) => l.source === 'story' && l.published && l.story && l.story.quote && l.story.consent !== 'private')
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
        .slice(0, 40)
        .map((l) => {
          const full = l.story.consent === 'full';
          const results = (l.qa || []).find((x) => x.q === 'Results');
          return { quote: clean(l.story.quote, 600), name: full ? clean(l.name, 120) : '', role: clean(l.role, 80), company: full ? clean(l.company, 160) : '', results: results ? clean(results.a, 200) : '' };
        });
      return json({ stories }, 200, cache);
    } catch (err) {
      console.error('stories failed', err);
      return json({ stories: [] }, 200, cors);
    }
  },
};
