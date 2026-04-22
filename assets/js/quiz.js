/* Quiz rendering.
   Chapters declare quizzes with:
     <div class="quiz" data-quiz data-chapter-id="ch-03">
       <script type="application/json" class="quiz-data">
         { "title": "Check your understanding",
           "questions": [
             { "q": "…?", "options": ["A", "B", "C"], "answer": 1,
               "explanation": "…" }
           ]
         }
       </script>
     </div>
   Multiple questions per quiz, instant feedback, best-score stored in
   localStorage via GoProgress.recordQuizScore(). */
(function () {
  'use strict';

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function renderQuiz(root) {
    const dataEl = root.querySelector('script.quiz-data');
    if (!dataEl) return;
    let data;
    try { data = JSON.parse(dataEl.textContent); }
    catch (e) { console.error('Invalid quiz JSON', e); return; }

    const chapterId = root.dataset.chapterId || 'unknown';
    const questions = data.questions || [];
    if (!questions.length) return;

    const answered = new Array(questions.length).fill(null); // user's choice idx
    const correctIdx = questions.map(q => q.answer);

    const title = data.title || 'Quick quiz';
    const header = document.createElement('div');
    header.className = 'quiz-header';
    header.innerHTML = `<h3>${escapeHTML(title)}</h3>
      <span class="badge">${questions.length} question${questions.length === 1 ? '' : 's'}</span>`;
    root.appendChild(header);

    questions.forEach((q, qi) => {
      const qEl = document.createElement('div');
      qEl.className = 'quiz-question';
      qEl.innerHTML = `
        <div class="q-text"><span class="q-num">Q${qi + 1}.</span>${escapeHTML(q.q)}</div>
        <div class="q-options"></div>
        <div class="quiz-explanation"></div>
      `;
      const optsWrap = qEl.querySelector('.q-options');
      (q.options || []).forEach((opt, oi) => {
        const label = document.createElement('label');
        label.className = 'quiz-option';
        label.innerHTML = `<input type="radio" name="q-${chapterId}-${qi}" value="${oi}">
          <span>${escapeHTML(opt)}</span>`;
        label.addEventListener('click', (e) => onChoose(qi, oi));
        optsWrap.appendChild(label);
      });
      root.appendChild(qEl);
    });

    const summary = document.createElement('div');
    summary.className = 'quiz-summary';
    summary.style.display = 'none';
    root.appendChild(summary);

    function onChoose(qi, oi) {
      if (answered[qi] !== null) return; // lock after first choice
      answered[qi] = oi;
      const qEl = root.querySelectorAll('.quiz-question')[qi];
      const opts = qEl.querySelectorAll('.quiz-option');
      opts.forEach((opt, i) => {
        opt.classList.add('disabled');
        opt.querySelector('input').disabled = true;
        if (i === correctIdx[qi]) opt.classList.add('correct');
        else if (i === oi) opt.classList.add('wrong');
      });
      const exp = qEl.querySelector('.quiz-explanation');
      const q = questions[qi];
      const correct = oi === correctIdx[qi];
      exp.innerHTML = `<strong>${correct ? 'Correct.' : 'Not quite.'}</strong> ${escapeHTML(q.explanation || '')}`;
      exp.classList.add('show');
      maybeSummarize();
    }

    function maybeSummarize() {
      if (answered.some(a => a === null)) return;
      const score = answered.reduce((s, a, i) => s + (a === correctIdx[i] ? 1 : 0), 0);
      summary.style.display = 'block';
      let message;
      const total = questions.length;
      const pct = score / total;
      if (pct === 1)      message = '🎉 Perfect score — you nailed it!';
      else if (pct >= .6) message = 'Nice work — review the explanations and keep going.';
      else                message = 'Re-read this chapter and try again — you\'ve got this.';
      summary.innerHTML = `<span>${score} / ${total} correct.</span> <span>${message}</span>`;
      if (window.GoProgress) window.GoProgress.recordQuizScore(chapterId, score, total);
    }
  }

  function init() {
    document.querySelectorAll('.quiz[data-quiz]').forEach(renderQuiz);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
