/* Client-side search.
   Loads assets/data/search-index.json and searches across chapters.
   Scoring: title > headings > body terms. Debounced input, keyboard nav. */
(function () {
  'use strict';

  const INDEX_URL_CANDIDATES = [
    // Try the most specific path first (relative to the page's location).
    // Works for both index.html at the repo root and chapter pages under /chapters/
    'assets/data/search-index.json',
    '../assets/data/search-index.json',
    '/go-lang-course/assets/data/search-index.json'
  ];

  let indexCache = null;

  async function loadIndex() {
    if (indexCache) return indexCache;
    for (const url of INDEX_URL_CANDIDATES) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        indexCache = await res.json();
        if (indexCache && indexCache.chapters) return indexCache;
      } catch (e) { /* try next */ }
    }
    // Inline fallback — empty
    indexCache = { chapters: [] };
    return indexCache;
  }

  function tokenize(q) {
    return q.toLowerCase().split(/\s+/).filter(Boolean);
  }

  function scoreChapter(ch, tokens) {
    let score = 0;
    const title = (ch.title || '').toLowerCase();
    const headings = (ch.headings || []).map(h => h.toLowerCase());
    const terms = (ch.terms || []).map(t => t.toLowerCase());
    const description = (ch.description || '').toLowerCase();
    tokens.forEach(t => {
      if (title.includes(t))                       score += 12;
      if (title.startsWith(t))                     score += 4;
      if (headings.some(h => h.includes(t)))       score += 6;
      if (terms.some(term => term.includes(t)))    score += 3;
      if (description.includes(t))                 score += 2;
    });
    // All tokens must appear somewhere
    const haystack = [title, ...headings, ...terms, description].join(' ');
    const missing = tokens.some(t => !haystack.includes(t));
    if (missing) return 0;
    return score;
  }

  function matchedHeading(ch, tokens) {
    for (const h of ch.headings || []) {
      const hl = h.toLowerCase();
      if (tokens.every(t => hl.includes(t))) return h;
    }
    return null;
  }

  function highlight(text, tokens) {
    let out = text;
    tokens.forEach(t => {
      if (!t) return;
      const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }

  async function search(query) {
    const tokens = tokenize(query);
    if (!tokens.length) return [];
    const idx = await loadIndex();
    const results = [];
    (idx.chapters || []).forEach(ch => {
      const score = scoreChapter(ch, tokens);
      if (score > 0) {
        results.push({
          chapter: ch,
          score,
          heading: matchedHeading(ch, tokens)
        });
      }
    });
    results.sort((a, b) => b.score - a.score || a.chapter.number - b.chapter.number);
    return results.slice(0, 8);
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  function resolveChapterHref(ch) {
    // If we're on index.html (no ../), paths are 'chapters/<slug>.html'
    // If we're inside a chapter page, paths need no prefix (they're peers).
    const inChapters = location.pathname.includes('/chapters/');
    const base = inChapters ? '' : 'chapters/';
    return base + ch.slug + '.html' + (ch.hash ? '#' + ch.hash : '');
  }

  function setupSearchUI() {
    const input = document.getElementById('search-input');
    const resultsBox = document.getElementById('search-results');
    if (!input || !resultsBox) return;

    let activeIdx = -1;
    let lastResults = [];

    async function render() {
      const q = input.value.trim();
      if (!q) {
        resultsBox.classList.remove('open');
        resultsBox.innerHTML = '';
        activeIdx = -1;
        return;
      }
      const results = await search(q);
      lastResults = results;
      activeIdx = -1;
      if (!results.length) {
        resultsBox.innerHTML = '<div class="search-empty">No matches. Try a different term.</div>';
        resultsBox.classList.add('open');
        return;
      }
      const tokens = tokenize(q);
      resultsBox.innerHTML = results.map((r, i) => {
        const ch = r.chapter;
        const title = highlight(`Chapter ${ch.number}: ${ch.title}`, tokens);
        const sub = r.heading
          ? 'Section · ' + highlight(r.heading, tokens)
          : (ch.description ? highlight(ch.description, tokens) : '');
        return `<a class="search-result" href="${resolveChapterHref(ch)}" data-idx="${i}">
                  <div class="sr-title">${title}</div>
                  <div class="sr-sub">${sub}</div>
                </a>`;
      }).join('');
      resultsBox.classList.add('open');
    }

    const onInput = debounce(render, 140);
    input.addEventListener('input', onInput);
    input.addEventListener('focus', render);

    input.addEventListener('keydown', (e) => {
      const items = resultsBox.querySelectorAll('.search-result');
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = (activeIdx + 1) % items.length;
        updateActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = (activeIdx - 1 + items.length) % items.length;
        updateActive(items);
      } else if (e.key === 'Enter') {
        if (activeIdx >= 0) {
          e.preventDefault();
          items[activeIdx].click();
        }
      } else if (e.key === 'Escape') {
        input.blur();
        resultsBox.classList.remove('open');
      }
    });

    function updateActive(items) {
      items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
      items[activeIdx] && items[activeIdx].scrollIntoView({ block: 'nearest' });
    }

    document.addEventListener('click', (e) => {
      if (!resultsBox.contains(e.target) && e.target !== input) {
        resultsBox.classList.remove('open');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSearchUI);
  } else {
    setupSearchUI();
  }
})();
