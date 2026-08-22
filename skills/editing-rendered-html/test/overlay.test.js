const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Regression guard: overlay.js runs un-unit-testably inside the browser, so a
// refactor that drops a variable declaration kills the whole IIFE silently —
// no edit bar, no keybindings. Execute the real source under absorbing Proxy
// stubs: any read of an undeclared identifier throws a real ReferenceError.
test('overlay: boots without reference errors under stub DOM', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'overlay.js'), 'utf8');

  function absorb() {
    const fn = function () { return p; };
    const p = new Proxy(fn, {
      get: () => p,
      set: () => true,
      apply: () => p,
      construct: () => p,
    });
    return p;
  }

  const sandbox = {
    window: null, // patched below so sandbox.window === the same object
    document: absorb(),
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    location: { pathname: '/x', href: '' },
    navigator: {},
    module: { exports: {} }, // for patch-core's UMD export
    setTimeout: () => 0, clearTimeout: () => {},
    Math, Object, JSON, RegExp, Date, String, Number,
  };
  sandbox.window = sandbox;
  const core = fs.readFileSync(path.join(__dirname, '..', 'assets', 'patch-core.js'), 'utf8');
  vm.runInNewContext(core, sandbox, { filename: 'patch-core.js' });
  assert.doesNotThrow(() => vm.runInNewContext(src, sandbox, { filename: 'overlay.js' }));
});
