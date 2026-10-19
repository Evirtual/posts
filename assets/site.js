// Theme switch and copy buttons. No dependencies. Same rules as articles.edgarasneverdauskas.com:
// "Copied" appears only once the copy has actually happened; if it fails, the text is selected and
// the page says so.
(() => {
  const root = document.documentElement;
  const KEY = 'posts-theme';
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
      applyTheme(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]);
      sync();
      if (!saveTheme(root.getAttribute('data-theme') || 'system')) toast('Theme changed for this page only: this browser blocks saving it.');
    });
  }

  // --- copying ---
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const FAIL = `Couldn't copy — text selected, press ${isMac ? '⌘C' : 'Ctrl+C'}`;

  function select(el) {
    el.scrollIntoView({ block: 'nearest' });
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

  // Some browsers refuse the clipboard API but still allow the older copy command on a click.
  function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }

  async function copyText(btn) {
    const el = document.getElementById(btn.dataset.copy);
    if (!el) return;
    const text = el.textContent;
    const what = (btn.getAttribute('aria-label') || btn.textContent).replace(/^Copy\s*/i, '');
    const done = () => copied(btn, `Copied ${what} (${text.length.toLocaleString('en-US')} characters).`);
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('No clipboard access');
      await navigator.clipboard.writeText(text);
      done();
    } catch {
      if (legacyCopy(text)) done();
      else { select(el); toast(FAIL, true); }
    }
  }

  // Clipboards take PNG only, so JPGs are redrawn onto a canvas first.
  async function copyImage(btn) {
    const img = btn.closest('figure').querySelector('img');
    try {
      if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) throw new Error('No image clipboard');
      const blob = new Promise((resolve, reject) => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('No image data'))), 'image/png');
      });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      copied(btn, 'Image copied.');
    } catch {
      toast("Couldn't copy the image here. Use Download instead.", true);
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-copy], button[data-copy-image]');
    if (!btn) return;
    if (btn.hasAttribute('data-copy-image')) copyImage(btn); else copyText(btn);
  });
})();
