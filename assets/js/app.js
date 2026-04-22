/* App boot: theme toggle, copy buttons, Go Playground integration, keyboard
   shortcuts, mobile sidebar toggle, scrollspy for chapter sidebar.
   Loaded on every page. */
(function () {
  'use strict';

  // ---- Theme handling -----------------------------------------------------
  const THEME_KEY = 'go-course-theme';
  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) || ''; } catch (e) { return ''; }
  }
  function setTheme(theme) {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    } else {
      document.documentElement.removeAttribute('data-theme');
      try { localStorage.removeItem(THEME_KEY); } catch (e) {}
    }
    updateThemeIcon();
  }
  function effectiveTheme() {
    const explicit = getTheme();
    if (explicit) return explicit;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function toggleTheme() {
    setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
  }
  function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const isDark = effectiveTheme() === 'dark';
    btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    btn.innerHTML = isDark ? sunIcon() : moonIcon();
  }
  function moonIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
  function sunIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/></svg>';
  }

  // Apply persisted theme on first paint (already done via inline script in
  // each page, but re-apply here defensively).
  (function bootTheme() {
    const t = getTheme();
    if (t) document.documentElement.setAttribute('data-theme', t);
  })();

  // ---- Copy + Playground for code blocks ---------------------------------
  const PLAYGROUND_BASE = 'https://go.dev/play/';

  // go.dev sets `frame-ancestors 'self'`, so the playground cannot be
  // embedded in an iframe on this site. Instead, the button copies the
  // snippet to the clipboard and opens go.dev/play in a new tab, where
  // the user pastes (⌘/Ctrl+V) and clicks Run.

  function languageOf(code) {
    const cls = code.className || '';
    const m = cls.match(/language-(\w+)/);
    return m ? m[1] : '';
  }

  function chooseLangLabel(lang) {
    if (!lang) return 'text';
    return lang.toLowerCase();
  }

  function decorateCodeBlocks(root) {
    (root || document).querySelectorAll('pre > code').forEach((codeEl) => {
      const pre = codeEl.parentElement;
      if (!pre || pre.parentElement.classList.contains('code-block')) return;

      const lang = languageOf(codeEl);
      const isGo = lang === 'go';
      // Allow opt-out: <pre><code class="language-go" data-runnable="false">
      const runnable = isGo && codeEl.dataset.runnable !== 'false';

      // Wrap
      const wrap = document.createElement('div');
      wrap.className = 'code-block';
      pre.parentNode.insertBefore(wrap, pre);

      const header = document.createElement('div');
      header.className = 'code-block-header';

      const langTag = document.createElement('span');
      langTag.className = 'code-block-lang';
      langTag.textContent = chooseLangLabel(lang);
      header.appendChild(langTag);

      const actions = document.createElement('div');
      actions.className = 'code-block-actions';

      if (runnable) {
        const runBtn = document.createElement('button');
        runBtn.className = 'code-btn run';
        runBtn.type = 'button';
        runBtn.innerHTML = playIcon() + '<span>Open Go Playground</span>';
        runBtn.title = 'Copy snippet and open the Go Playground in a new tab';
        runBtn.addEventListener('click', () => openInPlayground(codeEl.textContent));
        actions.appendChild(runBtn);
      }

      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-btn copy';
      copyBtn.type = 'button';
      copyBtn.innerHTML = copyIcon() + '<span>Copy</span>';
      copyBtn.title = 'Copy code to clipboard';
      copyBtn.addEventListener('click', () => copyToClipboard(codeEl.textContent, copyBtn));
      actions.appendChild(copyBtn);

      header.appendChild(actions);

      wrap.appendChild(header);
      wrap.appendChild(pre);
    });
  }

  function copyIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  }
  function checkIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  }
  function playIcon() {
    return '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg>';
  }

  function writeClipboard(text, done) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }
  function copyToClipboard(text, btn) {
    writeClipboard(text, () => {
      btn.classList.add('copied');
      btn.innerHTML = checkIcon() + '<span>Copied</span>';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = copyIcon() + '<span>Copy</span>';
      }, 1800);
    });
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  // Copy the snippet to the clipboard and open the Go Playground in a new
  // tab. go.dev blocks iframe embedding via `frame-ancestors 'self'`, so a
  // new tab is the only reliable option from a static site.
  function openInPlayground(code) {
    writeClipboard(code, () => {});
    window.open(PLAYGROUND_BASE, '_blank', 'noopener');
  }

  // ---- Mobile sidebar toggle ---------------------------------------------
  function setupMobileSidebar() {
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.chapter-sidebar');
    if (!toggle || !sidebar) return;
    let backdrop = document.querySelector('.backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'backdrop';
      document.body.appendChild(backdrop);
    }
    function close() {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    }
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('open');
    });
    backdrop.addEventListener('click', close);
    sidebar.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  }

  // ---- Scrollspy for chapter sidebar -------------------------------------
  function setupScrollspy() {
    const sidebar = document.querySelector('.chapter-sidebar');
    if (!sidebar) return;
    const links = sidebar.querySelectorAll('a[href^="#"]');
    if (!links.length) return;
    const map = new Map();
    links.forEach(a => {
      const id = decodeURIComponent(a.getAttribute('href').slice(1));
      const target = document.getElementById(id);
      if (target) map.set(target, a);
    });
    if (!map.size) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        const link = map.get(e.target);
        if (!link) return;
        if (e.isIntersecting) {
          links.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
    map.forEach((_, target) => observer.observe(target));
  }

  // ---- Keyboard shortcuts -------------------------------------------------
  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);

      if (!inField && e.key === '/') {
        const input = document.getElementById('search-input');
        if (input) { e.preventDefault(); input.focus(); }
        return;
      }
      if (inField) return;
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === 'ArrowLeft') {
        const prev = document.querySelector('.chapter-nav .prev');
        if (prev) prev.click();
      }
      if (e.key === 'ArrowRight') {
        const next = document.querySelector('.chapter-nav .next');
        if (next) next.click();
      }
      if (e.key.toLowerCase() === 't') {
        toggleTheme();
      }
    });
  }

  // ---- "Mark complete" button --------------------------------------------
  function setupCompleteButton() {
    const btn = document.querySelector('.complete-btn');
    if (!btn) return;
    const id = btn.dataset.chapterId;
    const box = btn.closest('.complete-box');
    function render() {
      const done = window.GoProgress && window.GoProgress.isComplete(id);
      btn.classList.toggle('done', !!done);
      box && box.classList.toggle('done', !!done);
      btn.innerHTML = done ? checkIcon() + ' Marked complete · click to undo'
                           : '✓ Mark this chapter complete';
    }
    btn.addEventListener('click', () => {
      if (!window.GoProgress) return;
      const done = window.GoProgress.isComplete(id);
      window.GoProgress.markComplete(id, !done);
      render();
    });
    render();
  }

  // ---- Init ---------------------------------------------------------------
  function init() {
    // Theme toggle wiring
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
    updateThemeIcon();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeIcon);

    // Code blocks → wrap with copy / run controls (must run BEFORE prism so
    // prism still has the original <pre><code> element to highlight).
    decorateCodeBlocks();

    setupMobileSidebar();
    setupScrollspy();
    setupKeyboard();
    setupCompleteButton();

    // Mark current chapter as visited
    const main = document.querySelector('[data-chapter-id]');
    if (main && window.GoProgress) {
      const id = main.dataset.chapterId || (document.body.dataset.chapterId);
      if (id) window.GoProgress.markVisited(id);
    }

    // Re-decorate dynamically inserted code (e.g. inside details/exercises
    // that lazy-render). Keep it cheap.
    document.querySelectorAll('.exercise-solution').forEach((d) => {
      d.addEventListener('toggle', () => decorateCodeBlocks(d));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
