// Builds index.html from content/posts.json. No dependencies: `node build.mjs`.
// The build refuses to finish when a text is over its platform's limit or an image is missing,
// so a page that says "616 / 700" was checked, not hoped.
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('content/posts.json', 'utf8'));
const PLATFORMS = data.platforms;
const ORDER = Object.keys(PLATFORMS);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const n = (x) => x.toLocaleString('en-US');

const problems = [];
for (const p of data.posts) {
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

function image(p, img, i) {
  const lead = i === 0 && p.images.length > 1;
  return `<figure class="pic${lead ? ' pic-lead' : ''}">
        <div class="frame"><img src="images/${attr(img.file)}" alt="${attr(img.alt)}" loading="lazy" decoding="async"></div>
        <figcaption>
          <span class="pic-label">${i + 1}. ${esc(img.label)}</span>
          <span class="chips">
            <a class="chip" href="images/${attr(img.file)}" download>Download</a>
            <button type="button" class="chip" data-copy-image aria-label="Copy image, ${attr(img.label)}">Copy image</button>
          </span>
        </figcaption>
      </figure>`;
}

function version(p, key) {
  const pl = PLATFORMS[key];
  const text = p.text[key];
  const id = `${p.id}-${key}`;
  return `<div class="version">
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

function post(p, i) {
  return `<section class="post" data-accent="${attr(p.accent)}" id="${attr(p.id)}" aria-labelledby="${attr(p.id)}-h">
      <p class="kicker">Post ${i + 1} · ${esc(p.kicker)}</p>
      <h2 id="${attr(p.id)}-h">${esc(p.title)}</h2>
      <p class="post-meta">${p.images.length} ${p.images.length === 1 ? 'picture' : 'pictures, in upload order'} · ${ORDER.length} platforms</p>
      <div class="pics">
      ${p.images.map((img, j) => image(p, img, j)).join('\n      ')}
      </div>
      <div class="versions">
      ${ORDER.map((k) => version(p, k)).join('\n      ')}
      </div>
    </section>`;
}

const html = `<!doctype html>
<html lang="en" data-page="posts">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Posts — Edgaras Neverdauskas</title>
<meta name="description" content="Copy-ready posts for Ko-fi, Facebook, Instagram and LinkedIn, with the pictures to go with them.">
<meta name="robots" content="noindex, nofollow">
<script>try{var t=localStorage.getItem('posts-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
<link rel="icon" href="images/cover-all-projects.png" type="image/png">
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
<a class="skip" href="#main">Skip to the posts</a>
<header class="site-head">
  <a class="home" href="./">${MARK}<span>Posts</span></a>
  <nav class="head-nav" aria-label="Elsewhere">
    <a href="https://articles.edgarasneverdauskas.com/">Articles</a>
    ${THEME_SWITCH}
  </nav>
</header>
<main id="main" class="index">
  <header class="index-head">
    <p class="kicker">${MARK}${data.posts.length} posts · ${ORDER.length} platforms</p>
    <h1>Posts</h1>
    <p class="dek">Copy-ready posts for ${ORDER.map((k) => PLATFORMS[k].name).join(', ').replace(/, ([^,]*)$/, ' and $1')}, with the pictures to go with them.</p>
  </header>
  ${data.posts.map(post).join('\n  ')}
</main>
<footer class="site-foot">
  <span>Edgaras Neverdauskas</span>
  <span><a href="https://articles.edgarasneverdauskas.com/">Articles</a> · <a href="https://ko-fi.com/edgarasneverdauskas">Ko-fi</a> · <a href="https://github.com/Evirtual">GitHub</a></span>
</footer>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="assets/site.js"></script>
</body>
</html>
`;

fs.writeFileSync('index.html', html);
const counts = data.posts.map((p) => `${p.id}: ` + ORDER.map((k) => `${PLATFORMS[k].name} ${p.text[k].length}/${PLATFORMS[k].limit}`).join(', '));
console.log(`Built index.html: ${data.posts.length} posts\n  ` + counts.join('\n  '));
