const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function bank(file = 'data/rk3-questions.js') {
  const context = { window: {} };
  vm.runInNewContext(read(file), context);
  return JSON.parse(JSON.stringify(context.window));
}

// Real application code in an isolated in-memory DOM/storage adapter.
// Layout and native interactions are checked separately in the live browser.
function app({ file, storage = new Map(), search = '', reducedMotion = false } = {}) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      innerHTML: '', textContent: '', value: '', checked: false,
      events: {}, classList: { toggle() {} }, querySelectorAll: () => [], querySelector: () => null,
      addEventListener(type, fn) { this.events[type] = fn; },
    });
    return elements.get(id);
  }
  let tick;
  const data = bank(file);
  const context = {
    window: { ...data, location: { search }, matchMedia: query => ({ matches: query.includes('prefers-reduced-motion') ? reducedMotion : query.includes('min-width') }), scrollTo() {} },
    document: { getElementById: element }, URLSearchParams, confirm: () => true,
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) },
    setInterval: fn => { tick = fn; return 1; }, clearInterval: () => { tick = null; },
  };
  vm.runInNewContext(read('js/app.js'), context);
  const config = data.PATHOLOGY_RK_CONFIG || { storageKey: 'pathologyTrainerProgressV1', sessionKey: 'pathologyTrainerActiveSessionV1' };
  const dispatch = (selector, dataset) => element('app').events.click({ target: { closest: s => s === selector ? { dataset } : null } });
  return {
    questions: data.PATHOLOGY_QUESTIONS, config, storage,
    html: () => element('app').innerHTML,
    action: action => dispatch('[data-action]', { action }),
    option: option => dispatch('[data-option]', { option }),
    jump: jump => dispatch('[data-jump]', { jump }),
    sequence: sequenceIndex => dispatch('[data-sequence-index]', { sequenceIndex }),
    matching(row, choice, multiple = false) {
      const field = { dataset: { matchRow: row, matchChoice: choice }, type: multiple ? 'checkbox' : 'select-one', value: String(choice), checked: true };
      element('app').events.change({ target: { closest: () => field } });
    },
    reset: () => element('resetButton').events.click(),
    field: (id, values) => Object.assign(element(id), values),
    state: () => JSON.parse(storage.get(config.sessionKey)),
    progress: () => JSON.parse(storage.get(config.storageKey)),
    tick: () => tick?.(),
    start(mode = 'training', shuffle = false, count = 'all') {
      this.action(`${mode}-settings`);
      this.field('questionCount', { value: String(count) });
      this.field('questionOrder', { value: 'sequential' });
      this.field('shuffleOptions', { checked: shuffle });
      this.field('examTime', { value: '0' });
      this.action(`start-${mode}`);
    },
  };
}

module.exports = { app };
