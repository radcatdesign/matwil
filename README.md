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
- **Plans &amp; pricing** (`/get-started/`, the header's Get started button): Operating Partner by private conversation, Private Advisory by application (`/get-started/apply/`), the Founder Cohort with a seat request, and the Operator Membership. Each lands in the CRM tagged with its plan and an estimated deal value, and the full application shows in the lead drawer. Prices, seats, cohort start date and an optional Stripe Payment Link for the membership live in `PLANS` at the top of `tools/build.py`; rebuild after changing them.
- **Client stories** (`/share-your-story/`): a form Matt sends to past clients. They say what changed, add a short quote and choose how it can be shared (name and company, role only, or private). Stories land in the CRM's Stories tab, never in the sales pipeline. Matt can edit the quote and publish with one click; published stories appear at the top of the quote walls on the homepage and testimonials page within a few minutes (served from `/api/stories`, cached at the edge). Private stories can't be published.
- **Homepage proof:** hero quote from Maren Boothby, a stats band (150+ businesses, $500M+ combined revenue across his E-Myth clients, E-Myth's Most Valuable Partner 2017, 7 years at E-Myth), a scrolling ticker of real client outcomes, the featured Boothby story, the quote wall and before-and-after rows for every client story. Static quotes live in `QUOTES` and outcomes in `OUTCOMES` in `tools/build.py`. The three anonymous quotes are verbatim openings from mattwil.com; swap in Matt's full approved versions.
- **CRM** (`/portal/`): pipeline board with drag-and-drop stages, list view, search and filters, follow-up dates, values, tags, notes, contact logging, activity history, pattern charts, manual leads and CSV export.
- **Analyze** (the Leads / Analyze switch in the CRM header): engagement for the last 7, 30 or 90 days against the period before. Traffic and attention, visitor-to-lead rate, leads by source, most-clicked buttons, the chat funnel step by step, the Bottleneck Check funnel, form and guide completion, page-by-page time, scroll and exit rate, sources, referrers, campaigns, devices, countries, landing pages and a day-by-hour heatmap. Every metric has a **?** that explains what it is, how it's calculated, the industry benchmark with its source, and what moves it. Rates based on fewer than 30 visits or events are marked as early data.

### Data storage

Connect **Upstash Redis** (free plan) to the Vercel project: Storage, Create Database, Upstash, connect to `matwil` for all environments, then redeploy. The functions pick it up from `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).

- With Redis connected, leads and engagement data live there. Leads already captured in Blob are copied over automatically the first time the CRM loads.
- Without Redis, leads stay in private Vercel Blob (`matwil-leads` store) and engagement tracking stays off. Analyze shows the setup steps instead.
- Why: Blob on the Hobby plan includes 2,000 writes a month and going over locks the store for 30 days, which would also stop lead capture. Daily CRM use plus visit tracking can reach that. Upstash's free plan includes 500,000 commands a month. A month of a few thousand visits and daily CRM use is roughly 50,000 to 100,000.
- The CRM checks a version marker every 3 minutes (and when you come back to the tab) and only reloads leads when something changed.

### Tracking and privacy

`assets/track.js` runs on every public page. No cookies and no personal data: a random ID in the visitor's browser, the page, referrer, UTM tags, device class, active time (only while the tab is visible and the visitor did something in the last 15 seconds), scroll depth, and clicks on buttons, chat, guides, email and phone links. Country comes from Vercel's edge header; IP addresses are never stored. Visitors with Global Privacy Control or Do Not Track are skipped, bots and headless browsers are dropped, and a browser signed into the CRM is excluded (toggle it in Analyze). A session ends after 30 minutes without activity, and a session counts as engaged with 10+ seconds of active time, 2+ pages, or a lead, matching Google Analytics 4. Raw events roll up into daily summaries the next time Analyze opens; summaries are kept 400 days.

Benchmarks used in Analyze: Databox GA4 benchmarks (Aug 2023) for engagement rate, bounce rate and engagement time; Huemor's 2026 B2B guide (citing WebFX) for visitor-to-lead rate; Zuko (2025) and FormAssembly (2025) for form completion; Riddle's quiz benchmarks (2021 data) for the Bottleneck Check; Yonder and Which-50 (2026) for chat open rate; VWO for scroll depth. Metrics without a dependable public benchmark (pages per session, nudge clicks, guide email capture, reached 75%) say so and compare against the prior period instead.

Spam is filtered with a hidden field and a minimum fill time. To rotate the CRM passcode, change `CRM_PASSCODE` in the Vercel project settings and redeploy.

Run it locally: `npm install`, then `CRM_PASSCODE=anything npm run dev` and open http://localhost:3000. Local leads and engagement data save to `.dev-leads/`.

## How it's built

- `tools/build.py` holds all page copy and templates. Edit it, then run `python3 tools/build.py` to regenerate every `index.html`.
- `assets/site.css` and `assets/site.js` are shared by every page.
- `assets/motion.js` is the GSAP layer: split-line type reveals, image wipes, hairlines drawing in, staggered menus and Lenis smooth scrolling on desktop. It switches off for visitors who prefer reduced motion, and if the CDN fails the page falls back to a simple CSS entrance.
- Plain static HTML, no framework. GSAP 3.15 and Lenis load from jsDelivr. GitHub Pages serves it as is.

## Before launch

- Photos, the logo and the guide PDFs load from mattwil.com. Copy them into this repo before the old site goes away.
- Connect Upstash Redis (see Data storage) so Analyze turns on and the CRM stays inside free limits.
- New leads don't send an alert yet. Add email or Slack notifications so Matt hears about them right away. A scheduler (Calendly or similar) can also drop into Book a session.
- Copy is rewritten and tightened from the current site and needs Matt's sign-off.
- Testimonials are summarized. Drop in Matt's approved, verbatim quotes.
- Blog article pages show a summary and link to the full article on the current site. Migrate the full article text when the site moves.

## Fixed or flagged from the current site

- The footer misspelled his name as "Willhelmsen." Fixed here.
- Background & experience says 450+ businesses coached. Every other page says 150+. This site uses 150+. Confirm with Matt.
- The reading list credited Atomic Habits to Michael E. Gerber. It's by James Clear. Fixed here.
