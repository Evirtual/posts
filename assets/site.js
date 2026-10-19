// Theme switch and the publishing kit's copy buttons. No dependencies.
// Copy feedback is only ever what happened: "Copied" appears after the clipboard promise resolves;
// if it rejects, the text is selected and the page says so.
(() => {
  const root = document.documentElement;
  const KEY = 'articles-theme';
  const toastEl = document.getElementById('toast');
  let toastTimer;

  function toast(message, bad = false) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.toggle('bad', bad);
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), bad ? 9000 : 3200);
  }

  // --- theme: Auto follows the system; Light and Dark are remembered when storage allows it ---
  const readTheme = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const saveTheme = (value) => {
    try {
      if (value === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, value);
      return true;
    } catch { return false; }
  };
  const applyTheme = (value) => {
    if (value === 'light' || value === 'dark') root.setAttribute('data-theme', value);
    else root.removeAttribute('data-theme');
  };
  // One button that cycles, rather than three that mostly say what you did not pick. The state is
  // carried on the button (data-mode) for the CSS to show one icon, and in its accessible name,
  // which says where you are AND what pressing it does -- an icon alone says neither.
  const ORDER = ['system', 'light', 'dark'];
  const SAYS = { system: 'following the system', light: 'light', dark: 'dark' };
  const switcher = document.querySelector('.theme-switch');
  if (switcher) {
    const sync = () => {
      const current = root.getAttribute('data-theme') || 'system';
      const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
      const label = `Colour theme: ${SAYS[current]}. Click for ${SAYS[next]}.`;
      switcher.dataset.mode = current;
      switcher.setAttribute('aria-label', label);
      switcher.title = label;
    };
    applyTheme(readTheme());
    switcher.hidden = false;
    sync();
    switcher.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') || 'system';
      const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
      applyTheme(next);
      sync();
      if (!saveTheme(next)) toast('Theme changed for this page only: this browser blocks saving it.');
    });
  }

  // --- the kit: open beside the article on wide screens, folded on phones ---
  const kit = document.getElementById('kit');
  if (kit && window.matchMedia('(min-width: 1100px)').matches) kit.open = true;

  // --- copying ---
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const FAIL = `Couldn't copy — text selected, press ${isMac ? '⌘C' : 'Ctrl+C'}`;

  function select(el) {
    for (let d = el.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true;
    el.scrollIntoView({ block: 'nearest' });
    if ('select' in el && typeof el.select === 'function') { el.focus(); el.select(); return; }
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function copied(btn, message) {
    const label = btn.dataset.label || btn.textContent;
    btn.dataset.label = label;
    btn.textContent = 'Copied ✓';
    btn.classList.add('is-done');
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.textContent = label; btn.classList.remove('is-done'); }, 2200);
    toast(message);
  }

  function failed(el) {
    select(el);
    toast(FAIL, true);
  }

  async function writeText(text) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('No clipboard access');
    await navigator.clipboard.writeText(text);
  }

  async function copyPlain(btn) {
    const el = document.getElementById(btn.dataset.copy);
    if (!el) return;
    const text = ('value' in el && el.tagName === 'TEXTAREA' ? el.value : el.textContent).trim();
    const what = (btn.getAttribute('aria-label') || btn.textContent).replace(/^Copy\s*/i, '');
    try {
      await writeText(text);
      copied(btn, `Copied ${what || 'text'} (${text.length.toLocaleString('en-US')} characters).`);
    } catch {
      failed(el);
    }
  }

  async function copyRich(btn) {
    const data = JSON.parse(document.getElementById('kit-data').textContent);
    // Plain-text twin of the rich copy, as the browser lays it out.
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:680px;white-space:normal';
    holder.innerHTML = data.richHtml;
    document.body.append(holder);
    const text = holder.innerText.trim();
    holder.remove();
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      try {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([data.richHtml], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        })]);
        copied(btn, 'Copied as rich text. Images aren’t included: a bold line marks each one, with its address.');
        return;
      } catch { /* try plain text below */ }
    }
    try {
      await writeText(text);
      copied(btn, 'Copied as plain text only: this browser would not copy rich text.');
    } catch {
      failed(document.getElementById('article-body'));
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-copy], button[data-copy-rich]');
    if (!btn) return;
    if (btn.hasAttribute('data-copy-rich')) copyRich(btn); else copyPlain(btn);
  });

  // --- a picture, opened ---------------------------------------------------------------------
  // A chart or a diagram at the width of a column on a phone is a picture of a chart, not a chart.
  // Clicking one opens it over the page, fitted to the screen; clicking it again shows it at its own
  // size and the box scrolls, which is the only way to read small labels on a small screen.
  // Escape closes it, the backdrop closes it, and focus comes back to the picture that opened it.
  let box = null;
  let opener = null;

  function closeBox() {
    if (!box) return;
    box.remove();
    box = null;
    document.documentElement.classList.remove('has-box');
    if (opener) { opener.focus({ preventScroll: true }); opener = null; }
  }

  function openBox(img) {
    closeBox();
    opener = img;
    box = document.createElement('div');
    box.className = 'shot';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', img.alt ? `Picture: ${img.alt.slice(0, 120)}` : 'Picture');
    box.innerHTML = `<button type="button" class="shot__x" aria-label="Close the picture">✕</button>
      <div class="shot__pane"><img src="${img.currentSrc || img.src}" alt="${img.alt.replace(/"/g, '&quot;')}"></div>
      <p class="shot__hint">Click the picture for its full size · Esc closes</p>`;
    document.body.appendChild(box);
    document.documentElement.classList.add('has-box');
    box.querySelector('.shot__x').focus({ preventScroll: true });
    box.addEventListener('click', (e) => {
      if (e.target.closest('.shot__x')) return closeBox();
      const shown = e.target.closest('.shot__pane img');
      if (shown) { box.classList.toggle('is-full'); return; }
      closeBox();
    });
  }

  document.addEventListener('click', (e) => {
    const img = e.target.closest('.fig .frame img, .img-row > img');
    if (!img || box) return;
    openBox(img);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && box) closeBox();
    // a picture is reachable from the keyboard: Enter or Space on a focused one opens it
    if ((e.key === 'Enter' || e.key === ' ') && !box && e.target.matches?.('.fig .frame img, .img-row > img')) {
      e.preventDefault();
      openBox(e.target);
    }
  });
})();

// "More build stories" scrolls sideways by swiping; these buttons do the same for a mouse. They stay
// hidden without JavaScript, and each turns off at its end of the row.
(() => {
  for (const nav of document.querySelectorAll('.more')) {
    const row = nav.querySelector('.more-row');
    const btns = nav.querySelector('.more-btns');
    if (!row || !btns) continue;
    const [back, fwd] = btns.querySelectorAll('button');
    const sync = () => {
      const max = row.scrollWidth - row.clientWidth;
      btns.hidden = max < 4;
      back.disabled = row.scrollLeft < 4;
      fwd.disabled = row.scrollLeft > max - 4;
    };
    btns.addEventListener('click', (e) => {
      const b = e.target.closest('[data-more]');
      if (!b) return;
      const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      row.scrollBy({ left: Number(b.dataset.more) * row.clientWidth * 0.9, behavior: smooth ? 'smooth' : 'auto' });
    });
    row.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    sync();
  }
})();
