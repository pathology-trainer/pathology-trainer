// Integration checks against the real shared trainer and isolated DOM/storage.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const { app: makeApp } = require('./helpers/trainer.cjs');

function finishScore(a, correct, total = 100) {
  a.start('exam', false, total);
  for (let i = 0; i < total; i++) {
    const q = a.questions[i]; a.jump(i);
    if (q.type === 'sequence') {
      if (i < correct) for (const choice of q.correct) a.sequence(choice);
    } else if (q.type === 'matching') {
      if (i < correct) q.correct.forEach((choices, row) => choices.forEach(choice => a.matching(row, choice, q.multiple)));
    } else {
      const choices = i < correct ? q.correct : [q.options.findIndex((_, index) => !q.correct.includes(index))];
      for (const choice of choices) a.option(choice);
    }
  }
  a.action('finish');
  return a.html();
}

for (const [score, text] of [
  [0, 'Знания пока в латентной фазе'], [10, 'Знания пока в латентной фазе'],
  [11, 'Первый контакт состоялся'], [25, 'Первый контакт состоялся'],
  [26, 'Картина начинает проясняться'], [49, 'Картина начинает проясняться'],
  [50, 'База есть. Закрепляем'], [69, 'База есть. Закрепляем'],
  [70, 'Влад и Платон гордятся тобой!'], [89, 'Влад и Платон гордятся тобой!'],
  [90, 'Почти безупречно'], [99, 'Почти безупречно'], [100, 'Полная компенсация'],
]) {
  test(`feedback at ${score}% matches the visible score band`, () => {
    const html = finishScore(makeApp(), score);
    assert.ok(html.includes(`<strong>${score}%</strong>`));
    assert.ok(html.includes(`<h1>${text}</h1>`));
  });
}

test('perfect 20-question run gives badge and finite decorative confetti', () => {
  const html = finishScore(makeApp(), 20, 20);
  assert.ok(html.includes('нашего архивариуса Леси'));
  assert.ok(html.includes('Влад и Платон аплодируют'));
  assert.ok(html.includes('Без единого осложнения'));
  assert.ok(html.includes('class="result-confetti" aria-hidden="true"'));
  assert.equal((html.match(/<i style=/g) || []).length, 36);
  assert.match(read('css/unified.css'), /result-confetti-fall 2\.4s/);
});

test('reduced motion keeps the badge and omits confetti', () => {
  const html = finishScore(makeApp({ reducedMotion: true }), 20, 20);
  assert.ok(html.includes('Без единого осложнения'));
  assert.ok(!html.includes('class="result-confetti"'));
});

test('one-question mistake retry gets 100% without the 20-question badge', () => {
  const storage = new Map([['pathologyTrainerProgressRK3V1', JSON.stringify({ mistakes: [1] })]]);
  const a = makeApp({ storage }); a.action('mistakes');
  a.option(a.questions[0].correct[0]); a.action('check'); a.action('next');
  assert.ok(a.html().includes('<strong>100%</strong>'));
  assert.ok(!a.html().includes('class="perfect-badge"'));
  assert.ok(!a.html().includes('class="result-confetti"'));
});

test('250 of 251 never rounds into a perfect score or Lesya easter egg', () => {
  const html = finishScore(makeApp({ file: 'data/questions.js' }), 250, 251);
  assert.ok(html.includes('<strong>99%</strong>'));
  assert.ok(!html.includes('нашего архивариуса Леси'));
  assert.ok(!html.includes('class="perfect-badge"'));
});

test('entirely unanswered attempt gets a neutral message and preserves comparison history', () => {
  const a = makeApp(); finishScore(a, 50);
  a.start('exam', false, 100); a.action('finish');
  assert.ok(a.html().includes('Ты пока не ответил на вопросы'));
  assert.ok(!a.html().includes('латентной фазе'));
  assert.equal(a.progress().lastResults['exam:100'].correct, 50);
  assert.ok(!a.html().includes('class="result-improvement"'));
});

test('improvement survives reload and compares matching mode and size only', () => {
  const first = makeApp(); finishScore(first, 50);
  const restored = makeApp({ storage: first.storage });
  finishScore(restored, 65);
  assert.ok(restored.html().includes('На 15 процентных пунктов лучше прошлой попытки'));
  assert.equal(restored.progress().lastResults['exam:100'].correct, 65);
  finishScore(restored, 20, 20);
  assert.ok(!restored.html().includes('class="result-improvement"'));
  const progress = restored.progress();
  progress.lastResults['training:50'] = { correct: 0, total: 50 };
  first.storage.set(first.config.storageKey, JSON.stringify(progress));
  const otherMode = makeApp({ storage: first.storage }); finishScore(otherMode, 50, 50);
  assert.ok(!otherMode.html().includes('class="result-improvement"'));
});

test('personal feedback and awards use the shared engine in RK1, RK2, and RK3', () => {
  for (const file of ['data/questions.js', 'data/rk2-questions.js', 'data/rk3-questions.js']) {
    const a = makeApp({ file });
    assert.ok(finishScore(a, 15, 20).includes('Влад и Платон гордятся тобой!'));
    assert.ok(finishScore(a, 19, 20).includes('готовы звать тебя в команду'));
    assert.ok(finishScore(a, 20, 20).includes('Без единого осложнения'));
  }
});
