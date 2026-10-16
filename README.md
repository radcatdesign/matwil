# Matt Wilhelmsen site redesign

Full-site redesign and lead system for [mattwil.com](https://www.mattwil.com/) by RADCAT.

- Live site with working lead capture: https://matwil.vercel.app/
- Matt's CRM: https://matwil.vercel.app/portal/ (passcode is the `CRM_PASSCODE` environment variable on the Vercel project)
- Static mirror: https://radcatdesign.github.io/matwil/ (its forms post to the Vercel API)

Every page in the current mattwil.com sitemap is rebuilt here, at the same paths:

- Home
- About: Mission & values, Background & experience, Why Matt, Philosophy & approach
- Services: One-on-one coaching, Leadership development, Group coaching, Public speaking
- Resources: Blog (plus the 3 article pages), Downloadable guides, Recommended reading
- Success stories: Client success stories (plus the 3 story pages), Testimonials
- Contact: Contact Matt, Book a session

## Lead system

Every capture tool posts to `/api/lead`, and every lead lands in the CRM with what the person shared.

- **Talk it through:** a conversational chat with Matt on every page. People pick what's weighing on them, add a few details and leave their contact info. The full conversation is saved with the lead. A gentle nudge appears once per visit after 30 seconds or 60% scroll.
- **Bottleneck check** (`/bottleneck-check/`): eight statements, instant results with the biggest constraint and three first moves, then an invitation to get Matt's take.
- **Guide downloads:** a soft dialog asks where to send the guide, with a "just download it" option.
- **Contact and booking forms:** post straight to the CRM.
- **CRM** (`/portal/`): pipeline board with drag-and-drop stages, list view, search and filters, follow-up dates, values, tags, notes, contact logging, activity history, pattern charts, manual leads and CSV export.

Backend: Vercel Functions in `api/` with leads stored as private JSON files in Vercel Blob (`matwil-leads` store). Spam is filtered with a hidden field and a minimum fill time. To rotate the CRM passcode, change `CRM_PASSCODE` in the Vercel project settings and redeploy.

Run it locally: `npm install`, then `CRM_PASSCODE=anything npm run dev` and open http://localhost:3000. Local leads save to `.dev-leads/`.

## How it's built

- `tools/build.py` holds all page copy and templates. Edit it, then run `python3 tools/build.py` to regenerate every `index.html`.
- `assets/site.css` and `assets/site.js` are shared by every page.
- `assets/motion.js` is the GSAP layer: split-line type reveals, image wipes, hairlines drawing in, staggered menus and Lenis smooth scrolling on desktop. It switches off for visitors who prefer reduced motion, and if the CDN fails the page falls back to a simple CSS entrance.
- Plain static HTML, no framework. GSAP 3.15 and Lenis load from jsDelivr. GitHub Pages serves it as is.

## Before launch

- Photos, the logo and the guide PDFs load from mattwil.com. Copy them into this repo before the old site goes away.
- New leads don't send an alert yet. Add email or Slack notifications so Matt hears about them right away. A scheduler (Calendly or similar) can also drop into Book a session.
- Copy is rewritten and tightened from the current site and needs Matt's sign-off.
- Testimonials are summarized. Drop in Matt's approved, verbatim quotes.
- Blog article pages show a summary and link to the full article on the current site. Migrate the full article text when the site moves.

## Fixed or flagged from the current site

- The footer misspelled his name as "Willhelmsen." Fixed here.
- Background & experience says 450+ businesses coached. Every other page says 150+. This site uses 150+. Confirm with Matt.
- The reading list credited Atomic Habits to Michael E. Gerber. It's by James Clear. Fixed here.
