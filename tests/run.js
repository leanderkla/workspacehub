// Minimal test harness — node only, no deps.
// Loads app.js in a vm sandbox with fake DOM/electron globals,
// then exposes selected pure functions to test.
//
// Add tests in tests/*.test.js — each file exports
//   module.exports = function(describe, helpers) { ... }
// where each describe(group, body) calls body((name, fn) => ...).

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ESC = String.fromCharCode(27);
const GREEN = ESC + '[32m', RED = ESC + '[31m', RESET = ESC + '[0m';

const projRoot = path.resolve(__dirname, '..');
const appSrc = fs.readFileSync(path.join(projRoot, 'app.js'), 'utf8');

const sandbox = {
  console, setTimeout, setInterval, clearTimeout, clearInterval,
  Date, Math, JSON, Object, Array, String, Number, Boolean, Set, Map, RegExp, Promise, process,
  document: makeFakeDocument(),
  window: {
    addEventListener() {}, removeEventListener() {},
    api: {},
    location: { reload() {} },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
  },
  localStorage: makeFakeStorage(),
  navigator: { userAgent: 'node-test' },
  MutationObserver: class { observe() {} disconnect() {} },
  Notification: class { constructor() {} show() {} static get isSupported() { return false; } },
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  Event: class { constructor(name) { this.type = name; } },
  CustomEvent: class { constructor(name, opts) { this.type = name; this.detail = opts && opts.detail; } }
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

vm.createContext(sandbox);
try {
  vm.runInContext(appSrc, sandbox, { filename: 'app.js' });
} catch (e) {
  if (process.env.DEBUG_TESTS) console.error('module load warning:', e.message);
}

const tests = [];
function describe(group, body) { body((name, fn) => tests.push({ group, name, fn })); }

function eq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg || 'assert'}: expected ${e}, got ${a}`);
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'expected truthy'); }
function get(name) {
  let cached = sandbox[name];
  if (typeof cached === 'function') return cached;
  try {
    cached = vm.runInContext(`typeof ${name} === 'function' ? ${name} : null`, sandbox);
  } catch { cached = null; }
  if (typeof cached !== 'function') throw new Error(`function ${name}() not exported from app.js context`);
  return cached;
}
function evalIn(code) { return vm.runInContext(code, sandbox); }

const helpers = { eq, ok, get, sandbox, evalIn };

const testDir = __dirname;
fs.readdirSync(testDir).filter(f => f.endsWith('.test.js')).forEach(f => {
  try { require(path.join(testDir, f))(describe, helpers); }
  catch (e) { console.error(`${RED}Failed to load ${f}: ${e.message}${RESET}`); }
});

(async () => {
  let pass = 0, fail = 0;
  for (const t of tests) {
    try {
      const r = t.fn();
      if (r && typeof r.then === 'function') await r;
      pass++;
      process.stdout.write(`${GREEN}✓${RESET} ${t.group}  ${t.name}\n`);
    } catch (e) {
      fail++;
      process.stdout.write(`${RED}✗${RESET} ${t.group}  ${t.name}\n  ${e.message}\n`);
    }
  }
  process.stdout.write(`\n${pass} passed, ${fail} failed.\n`);
  if (fail) process.exit(1);
})();

function makeFakeDocument() {
  const noop = () => {};
  const makeEl = () => {
    const el = {
      style: {},
      classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
      setAttribute: noop, getAttribute: () => null,
      addEventListener: noop, removeEventListener: noop,
      appendChild: noop, removeChild: noop,
      remove: noop, focus: noop, blur: noop,
      _innerHTML: '', _textContent: '',
      children: [], childNodes: []
    };
    Object.defineProperty(el, 'innerHTML', {
      get() { return el._innerHTML; },
      set(v) {
        el._innerHTML = String(v || '');
        el._textContent = el._innerHTML
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      }
    });
    Object.defineProperty(el, 'textContent', {
      get() { return el._textContent; },
      set(v) { el._textContent = String(v || ''); el._innerHTML = el._textContent; }
    });
    Object.defineProperty(el, 'innerText', { get() { return el._textContent; } });
    return el;
  };
  const stub = {
    addEventListener: noop, removeEventListener: noop,
    querySelector: () => null, querySelectorAll: () => [],
    getElementById: () => null,
    createElement: makeEl,
    body: null,
    documentElement: { setAttribute: noop, style: { setProperty: noop, removeProperty: noop }, getAttribute: () => null },
    activeElement: null, head: null
  };
  stub.body = makeEl(); stub.head = makeEl();
  return stub;
}

function makeFakeStorage() {
  const store = new Map();
  return {
    getItem: k => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear()
  };
}
