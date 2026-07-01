const test = require('node:test');
const assert = require('node:assert/strict');
const { snap, prune, entryToStyle } = require('../assets/patch-core.js');

test('snap: off returns rounded value unchanged', () => {
  assert.equal(snap(37, false, 24), 37);
  assert.equal(snap(37.6, false, 24), 38);
});

test('snap: on rounds to nearest multiple of step', () => {
  assert.equal(snap(37, true, 24), 48);   // 37/24=1.54 -> 2*24
  assert.equal(snap(19, true, 24), 24);   // 19/24=0.79 -> 1*24
  assert.equal(snap(10, true, 16), 16);   // 10/16=0.63 -> 1*16
  assert.equal(snap(7, true, 16), 0);     // 7/16=0.44 -> 0
});

test('prune: drops entries with no facets', () => {
  const input = { a: { text: 'x' }, b: {}, c: { transform: { x: 1, y: 2 } } };
  assert.deepEqual(prune(input), { a: { text: 'x' }, c: { transform: { x: 1, y: 2 } } });
});

test('prune: empty patch -> empty object', () => {
  assert.deepEqual(prune({}), {});
});

test('entryToStyle: transform facet', () => {
  assert.deepEqual(entryToStyle({ transform: { x: 50, y: 30 } }),
    { transform: 'translate(50px,30px)' });
});

test('entryToStyle: size facet', () => {
  assert.deepEqual(entryToStyle({ size: { w: 235, h: 117 } }),
    { width: '235px', minHeight: '117px' });
});

test('entryToStyle: style facet (fontSize, color, textAlign)', () => {
  assert.deepEqual(entryToStyle({ style: { fontSize: '20px', color: '#a5d6ff', textAlign: 'center' } }),
    { fontSize: '20px', color: '#a5d6ff', textAlign: 'center' });
});

test('entryToStyle: combined facets merge', () => {
  const out = entryToStyle({ transform: { x: 1, y: 2 }, size: { w: 10 }, style: { color: '#fff' } });
  assert.deepEqual(out, { transform: 'translate(1px,2px)', width: '10px', color: '#fff' });
});

test('entryToStyle: empty entry -> empty object', () => {
  assert.deepEqual(entryToStyle({}), {});
});
