// Builds the site from content/posts.json. No dependencies: `node build.mjs`.
//   index.html        a card per post, as on the Articles home page
//   <id>/index.html   a post laid out like an article: the post itself on the left, a share kit
//                     with each platform's copy-ready text and the pictures on the right
//
// The look is not imitated, it is borrowed: the stylesheet, script and fonts are the Articles
// site's own built files, copied from ../articles-site/docs/assets when that folder is here (the
// committed copy is used when it is not). Each post takes its project's theme the way an article
// does, through <html data-page>: the intro the Articles theme, CSS 3D Lab the lab's, JARVIS the HUD.
//
// The build refuses to finish when a text is over its platform's limit or a picture is missing,
// so a page that says "616 of 700" was checked, not hoped.
import fs from 'node:fs';
import path from 'node:path';

const data = JSON.parse(fs.readFileSync('content/posts.json', 'utf8'));
const PLATFORMS = data.platforms;
const ORDER = Object.keys(PLATFORMS);
const POSTS = data.posts;
const PREVIEW = 'linkedin'; // the fullest version, shown as the post on its page
const ARTICLES_URL = 'https://articles.edgarasneverdauskas.com';
const HOME_URL = 'https://edgarasneverdauskas.com';
// The themes Articles defines; a post whose accent is not one of these gets the Articles theme.
const THEMES = ['index', 'css-3d-lab', 'jarvis'];
const FONTS = {
  jarvis: 'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Serif:ital,wght@0,400;0,600;1,400&display=swap',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const n = (x) => x.toLocaleString('en-US');
const list = (xs) => xs.join(', ').replace(/, ([^,]*)$/, ' and $1');
const platformNames = list(ORDER.map((k) => PLATFORMS[k].name));
const pictures = (p) => `${p.images.length} ${p.images.length === 1 ? 'picture' : 'pictures'}`;
const hostOf = (url) => new URL(url).host;
const themeOf = (p) => (THEMES.includes(p.accent) ? p.accent : 'index');

// --- checks ---------------------------------------------------------------------------------
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

// --- the Articles look ----------------------------------------------------------------------
const articlesAssets = path.join('..', 'articles-site', 'docs', 'assets');
if (fs.existsSync(articlesAssets)) {
  fs.mkdirSync('assets/fonts', { recursive: true });
  for (const f of ['site.css', 'site.js']) fs.copyFileSync(path.join(articlesAssets, f), path.join('assets', f));
  for (const f of fs.readdirSync(path.join(articlesAssets, 'fonts'))) fs.copyFileSync(path.join(articlesAssets, 'fonts', f), path.join('assets', 'fonts', f));
} else if (!fs.existsSync('assets/site.css')) {
  console.error('Not built: no ../articles-site/docs/assets to take the look from, and no committed copy in assets/');
  process.exit(1);
}

const MARK = `<svg class="mark" viewBox="0 0 38 24" aria-hidden="true" focusable="false"><text x="0" y="19.3" font-family="var(--f-ui), ui-sans-serif, system-ui, sans-serif" font-weight="700" font-size="21" fill="currentColor">EN</text><rect x="30.1" y="12.8" width="6.5" height="6.5" rx="1.2" fill="var(--accent)"/></svg>`;

const THEME_SWITCH = `<button type="button" class="theme-switch" data-theme-cycle hidden aria-label="Colour theme: following the system. Click for light." title="Colour theme: following the system. Click for light.">
      <svg class="ti ti-system" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      <svg class="ti ti-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      <svg class="ti ti-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
    </button>`;

const headEnd = `<div class="head-end"><a class="head-link" href="${ARTICLES_URL}/">Articles</a>${THEME_SWITCH}</div>`;

function page({ theme, title, description, base, homeNav, skip, main }) {
  const fonts = FONTS[theme];
  return `<!doctype html>
<html lang="en" data-page="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${attr(description)}">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light dark">
<script>try{var t=localStorage.getItem('articles-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
<link rel="icon" href="${base}images/cover-all-projects.png" type="image/png">
${fonts ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="${attr(fonts)}">\n` : ''}<link rel="stylesheet" href="${base}assets/site.css">
<script src="${base}assets/site.js" defer></script>
</head>
<body>
<a class="skip" href="#${skip.id}">${esc(skip.label)}</a>
<header class="site-head">
  <nav aria-label="Site">${homeNav}</nav>
  ${headEnd}
</header>
${main}
<footer class="site-foot">
  <span>Edgaras Neverdauskas</span>
  <span><a href="${ARTICLES_URL}/">Articles</a> · <a href="https://ko-fi.com/edgarasneverdauskas">Ko-fi</a> · <a href="https://github.com/Evirtual">GitHub</a></span>
</footer>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
</body>
</html>
`;
}

// --- the home page: a card per post, as on Articles -----------------------------------------
function card(p) {
  const lead = p.images[0];
  return `<article class="card" data-accent="${attr(themeOf(p))}">
      <div class="frame"><img src="images/${attr(lead.file)}" alt="${attr(lead.alt)}" loading="lazy" decoding="async"></div>
      <div class="card-body">
        <p class="kicker">${esc(p.kicker)}</p>
        <h2><a class="card-link" href="${attr(p.id)}/">${esc(p.title)}</a></h2>
        <p class="sub">${esc(p.summary)}</p>
        <p class="meta">${pictures(p)} · ${ORDER.length} platforms</p>
        <p class="links"><a href="${attr(p.id)}/">Open the post <span aria-hidden="true">→</span></a></p>
        <p class="elsewhere"><span class="also-label">Project</span><a href="${attr(p.project)}" rel="noopener">${esc(hostOf(p.project))}<span aria-hidden="true"> ↗</span></a></p>
      </div>
    </article>`;
}

const indexMain = `<main id="main" class="index">
  <header class="index-head">
    <p class="kicker">${POSTS.length} posts · ${ORDER.length} platforms</p>
    <h1>Posts</h1>
    <p class="dek">Copy-ready posts for ${platformNames}, with the pictures to go with them.</p>
  </header>
  <div class="cards">
    ${POSTS.map(card).join('\n    ')}
  </div>
</main>`;

// --- a post's page, laid out like an article -------------------------------------------------
// The post as it reads: blank lines are paragraphs, single line breaks stay, and addresses link.
function prose(text) {
  const link = (s) => esc(s).replace(/https?:\/\/[^\s]+/g, (u) => `<a href="${attr(u)}" rel="noopener">${esc(u.replace(/^https?:\/\//, ''))}</a>`);
  return text.split(/\n{2,}/).map((para) => `<p>${para.split('\n').map(link).join('<br>')}</p>`).join('\n      ');
}

function figure(p, img, i) {
  const key = `${p.id}-${i}`;
  return `<figure class="fig${i === 0 ? ' fig-cover' : ''}" id="fig-${key}">
  <div class="frame"><img src="../images/${attr(img.file)}" alt="${attr(img.alt)}" decoding="async" tabindex="0" role="button" aria-label="Open this picture"${i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}></div>
  <figcaption>
    <p class="cap">${i + 1}. ${esc(img.label)}</p>
    <div class="fig-tools">
      <button type="button" class="chip" data-copy="alt-${key}" aria-label="Copy alt text, ${attr(img.label.toLowerCase())}">Copy alt</button>
      <a class="chip" href="../images/${attr(img.file)}" download aria-label="Download image, ${attr(img.label.toLowerCase())} (${attr(img.file)})">Download</a>
    </div>
    <details class="alt"><summary>Alt text <span>· ${img.alt.length} characters</span></summary><p id="alt-${key}">${esc(img.alt)}</p></details>
  </figcaption>
</figure>`;
}

function share(p, key) {
  const pl = PLATFORMS[key];
  const text = p.text[key];
  const id = `share-${key}`;
  return `<div class="share">
          <div class="share-head">
            <h3>${esc(pl.name)}</h3>
            <button type="button" class="chip" data-copy="${id}" aria-label="Copy ${attr(pl.name)} post">Copy</button>
          </div>
          <p class="share-meta">${n(text.length)} of ${n(pl.limit)} characters · ${esc(pl.limitNote)}</p>
          <pre id="${id}" tabindex="0">${esc(text)}</pre>
        </div>`;
}

function imgRow(p, img, i) {
  const key = `${p.id}-${i}`;
  return `<li class="img-row">
          <img src="../images/${attr(img.file)}" alt="" loading="lazy" decoding="async" tabindex="0" role="button" aria-label="Open ${attr(img.label.toLowerCase())} full size">
          <p class="img-name">${i + 1}. ${esc(img.label)}<span>${esc(img.file)}</span></p>
          <div class="img-more">
            <div class="fig-tools">
              <button type="button" class="chip" data-copy="k-alt-${key}" aria-label="Copy alt text, ${attr(img.label.toLowerCase())}">Copy alt</button>
              <a class="chip" href="../images/${attr(img.file)}" download aria-label="Download image, ${attr(img.label.toLowerCase())} (${attr(img.file)})">Download</a>
            </div>
            <details class="alt"><summary>Alt text</summary>
              <p class="lbl">Alt text · ${img.alt.length} characters</p><p id="k-alt-${key}">${esc(img.alt)}</p>
            </details>
          </div>
        </li>`;
}

function kit(p) {
  return `<aside class="kit" aria-label="Share kit">
    <details class="kit-box" id="kit">
      <summary><span class="kit-sum"><span class="kit-title">Share kit</span><span class="kit-hint">Copy the post for each platform, and its pictures</span></span></summary>
      <div class="kit-body">
        <section aria-labelledby="kit-post">
          <h2 id="kit-post">Post</h2>
          <div class="btn-grid">
            <button type="button" class="btn primary" data-copy="story-title">Copy title</button>
            <button type="button" class="btn wide" data-copy="story-dek">Copy summary</button>
          </div>
          <p class="kit-note">The title is for Ko-fi, the one platform here with a title field. Upload the pictures in the order they are numbered.</p>
        </section>
        <section aria-labelledby="kit-share">
          <h2 id="kit-share">Platforms (${ORDER.length})</h2>
        ${ORDER.map((k) => share(p, k)).join('\n        ')}
        </section>
        <section aria-labelledby="kit-images">
          <h2 id="kit-images">Pictures (${p.images.length})</h2>
          <ul class="img-list">
        ${p.images.map((img, i) => imgRow(p, img, i)).join('\n        ')}
          </ul>
        </section>
      </div>
    </details>
  </aside>`;
}

function postMain(p, i) {
  const others = POSTS.filter((o) => o !== p);
  return `<main class="layout" id="main">
  ${kit(p)}
  <article class="story" id="story" aria-labelledby="story-title" tabindex="-1">
    <header class="story-head">
      <p class="kicker">Post ${i + 1} · ${esc(p.kicker)}</p>
      <h1 id="story-title">${esc(p.title)}</h1>
      <p class="dek" id="story-dek">${esc(p.summary)}</p>
      <p class="byline"><span>Edgaras Neverdauskas</span><span>${pictures(p)}</span><span>${ORDER.length} platforms</span></p>
      <nav class="also" aria-label="This post's project">
        <p><span class="also-label">Project</span><a href="${attr(p.project)}" rel="noopener">${esc(hostOf(p.project))}<span aria-hidden="true"> ↗</span></a></p>
      </nav>
    </header>
    ${figure(p, p.images[0], 0)}
    <div class="prose" id="article-body">
      ${prose(p.text[PREVIEW])}
    </div>
    ${p.images.slice(1).map((img, j) => figure(p, img, j + 1)).join('\n    ')}
    <footer class="story-foot">
      <p class="also-end"><span><a href="../">All posts</a></span>${others.map((o) => `<span><a href="../${attr(o.id)}/">${esc(o.title)}</a></span>`).join('')}</p>
    </footer>
  </article>
</main>`;
}

fs.writeFileSync('index.html', page({
  theme: 'index',
  title: 'Posts — Edgaras Neverdauskas',
  description: `Copy-ready posts for ${platformNames}, with the pictures to go with them.`,
  base: '',
  homeNav: `<a class="home" href="${HOME_URL}" aria-label="Edgaras Neverdauskas — the portfolio">${MARK}</a>`,
  skip: { id: 'main', label: 'Skip to the posts' },
  main: indexMain,
}));
POSTS.forEach((p, i) => {
  fs.mkdirSync(p.id, { recursive: true });
  fs.writeFileSync(`${p.id}/index.html`, page({
    theme: themeOf(p),
    title: `${p.title} — Posts`,
    description: p.summary,
    base: '../',
    homeNav: `<a class="home" href="../"><span aria-hidden="true">←</span> All posts</a>`,
    skip: { id: 'story', label: 'Skip to the post' },
    main: postMain(p, i),
  }));
});

const counts = POSTS.map((p) => `${p.id}/ (${themeOf(p)} theme): ` + ORDER.map((k) => `${PLATFORMS[k].name} ${p.text[k].length}/${PLATFORMS[k].limit}`).join(', '));
console.log(`Built index.html and ${POSTS.length} post pages, styled with ${fs.existsSync(articlesAssets) ? 'the Articles assets, freshly copied' : 'the committed copy of the Articles assets'}\n  ` + counts.join('\n  '));
