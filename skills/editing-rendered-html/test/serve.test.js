const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { injectBundle, sidecarPaths } = require('../serve.js');

test('sidecarPaths: derives patch and final beside target', () => {
  const p = sidecarPaths('/tmp/deck.html');
  assert.equal(p.patch, path.join('/tmp', 'deck.patch.json'));
  assert.equal(p.final, path.join('/tmp', 'deck.final.html'));
});

test('sidecarPaths: handles names without .html', () => {
  const p = sidecarPaths('/tmp/deck');
  assert.equal(p.patch, path.join('/tmp', 'deck.patch.json'));
  assert.equal(p.final, path.join('/tmp', 'deck.final.html'));
});

test('injectBundle: inserts assets before </body> with data-erh-asset markers', () => {
  const out = injectBundle('<html><body><h1>hi</h1></body></html>', {});
  assert.match(out, /<link[^>]+\/__erh\/overlay\.css[^>]+data-erh-asset/);
  assert.match(out, /<script[^>]+\/__erh\/patch-core\.js[^>]+data-erh-asset/);
  assert.match(out, /<script[^>]+\/__erh\/overlay\.js[^>]+data-erh-asset/);
  assert.ok(out.indexOf('data-erh-asset') < out.indexOf('</body>'));
});

test('injectBundle: seeds initial patch as source of truth', () => {
  const out = injectBundle('<html><body></body></html>', { title: { transform: { x: 5, y: 6 } } });
  assert.match(out, /window\.__erhServed\s*=\s*true/);
  assert.match(out, /window\.__erhInitialPatch\s*=\s*\{"title":\{"transform":\{"x":5,"y":6\}\}\}/);
});

test('injectBundle: appends bundle when no </body> present', () => {
  const out = injectBundle('<h1>bare</h1>', {});
  assert.match(out, /\/__erh\/overlay\.js/);
});
