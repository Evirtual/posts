// Builds the site from content/posts.json. No dependencies: `node build.mjs`.
//   index.html        a card per post, as on the Articles home page
//   <id>/index.html   the post itself: its pictures, then a copy-ready version per platform
// The build refuses to finish when a text is over its platform's limit or a picture is missing,
// so a page that says "616 / 700" was checked, not hoped.
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('content/posts.json', 'utf8'));
const PLATFORMS = data.platforms;
const ORDER = Object.keys(PLATFORMS);
const POSTS = data.posts;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const n = (x) => x.toLocaleString('en-US');
const list = (xs) => xs.join(', ').replace(/, ([^,]*)$/, ' and $1');
const platformNames = list(ORDER.map((k) => PLATFORMS[k].name));
const pictures = (p) => `${p.images.length} ${p.images.length === 1 ? 'picture' : 'pictures'}`;

const problems = [];
for (const p of POSTS) {
  if (!/^[a-z0-9-]+$/.test(p.id)) problems.push(`${p.id}: id must be lowercase letters, digits and dashes`);
  for (const key of ORDER) {
    const text = p.text[key];
    if (!text) { problems.push(`${p.id}: no ${PLATFORMS[key].name} text`); continue; }
    if (text.length > PLATFORMS[key].limit) problems.push(`${p.id}: ${PLATFORMS[key].name} is ${text.length} of ${PLATFORMS[key].limit}`);
  }
  for (const img of p.images) if (!fs.existsSync(`images/${img.file}`)) problems.push(`${p.id}: missing images/${img.file}`);
}
if (problems.length) { console.error('Not built:\n  ' + problems.join('\n  ')); process.exit(1); }

const MARK = `<svg class="mark" viewBox="0 0 38 24" aria-hidden="true" focusable="false"><text x="0" y="19.3" font-family="DM Sans, ui-sans-serif, system-ui, sans-serif" font-weight="700" font-size="21" fill="currentColor">EN</text><rect x="30.1" y="12.8" width="6.5" height="6.5" rx="1.2" fill="var(--accent)"/></svg>`;

const THEME_SWITCH = `<button type="button" class="theme-switch" hidden aria-label="Colour theme: following the system. Click for light." title="Colour theme: following the system. Click for light.">
      <svg class="ti ti-system" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      <svg class="ti ti-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      <svg class="ti ti-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
    </button>`;

function page({ title, description, base, main }) {
  return `<!doctype html>
<html lang="en" data-page="posts">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${attr(description)}">
<meta name="robots" content="noindex, nofollow">
<script>try{var t=localStorage.getItem('posts-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
<link rel="icon" href="${base}images/cover-all-projects.png" type="image/png">
<link rel="stylesheet" href="${base}assets/site.css">
</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
<header class="site-head">
  <a class="home" href="${base}">${MARK}<span>Posts</span></a>
  <nav class="head-nav" aria-label="Elsewhere">
    <a href="https://articles.edgarasneverdauskas.com/">Articles</a>
    ${THEME_SWITCH}
  </nav>
</header>
${main}
<footer class="site-foot">
  <span>Edgaras Neverdauskas</span>
  <span><a href="https://articles.edgarasneverdauskas.com/">Articles</a> · <a href="https://ko-fi.com/edgarasneverdauskas">Ko-fi</a> · <a href="https://github.com/Evirtual">GitHub</a></span>
</footer>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="${base}assets/site.js"></script>
</body>
</html>
`;
}

// --- the home page: a card per post ---------------------------------------------------------
function card(p) {
  const lead = p.images[0];
  return `<article class="card" data-accent="${attr(p.accent)}">
      <div class="frame"><img src="images/${attr(lead.file)}" alt="${attr(lead.alt)}" loading="lazy" decoding="async"></div>
      <div class="card-body">
        <p class="kicker">${esc(p.kicker)}</p>
        <h2><a class="card-link" href="${attr(p.id)}/">${esc(p.title)}</a></h2>
        <p class="sub">${esc(p.summary)}</p>
        <p class="meta">${pictures(p)} · ${ORDER.length} platforms</p>
        <p class="links"><span>Open the post <span aria-hidden="true">→</span></span></p>
      </div>
    </article>`;
}

const indexMain = `<main id="main" class="index">
  <header class="index-head">
    <p class="kicker">${MARK}${POSTS.length} posts · ${ORDER.length} platforms</p>
    <h1>Posts</h1>
    <p class="dek">Copy-ready posts for ${platformNames}, with the pictures to go with them.</p>
  </header>
  <div class="cards">
    ${POSTS.map(card).join('\n    ')}
  </div>
</main>`;

// --- a post's own page ----------------------------------------------------------------------
function picture(p, img, i) {
  return `<figure class="pic${i === 0 ? ' pic-lead' : ''}">
          <div class="frame"><img src="../images/${attr(img.file)}" alt="${attr(img.alt)}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></div>
          <figcaption>
            <span class="pic-label">${i + 1}. ${esc(img.label)}</span>
            <span class="chips">
              <a class="chip" href="../images/${attr(img.file)}" download>Download</a>
              <button type="button" class="chip" data-copy-image aria-label="Copy image, ${attr(img.label)}">Copy image</button>
            </span>
          </figcaption>
        </figure>`;
}

function version(p, key) {
  const pl = PLATFORMS[key];
  const text = p.text[key];
  const id = `${p.id}-${key}`;
  return `<div class="version" id="${attr(key)}">
          <div class="version-head">
            <h3>${esc(pl.name)}</h3>
            <span class="count" title="${attr(pl.limitNote)}">${n(text.length)} / ${n(pl.limit)}</span>
          </div>
          ${pl.hasTitle ? `<p class="v-title"><span class="also-label">Title</span> <span id="${id}-title">${esc(p.title)}</span></p>` : ''}
          <pre id="${id}">${esc(text)}</pre>
          <div class="chips">
            ${pl.hasTitle ? `<button type="button" class="chip" data-copy="${id}-title" aria-label="Copy ${attr(pl.name)} title">Copy title</button>` : ''}
            <button type="button" class="btn" data-copy="${id}" aria-label="Copy ${attr(pl.name)} text">Copy text</button>
          </div>
          <p class="note">${esc(pl.limitNote)}.</p>
        </div>`;
}

function postMain(p, i) {
  const others = POSTS.filter((o) => o !== p);
  return `<main id="main" class="layout" data-accent="${attr(p.accent)}">
  <article class="story">
    <header class="story-head">
      <p class="kicker">Post ${i + 1} · ${esc(p.kicker)}</p>
      <h1>${esc(p.title)}</h1>
      <p class="dek">${esc(p.summary)}</p>
      <p class="byline"><span>${pictures(p)}</span><span>${platformNames}</span></p>
      <nav class="jump" aria-label="Jump to a platform">${ORDER.map((k) => `<a class="chip" href="#${k}">${esc(PLATFORMS[k].name)}</a>`).join('')}</nav>
    </header>
    <section aria-labelledby="pics-h">
      <h2 class="section-h" id="pics-h">Pictures${p.images.length > 1 ? ', in upload order' : ''}</h2>
      <div class="pics">
        ${p.images.map((img, j) => picture(p, img, j)).join('\n        ')}
      </div>
    </section>
    <section aria-labelledby="text-h">
      <h2 class="section-h" id="text-h">Text for each platform</h2>
      <div class="versions">
        ${ORDER.map((k) => version(p, k)).join('\n        ')}
      </div>
    </section>
    <footer class="story-foot">
      <p class="also-end"><span><a href="../">All posts</a></span>${others.map((o) => `<span><a href="../${attr(o.id)}/">${esc(o.title)}</a></span>`).join('')}</p>
    </footer>
  </article>
</main>`;
}

fs.writeFileSync('index.html', page({
  title: 'Posts — Edgaras Neverdauskas',
  description: `Copy-ready posts for ${platformNames}, with the pictures to go with them.`,
  base: './',
  main: indexMain,
}));
POSTS.forEach((p, i) => {
  fs.mkdirSync(p.id, { recursive: true });
  fs.writeFileSync(`${p.id}/index.html`, page({ title: `${p.title} — Posts`, description: p.summary, base: '../', main: postMain(p, i) }));
});

const counts = POSTS.map((p) => `${p.id}/: ` + ORDER.map((k) => `${PLATFORMS[k].name} ${p.text[k].length}/${PLATFORMS[k].limit}`).join(', '));
console.log(`Built index.html and ${POSTS.length} post pages\n  ` + counts.join('\n  '));
