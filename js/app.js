(() => {
  "use strict";

  const QUESTIONS = Array.isArray(window.PATHOLOGY_QUESTIONS) ? window.PATHOLOGY_QUESTIONS : [];
  const qById = new Map(QUESTIONS.map(q => [q.id, q]));
  const app = document.getElementById("app");
  const STORAGE_KEY = "pathologyTrainerProgressV1";
  const SESSION_KEY = "pathologyTrainerActiveSessionV1";
  let session = null;
  let timerHandle = null;

  function defaultProgress() {
    return { totalAttempts: 0, correctAttempts: 0, perQuestion: {}, mistakes: [], sessions: 0 };
  }

  function loadProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { ...defaultProgress(), ...(raw || {}) };
    } catch {
      return defaultProgress();
    }
  }

  let progress = loadProgress();

  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch {}
  }

  function loadStoredSession() {
    try {
      const raw = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (!raw || raw.finished || !Array.isArray(raw.ids) || !raw.ids.length) return null;
      return raw;
    } catch {
      return null;
    }
  }

  function persistSession() {
    if (!session || session.finished) return;
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  }

  function clearStoredSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    const aa = [...a].sort((x, y) => x - y);
    const bb = [...b].sort((x, y) => x - y);
    return aa.every((v, i) => v === bb[i]);
  }

  function getStats() {
    const attemptedUnique = Object.keys(progress.perQuestion || {}).length;
    const pct = progress.totalAttempts ? Math.round((progress.correctAttempts / progress.totalAttempts) * 100) : 0;
    return { attemptedUnique, pct, mistakes: progress.mistakes.length };
  }

  function renderHome() {
    clearTimer();
    session = null;
    const s = getStats();
    const savedSession = loadStoredSession();
    app.innerHTML = `
      <section class="hero">
        <div class="hero-main">
          <div class="eyebrow">РК №1 · Патология</div>
          <h1>Тренажёр как экзамен ПДД.</h1>
          <p>251 вопрос из твоего Word-файла. Проходи тренировку или экзамен, а потом отдельно разбирай только те задания, где ошибся.</p>
        </div>
        <div class="hero-stats">
          <div class="stat-line"><strong>${QUESTIONS.length}</strong><span>вопросов в базе</span></div>
          <div class="stat-line"><strong>${s.attemptedUnique}</strong><span>уже встречались в попытках</span></div>
          <div class="stat-line"><strong>${s.mistakes}</strong><span>сейчас в работе над ошибками</span></div>
          <div class="stat-line"><strong>${s.pct}%</strong><span>точность всех ответов</span></div>
        </div>
      </section>

      <h2 class="section-title">Выбери режим</h2>
      <section class="mode-grid">
        ${savedSession ? `
        <button class="mode-card continue-card" data-action="continue-session">
          <span class="mode-icon">▶</span>
          <h3>Продолжить</h3>
          <p>Вернуться к незавершённой попытке с того же места.</p>
          <span class="mode-meta">Вопрос ${Math.min(savedSession.index + 1, savedSession.ids.length)} из ${savedSession.ids.length} →</span>
        </button>` : ""}
        <button class="mode-card" data-action="training-settings">
          <span class="mode-icon">✓</span>
          <h3>Тренировка</h3>
          <p>Сразу проверяй ответ, смотри правильный вариант и двигайся дальше.</p>
          <span class="mode-meta">Настроить тренировку →</span>
        </button>
        <button class="mode-card" data-action="exam-settings">
          <span class="mode-icon">⏱</span>
          <h3>Экзамен</h3>
          <p>Без подсказок во время прохождения. Результат и полный разбор — только в конце.</p>
          <span class="mode-meta">Начать экзамен →</span>
        </button>
        <button class="mode-card" data-action="mistakes">
          <span class="mode-icon">!</span>
          <h3>Работа над ошибками</h3>
          <p>Повтори вопросы, на которых ошибался. Правильный повтор убирает вопрос из текущих ошибок.</p>
          <span class="mode-meta">${s.mistakes ? `Повторить ${s.mistakes}` : "Ошибок пока нет"}</span>
        </button>
      </section>
    `;
  }

  function renderSettings(mode) {
    const exam = mode === "exam";
    app.innerHTML = `
      <section class="panel">
        <div class="panel-head">
          <h1>${exam ? "Экзамен" : "Тренировка"}</h1>
          <p>${exam ? "Ответы не раскрываются до завершения — как на экзамене." : "После проверки сразу увидишь правильный ответ."}</p>
        </div>
        <div class="settings-grid">
          <div class="field">
            <label for="questionCount">Количество вопросов</label>
            <select id="questionCount">
              <option value="20">20</option>
              <option value="50" ${exam ? "" : "selected"}>50</option>
              <option value="100">100</option>
              <option value="all">Все ${QUESTIONS.length}</option>
            </select>
          </div>
          <div class="field">
            <label for="questionOrder">Порядок вопросов</label>
            <select id="questionOrder">
              <option value="random" selected>Случайный</option>
              <option value="sequential">По порядку</option>
            </select>
          </div>
          ${exam ? `
          <div class="field">
            <label for="examTime">Таймер</label>
            <select id="examTime">
              <option value="0">Без таймера</option>
              <option value="20" selected>20 минут</option>
              <option value="30">30 минут</option>
              <option value="60">60 минут</option>
            </select>
          </div>` : ""}
          <label class="checkline">
            <input id="shuffleOptions" type="checkbox" checked />
            <span><strong>Перемешивать варианты</strong><br><small>Чтобы не запоминать номер ответа</small></span>
          </label>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" data-action="home">← Назад</button>
          <button class="btn btn-primary" data-action="start-${mode}">${exam ? "Начать экзамен" : "Начать тренировку"}</button>
        </div>
      </section>
    `;
  }

  function buildSession({ mode, ids, shuffleOptions = true, minutes = 0 }) {
    const optionOrder = {};
    ids.forEach(id => {
      const q = qById.get(id);
      const base = q.options.map((_, i) => i);
      optionOrder[id] = shuffleOptions ? shuffle(base) : base;
    });
    return {
      mode,
      ids,
      index: 0,
      optionOrder,
      answers: {},
      startedAt: Date.now(),
      endsAt: minutes ? Date.now() + minutes * 60_000 : null,
      finished: false,
    };
  }

  function startConfigured(mode) {
    const countEl = document.getElementById("questionCount");
    const orderEl = document.getElementById("questionOrder");
    const shuffleEl = document.getElementById("shuffleOptions");
    const timeEl = document.getElementById("examTime");
    const rawCount = countEl.value;
    const count = rawCount === "all" ? QUESTIONS.length : Number(rawCount);
    let ids = QUESTIONS.map(q => q.id);
    if (orderEl.value === "random") ids = shuffle(ids);
    ids = ids.slice(0, count);
    session = buildSession({
      mode,
      ids,
      shuffleOptions: shuffleEl.checked,
      minutes: mode === "exam" && timeEl ? Number(timeEl.value) : 0,
    });
    persistSession();
    if (session.endsAt) startTimer();
    renderQuestion();
  }

  function startMistakes() {
    const ids = progress.mistakes.filter(id => qById.has(id));
    if (!ids.length) {
      app.innerHTML = `
        <section class="panel empty-state">
          <div class="big">✓</div>
          <h2>Ошибок пока нет</h2>
          <p>Пройди тренировку или экзамен — вопросы с ошибками появятся здесь автоматически.</p>
          <div class="actions" style="justify-content:center"><button class="btn btn-primary" data-action="home">На главную</button></div>
        </section>`;
      return;
    }
    session = buildSession({ mode: "mistakes", ids: shuffle(ids), shuffleOptions: true, minutes: 0 });
    persistSession();
    renderQuestion();
  }

  function answerState(id) {
    if (!session.answers[id]) session.answers[id] = { selected: [], checked: false, isCorrect: null, recorded: false };
    return session.answers[id];
  }

  function renderQuestion() {
    if (!session || !session.ids.length) return renderHome();
    const id = session.ids[session.index];
    const q = qById.get(id);
    const a = answerState(id);
    const isPractice = session.mode !== "exam";
    const locked = isPractice && a.checked;
    const order = session.optionOrder[id];
    const answeredCount = session.ids.filter(qid => (session.answers[qid]?.selected?.length || 0) > 0).length;

    const optionHtml = order.map((origIdx, displayIdx) => {
      const selected = a.selected.includes(origIdx);
      const correct = q.correct.includes(origIdx);
      let cls = selected ? "selected" : "";
      let mark = "";
      if (locked && correct) { cls += " correct"; mark = "✓"; }
      if (locked && selected && !correct) { cls += " wrong"; mark = "✕"; }
      return `
        <button class="option ${cls}" data-option="${origIdx}" ${locked ? "disabled" : ""}>
          <span class="option-index">${displayIdx + 1}</span>
          <span>${escapeHtml(q.options[origIdx])}</span>
          <span class="option-mark">${mark}</span>
        </button>`;
    }).join("");

    let feedback = "";
    if (locked) {
      feedback = a.isCorrect
        ? `<div class="feedback good">✓ Правильно</div>`
        : `<div class="feedback bad">✕ Неверно. Правильный ответ выделен выше.</div>`;
    }

    app.innerHTML = `
      <section class="exam-layout">
        <div class="question-panel">
          <div class="question-top">
            <div><span class="question-counter">Вопрос ${session.index + 1} из ${session.ids.length}</span><div class="question-status">ID ${q.id} · ${session.mode === "exam" ? "Экзамен" : session.mode === "mistakes" ? "Ошибки" : "Тренировка"}</div></div>
            ${session.endsAt ? `<div class="timer" id="timer">--:--</div>` : ""}
          </div>
          <div class="question-body">
            <h2>${escapeHtml(q.question)}</h2>
            ${q.multiple ? `<div class="multi-note">Можно выбрать несколько вариантов</div>` : ""}
            <div class="options">${optionHtml}</div>
            ${feedback}
          </div>
          <div class="question-actions">
            <button class="btn btn-secondary" data-action="prev" ${session.index === 0 ? "disabled" : ""}>← Назад</button>
            <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end">
              ${session.mode === "exam"
                ? `<button class="btn btn-secondary" data-action="finish">Завершить</button><button class="btn btn-accent" data-action="save-next">${session.index === session.ids.length - 1 ? "Сохранить" : "Ответить и далее"}</button>`
                : a.checked
                  ? `<button class="btn btn-accent" data-action="next">${session.index === session.ids.length - 1 ? "К результату" : "Далее →"}</button>`
                  : `<button class="btn btn-accent" data-action="check" ${a.selected.length ? "" : "disabled"}>Проверить ответ</button>`
              }
            </div>
          </div>
        </div>
        <aside class="side-panel">
          <details class="question-nav-details" id="questionNavDetails">
          <summary>Вопросы · отвечено ${answeredCount}/${session.ids.length}</summary>
          <div class="question-grid">
            ${session.ids.map((qid, i) => {
              const ans = session.answers[qid];
              let cls = i === session.index ? "current" : "";
              if (session.mode === "exam" && ans?.selected?.length) cls += " answered";
              if (session.mode !== "exam" && ans?.checked) cls += ans.isCorrect ? " good" : " bad";
              return `<button class="qnav ${cls}" data-jump="${i}">${i + 1}</button>`;
            }).join("")}
          </div>
          <div class="side-summary">${session.mode === "exam" ? "Правильность ответов будет показана только после завершения." : "Зелёный/красный статус появляется после проверки."}</div>
          </details>
        </aside>
      </section>
    `;
    const navDetails = document.getElementById("questionNavDetails");
    if (navDetails) navDetails.open = window.matchMedia("(min-width: 861px)").matches;
    updateTimerText();
  }

  function selectOption(origIdx) {
    if (!session) return;
    const q = qById.get(session.ids[session.index]);
    const a = answerState(q.id);
    if (session.mode !== "exam" && a.checked) return;
    if (q.multiple) {
      a.selected = a.selected.includes(origIdx) ? a.selected.filter(x => x !== origIdx) : [...a.selected, origIdx];
    } else {
      a.selected = [origIdx];
    }
    persistSession();
    renderQuestion();
  }

  function recordAnswer(q, a) {
    if (a.recorded) return;
    a.recorded = true;
    progress.totalAttempts += 1;
    if (a.isCorrect) progress.correctAttempts += 1;
    const item = progress.perQuestion[q.id] || { attempts: 0, correct: 0, wrong: 0 };
    item.attempts += 1;
    if (a.isCorrect) item.correct += 1; else item.wrong += 1;
    progress.perQuestion[q.id] = item;

    const set = new Set(progress.mistakes);
    if (a.isCorrect) set.delete(q.id); else set.add(q.id);
    progress.mistakes = [...set].sort((x, y) => x - y);
    saveProgress();
  }

  function checkCurrent() {
    const q = qById.get(session.ids[session.index]);
    const a = answerState(q.id);
    if (!a.selected.length) return;
    a.isCorrect = sameSet(a.selected, q.correct);
    a.checked = true;
    recordAnswer(q, a);
    persistSession();
    renderQuestion();
  }

  function saveExamCurrentAndNext() {
    const id = session.ids[session.index];
    const a = answerState(id);
    if (session.index < session.ids.length - 1) {
      session.index += 1;
    }
    persistSession();
    renderQuestion();
  }

  function finalizeSession() {
    if (!session || session.finished) return;
    clearTimer();
    session.finished = true;
    session.ids.forEach(id => {
      const q = qById.get(id);
      const a = answerState(id);
      a.isCorrect = a.selected.length > 0 && sameSet(a.selected, q.correct);
      a.checked = true;
      recordAnswer(q, a);
    });
    progress.sessions += 1;
    saveProgress();
    clearStoredSession();
    renderResults();
  }

  function renderResults() {
    const entries = session.ids.map(id => ({ q: qById.get(id), a: answerState(id) }));
    const correct = entries.filter(x => x.a.isCorrect).length;
    const unanswered = entries.filter(x => !x.a.selected.length).length;
    const wrong = entries.length - correct - unanswered;
    const pct = entries.length ? Math.round(correct / entries.length * 100) : 0;
    const problemIds = entries.filter(x => !x.a.isCorrect).map(x => x.q.id);
    session.problemIds = problemIds;

    app.innerHTML = `
      <section class="result-card">
        <div class="score-ring" style="--score:${pct * 3.6}deg"><strong>${pct}%</strong></div>
        <h1>${pct >= 90 ? "Отличный результат" : pct >= 70 ? "Хорошо" : "Есть что повторить"}</h1>
        <p>${correct} правильных ответов из ${entries.length}</p>
        <div class="result-stats">
          <div class="result-stat"><strong>${correct}</strong><span>правильно</span></div>
          <div class="result-stat"><strong>${wrong}</strong><span>ошибок</span></div>
          <div class="result-stat"><strong>${unanswered}</strong><span>без ответа</span></div>
        </div>
        <div class="actions result-actions">
          <button class="btn btn-secondary" data-action="home">На главную</button>
          ${problemIds.length ? `<button class="btn btn-accent" data-action="review-session">Разобрать ${problemIds.length} ${problemIds.length === 1 ? "ошибку" : "ошибок"}</button>` : ""}
        </div>
      </section>`;
  }

  function renderReview(ids = null) {
    const reviewIds = ids || session?.problemIds || [];
    if (!reviewIds.length) return renderHome();
    const cards = reviewIds.map((id, i) => {
      const q = qById.get(id);
      const a = session?.answers?.[id] || { selected: [] };
      const userText = a.selected.length ? a.selected.map(idx => q.options[idx]).join("; ") : "Ответ не выбран";
      const correctText = q.correct.map(idx => q.options[idx]).join("; ");
      return `
        <article class="review-card">
          <h3>${i + 1}. ${escapeHtml(q.question)}</h3>
          <div class="answer-box user"><strong>Твой ответ</strong>${escapeHtml(userText)}</div>
          <div class="answer-box correct"><strong>Правильный ответ</strong>${escapeHtml(correctText)}</div>
        </article>`;
    }).join("");
    app.innerHTML = `
      <section class="panel">
        <div class="panel-head"><h1>Разбор ошибок</h1><p>Здесь показаны только вопросы, где ответ был неверным или отсутствовал.</p></div>
        <div class="review-list">${cards}</div>
        <div class="actions">
          <button class="btn btn-secondary" data-action="home">На главную</button>
          <button class="btn btn-primary" data-action="repeat-problems">Повторить эти вопросы</button>
        </div>
      </section>`;
  }

  function repeatProblems() {
    const ids = session?.problemIds ? [...session.problemIds] : [];
    if (!ids.length) return renderHome();
    session = buildSession({ mode: "mistakes", ids: shuffle(ids), shuffleOptions: true, minutes: 0 });
    persistSession();
    renderQuestion();
  }

  function startTimer() {
    clearTimer();
    timerHandle = setInterval(() => {
      if (!session?.endsAt) return;
      if (Date.now() >= session.endsAt) {
        finalizeSession();
        return;
      }
      updateTimerText();
    }, 1000);
  }

  function updateTimerText() {
    const el = document.getElementById("timer");
    if (!el || !session?.endsAt) return;
    const left = Math.max(0, session.endsAt - Date.now());
    const mins = Math.floor(left / 60000);
    const secs = Math.floor((left % 60000) / 1000);
    el.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    el.classList.toggle("danger", left < 5 * 60_000);
  }

  function clearTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
  }

  app.addEventListener("click", (event) => {
    const option = event.target.closest("[data-option]");
    if (option) return selectOption(Number(option.dataset.option));

    const jump = event.target.closest("[data-jump]");
    if (jump && session) {
      session.index = Number(jump.dataset.jump);
      persistSession();
      return renderQuestion();
    }

    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action === "home") renderHome();
    if (action === "continue-session") {
      const saved = loadStoredSession();
      if (saved) {
        session = saved;
        if (session.endsAt && Date.now() >= session.endsAt) finalizeSession();
        else { if (session.endsAt) startTimer(); renderQuestion(); }
      } else renderHome();
    }
    if (action === "training-settings") renderSettings("training");
    if (action === "exam-settings") renderSettings("exam");
    if (action === "start-training") startConfigured("training");
    if (action === "start-exam") startConfigured("exam");
    if (action === "mistakes") startMistakes();
    if (action === "check") checkCurrent();
    if (action === "save-next") saveExamCurrentAndNext();
    if (action === "next") {
      if (session.index >= session.ids.length - 1) finalizeSession();
      else { session.index += 1; persistSession(); renderQuestion(); }
    }
    if (action === "prev" && session.index > 0) { session.index -= 1; persistSession(); renderQuestion(); }
    if (action === "finish") {
      if (confirm("Завершить попытку и показать результат?")) finalizeSession();
    }
    if (action === "review-session") renderReview();
    if (action === "repeat-problems") repeatProblems();
  });

  document.getElementById("brandButton").addEventListener("click", renderHome);
  document.getElementById("resetButton").addEventListener("click", () => {
    if (!confirm("Сбросить всю статистику и список ошибок на этом устройстве?")) return;
    progress = defaultProgress();
    saveProgress();
    clearStoredSession();
    renderHome();
  });

  if (!QUESTIONS.length) {
    app.innerHTML = `<section class="panel"><h1>База вопросов не загрузилась</h1><p>Проверь файл data/questions.js.</p></section>`;
  } else {
    renderHome();
  }
})();
