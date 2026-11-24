const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const { app } = require('./helpers/trainer.cjs');

test('all 157 keys grade correctly with shuffled options and sequential navigation', () => {
  const a = app(); a.start('training', true);
  for (const q of a.questions) {
    assert.equal(a.state().ids[a.state().index], q.id);
    assert.equal(a.state().optionOrder[q.id].length, q.options.length);
    assert.deepEqual([...a.state().optionOrder[q.id]].sort(), q.options.map((_,i) => i).sort());
    assert.ok(!a.html().includes('class="source-note"'));
    a.option(q.correct[0]); a.action('check');
    assert.ok(a.html().includes('feedback good'), `correct answer rejected at ${q.id}`);
    if (q.sourceNote) assert.ok(a.html().includes('class="source-note"'));
    // Repeated check/navigation must not double-count an attempt.
    a.action('check'); a.action('next');
  }
  assert.ok(a.html().includes('157 правильных ответов из 157'));
  assert.equal(a.progress().totalAttempts, 157);
  assert.equal(a.progress().correctAttempts, 157);
  assert.deepEqual(a.progress().mistakes, []);
  assert.equal(a.storage.has(a.config.sessionKey), false);
});

test('all 157 incorrect answers enter mistakes, then correct retry removes them', () => {
  const a = app(); a.start();
  for (const q of a.questions) {
    a.option(q.options.findIndex((_,i) => !q.correct.includes(i))); a.action('check');
    assert.ok(a.html().includes('feedback bad'), `wrong answer accepted at ${q.id}`);
    a.action('next');
  }
  assert.equal(a.progress().mistakes.length, 157);
  a.action('home'); a.action('mistakes');
  const order = [...a.state().ids];
  for (const id of order) {
    a.option(a.questions.find(q => q.id === id).correct[0]); a.action('check'); a.action('next');
  }
  assert.deepEqual(a.progress().mistakes, []);
  assert.equal(a.progress().totalAttempts, 314);
});

test('exam keeps source notes hidden, grades skipped questions, and provides review', () => {
  const a = app(); a.start('exam', true);
  a.jump(27);
  assert.ok(!a.html().includes('class="source-note"'));
  a.option(a.questions[27].correct[0]);
  assert.ok(!a.html().includes('feedback good'));
  a.action('finish');
  assert.ok(a.html().includes('1 правильных ответов из 157'));
  assert.equal(a.progress().mistakes.length, 156);
  a.action('review-session');
  assert.ok(a.html().includes('Разбор ошибок'));
  assert.ok(a.html().includes('class="source-note"'));
});

test('reload resumes selection and checked answer without counting twice', () => {
  const first = app(); first.start(); first.option(0); first.action('check'); first.action('next'); first.option(3);
  const restored = app({ storage: first.storage });
  assert.ok(restored.html().includes('data-action="continue-session"'));
  restored.action('continue-session');
  assert.equal(restored.state().index, 1);
  assert.deepEqual(restored.state().answers[2].selected, [3]);
  restored.action('check');
  assert.equal(restored.progress().totalAttempts, 2);
  restored.jump(0); restored.action('check');
  assert.equal(restored.progress().totalAttempts, 2);
});

test('RK3 reset and progress leave RK1/RK2 storage unchanged', () => {
  const storage = new Map([['pathologyTrainerProgressV1', '{"sentinel":1}'], ['pathologyTrainerProgressRK2V1', '{"sentinel":2}'], ['pathologyTrainerActiveSessionRK2V1', '{"sentinel":3}']]);
  const a = app({ storage }); a.start(); a.option(0); a.action('check');
  a.reset();
  assert.equal(a.progress().totalAttempts, 0);
  assert.equal(storage.has(a.config.sessionKey), false);
  assert.equal(storage.get('pathologyTrainerProgressV1'), '{"sentinel":1}');
  assert.equal(storage.get('pathologyTrainerProgressRK2V1'), '{"sentinel":2}');
  assert.equal(storage.get('pathologyTrainerActiveSessionRK2V1'), '{"sentinel":3}');
});

test('expired exam resumes directly into results', () => {
  const a = app(); a.start('exam');
  const state = a.state(); state.endsAt = Date.now() - 1;
  a.storage.set(a.config.sessionKey, JSON.stringify(state));
  const restored = app({ storage: a.storage }); restored.action('continue-session');
  assert.ok(restored.html().includes('0 правильных ответов из 157'));
  assert.equal(restored.storage.has(restored.config.sessionKey), false);
});

test('RK1/RK2 banks and existing structured answers still render', () => {
  for (const file of ['data/questions.js', 'data/rk2-questions.js']) {
    const a = app({ file }); a.start();
    assert.ok(a.html().includes('question-panel'));
    const q = a.questions[0]; a.option(q.correct[0]); a.action('check');
    assert.ok(a.html().includes('feedback good'));
    a.action('question-bank'); assert.ok(a.html().includes('bank-card'));
    for (const structured of a.questions.filter(q => q.type === 'sequence')) {
      a.start(); a.jump(a.questions.indexOf(structured));
      for (const option of structured.correct) a.sequence(option);
      a.action('check'); assert.ok(a.html().includes('feedback good'));
    }
    for (const structured of a.questions.filter(q => q.type === 'matching')) {
      a.start(); a.jump(a.questions.indexOf(structured));
      structured.correct.forEach((choices, row) => choices.forEach(choice => a.matching(row, choice, structured.multiple)));
      a.action('check'); assert.ok(a.html().includes('feedback good'));
    }
  }
});

test('catalog, trainer resources and all precached assets exist', () => {
  const sw = read('sw.js'), paths = JSON.parse(sw.match(/const APP_SHELL = (\[[\s\S]*?\]);/)[1]);
  for (const asset of paths) assert.ok(fs.existsSync(path.join(root, asset)), asset);
  assert.ok(paths.includes('./rk3.html') && paths.includes('./data/rk3-questions.js'));
  assert.ok(read('js/catalog.js').includes('rk:3'));
  for (const page of ['index.html', 'rk1.html', 'rk2.html', 'rk3.html']) {
    for (const m of read(page).matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)) {
      if (/^(https?:|data:)/.test(m[1])) continue;
      assert.ok(fs.existsSync(path.join(root, m[1])), `${page}: ${m[1]}`);
    }
  }
});

test('offline deep links use the cached trainer instead of falling back to catalog', async () => {
  const cachedTrainer = { name: 'rk3 cached page' };
  const scope = {
    self: { addEventListener() {}, skipWaiting() {}, clients: { claim() {} } },
    fetch: async () => { throw Error('offline'); },
    caches: { match: async (request, options) => {
      if (request.url?.includes('rk3.html?mode=exam') && options?.ignoreSearch) return cachedTrainer;
      if (request === './index.html') return { name: 'catalog' };
    } },
  };
  vm.createContext(scope); vm.runInContext(read('sw.js'), scope);
  scope.request = { url: 'http://localhost/rk3.html?mode=exam', mode: 'navigate' };
  assert.equal(await vm.runInContext('networkFirst(request)', scope), cachedTrainer);
});
