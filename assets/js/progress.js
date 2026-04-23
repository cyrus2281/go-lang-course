/* Progress tracking via localStorage.
   Persists which chapters the learner has marked complete, plus their last
   visit timestamp and quiz scores. Exposes a small API on window.GoProgress. */
(function () {
  'use strict';

  const KEY = 'go-course-progress-v1';
  const TOTAL_CHAPTERS = 34; // Updated by index.html if curriculum grows

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { chapters: {}, totalChapters: TOTAL_CHAPTERS };
      const parsed = JSON.parse(raw);
      if (!parsed.chapters) parsed.chapters = {};
      if (!parsed.totalChapters) parsed.totalChapters = TOTAL_CHAPTERS;
      return parsed;
    } catch (e) {
      return { chapters: {}, totalChapters: TOTAL_CHAPTERS };
    }
  }

  function write(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { /* localStorage unavailable */ }
  }

  function setTotal(n) {
    const state = read();
    state.totalChapters = n;
    write(state);
  }

  function markVisited(chapterId) {
    if (!chapterId) return;
    const state = read();
    state.chapters[chapterId] = state.chapters[chapterId] || {};
    state.chapters[chapterId].lastVisited = new Date().toISOString();
    write(state);
  }

  function markComplete(chapterId, complete = true) {
    if (!chapterId) return;
    const state = read();
    state.chapters[chapterId] = state.chapters[chapterId] || {};
    state.chapters[chapterId].completed = !!complete;
    if (complete) {
      state.chapters[chapterId].completedAt = new Date().toISOString();
    } else {
      delete state.chapters[chapterId].completedAt;
    }
    write(state);
    document.dispatchEvent(new CustomEvent('progress:change', { detail: { chapterId, complete } }));
  }

  function isComplete(chapterId) {
    const state = read();
    return !!(state.chapters[chapterId] && state.chapters[chapterId].completed);
  }

  function recordQuizScore(chapterId, score, total) {
    if (!chapterId) return;
    const state = read();
    state.chapters[chapterId] = state.chapters[chapterId] || {};
    const prev = state.chapters[chapterId].quizBest || 0;
    if (score > prev) state.chapters[chapterId].quizBest = score;
    state.chapters[chapterId].quizLast = score;
    state.chapters[chapterId].quizTotal = total;
    write(state);
  }

  function getCompletedCount() {
    const state = read();
    return Object.values(state.chapters).filter(c => c.completed).length;
  }

  function getProgressPercent() {
    const state = read();
    const total = state.totalChapters || TOTAL_CHAPTERS;
    return total === 0 ? 0 : Math.round((getCompletedCount() / total) * 100);
  }

  function getLastVisited() {
    const state = read();
    let last = null;
    Object.entries(state.chapters).forEach(([id, c]) => {
      if (c.lastVisited && (!last || c.lastVisited > last.lastVisited)) {
        last = { id, ...c };
      }
    });
    return last;
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    document.dispatchEvent(new CustomEvent('progress:change', { detail: { reset: true } }));
  }

  // Render helpers - wire up DOM elements declaratively
  function renderProgressBar(fillEl, labelEl) {
    const pct = getProgressPercent();
    const completed = getCompletedCount();
    const total = read().totalChapters || TOTAL_CHAPTERS;
    if (fillEl) fillEl.style.width = pct + '%';
    if (labelEl) labelEl.textContent = `${completed} / ${total} chapters · ${pct}%`;
  }

  function decorateTOCCards(root) {
    (root || document).querySelectorAll('[data-chapter-id]').forEach((card) => {
      const id = card.getAttribute('data-chapter-id');
      if (isComplete(id)) card.classList.add('done');
      else card.classList.remove('done');
    });
  }

  function getState() { return read(); }

  window.GoProgress = {
    setTotal,
    markVisited,
    markComplete,
    isComplete,
    recordQuizScore,
    getCompletedCount,
    getProgressPercent,
    getLastVisited,
    getState,
    renderProgressBar,
    decorateTOCCards,
    reset
  };
})();
