#!/usr/bin/env python3
"""Builds the Matt Wilhelmsen site redesign as static HTML.

Run from anywhere:  python3 tools/build.py
Every page is written into the repo root, one folder per URL, so the paths
match the current mattwil.com sitemap. Shared styles and behavior live in
assets/site.css and assets/site.js. Edit page copy in this file and rebuild.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
U = 'https://www.mattwil.com/wp-content/uploads/'
EMAIL = 'matt@mattwil.com'
PHONE = '(707) 484-5255'
TEL = '+17074845255'
SOCIAL = [('LinkedIn', 'https://www.linkedin.com/in/mwilhelmsen'),
          ('Instagram', 'https://www.instagram.com/mcwilhelmsen/'),
          ('X', 'https://x.com/MCWilhelmsen')]
BOOK = 'contact/book-a-session/'
START = 'get-started/'

# ---------------------------------------------------------------- plans
# Pricing for /get-started/. Change it here and rebuild: the page, the application and the
# CRM's deal values (api/_plans.js is generated from this) all update together.
PLANS = {
    'advisory': dict(name='Private Advisory', price=9500, term='12-month engagement, billed monthly',
                     openings='4 companies a year', value=114000),
    'cohort': dict(name='Founder Cohort', price=1250, term='6 months', full=6750, seats=10, taken=0,
                   starts='January 2027', value=7500),
    'membership': dict(name='Operator Membership', price=149, term='Month to month, cancel anytime', value=1788,
                       checkout=''),  # paste a Stripe Payment Link here to take card payment on the spot
}


def usd(n):
    return f'${n:,}'

# The sitemap, mirrored from mattwil.com
NAV = [
    ('About', 'about/', [
        ('Mission &amp; values', 'about/mission-values/'),
        ('Background &amp; experience', 'about/background-experience/'),
        ('Why Matt', 'about/differentiator-why-matt/'),
        ('Philosophy &amp; approach', 'about/philosophy-approach/')]),
    ('Services', 'services/', [
        ('One-on-one coaching', 'services/one-on-one-coaching/'),
        ('Leadership development', 'services/leadership-development/'),
        ('Group coaching', 'services/group-coaching/'),
        ('Public speaking', 'services/public-speaking/'),
        ('Plans &amp; pricing', START)]),
    ('Resources', 'resources/', [
        ('Bottleneck check', 'bottleneck-check/'),
        ('Blog', 'resources/blogs/'),
        ('Downloadable guides', 'resources/downloadable-guides/'),
        ('Recommended reading', 'resources/recommended-reading/')]),
    ('Success stories', 'success-stories/', [
        ('Client success stories', 'success-stories/client-success-stories/'),
        ('Testimonials', 'success-stories/testimonials/')]),
    ('Contact', 'contact/', [
        ('Contact Matt', 'contact/contact-matt/'),
        ('Book a session', 'contact/book-a-session/')]),
]

CHEV = ('<svg class="chev" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" '
        'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>')

# ---------------------------------------------------------------- content data

SERVICES = [
    dict(path='services/one-on-one-coaching/', name='One-on-one coaching', img='one-on-one-1.jpg', pos='62% 30%',
         alt='Matt in a one-on-one session with a client',
         blurb='Private coaching for owners and CEOs who are ready to get out of the bottleneck.'),
    dict(path='services/leadership-development/', name='Leadership development', img='Interior-Banner.png', pos='62% 40%',
         alt='Matt working with a leadership team around a conference table',
         blurb='Grow leaders who decide well, build strong teams and lead change with confidence.'),
    dict(path='services/group-coaching/', name='Group coaching', img='group-coaching.jpg', pos='55% 30%',
         alt='A team in a group coaching session',
         blurb='Get a team communicating, trusting each other and solving problems together.'),
    dict(path='services/public-speaking/', name='Public speaking', img='image-11.png', pos='45% 30%',
         alt='Matt presenting at a whiteboard to a seated group',
         blurb='Keynotes, panels and workshops shaped around your audience.'),
]

STORIES = [
    dict(slug='good-months-stopped-being-a-surprise', title='Good months stopped being a surprise',
         client='CEO, small business (under 50 employees)', tag='Revenue growth',
         img='image-12.png', pos='50% 40%', alt='A leadership team in discussion around a conference table',
         summary='A growing company with unpredictable months turned its results into something it could plan for.',
         challenge='The company was growing, but it didn’t feel under control. Strong months and weak months came and went, and nobody could say why. The team spent more time reacting than working a plan, and the CEO knew something had to change without being able to name it.',
         solution='Matt and the CEO went after root causes instead of symptoms. Together they put in what was missing: clear direction, defined standards for execution, real accountability and a short list of numbers that showed what was actually happening. A weekly and monthly rhythm kept priorities in view and the team aligned.',
         result='Revenue climbed and growth became dependable. Nobody worked longer hours. The business finally had the structure to turn steady effort into steady results, and good months became something the team planned for.'),
    dict(slug='from-a-capable-team-to-an-execution-engine', title='From a capable team to an execution engine',
         client='Executive team, multi-leader organization', tag='Leadership team',
         img='workshop.jpg', pos='50% 35%', alt='Matt leading a working session with a client team',
         summary='A strong leadership team learned to own outcomes, so the CEO could finally step back.',
         challenge='The leadership team was talented, but the CEO was still in the middle of everything. Managers completed tasks without owning results, and decisions kept climbing back to the top. Without clarity, structure and accountability, the team couldn’t run on its own.',
         solution='They rebuilt how the team operates from the inside: clear roles and decision rights, a regular execution cadence, scoreboards everyone could see, and defined standards for each leader. It wasn’t a one-off workshop. It became the way the business runs day to day.',
         result='Leaders started owning outcomes instead of waiting for direction. Managers drove the results, and the CEO gained a team that could truly lead. The business stopped depending on one person.'),
    dict(slug='when-scaling-stopped-feeling-like-growth', title='When scaling stopped feeling like growth',
         client='CEO, mid-size company (50 to 200 employees)', tag='Scaling',
         img='The-Secret-to-Scaling-Your-Business-Without-Sacrificing-Quality.jpg', pos='50% 50%',
         alt='Close-up of hands reviewing paperwork at a desk',
         summary='Fast growth was breaking things until the company built an operating system that could carry it.',
         challenge='Rapid growth was outrunning the company’s systems. New hires, new markets and new complexity piled up while every decision still ran through the CEO. Managers weren’t sure what they owned, execution was uneven, and growth was creating more problems than progress.',
         solution='Matt and the CEO worked through the whole operating system: direction, ownership, an execution cadence and the core processes needed to scale without breaking. They tackled the highest-leverage problems first, in an order where each change made the next one easier.',
         result='For the first time, the CEO could step back from daily operations. The company had real structure under it, and growth started to feel like progress again.'),
]

POSTS = [
    dict(slug='5-leadership-habits-that-drive-team-success-and-how-to-build-them',
         title='5 leadership habits that drive team success, and how to build them',
         img='5-Leadership-Habits-That-Drive-Team-Success-And-How-to-Build-Them.jpg', pos='50% 30%',
         alt='Portrait of a smiling professional woman', pain='leaders',
         dek='Strong teams usually trace back to a few things the leader does every day.',
         intro='Great teams rarely come from a great plan alone. They come from a leader’s daily habits, the small, repeated choices that set the tone for everyone else. This article walks through five of those habits, why each one matters, and how to start practicing one of them this week.',
         ideas=['Set expectations nobody can misread', 'Raise feedback while problems are still small',
                'Build systems instead of becoming the bottleneck', 'Don’t put off the hard conversation',
                'Live the standard you ask of others', 'Pick one habit and start there']),
    dict(slug='the-secret-to-scaling-your-business-without-sacrificing-quality',
         title='The secret to scaling your business without sacrificing quality',
         img='The-Secret-to-Scaling-Your-Business-Without-Sacrificing-Quality.jpg', pos='50% 50%',
         alt='Close-up of hands reviewing paperwork at a desk', pain='growth',
         dek='Growth exposes every weak spot in how work gets done. Here’s how to keep the bar where it belongs.',
         intro='Most owners worry that growing means letting quality slip. It doesn’t have to. Quality that depends on one great person can’t scale, but quality that lives in your systems can. This piece covers how to protect the standard while the business gets bigger.',
         ideas=['Treat quality as a system, not a star employee', 'Define what good looks like before you hand work off',
                'Hire people who can hold the bar, not just fill a role', 'Measure quality so it can’t quietly drift',
                'Let growth move at the pace your systems can support']),
    dict(slug='balancing-leadership-and-life-proven-strategies-for-thriving-both-personally-and-professionally',
         title='Balancing leadership and life: strategies for thriving at work and at home',
         img='Balancing-Leadership-and-Life_-Proven-Strategies-for-Thriving-Both-Personally-and-Professionally.jpg',
         pos='45% 35%', alt='A man in boxing gloves training', pain='stretched',
         dek='Leading a business and having a life aren’t opposing goals.',
         intro='Running a company can take everything you give it. The leaders who last are the ones who protect their energy, their attention and the people who matter most. This article shares practical ways to do that without letting the business slide.',
         ideas=['Plan around your energy, not only your calendar', 'Treat boundaries as part of leading',
                'Give full attention to whatever is in front of you', 'Delegate so there’s room for life outside work',
                'Decide for yourself what winning at life means', 'Play the long game']),
]

GUIDES = [
    ('The Ultimate Leadership Playbook: 10 Proven Strategies for Driving Team Excellence',
     'Ten field-tested leadership strategies for building a team that performs without you in the room.',
     'Leadership-Playbook.dc_.pdf'),
    ('SMART Goals Made Simple: The Only Framework You’ll Ever Need for Success',
     'A plain guide to setting goals that are specific, measurable and actually get finished.',
     'SMART-Goals-Made-Simple.dc_-1.pdf'),
    ('The Team Communication Blueprint: 5 Steps to Better Conversations, Stronger Collaboration',
     'Five steps for clearer conversations, because most team problems start as communication problems.',
     'Team-Communication-Blueprint.dc_-1.pdf'),
    ('The Scalable Business Checklist: Build Processes That Grow With You',
     'A checklist for building processes that grow with the business instead of around you.',
     'Scalable-Business-Checklist.dc_-1.pdf'),
]

BOOKS = [
    ('Leadership &amp; influence', [
        ('Dare to Lead', 'Brené Brown', 'Courage and honesty as everyday leadership skills.'),
        ('Extreme Ownership', 'Jocko Willink and Leif Babin', 'Taking full responsibility for outcomes, good and bad.'),
        ('Leaders Eat Last', 'Simon Sinek', 'Why trust and safety are what make teams work.')]),
    ('Business growth &amp; strategy', [
        ('The E-Myth Revisited', 'Michael E. Gerber', 'Working on your business instead of only in it.'),
        ('Good to Great', 'Jim Collins', 'What separates companies that make the leap from those that don’t.'),
        ('Blue Ocean Strategy', 'W. Chan Kim and Renée Mauborgne', 'Creating new demand instead of fighting over old markets.')]),
    ('Personal development &amp; productivity', [
        ('Atomic Habits', 'James Clear', 'How small habits compound into big results.'),
        ('The ONE Thing', 'Gary Keller and Jay Papasan', 'Finding the one priority that makes everything else easier.'),
        ('Grit', 'Angela Duckworth', 'Why persistence and passion outlast raw talent.')]),
]

# ---------------------------------------------------------------- helpers

def rel(cur, target):
    out = '../' * cur.count('/') + target
    return out if out else './'


def img(name, alt='', pos=None, lazy=True, eager=False):
    style = f' style="object-position:{pos}"' if pos else ''
    load = '' if eager else ' loading="lazy"'
    return f'<img src="{U}{name}" alt="{alt}"{style}{load}>'


def crumbs(L, trail):
    parts = [f'<li><a href="{L("")}">Home</a></li>']
    for i, (label, path) in enumerate(trail):
        if i == len(trail) - 1:
            parts.append(f'<li><span aria-current="page">{label}</span></li>')
        else:
            parts.append(f'<li><a href="{L(path)}">{label}</a></li>')
    return '<nav aria-label="Breadcrumb"><ol class="crumbs">' + ''.join(parts) + '</ol></nav>'


def page_head(L, trail, h1, lede, image=None, pos='50% 40%', alt='', ctas=''):
    copy = f'''<div class="ph-copy">
      {crumbs(L, trail)}
      <h1>{h1}</h1>
      <p class="lede">{lede}</p>
      {ctas}
    </div>'''
    if image:
        return f'''<section class="page-head" aria-label="Page introduction">
    {copy}
    <figure class="slant">{img(image, alt, pos, eager=True)}</figure>
  </section>'''
    return f'<section class="page-head text-only" aria-label="Page introduction">{copy}</section>'


def chat_btn(label='Talk it through', pain=None, cls='btn btn-line'):
    p = f' data-chat-pain="{pain}"' if pain else ''
    return f'<button class="{cls}" type="button" data-chat{p}>{label}</button>'


def ctas(L, primary=('Book a consultation', BOOK), secondary=None, chat=None):
    out = f'<div class="ctas"><a class="btn" href="{L(primary[1])}">{primary[0]}</a>'
    if secondary:
        out += f'<a class="btn btn-line" href="{L(secondary[1])}">{secondary[0]}</a>'
    if chat is not None:
        out += chat_btn(pain=chat or None)
    return out + '</div>'


def items(pairs, cols=2):
    body = ''.join(f'<div class="item"><h3>{h}</h3><p>{p}</p></div>' for h, p in pairs)
    return f'<div class="items" style="--cols:{cols}">{body}</div>'


def checks(lines, cols=1):
    return f'<ul class="checks" style="--cols:{cols}">' + ''.join(f'<li>{x}</li>' for x in lines) + '</ul>'


def steps(pairs, cols=4):
    body = ''.join(f'<li><h3>{h}</h3><p>{p}</p></li>' for h, p in pairs)
    return f'<ol class="steps" style="--cols:{cols}">{body}</ol>'


def rows(pairs, big=False):
    cls = 'rows big' if big else 'rows'
    return f'<div class="{cls}">' + ''.join(f'<div><h3>{h}</h3><p>{p}</p></div>' for h, p in pairs) + '</div>'


def card(L, path, title, text, image=None, pos=None, alt='', more='Learn more', meta=None):
    ph = f'<span class="ph">{img(image, alt, pos)}</span>' if image else ''
    cls = 'card' if image else 'card text-card'
    m = f'<span class="meta">{meta}</span>' if meta else ''
    return (f'<a class="{cls}" href="{L(path)}">{ph}<span class="body">{m}<h3>{title}</h3>'
            f'<p>{text}</p><span class="more">{more}</span></span></a>')


def sec_head(h2, text=None, solo=False):
    p = f'<p class="lede">{text}</p>' if text else ''
    cls = 'sec-head solo' if solo or not text else 'sec-head'
    return f'<div class="{cls}"><h2>{h2}</h2>{p}</div>'


def proof(stats):
    cls = 'proof three' if len(stats) == 3 else 'proof'
    lis = ''.join(f'<li><b>{b}</b>{t}</li>' for b, t in stats)
    return f'<section class="{cls}" aria-label="At a glance"><ul class="wrap">{lis}</ul></section>'


def close_band(L, photo=False):
    cls = 'close' if photo else 'close plain'
    return f'''<section class="{cls}" aria-labelledby="closeTitle">
  <div class="wrap">
    <h2 id="closeTitle">Let’s build what’s next.</h2>
    <p class="lede">Start with a consultation. Bring the problem that keeps landing on your desk and leave with a clearer next step.</p>
    <div class="ctas">
      <a class="btn btn-light" href="{L(BOOK)}">Book a consultation</a>
      <a class="btn btn-line-light" href="{L('contact/contact-matt/')}">Contact Matt</a>
    </div>
    <div class="reach">
      <p><span>Email</span><a class="link on-dark" href="mailto:{EMAIL}">{EMAIL}</a></p>
      <p><span>Phone</span><a class="link on-dark" href="tel:{TEL}">{PHONE}</a></p>
    </div>
  </div>
</section>'''


def story_card(L, s, kind='small'):
    if kind == 'wide':
        return f'''<a class="story wide" href="{L('success-story/' + s['slug'] + '/')}">
        <span class="ph">{img(s['img'], s['alt'], s['pos'])}</span>
        <div><span class="meta">{s['client']}</span><h3><span class="t">{s['title']}</span></h3><p>{s['summary']}</p><span class="more">Read the story</span></div>
      </a>'''
    if kind == 'big':
        return f'''<a class="story big" href="{L('success-story/' + s['slug'] + '/')}">
        <span class="ph">{img(s['img'], s['alt'], s['pos'])}</span>
        <h3><span class="t">{s['title']}</span></h3><span class="more">Read the story</span>
      </a>'''
    return f'''<a class="story small" href="{L('success-story/' + s['slug'] + '/')}">
        <span class="ph">{img(s['img'], s['alt'], s['pos'])}</span>
        <div><h3><span class="t">{s['title']}</span></h3><span class="more">Read the story</span></div>
      </a>'''


def stories_block(L):
    return '<div class="cards" style="--cols:3">' + ''.join(
        card(L, 'success-story/' + s['slug'] + '/', s['title'], s['summary'], more='Read the story', meta=s['client'])
        for s in STORIES) + '</div>'


def post_list(L, posts=POSTS, with_dek=False):
    out = []
    for p in posts:
        dek = f'<p>{p["dek"]}</p>' if with_dek else ''
        out.append(f'''<li class="post"><a href="{L(p['slug'] + '/')}">
        <div><h3>{p['title']}</h3>{dek}</div><span class="more">Read article</span></a></li>''')
    return '<ul class="posts text">' + ''.join(out) + '</ul>'


def feature_quote(L, link=True):
    more = (f'<a class="link on-dark" href="{L("success-stories/testimonials/")}">Read client testimonials</a>'
            if link else '')
    return f'''<div class="feature">
      <blockquote>
        <p>&ldquo;Both a trusted advisor and a rigorous thinking partner.&rdquo;</p>
        <cite><b>Maren E. Boothby, MS, CCC-SLP</b>CEO, Boothby Therapy Services</cite>
      </blockquote>
      <div class="arc">
        <h3>Over several years of coaching with Matt, Maren:</h3>
        <ol>
          <li>Moved from President to CEO</li>
          <li>Doubled the size of the company</li>
          <li>Expanded into a new state</li>
          <li>Sold the business at a strong multiple</li>
        </ol>
        {more}
      </div>
    </div>'''


# ---------------------------------------------------------------- shell

def header(L, path, section):
    lis = []
    for label, top, subs in NAV:
        cur = ' aria-current="true"' if section == top else ''
        links = ''.join(
            f'<a href="{L(p)}"' + (' aria-current="page"' if p == path else '') + f'>{t}</a>' for t, p in subs)
        lis.append(f'<li class="has-menu"><a class="top" href="{L(top)}"{cur}>{label}{CHEV}</a>'
                   f'<div class="menu">{links}</div></li>')
    groups = []
    for label, top, subs in NAV:
        allsubs = [('Overview', top)] + subs
        links = ''.join(
            f'<a href="{L(p)}"' + (' aria-current="page"' if p == path else '') + f'>{t}</a>' for t, p in allsubs)
        op = ' open' if section == top else ''
        groups.append(f'<details{op}><summary>{label}{CHEV}</summary><div>{links}</div></details>')
    return f'''<a class="skip" href="#main">Skip to content</a>
<div class="concept" id="concept">Website redesign concept by RADCAT for mattwil.com. <button type="button" id="hideConcept">Hide</button></div>
<header class="site-header" id="header">
  <div class="wrap nav">
    <a class="logo" href="{L('')}" aria-label="Matt Wilhelmsen, home"><img src="{U}logo.svg" alt="Matt Wilhelmsen, Business &amp; Executive Coaching" width="389" height="54"></a>
    <nav class="primary" aria-label="Main"><ul>{''.join(lis)}</ul></nav>
    <a class="btn btn-sm nav-cta" href="{L(START)}">Get started</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobileNav">Menu</button>
  </div>
  <nav class="mobile-nav" id="mobileNav" aria-label="Mobile" hidden>
    {''.join(groups)}
    <a class="btn" href="{L(START)}">Get started</a>
  </nav>
</header>'''


def footer(L):
    cols = []
    for label, top, subs in NAV:
        lis = ''.join(f'<li><a href="{L(p)}">{t}</a></li>' for t, p in subs)
        cols.append(f'<div><h4><a href="{L(top)}">{label}</a></h4><ul>{lis}</ul></div>')
    soc = ''.join(f'<a href="{u}">{n}</a>' for n, u in SOCIAL)
    return f'''<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <a class="logo" href="{L('')}"><img src="{U}logo.svg" alt="Matt Wilhelmsen, Business &amp; Executive Coaching" width="389" height="54" loading="lazy"></a>
        <ul style="margin-top:1.5rem"><li><a href="mailto:{EMAIL}">{EMAIL}</a></li><li><a href="tel:{TEL}">{PHONE}</a></li></ul>
      </div>
      {''.join(cols)}
    </div>
    <div class="foot-base">
      <span>&copy; 2026 Matt Wilhelmsen. All rights reserved. <a href="{L('portal/')}" style="margin-left:1.25rem">Portal</a></span>
      <div class="social">{soc}</div>
    </div>
  </div>
</footer>'''


def render(page):
    path = page['path']
    L = lambda p: rel(path, p)
    root = '../' * path.count('/')
    title = page['title'] if path == '' else f"{page['title']} | Matt Wilhelmsen"
    body = page['body'](L)
    close = close_band(L, photo=(path == '')) if page.get('close', True) else ''
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{page['desc']}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{page['desc']}">
<meta property="og:image" content="{U}Social-Graph-Image-Matt-Wilhemsen.jpg">
<link rel="icon" href="{U}cropped-Favicon-MattWilhemsen-270x270.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400;1,8..60,500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}assets/site.css">
<link rel="stylesheet" href="{root}assets/leads.css">
<script>(function(d){{try{{if(sessionStorage.getItem('mw-concept')==='hidden')d.classList.add('concept-hidden')}}catch(e){{}}if(!matchMedia('(prefers-reduced-motion: reduce)').matches){{d.classList.add('motion');setTimeout(function(){{if(!window.__mwMotion)d.classList.remove('motion')}},2500)}}}})(document.documentElement)</script>
</head>
<body data-root="{root}">
{header(L, path, page.get('section', ''))}
<main id="main">
{body}
{close}
</main>
{footer(L)}
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/SplitText.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.3.27/dist/lenis.min.js" defer></script>
<script src="{root}assets/track.js" defer></script>
<script src="{root}assets/site.js" defer></script>
<script src="{root}assets/leads.js" defer></script>
<script src="{root}assets/motion.js" defer></script>
</body>
</html>
'''

# ---------------------------------------------------------------- pages

PAGES = []


def page(path, title, desc, section='', close=True):
    def wrap(fn):
        PAGES.append(dict(path=path, title=title, desc=desc, section=section, close=close, body=fn))
        return fn
    return wrap


@page('', 'Matt Wilhelmsen | Business &amp; Executive Coaching',
      'Business and executive coaching for owners and CEOs ready to scale. Build the systems, leaders and rhythm that let your team own the results.')
def home(L):
    return f'''<section class="hero" aria-labelledby="heroTitle">
  <div class="hero-copy">
    <h1 id="heroTitle">Build a company that doesn’t need you in every room.</h1>
    <p class="lede">Business and executive coaching for owners and CEOs who are ready to scale. Matt helps you build the systems, the leaders, and the rhythm that let your team own the results.</p>
    {ctas(L, secondary=('See client results', 'success-stories/'))}
  </div>
  <figure class="slant">{img('MattWill_Hero-scaled-e1773687387871.jpg', 'Matt Wilhelmsen smiling with arms crossed in front of a bookshelf', '76% 30%', eager=True)}</figure>
</section>

{proof([('150+', 'businesses coached'), ('E-Myth', 'Former E-Myth Worldwide coach'), ('3 generations', 'of entrepreneurs in the family'), ('4 ways', 'to work together, solo to full team')])}

<section class="sec" aria-labelledby="approachTitle">
  <div class="wrap split">
    <div>
      <h2 id="approachTitle" style="max-width:10em;margin-bottom:.65em">Busy isn’t the same as aligned.</h2>
      <p class="lede">Most owners Matt works with already have good people and a real business. What’s missing is clarity: who owns what, how decisions get made, and what a good month actually takes. Coaching is where that gets built, one honest conversation at a time.</p>
      <div style="margin:3rem 0 2.5rem">{rows([('Honest feedback', 'You hear what’s true, including the parts nobody on your team will say out loud.'), ('Sustainable strategy', 'Systems your company can still run on next year, not plans that only look good this quarter.'), ('Real collaboration', 'Matt works alongside you and your leaders, not from a script written for someone else’s business.')])}</div>
      <a class="link" href="{L('about/philosophy-approach/')}">How Matt coaches</a>
    </div>
    <figure class="photo">{img('image-10.png', 'Matt in a coaching conversation with a client, laptops open on the table')}
      <figcaption>Every engagement starts with the business you actually have.</figcaption></figure>
  </div>
</section>

<section class="sec fit" aria-labelledby="fitTitle">
  <div class="wrap fit-grid">
    <div>
      <h2 id="fitTitle">Start with what your week looks like.</h2>
      <p class="lede">Pick the line that sounds most like you. Each one points to the work that fixes it.</p>
      <div class="fit-options" role="tablist" aria-label="Coaching services" id="fitOptions"></div>
      <p class="fit-foot">Not sure? <a class="link on-dark" href="{L('bottleneck-check/')}">Take the 2-minute bottleneck check</a> or <a class="link on-dark" href="{L('services/')}">see all services</a>.</p>
    </div>
    <div class="fit-panel" role="tabpanel" id="fitPanel" aria-live="polite">
      <div class="fit-body" id="fitBody">
        <div class="svc" id="fitSvc"></div>
        <h3 id="fitTitle2"></h3>
        <p id="fitDesc"></p>
        <ul id="fitList"></ul>
        <a class="btn" id="fitLink" href="{L('services/')}">Explore</a>
      </div>
    </div>
  </div>
</section>

<section class="sec tight" aria-labelledby="startTitle">
  <div class="wrap">
    {sec_head('Not ready for a call? Start smaller.', 'Two easy ways to get a straight read on what’s holding the business back.').replace('<h2>', '<h2 id="startTitle">', 1)}
    <div class="cards" style="--cols:2">
      <a class="card text-card" href="{L('bottleneck-check/')}"><span class="body"><span class="meta">2 minutes, results right away</span><h3>Take the bottleneck check</h3><p>Eight quick statements that show where the business is leaning on you hardest, plus three first moves.</p><span class="more">Start the check</span></span></a>
      <button class="card text-card" type="button" data-chat><span class="body"><span class="meta">A short conversation</span><h3>Tell Matt what’s going on</h3><p>Share what’s weighing on you in a few taps. Matt reads every one and replies personally within a day.</p><span class="more">Talk it through</span></span></button>
    </div>
  </div>
</section>

<section class="sec" aria-labelledby="resultsTitle">
  <div class="wrap">
    {sec_head('What changes when it works.', 'Fewer surprises, a team that owns its numbers, and an owner with room to lead again. Here’s what that has looked like for Matt’s clients.').replace('<h2>', '<h2 id="resultsTitle">', 1)}
    {feature_quote(L)}
    <div style="height:clamp(56px,6vw,80px)"></div>
    {stories_block(L)}
    <div class="sec-foot"><a class="link" href="{L('success-stories/')}">All success stories</a></div>
  </div>
</section>

<section class="sec white" aria-labelledby="mattTitle">
  <div class="wrap">
    <div class="split center">
      <figure class="matt-photo">{img('Matt-Approach-IMG.jpg', 'Matt Wilhelmsen working at a table with a laptop and a cup of coffee')}</figure>
      <div>
        <h2 id="mattTitle" style="margin-bottom:.6em">Meet Matt Wilhelmsen</h2>
        <p class="lede">Matt comes from three generations of entrepreneurs, so he learned how a business really runs long before he coached one.</p>
        <p>He spent years as an E-Myth Worldwide coach and has since worked with more than 150 companies, helping owners turn the business they built into one that can grow without them holding every piece together. His style is direct and prepared. No recycled frameworks, just focused work on what your company needs next.</p>
        <p style="margin-top:1.9rem"><a class="link" href="{L('about/background-experience/')}">Get to know Matt</a></p>
      </div>
    </div>
    <div class="values">
      <h3>What he works by</h3>
      <ul><li>Love</li><li>Trust</li><li>Integrity</li><li>Facts</li><li>Adaptability</li><li>Endless growth</li></ul>
    </div>
  </div>
</section>

<section class="sec" aria-labelledby="insTitle">
  <div class="wrap">
    {sec_head('Notes for leaders', 'Practical reads from Matt’s blog on leading teams, scaling well, and keeping a life outside the business.').replace('<h2>', '<h2 id="insTitle">', 1)}
    {post_list(L)}
    <div class="sec-foot">
      <a class="link" href="{L('resources/blogs/')}">Read the blog</a>
      <a class="link" href="{L('resources/downloadable-guides/')}">Downloadable guides</a>
      <a class="link" href="{L('resources/recommended-reading/')}">Recommended reading</a>
    </div>
  </div>
</section>'''


# ---------- About

@page('about/', 'About', 'Who Matt Wilhelmsen is, what he believes and how he coaches business owners and leadership teams.', 'about/')
def about(L):
    subs = [
        ('about/mission-values/', 'Mission &amp; values', 'Why the work exists and the six values behind it.'),
        ('about/background-experience/', 'Background &amp; experience', 'Three generations of family business and more than a decade of coaching.'),
        ('about/differentiator-why-matt/', 'Why Matt', 'What clients say makes working with him different.'),
        ('about/philosophy-approach/', 'Philosophy &amp; approach', 'The beliefs and frameworks behind every engagement.'),
    ]
    cards = ''.join(card(L, p, t, d) for p, t, d in subs)
    return f'''{page_head(L, [('About', 'about/')], 'A coach who has run the business, not just studied it.', 'Third-generation entrepreneur, former E-Myth Worldwide coach and a straight talker. Here’s who Matt is, what he believes and how he works.', ctas=ctas(L))}
{proof([('150+', 'businesses coached'), ('10+ years', 'of hands-on coaching'), ('3 generations', 'of entrepreneurs in the family')])}
<section class="sec">
  <div class="wrap">
    {sec_head('Get to know Matt', 'Four short reads on where he comes from and what you can expect when you work together.')}
    <div class="cards" style="--cols:4">{cards}</div>
  </div>
</section>
<section class="sec white">
  <div class="wrap split">
    <h2 style="max-width:10em">Focus beats doing more.</h2>
    <div>
      <p class="lede">Matt’s view is simple. Most businesses don’t need more activity. They need clearer direction, leaders who own their part, and systems that handle the routine so people can do their best work.</p>
      <p>That’s what the coaching builds, whether it’s one-on-one with the owner or with the whole leadership team.</p>
      <p style="margin-top:1.75rem"><a class="link" href="{L('services/')}">See how you can work together</a></p>
    </div>
  </div>
</section>'''


@page('about/mission-values/', 'Mission &amp; values', 'Matt Wilhelmsen’s mission for small and mid-sized businesses and the six values behind his coaching.', 'about/')
def mission(L):
    values = [
        ('Love', 'Lead from care, not fear. That’s where courage, creativity and real connection come from.'),
        ('Trust', 'The base of every relationship with your team, customers and community. It speeds up decisions and keeps things transparent.'),
        ('Integrity', 'Do the right thing, especially when it’s hard. Stay honest and accountable.'),
        ('Facts', 'Decide on evidence and verified data, not assumptions.'),
        ('Adaptability', 'Treat change as an opening. Stay flexible and resilient.'),
        ('Endless growth', 'Keep learning and improving. There is no finish line.'),
    ]
    return f'''{page_head(L, [('About', 'about/'), ('Mission &amp; values', 'about/mission-values/')], 'Grow on purpose.', 'Help small and mid-sized businesses grow with systems, processes and people that fit what the owner actually values.')}
<section class="sec">
  <div class="wrap split">
    <h2 style="max-width:9em">The mission</h2>
    <div>
      <p class="lede">Matt’s work is about transforming small and medium-sized businesses through three things: strategic management systems, efficient processes, and people who are trusted to lead.</p>
      <p>The goal is a business that reflects the owner’s values and purpose, without the complexity it doesn’t need. It draws on more than three generations of entrepreneurial experience and one steady belief: success comes from focus and deliberate leadership, not from doing more.</p>
      <p>So the coaching is direct. Name the obstacle, deal with it head on, and leave with a roadmap.</p>
    </div>
  </div>
</section>
<section class="sec dark tight">
  <div class="wrap">
    {sec_head('Six values', 'What Matt works by, and what he helps clients build into their own companies.')}
    {items(values, 3)}
  </div>
</section>'''


@page('about/background-experience/', 'Background &amp; experience', 'Matt Wilhelmsen’s family business roots, operating experience and coaching track record.', 'about/')
def background(L):
    return f'''{page_head(L, [('About', 'about/'), ('Background &amp; experience', 'about/background-experience/')], 'Raised around family business. Built teams before coaching them.', 'Three generations of entrepreneurs, years of running operations and more than a decade of coaching owners and leadership teams.')}
{proof([('150+', 'businesses coached'), ('10+ years', 'in the work'), ('3 generations', 'of family businesses')])}
<section class="sec">
  <div class="wrap split">
    <h2 style="max-width:9em">Where it started</h2>
    <div>
      <p class="lede">Matt’s family has built and run businesses for three generations. He grew up watching what made them work, and what made them hard.</p>
      <p>Before coaching full time, he led teams and ran operations of his own. He also spent years as an E-Myth Worldwide coach, which shaped the systems-first way he works today.</p>
    </div>
  </div>
</section>
<section class="sec white">
  <div class="wrap">
    {sec_head('What he’s done', 'Hands-on experience across industries, from the shop floor to the boardroom.')}
    {checks(['Coached 150+ businesses across manufacturing, retail, professional services, technology and family-owned companies', 'Built teams firsthand, with ownership of hiring, systems, culture and P&amp;L', 'Designed leadership frameworks that move companies from founder-dependent to systems-driven', 'Spoken and led workshops for corporate teams, entrepreneurs and national industry conferences', 'Coached as part of E-Myth Worldwide before building his own practice'], 2)}
  </div>
</section>
<section class="sec">
  <div class="wrap split">
    <h2 style="max-width:9em">Why he does this</h2>
    <div>
      <p class="lede">Strong businesses share three things: clear leaders, teams that trust each other, and systems that take care of the routine.</p>
      <p>Matt’s job is to help owners build all three, so the company can grow without running through one person.</p>
      <p style="margin-top:1.75rem"><a class="link" href="{L('about/philosophy-approach/')}">Read his philosophy</a></p>
    </div>
  </div>
</section>'''


@page('about/differentiator-why-matt/', 'Why Matt', 'What makes Matt Wilhelmsen’s executive coaching and leadership work different.', 'about/')
def why(L):
    diffs = [
        ('Real-world expertise', 'More than a decade of hands-on work with 150+ businesses. Methods that came from doing, not from a textbook.'),
        ('Built for your business', 'Every session and workshop is shaped around your situation. Businesses differ, even when the problems rhyme.'),
        ('Engaging delivery', 'Interactive sessions that use stories, real examples and hands-on work, so the ideas stick.'),
        ('Cross-industry insight', 'Patterns from many industries, applied to the leadership and team problems every company runs into.'),
        ('Built to last', 'Tools, frameworks and strategies that keep working long after the sessions end.'),
        ('Honest conversations', 'Direct, candid feedback. You hear what you need to hear, not what’s comfortable.'),
        ('Proven team impact', 'A track record of scalable systems, stronger collaboration and more resilient teams.'),
    ]
    return f'''{page_head(L, [('About', 'about/'), ('Why Matt', 'about/differentiator-why-matt/')], 'Plenty of people coach. Here’s what’s different.', 'Practical, honest and built around your business, with results that outlast the engagement.')}
<section class="sec">
  <div class="wrap">
    {sec_head('Seven reasons clients choose Matt', 'What owners and leadership teams point to when they explain why the work landed.')}
    {items(diffs, 2)}
  </div>
</section>
<section class="sec white">
  <div class="wrap">{feature_quote(L)}</div>
</section>'''


@page('about/philosophy-approach/', 'Philosophy &amp; approach', 'The coaching philosophy and working approach behind Matt Wilhelmsen’s engagements.', 'about/')
def philosophy(L):
    beliefs = [
        ('Every business is different. The problems usually aren’t.', 'Communication gaps, clunky processes and leadership friction show up in every industry. The fix gets tailored to you, informed by what’s worked across many sectors.'),
        ('Truth first.', 'Growth starts with candid conversations. Feedback is direct so leaders can deal with what’s actually wrong.'),
        ('Sustainable over shortcuts.', 'Lasting tools and frameworks instead of quick fixes, for individuals and for teams.'),
        ('Collaboration at the core.', 'Leadership is influence and vision, not authority. The work aligns personal and company values with practical strategy.'),
    ]
    frameworks = ['A defined vision used as a real management tool', 'Measurable indicators, documented and tracked over time',
                  'Communication channels built for teamwork and transparency', 'Growth-mindset habits that build adaptability',
                  'Scalable systems for day-to-day operations', 'Values-driven models that tie culture to strategy']
    return f'''{page_head(L, [('About', 'about/'), ('Philosophy &amp; approach', 'about/philosophy-approach/')], 'Clarity. Honesty. Action.', 'Leadership and growth come down to those three things. Here’s how they show up in the work.')}
<section class="sec">
  <div class="wrap">
    {sec_head('Philosophy', 'Four beliefs that shape every engagement.')}
    {rows(beliefs, big=True)}
  </div>
</section>
<section class="sec white">
  <div class="wrap">
    {sec_head('Approach', 'Tailored to your goals, grounded in proven frameworks, and focused on what you’ll do next.')}
    <div class="split">
      <div>
        <h3 style="margin-bottom:.6rem">Tailored to you</h3>
        <p>Coaching and workshops are built around your goals and challenges, and measured against outcomes that matter to your business.</p>
        <h3 style="margin:2rem 0 .6rem">Action every time</h3>
        <p>Every session ends with clear next steps, practical tools and a measurable result to move toward.</p>
      </div>
      <div>
        <h3 style="margin-bottom:1rem">Frameworks behind the work</h3>
        {checks(frameworks)}
      </div>
    </div>
  </div>
</section>'''


# ---------- Services

@page('services/', 'Services', 'Executive coaching, leadership development, group coaching and keynote speaking with Matt Wilhelmsen.', 'services/')
def services(L):
    cards = ''.join(card(L, s['path'], s['name'], s['blurb'], more='Explore') for s in SERVICES)
    return f'''{page_head(L, [('Services', 'services/')], 'Four ways to work with Matt.', 'From private coaching for the CEO to keynotes for a full room, every engagement is built around where your business is now.', 'workshop.jpg', '50% 35%', 'Matt leading a working session with a client team', ctas(L, chat=''))}
<section class="sec">
  <div class="wrap">
    {sec_head('Choose your starting point', 'Most clients start with one service and add others as the business grows.')}
    <div class="cards" style="--cols:4">{cards}</div>
  </div>
</section>
<section class="sec dark">
  <div class="wrap">
    {sec_head('How engagements usually grow', 'Coaching starts with the leader and widens to the team, so the whole company moves together.')}
    {steps([('Start with the leader', 'One-on-one coaching with the CEO or owner to set direction and find the real bottlenecks.'), ('Bring in the team', 'Coaching widens to the C-suite and middle managers so everyone works from the same plan.'), ('Run both together', 'Individual and whole-team sessions run side by side, measured against real outcomes.')], 3)}
  </div>
</section>'''


@page('services/one-on-one-coaching/', 'One-on-one coaching', 'One-on-one executive coaching for business owners and CEOs who want stronger teams, better decisions and confident growth.', 'services/')
def one_on_one(L):
    focus = [('Leadership development', 'Grow the habits and presence that make people want to follow.'),
             ('Strategic decision making', 'Make bigger calls with more clarity and less second-guessing.'),
             ('Work-life balance', 'Lead well without the business taking everything.'),
             ('Career planning', 'Decide where you’re going next and what it takes to get there.')]
    benefits = ['Focused attention on your goals', 'Practical frameworks for growth', 'Alignment with your company’s values',
                'Initiatives that matter, not busywork', 'Processes built to scale', 'Open communication and real accountability',
                'Success measured with data']
    how = [('Discovery &amp; goal setting', 'A deep look at the business to find the real challenges and opportunities, aligned with your values.'),
           ('One-on-one leadership coaching', 'Sessions built around you to sharpen clarity, confidence and decision-making.'),
           ('Team integration', 'The work extends to your team to improve collaboration, alignment and communication.'),
           ('Whole-team coaching', 'Ongoing sessions focused on scale and steady improvement, tracked against measurable results.')]
    return f'''{page_head(L, [('Services', 'services/'), ('One-on-one coaching', 'services/one-on-one-coaching/')], 'Get out of the bottleneck.', 'Private coaching for business owners and CEOs. Your goals, your challenges and a plan you actually carry out.', 'one-on-one-1.jpg', '62% 30%', 'Matt in a one-on-one session with a client', ctas(L, chat='decisions'))}
<section class="sec">
  <div class="wrap">
    {sec_head('Areas of focus', 'Sessions center on the decisions and habits that have the biggest effect on you and your company.')}
    {items(focus, 2)}
  </div>
</section>
<section class="sec white">
  <div class="wrap split">
    <div><h2 style="max-width:9em;margin-bottom:.6em">What you get</h2><p class="lede">One-on-one time with a coach who knows how businesses actually run.</p></div>
    {checks(benefits)}
  </div>
</section>
<section class="sec dark">
  <div class="wrap">
    {sec_head('How it works', 'It starts with you and grows to include the team when you’re ready.')}
    {steps(how, 4)}
  </div>
</section>'''


@page('services/leadership-development/', 'Leadership development', 'Leadership development with Matt Wilhelmsen: decision making, team building, conflict resolution and leading change.', 'services/')
def leadership(L):
    focus = [('Strategic decision making', 'Make sound calls faster, with the right information in front of you.'),
             ('Effective team building', 'Put the right people in the right seats and help them work as one.'),
             ('Conflict resolution', 'Turn friction into progress instead of letting it fester.'),
             ('Inspiring and motivating teams', 'Lead through influence and vision so people bring their best.')]
    outcomes = [('Stronger leaders', 'Sharper skills and a practical toolkit for leading with impact.'),
                ('Confidence through change', 'Leaders who can guide the company through growth and uncertainty.'),
                ('Better collaboration', 'Teams that work together and reach more of their potential.')]
    return f'''{page_head(L, [('Services', 'services/'), ('Leadership development', 'services/leadership-development/')], 'Build a bench you can trust.', 'Leadership is influence and vision, not a title. Develop leaders who inspire their teams, encourage new ideas and deliver results.', 'Interior-Banner.png', '62% 40%', 'Matt working with a leadership team around a conference table', ctas(L, chat='leaders'))}
<section class="sec">
  <div class="wrap">
    {sec_head('Areas of focus', 'The skills that separate leaders who manage tasks from leaders who move a company.')}
    {items(focus, 2)}
  </div>
</section>
<section class="sec white">
  <div class="wrap">
    {sec_head('What changes', 'The results leaders and their teams can expect.')}
    {items(outcomes, 3)}
  </div>
</section>'''


@page('services/group-coaching/', 'Group coaching', 'Group coaching for teams: better communication, trust, accountability and shared problem-solving.', 'services/')
def group(L):
    focus = [('Communication', 'Improve how the team talks and clear the blockers to open conversation.'),
             ('Trust and accountability', 'Build a culture where people feel empowered and own their part.'),
             ('Collaborative problem-solving', 'Use everyone’s perspective to reach better answers together.'),
             ('Resilience and adaptability', 'Prepare the team to handle change and uncertainty with confidence.')]
    outcomes = [('A stronger culture', 'More synergy and mutual respect across the team.'),
                ('Real alignment', 'Shared clarity on roles, goals and expectations.'),
                ('Practical strategies', 'Concrete plans built to produce results, not just good meetings.')]
    return f'''{page_head(L, [('Services', 'services/'), ('Group coaching', 'services/group-coaching/')], 'Get the whole team pulling one way.', 'Coaching for teams that need to work better together, whether they’re working through friction or chasing a shared goal.', 'group-coaching.jpg', '55% 30%', 'A team in a group coaching session', ctas(L, chat='alignment'))}
<section class="sec">
  <div class="wrap">
    {sec_head('Areas of focus', 'Where group coaching makes the biggest difference.')}
    {items(focus, 2)}
  </div>
</section>
<section class="sec white">
  <div class="wrap">
    {sec_head('What changes', 'What teams take away from the work.')}
    {items(outcomes, 3)}
  </div>
</section>'''


@page('services/public-speaking/', 'Public speaking', 'Book Matt Wilhelmsen for keynotes, panels and workshops on leadership, scalable systems and balancing business with life.', 'services/')
def speaking(L):
    topics = [('Leadership development', 'Actionable ideas for leading people well.'),
              ('Building scalable systems', 'How to streamline operations and keep growth sustainable.'),
              ('Balancing business and life', 'Managing priorities so the business doesn’t take everything.')]
    formats = [('Keynotes', 'High-energy talks for large audiences.'),
               ('Panel discussions', 'A strong voice on multi-speaker panels, including audience Q&amp;A.'),
               ('Workshops and seminars', 'Interactive sessions built around practical strategies.')]
    audiences = [('Corporate teams', 'Motivate staff around shared goals.'),
                 ('Entrepreneurs', 'Tools for working through challenges and spotting opportunities.'),
                 ('Industry conferences', 'Fresh thinking and thought leadership for the room.')]
    return f'''{page_head(L, [('Services', 'services/'), ('Public speaking', 'services/public-speaking/')], 'Bring Matt to your stage.', 'Talks shaped around your audience, built to educate, inspire and leave people with something they can use on Monday.', 'image-11.png', '45% 30%', 'Matt presenting at a whiteboard to a seated group', ctas(L, ('Ask about speaking', 'contact/contact-matt/')))}
<section class="sec">
  <div class="wrap">
    {sec_head('Speaking topics', 'Each talk is tailored, but these are the subjects Matt is asked about most.')}
    {items(topics, 3)}
  </div>
</section>
<section class="sec white">
  <div class="wrap">
    {sec_head('Formats', 'From the main stage to a working session.')}
    {items(formats, 3)}
  </div>
</section>
<section class="sec">
  <div class="wrap">
    {sec_head('Who it’s for', 'Audiences Matt speaks to regularly.')}
    {items(audiences, 3)}
  </div>
</section>
<section class="sec dark tight">
  <div class="wrap split center">
    <div><h2 style="max-width:10em">Make it yours.</h2></div>
    <div>
      {checks(['Pick the focus area that fits your event', 'Set the length and format', 'Add Q&amp;A or breakout discussions'])}
      <div class="ctas" style="margin-top:2rem"><a class="btn btn-light" href="{L('contact/contact-matt/')}">Ask about speaking</a></div>
    </div>
  </div>
</section>'''


# ---------- Resources

@page('resources/', 'Resources', 'Articles, free downloadable guides and a recommended reading list for leaders and business owners.', 'resources/')
def resources(L):
    subs = [('resources/blogs/', 'Blog', 'Practical reads on leading teams, scaling well and keeping a life outside the business.'),
            ('resources/downloadable-guides/', 'Downloadable guides', 'Free playbooks and checklists you can put to work this week.'),
            ('resources/recommended-reading/', 'Recommended reading', 'Nine books every leader should know, grouped by what they’ll help with.')]
    cards = ''.join(card(L, p, t, d, more='Open') for p, t, d in subs)
    return f'''{page_head(L, [('Resources', 'resources/')], 'Keep sharpening.', 'Articles, free guides and a reading list for leaders who want to keep getting better between sessions.')}
<section class="sec">
  <div class="wrap">
    <div class="cards" style="--cols:3">{cards}</div>
  </div>
</section>
<section class="sec white">
  <div class="wrap">
    {sec_head('Latest from the blog')}
    {post_list(L, with_dek=True)}
  </div>
</section>'''


@page('resources/blogs/', 'Blog', 'Articles from Matt Wilhelmsen on leadership habits, scaling a business and balancing leadership with life.', 'resources/')
def blogs(L):
    return f'''{page_head(L, [('Resources', 'resources/'), ('Blog', 'resources/blogs/')], 'Notes for leaders', 'Practical reads on leading teams, scaling well and keeping a life outside the business.')}
<section class="sec tight" style="padding-top:0">
  <div class="wrap">{post_list(L, with_dek=True)}</div>
</section>'''


@page('resources/downloadable-guides/', 'Downloadable guides', 'Free PDF guides from Matt Wilhelmsen on leadership, goal setting, team communication and scalable processes.', 'resources/')
def guides(L):
    lis = ''.join(f'''<li class="guide"><span class="doc" aria-hidden="true"></span>
        <div><h3>{t}</h3><p>{d}</p></div>
        <a class="btn btn-line btn-sm" href="{U}{f}" data-guide="{t}" download>Download PDF</a></li>''' for t, d, f in GUIDES)
    return f'''{page_head(L, [('Resources', 'resources/'), ('Downloadable guides', 'resources/downloadable-guides/')], 'Free tools for leading better.', 'Playbooks and checklists for stronger leadership and a business that scales. Download, print and put them to work.')}
<section class="sec tight" style="padding-top:0">
  <div class="wrap"><ul class="guides">{lis}</ul></div>
</section>'''


@page('resources/recommended-reading/', 'Recommended reading', 'Books every leader should know, recommended by Matt Wilhelmsen: leadership, business growth and personal development.', 'resources/')
def reading(L):
    groups = []
    for g, books in BOOKS:
        bk = ''.join(f'<div class="book"><h3>{t}</h3><div class="by">{a}</div><p>{n}</p></div>' for t, a, n in books)
        groups.append(f'<div class="book-group"><h2>{g}</h2>{bk}</div>')
    return f'''{page_head(L, [('Resources', 'resources/'), ('Recommended reading', 'resources/recommended-reading/')], 'Books every leader should know.', 'A short reading list for leadership, business growth and personal development, kept up to date.')}
<section class="sec">
  <div class="wrap"><div class="books">{''.join(groups)}</div></div>
</section>'''


def post_page(p):
    def body(L):
        others = [o for o in POSTS if o is not p]
        rel_links = ''.join(f'<a href="{L(o["slug"] + "/")}"><span class="uline">{o["title"]}</span></a>' for o in others)
        return f'''{page_head(L, [('Resources', 'resources/'), ('Blog', 'resources/blogs/'), (p['title'], p['slug'] + '/')], p['title'], p['dek'])}
<section class="sec tight" style="padding-top:0">
  <div class="wrap">
    <figure class="article-hero"><span class="ph">{img(p['img'], p['alt'], p['pos'], eager=True)}</span></figure>
    <div class="article">
      <div class="prose">
        <p>{p['intro']}</p>
        <h2>The short version</h2>
        {checks(p['ideas'])}
        <p style="margin-top:2rem"><a class="btn btn-line" href="https://www.mattwil.com/{p['slug']}/">Read the full article</a></p>
        <div class="callout"><h3>Sound familiar?</h3><p>If this is showing up in your business right now, tell Matt what’s going on. He reads every one and replies personally.</p>{chat_btn('Talk it through', p.get('pain'), 'btn')}</div>
      </div>
      <aside class="aside">
        <h3>More from the blog</h3>
        <div class="related">{rel_links}</div>
        <a class="link" href="{L('resources/blogs/')}">All articles</a>
      </aside>
    </div>
  </div>
</section>'''
    return body


for _p in POSTS:
    page(_p['slug'] + '/', _p['title'], _p['dek'], 'resources/')(post_page(_p))


# ---------- Success stories

@page('success-stories/', 'Success stories', 'How business owners and leadership teams changed the way their companies run after coaching with Matt Wilhelmsen.', 'success-stories/')
def success(L):
    return f'''{page_head(L, [('Success stories', 'success-stories/')], 'What changes when the work gets done.', 'Owners who stepped out of the bottleneck, leadership teams that started owning outcomes, and companies that grew without breaking.', 'image-12.png', '50% 40%', 'A leadership team in discussion around a conference table', ctas(L, ('Book a consultation', BOOK), ('Read testimonials', 'success-stories/testimonials/')))}
<section class="sec">
  <div class="wrap">
    {feature_quote(L)}
  </div>
</section>
<section class="sec white">
  <div class="wrap">
    {sec_head('Client stories', 'Three engagements, from a small business to a multi-leader organization.')}
    {stories_block(L)}
  </div>
</section>'''


@page('success-stories/client-success-stories/', 'Client success stories', 'Client case studies from Matt Wilhelmsen’s coaching: revenue growth, leadership teams and scaling.', 'success-stories/')
def client_stories(L):
    return f'''{page_head(L, [('Success stories', 'success-stories/'), ('Client success stories', 'success-stories/client-success-stories/')], 'Client success stories', 'The challenge, what changed and the result, from owners and leadership teams Matt has worked with.')}
<section class="sec tight" style="padding-top:0">
  <div class="wrap">{stories_block(L)}</div>
</section>'''


def story_page(i, s):
    def body(L):
        prev_s = STORIES[i - 1] if i > 0 else None
        next_s = STORIES[i + 1] if i < len(STORIES) - 1 else None
        prev_l = (f'<a href="{L("success-story/" + prev_s["slug"] + "/")}"><span>Previous story</span><strong><span class="uline">{prev_s["title"]}</span></strong></a>'
                  if prev_s else '<span></span>')
        next_l = (f'<a class="next" href="{L("success-story/" + next_s["slug"] + "/")}"><span>Next story</span><strong><span class="uline">{next_s["title"]}</span></strong></a>'
                  if next_s else f'<a class="next" href="{L("success-stories/client-success-stories/")}"><span>Back to</span><strong><span class="uline">All client stories</span></strong></a>')
        chips = f'<div class="chips"><span class="chip">{s["client"]}</span><span class="chip">{s["tag"]}</span></div>'
        head = page_head(L, [('Success stories', 'success-stories/'), ('Client success stories', 'success-stories/client-success-stories/'), (s['title'], 'success-story/' + s['slug'] + '/')],
                         s['title'], s['summary'], ctas=chips)
        return f'''{head}
<section class="sec">
  <div class="wrap">
    {rows([('The challenge', s['challenge']), ('What we did', s['solution'])], big=True)}
    <div class="result-band"><h2>The result</h2><p>{s['result']}</p></div>
    <nav class="pager" aria-label="More stories">{prev_l}{next_l}</nav>
  </div>
</section>'''
    return body


for _i, _s in enumerate(STORIES):
    page('success-story/' + _s['slug'] + '/', _s['title'], _s['summary'], 'success-stories/')(story_page(_i, _s))


@page('success-stories/testimonials/', 'Testimonials', 'What clients say after working with business and executive coach Matt Wilhelmsen.', 'success-stories/')
def testimonials(L):
    q = [('Coaching client, CEO', 'Had been part of every decision and every problem without seeing what it cost. After building a better structure with Matt, the team owns its results and the CEO finally has room to lead.'),
         ('Coaching client, President', 'The company was busy but not aligned. Coaching brought clear direction, defined ownership and a steady operating rhythm, faster than expected, and changed how the whole team shows up.'),
         ('Coaching client, CEO', 'Valued that Matt arrives prepared and focused on what this specific company needs, with no generic advice and no borrowed frameworks.')]
    cards = ''.join(f'<figure class="quote"><span class="role">{r}</span><p>{t}</p><span class="tag">Summary of client feedback</span></figure>' for r, t in q)
    return f'''{page_head(L, [('Success stories', 'success-stories/'), ('Testimonials', 'success-stories/testimonials/')], 'In their words.', 'What clients say after working with Matt.')}
<section class="sec tight" style="padding-top:0">
  <div class="wrap">
    {feature_quote(L, link=False)}
    <div class="split" style="margin-top:clamp(40px,5vw,64px)">
      <h2 style="max-width:10em">The longer story</h2>
      <p class="lede" style="margin:0">Over several years, Matt coached Maren and members of her strategic team as the company grew, changed leadership roles and eventually sold. She first found him through his background as an E-Myth Worldwide coach.</p>
    </div>
  </div>
</section>
<section class="sec white">
  <div class="wrap">
    {sec_head('More from clients')}
    <div class="quotes">{cards}</div>
  </div>
</section>'''


# ---------- Contact

@page('contact/', 'Contact', 'Contact business and executive coach Matt Wilhelmsen or book a free consultation.', 'contact/', close=False)
def contact(L):
    cards = (card(L, BOOK, 'Book a session', 'A free 30-minute conversation by phone or video to talk through what’s going on in your business.', more='Book a session') +
             card(L, 'contact/contact-matt/', 'Contact Matt', 'Questions about coaching, speaking or anything else. Send a note and Matt will get back to you.', more='Send a message'))
    return f'''{page_head(L, [('Contact', 'contact/')], 'Let’s talk.', 'Book a free consultation or send Matt a note. Either way, you’ll hear back from him directly.')}
<section class="sec tight" style="padding-top:0">
  <div class="wrap contact-grid">
    <dl class="dl">
      <div><dt>Email</dt><dd><a href="mailto:{EMAIL}">{EMAIL}</a></dd></div>
      <div><dt>Phone</dt><dd><a href="tel:{TEL}">{PHONE}</a></dd></div>
      <div><dt>Social</dt><dd class="socials">{''.join(f'<a href="{u}">{n}</a>' for n, u in SOCIAL)}</dd></div>
    </dl>
    <div class="cards" style="--cols:2">{cards}</div>
  </div>
</section>'''


@page('contact/contact-matt/', 'Contact Matt', 'Send Matt Wilhelmsen a message about coaching, leadership development or speaking.', 'contact/', close=False)
def contact_matt(L):
    return f'''{page_head(L, [('Contact', 'contact/'), ('Contact Matt', 'contact/contact-matt/')], 'Contact Matt', 'Questions about coaching, speaking or working together. Send a note and Matt will reply personally.')}
<section class="sec tight">
  <div class="wrap contact-grid">
    <div>
      <h2 style="font-size:clamp(1.5rem,1.2rem + 1.2vw,2.125rem);letter-spacing:-.03em;margin-bottom:1.5rem">Reach Matt directly</h2>
      <dl class="dl">
        <div><dt>Email</dt><dd><a href="mailto:{EMAIL}">{EMAIL}</a></dd></div>
        <div><dt>Phone</dt><dd><a href="tel:{TEL}">{PHONE}</a></dd></div>
        <div><dt>Social</dt><dd class="socials">{''.join(f'<a href="{u}">{n}</a>' for n, u in SOCIAL)}</dd></div>
      </dl>
      <p style="margin-top:2rem">Ready to talk it through? <a class="inline-link" href="{L(BOOK)}">Book a free consultation</a>.</p>
    </div>
    <div class="form-card">
      <h2>Send a message</h2>
      <p>Fields marked optional can be left blank.</p>
      <form class="form" data-lead="contact" novalidate>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="field"><label for="cm-name">Name</label><input id="cm-name" name="name" data-label="Name" autocomplete="name" required></div>
        <div class="field"><label for="cm-email">Email</label><input id="cm-email" name="email" data-label="Email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="cm-company">Company <span class="opt">(optional)</span></label><input id="cm-company" name="company" data-label="Company" autocomplete="organization"></div>
        <div class="field"><label for="cm-phone">Phone <span class="opt">(optional)</span></label><input id="cm-phone" name="phone" data-label="Phone" type="tel" autocomplete="tel"></div>
        <div class="field full"><label for="cm-topic">What’s it about?</label>
          <select id="cm-topic" name="topic" data-label="Topic">
            <option>One-on-one coaching</option><option>Leadership development</option><option>Group coaching</option><option>Public speaking</option><option>Something else</option>
          </select></div>
        <div class="field full"><label for="cm-msg">Message</label><textarea id="cm-msg" name="message" data-label="Message" required></textarea></div>
        <div class="actions"><button class="btn" type="submit">Send message</button><p class="note">Goes straight to Matt. He replies within one business day.</p></div>
        <p class="form-err" hidden></p>
      </form>
    </div>
  </div>
</section>'''


@page('contact/book-a-session/', 'Book a session', 'Book a free 30-minute consultation with Matt Wilhelmsen by phone or video.', 'contact/', close=False)
def book(L):
    return f'''{page_head(L, [('Contact', 'contact/'), ('Book a session', 'contact/book-a-session/')], 'Let’s find a time to talk.', 'A free 30-minute conversation about where your business is and where you want it to go.')}
<section class="sec tight">
  <div class="wrap">
    {sec_head('What to expect')}
    {steps([('A 30-minute conversation', 'By phone or video, whichever works better for you.'), ('Get to the real issue', 'You talk through what’s going on, and Matt helps find the challenge underneath it.'), ('A clear next step', 'You leave knowing what to do next, whether or not you decide to work together.')], 3)}
  </div>
</section>
<section class="sec white">
  <div class="wrap contact-grid">
    <div>
      <h2 style="max-width:9em;margin-bottom:.6em">Request a time</h2>
      <p class="lede">Share a little about your business and when you’re free. Matt will reply to confirm.</p>
      <p style="margin-top:1.5rem">Prefer to call? <a class="inline-link" href="tel:{TEL}">{PHONE}</a></p>
    </div>
    <div class="form-card" style="background:var(--mist)">
      <form class="form" data-lead="booking" novalidate>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="field"><label for="bk-name">Name</label><input id="bk-name" name="name" data-label="Name" autocomplete="name" required></div>
        <div class="field"><label for="bk-email">Email</label><input id="bk-email" name="email" data-label="Email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="bk-company">Company <span class="opt">(optional)</span></label><input id="bk-company" name="company" data-label="Company" autocomplete="organization"></div>
        <div class="field"><label for="bk-phone">Phone <span class="opt">(optional)</span></label><input id="bk-phone" name="phone" data-label="Phone" type="tel" autocomplete="tel"></div>
        <fieldset class="field full"><legend>How would you like to meet?</legend>
          <div class="seg">
            <label><input type="radio" name="format" value="Phone" data-label="Format" checked><span>Phone</span></label>
            <label><input type="radio" name="format" value="Video" data-label="Format"><span>Video</span></label>
          </div></fieldset>
        <div class="field full"><label for="bk-times">Good days and times <span class="opt">(optional)</span></label><input id="bk-times" name="times" data-label="Availability" placeholder="Tuesday or Thursday mornings"></div>
        <div class="field full"><label for="bk-msg">What’s going on in your business?</label><textarea id="bk-msg" name="message" data-label="What’s going on" required></textarea></div>
        <div class="actions"><button class="btn" type="submit">Request a consultation</button><p class="note">Matt replies personally to confirm a time.</p></div>
        <p class="form-err" hidden></p>
      </form>
    </div>
  </div>
</section>'''


@page('bottleneck-check/', 'Bottleneck check', 'Eight quick statements that show where your business leans on you hardest, with three first moves. Free, about two minutes.', 'resources/')
def bottleneck(L):
    return f'''{page_head(L, [('Resources', 'resources/'), ('Bottleneck check', 'bottleneck-check/')], 'Find what’s really holding the business back.', 'Eight quick statements, about two minutes. You’ll see your biggest constraint and three first moves right away.')}
<section class="sec tight" style="padding-top:0">
  <div class="wrap"><div class="check" id="check" aria-live="polite"><noscript><p>The check needs JavaScript. You can <a class="inline-link" href="{L(BOOK)}">book a free consultation</a> instead.</p></noscript></div></div>
</section>'''


# ---------------------------------------------------------------- get started

X_ICON = ('<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" '
          'stroke-width="1.8" stroke-linecap="round"/></svg>')


def tier_list(lines, cls='checks'):
    return f'<ul class="{cls}">' + ''.join(f'<li>{x}</li>' for x in lines) + '</ul>'


def seat_meter(c):
    left = c['seats'] - c['taken']
    if not c['taken']:
        return f'<p class="seats"><b>{c["seats"]} seats</b> per cohort. Next one starts {c["starts"]}.</p>'
    pct = round(c['taken'] / c['seats'] * 100)
    word = 'seat' if left == 1 else 'seats'
    return (f'<div class="seats"><p><b>{left} of {c["seats"]} {word} left</b> for {c["starts"]}.</p>'
            f'<span class="seat-bar" role="img" aria-label="{c["taken"]} of {c["seats"]} seats taken"><i style="width:{pct}%"></i></span></div>')


def plan_dialog(L, key, kicker, title, lede, button, extra=''):
    return f"""<dialog class="gate plan-dlg" id="plan-{key}" aria-labelledby="plan-{key}-title">
  <form method="dialog" class="gate-x"><button aria-label="Close">{X_ICON}</button></form>
  <p class="gate-kicker">{kicker}</p>
  <h2 id="plan-{key}-title">{title}</h2>
  <p class="gate-lede">{lede}</p>
  <form class="form gate-form" data-lead="{key}" data-plan="{key}" novalidate>
    <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="field"><label for="{key}-name">Name</label><input id="{key}-name" name="name" autocomplete="name" required></div>
    <div class="field"><label for="{key}-email">Email</label><input id="{key}-email" name="email" type="email" autocomplete="email" required></div>
    {extra}
    <div class="actions"><button class="btn" type="submit">{button}</button></div>
    <p class="form-err" hidden></p>
  </form>
</dialog>"""


@page(START, 'Plans &amp; pricing', 'Three ways to work with business and executive coach Matt Wilhelmsen: Private Advisory by application, the Founder Cohort, and the Operator Membership.', 'services/')
def get_started(L):
    A, C, M = PLANS['advisory'], PLANS['cohort'], PLANS['membership']
    join = (f'<a class="btn" href="{M["checkout"]}">Join for {usd(M["price"])} a month</a>' if M['checkout'] else
            f'<button class="btn" type="button" data-plan-open="membership">Join for {usd(M["price"])} a month</button>')
    cohort_extra = f"""<div class="field"><label for="cohort-company">Company</label><input id="cohort-company" name="company" autocomplete="organization" required></div>
    <div class="field"><label for="cohort-size">Team size</label><select id="cohort-size" name="companySize" required><option value="">Choose one</option><option>1 to 9</option><option>10 to 19</option><option>20 to 49</option><option>50 to 99</option><option>100 to 250</option><option>250+</option></select></div>
    <div class="field"><label for="cohort-msg">What do you want out of the six months?</label><textarea id="cohort-msg" name="message" rows="3" required></textarea></div>"""
    member_extra = """<div class="field"><label for="membership-company">Company <span class="opt">(optional)</span></label><input id="membership-company" name="company" autocomplete="organization"></div>"""
    return f"""<section class="page-head text-only start-head" aria-label="Page introduction">
  <div class="ph-copy">
    {crumbs(L, [('Services', 'services/'), ('Plans &amp; pricing', START)])}
    <h1>Three ways to work with Matt.</h1>
    <p class="lede">Pick the depth that fits where the business is today. Every path aims at the same thing: a company that runs well without running through you.</p>
  </div>
</section>

<section class="sec tight tiers-sec" aria-label="Plans">
  <div class="wrap">
    <article class="tier tier-top" id="advisory" aria-labelledby="advisoryTitle">
      <div class="tier-main">
        <p class="tier-kicker"><span class="pip" aria-hidden="true"></span>By application only <span class="sep" aria-hidden="true"></span> {A['openings']}</p>
        <h2 id="advisoryTitle">Private Advisory</h2>
        <p class="tier-pitch">Matt, embedded with you and your leadership team for twelve months.</p>
        <p class="price"><b>{usd(A['price'])}</b><span>per month</span></p>
        <p class="price-note">{A['term']}.</p>
        <div class="ctas"><a class="btn btn-light" href="{L(START + 'apply/')}">Apply for Advisory</a></div>
        <p class="tier-fine">Matt reads every application himself and replies within two business days.</p>
      </div>
      <div class="tier-incl">
        <h3>What’s included</h3>
        {tier_list(['A weekly 60-minute 1:1 with Matt', 'A monthly working session with your leadership team', 'A quarterly planning day, on-site or remote', 'Your operating system built with you: scorecard, meeting rhythm, decision rights and accountability', 'A 360 review for every leader on your team, twice a year', 'A direct line to Matt between sessions, with same-day replies on weekdays', 'Input on hiring and org design for key seats'], 'checks light')}
        <p class="tier-fit"><b>Built for</b> founders and CEOs with 20 to 250 people who are ready to change how the company runs, not just talk about it.</p>
      </div>
    </article>

    <div class="tier-pair">
      <article class="tier tier-mid" id="cohort" aria-labelledby="cohortTitle">
        <p class="tier-kicker"><span class="pip" aria-hidden="true"></span>Limited seats</p>
        <h2 id="cohortTitle">Founder Cohort</h2>
        <p class="tier-pitch">Six months with a small group of founders working the same problems, led by Matt.</p>
        <p class="price"><b>{usd(C['price'])}</b><span>per month</span></p>
        <p class="price-note">{C['term']}, or {usd(C['full'])} paid in full.</p>
        {seat_meter(C)}
        {tier_list(['A live 90-minute group session every other week', 'A private 1:1 with Matt each month', 'The operating rhythm toolkit: scorecard, meeting templates and a delegation map', 'A peer group that holds you to what you said you’d do', 'A Bottleneck review at the start and the end, so you can see what moved'])}
        <div class="tier-foot"><button class="btn" type="button" data-plan-open="cohort">Request a seat</button><p class="tier-fine">Seats are confirmed after a 20-minute fit call.</p></div>
      </article>

      <article class="tier tier-open" id="membership" aria-labelledby="membershipTitle">
        <p class="tier-kicker"><span class="pip" aria-hidden="true"></span>Open enrollment</p>
        <h2 id="membershipTitle">Operator Membership</h2>
        <p class="tier-pitch">Matt’s playbook and a monthly live session, for owners who want to keep sharpening between bigger moves.</p>
        <p class="price"><b>{usd(M['price'])}</b><span>per month</span></p>
        <p class="price-note">{M['term']}.</p>
        {tier_list(['A monthly live Q&amp;A with Matt, recorded if you can’t make it', 'The full template library: scorecards, meeting agendas, role clarity and hiring scorecards', 'Send a question any time and get a video answer from Matt within a week', 'A quarterly Bottleneck Check with a written read from Matt', 'Monthly field notes on what’s working with his clients'])}
        <div class="tier-foot">{join}<p class="tier-fine">No contract. Stop whenever it stops being useful.</p></div>
      </article>
    </div>
  </div>
</section>

<section class="sec tight white" aria-labelledby="pickTitle">
  <div class="wrap pick">
    <div class="pick-copy">
      <h2 id="pickTitle">Not sure which fits?</h2>
      <p class="lede">Two quick questions and you’ll know where to start.</p>
    </div>
    <form class="picker" id="planPicker" novalidate>
      <fieldset class="field"><legend>How many people work in the business?</legend>
        <div class="seg">{''.join(f'<label><input type="radio" name="size" value="{v}"><span>{t}</span></label>' for v, t in [('1', 'Under 10'), ('2', '10 to 50'), ('3', '50 to 250'), ('4', 'Over 250')])}</div></fieldset>
      <fieldset class="field"><legend>What would help most right now?</legend>
        <div class="seg">{''.join(f'<label><input type="radio" name="want" value="{v}"><span>{t}</span></label>' for v, t in [('tools', 'Tools and a monthly check-in'), ('peers', 'A peer group and structure'), ('embedded', 'Matt in it with me and my team')])}</div></fieldset>
      <div class="pick-out" id="pickOut" aria-live="polite" hidden></div>
    </form>
  </div>
</section>

<section class="sec tight" aria-labelledby="compareTitle">
  <div class="wrap">
    {sec_head('Side by side', 'Same coach, same operating system. The difference is how close Matt gets to the work.')}
    <div class="compare-wrap" tabindex="0" role="region" aria-labelledby="compareTitle">
      <table class="compare">
        <caption class="sr-only" id="compareTitle">Plans compared</caption>
        <thead><tr><th scope="col"><span class="sr-only">Feature</span></th><th scope="col">Private Advisory</th><th scope="col">Founder Cohort</th><th scope="col">Operator Membership</th></tr></thead>
        <tbody>
          <tr><th scope="row">Time with Matt</th><td>Weekly 1:1</td><td>Monthly 1:1</td><td>Monthly live Q&amp;A</td></tr>
          <tr><th scope="row">Your leadership team</th><td>Monthly session plus quarterly planning days</td><td>Not included</td><td>Not included</td></tr>
          <tr><th scope="row">Operating system</th><td>Built with you</td><td>Toolkit and guidance</td><td>Template library</td></tr>
          <tr><th scope="row">Between sessions</th><td>Direct line to Matt</td><td>Your peer group</td><td>Video answers within a week</td></tr>
          <tr><th scope="row">360 reviews</th><td>Every leader, twice a year</td><td>Not included</td><td>Not included</td></tr>
          <tr><th scope="row">Commitment</th><td>12 months</td><td>6 months</td><td>Month to month</td></tr>
          <tr><th scope="row">How to start</th><td>Apply</td><td>Request a seat</td><td>Join today</td></tr>
          <tr class="price-row"><th scope="row">Price</th><td>{usd(A['price'])}/mo</td><td>{usd(C['price'])}/mo</td><td>{usd(M['price'])}/mo</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="sec tight dark" aria-labelledby="applyTitle">
  <div class="wrap">
    {sec_head('<span id="applyTitle">How Advisory starts</span>', 'Four steps, about two weeks from application to kickoff.')}
    {steps([('Apply', 'Ten minutes. Tell Matt where the business is and what’s getting in the way.'), ('Fit call', 'A 45-minute conversation to see whether the timing and fit are right for both of you.'), ('Proposal', 'Within a week: the plan for your first 90 days and what success looks like at twelve months.'), ('Kickoff', 'A working day with you and your leadership team to set the rhythm.')])}
    <div class="ctas" style="margin-top:2.75rem"><a class="btn btn-light" href="{L(START + 'apply/')}">Apply for Advisory</a></div>
  </div>
</section>

<section class="sec tight" aria-labelledby="faqTitle">
  <div class="wrap faq-grid">
    <h2 id="faqTitle">Questions</h2>
    <div class="faq">
      <details><summary>Why is Advisory by application?</summary><p>Matt works with {A['openings']} at this level so each one gets real attention. The application helps both sides see whether the timing and fit are right before anyone commits.</p></details>
      <details><summary>What happens if the cohort is full?</summary><p>Request a seat anyway. You’ll be first in line for the next cohort, and Matt will tell you honestly whether it’s the right fit before you pay anything.</p></details>
      <details><summary>Can I move from one plan to another?</summary><p>Yes. Plenty of owners start with the membership or a cohort and move up when the business is ready for it.</p></details>
      <details><summary>How does billing work?</summary><p>Advisory and the cohort are invoiced monthly, or the cohort can be paid in full up front. The membership bills monthly and you can cancel any time.</p></details>
      <details><summary>I don’t know where to start.</summary><p>Take the two-minute <a class="inline-link" href="{L('bottleneck-check/')}">Bottleneck Check</a> or <a class="inline-link" href="{L(BOOK)}">book a free consultation</a>. Either one will point you in the right direction.</p></details>
    </div>
  </div>
</section>

{plan_dialog(L, 'cohort', 'Founder Cohort, ' + C['starts'], 'Request a seat', 'Tell Matt a little about the business. He’ll set up a 20-minute fit call before anything is confirmed.', 'Request my seat', cohort_extra)}
{'' if M['checkout'] else plan_dialog(L, 'membership', 'Operator Membership, ' + usd(M['price']) + ' a month', 'Join the membership', 'Leave your details and Matt will send your welcome and a payment link within one business day.', 'Join the membership', member_extra)}"""


@page(START + 'apply/', 'Apply for Private Advisory', 'Apply to work with Matt Wilhelmsen in Private Advisory, his twelve-month engagement with founders and their leadership teams.', 'services/', close=False)
def apply(L):
    A = PLANS['advisory']
    sizes = ''.join(f'<option>{x}</option>' for x in ['1 to 9', '10 to 19', '20 to 49', '50 to 99', '100 to 250', '250+'])
    rev = ''.join(f'<option>{x}</option>' for x in ['Under $1M', '$1M to $5M', '$5M to $20M', '$20M to $50M', 'Over $50M', 'I’d rather not say'])
    roles = ''.join(f'<option>{x}</option>' for x in ['Founder or CEO', 'President or COO', 'Owner-operator', 'Another executive role'])
    start = ''.join(f'<label><input type="radio" name="start" value="{x}" required><span>{x}</span></label>' for x in ['In the next 30 days', 'In 1 to 3 months', 'Later this year'])
    return f"""{page_head(L, [('Plans &amp; pricing', START), ('Apply', START + 'apply/')], 'Apply for Private Advisory', 'About ten minutes. Matt reads every application himself and replies within two business days.')}
<section class="sec tight" style="padding-top:0">
  <div class="wrap apply-grid">
    <div class="form-card">
      <form class="form apply-form" data-lead="application" data-plan="advisory" novalidate>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <h2 class="form-step full"><span>1</span>About you</h2>
        <div class="field"><label for="ap-name">Name</label><input id="ap-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="ap-email">Work email</label><input id="ap-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="ap-role">Your role</label><select id="ap-role" name="role" required><option value="">Choose one</option>{roles}</select></div>
        <div class="field"><label for="ap-phone">Phone <span class="opt">(optional)</span></label><input id="ap-phone" name="phone" type="tel" autocomplete="tel"></div>

        <h2 class="form-step full"><span>2</span>The business</h2>
        <div class="field"><label for="ap-company">Company</label><input id="ap-company" name="company" autocomplete="organization" required></div>
        <div class="field"><label for="ap-url">Website <span class="opt">(optional)</span></label><input id="ap-url" name="companyUrl" data-q="Website" autocomplete="url" inputmode="url"></div>
        <div class="field"><label for="ap-size">People on the team</label><select id="ap-size" name="companySize" required><option value="">Choose one</option>{sizes}</select></div>
        <div class="field"><label for="ap-rev">Annual revenue</label><select id="ap-rev" name="revenue" data-q="Annual revenue" required><option value="">Choose one</option>{rev}</select></div>

        <h2 class="form-step full"><span>3</span>Where things stand</h2>
        <div class="field full"><label for="ap-msg">What’s the biggest thing getting in the way right now?</label><textarea id="ap-msg" name="message" required></textarea></div>
        <div class="field full"><label for="ap-goal">Twelve months from now, what would have to be true for this to be worth it?</label><textarea id="ap-goal" name="goal" data-q="Twelve months from now" required></textarea></div>
        <div class="field full"><label for="ap-tried">What have you already tried? <span class="opt">(optional)</span></label><textarea id="ap-tried" name="tried" data-q="Already tried" rows="3" style="min-height:6rem"></textarea></div>

        <h2 class="form-step full"><span>4</span>Timing</h2>
        <fieldset class="field full" data-q="Ideal start"><legend>When would you want to start?</legend><div class="seg">{start}</div></fieldset>
        <div class="field full"><label for="ap-heard">How did you hear about Matt? <span class="opt">(optional)</span></label><input id="ap-heard" name="heard" data-q="Heard about Matt"></div>
        <label class="consent full"><input type="checkbox" name="ack" value="Yes" data-q="Understands the investment" required><span>I understand Private Advisory is {usd(A['price'])} a month on a twelve-month engagement.</span></label>

        <div class="actions"><button class="btn" type="submit">Send application</button><p class="note">Goes straight to Matt. Nothing is shared.</p></div>
        <p class="form-err" hidden></p>
      </form>
    </div>
    <aside class="apply-aside" aria-label="What happens next">
      <h2>What happens next</h2>
      <ol class="next">
        <li><b>Matt reads it</b>Within two business days you’ll hear back, either with times for a call or an honest note if another path fits better.</li>
        <li><b>A 45-minute fit call</b>You talk through the business. No pitch deck, no pressure.</li>
        <li><b>A proposal in a week</b>Your first 90 days and what success looks like at twelve months.</li>
      </ol>
      <div class="aside-card">
        <p class="price"><b>{usd(A['price'])}</b><span>per month</span></p>
        <p>{A['term']}. {A['openings'][0].upper() + A['openings'][1:]}.</p>
      </div>
      <p class="aside-alt">Prefer to talk first? <a class="inline-link" href="{L(BOOK)}">Book a free consultation</a>, or see the <a class="inline-link" href="{L(START)}">other plans</a>.</p>
    </aside>
  </div>
</section>"""


# ---------------------------------------------------------------- write

def write_plans():
    data = {k: dict(name=v['name'], value=v['value']) for k, v in PLANS.items()}
    with open(os.path.join(ROOT, 'api', '_plans.js'), 'w', encoding='utf-8') as f:
        f.write('// Generated by tools/build.py from PLANS. Edit prices there and rebuild.\n'
                'export const PLANS = ' + json.dumps(data, indent=2) + ';\n')


def main():
    write_plans()
    for p in PAGES:
        out_dir = os.path.join(ROOT, p['path'])
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(render(p))
    print(f'Built {len(PAGES)} pages')


if __name__ == '__main__':
    main()
