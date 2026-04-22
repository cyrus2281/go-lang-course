// Shared site chrome (header + footer) for every page.
// Loaded with `defer` from <head>, so it runs once the DOM is parsed and
// BEFORE the other deferred scripts (app.js, search.js, ...) that bind to
// the header's elements (#search-input, #theme-toggle, #menu-toggle, ...).

(function () {
  // Derive the site root from this script's own src so the same file works
  // from the repo root (`assets/js/layout.js`), from a chapter page
  // (`../assets/js/layout.js`), and from the 404 page that uses absolute
  // paths (`/go-lang-course/assets/js/layout.js`).
  const SUFFIX = 'assets/js/layout.js';
  const scriptEl = document.querySelector(`script[src$="${SUFFIX}"]`);
  const rawSrc = scriptEl ? scriptEl.getAttribute('src') : SUFFIX;
  const base = rawSrc.slice(0, rawSrc.length - SUFFIX.length); // "", "../", "/go-lang-course/"

  const homeHref = base + 'index.html';

  const MENU_BTN = `
    <button id="menu-toggle" class="icon-btn menu-toggle" aria-label="Toggle chapter menu" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>`;

  function headerHTML(includeMenu) {
    return `
  <header class="site-header">
    <a href="${homeHref}" class="brand">
      <span class="brand-mark">Go</span>
      <span class="brand-name">Learn <span class="brand-accent">Go</span></span>
    </a>
    ${includeMenu ? MENU_BTN : ''}
    <div class="header-spacer"></div>
    <div class="search" role="search">
      <input id="search-input" type="search" placeholder="Search chapters…" autocomplete="off" aria-label="Search across all chapters">
      <kbd class="search-hint">/</kbd>
      <div id="search-results" class="search-results" role="listbox"></div>
    </div>
    <button id="theme-toggle" class="icon-btn" aria-label="Toggle theme" type="button"></button>
  </header>`;
  }

  const FOOTER_HTML = `
  <footer class="site-footer">
    <div class="footer-line">
      Made with <span class="heart">❤️</span> by
      <a href="https://github.com/cyrus2281" target="_blank" rel="noopener">Cyrus Mobini</a>
    </div>
    <a class="bmac" href="https://buymeacoffee.com/cyrus2281" target="_blank" rel="noopener" aria-label="Support Cyrus on Buy Me a Coffee">
      <span class="bmac-icon" aria-hidden="true">☕</span>
      Buy me a coffee
    </a>
  </footer>`;

  function inject() {
    const includeMenu = !!document.querySelector('.chapter-sidebar');
    document.body.insertAdjacentHTML('afterbegin', headerHTML(includeMenu));
    document.body.insertAdjacentHTML('beforeend', FOOTER_HTML);
    injectEditButton();
  }

  function injectEditButton() {
    const path = globalThis.location.pathname;
    const match = /\/chapters\/([^/]+\.html)$/.exec(path);
    if (!match) return;
    const nav = document.querySelector('nav.chapter-nav');
    if (!nav) return;

    const editUrl = `https://github.com/cyrus2281/go-lang-course/edit/main/chapters/${match[1]}`;
    const editLink = document.createElement('a');
    editLink.className = 'edit-page';
    editLink.href = editUrl;
    editLink.target = '_blank';
    editLink.rel = 'noopener';
    editLink.style.gridColumn = '1 / -1';
    editLink.style.textAlign = 'center';
    editLink.innerHTML = `
      <div class="nav-label">Contribute</div>
      <div class="nav-title">✎ Edit this page on GitHub</div>
    `;
    nav.appendChild(editLink);
  }

  if (document.body) {
    inject();
  } else {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  }
})();
