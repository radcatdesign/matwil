# Matt Wilhelmsen site redesign

Full-site redesign concept for [mattwil.com](https://www.mattwil.com/) by RADCAT. Live preview: https://radcatdesign.github.io/matwil/

Every page in the current mattwil.com sitemap is rebuilt here, at the same paths:

- Home
- About: Mission & values, Background & experience, Why Matt, Philosophy & approach
- Services: One-on-one coaching, Leadership development, Group coaching, Public speaking
- Resources: Blog (plus the 3 article pages), Downloadable guides, Recommended reading
- Success stories: Client success stories (plus the 3 story pages), Testimonials
- Contact: Contact Matt, Book a session

## How it's built

- `tools/build.py` holds all page copy and templates. Edit it, then run `python3 tools/build.py` to regenerate every `index.html`.
- `assets/site.css` and `assets/site.js` are shared by every page.
- Plain static HTML, no framework. GitHub Pages serves it as is.

## Before launch

- Photos, the logo and the guide PDFs load from mattwil.com. Copy them into this repo before the old site goes away.
- Forms open a pre-filled email to Matt. Swap in a form service or a scheduler (Calendly or similar) on Book a session when ready.
- Copy is rewritten and tightened from the current site and needs Matt's sign-off.
- Testimonials are summarized. Drop in Matt's approved, verbatim quotes.
- Blog article pages show a summary and link to the full article on the current site. Migrate the full article text when the site moves.

## Fixed or flagged from the current site

- The footer misspelled his name as "Willhelmsen." Fixed here.
- Background & experience says 450+ businesses coached. Every other page says 150+. This site uses 150+. Confirm with Matt.
- The reading list credited Atomic Habits to Michael E. Gerber. It's by James Clear. Fixed here.
