const test = require('node:test');
const assert = require('node:assert/strict');
const { snap, prune, entryToStyle, normalize, toDoc, op, lastNote, removeNotes } = require('../assets/patch-core.js');

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

// ---------------------------------------------------------------------------
// Patch schema v2: {version, entries:{eid:{final, history}}}
// ---------------------------------------------------------------------------

test('normalize: v1 flat patch becomes flat facets with empty histories', () => {
  const out = normalize({ title: { text: 'x' } });
  assert.deepEqual(out, { flat: { title: { text: 'x' } }, hist: {} });
});

test('normalize: null/garbage input yields empty state', () => {
  assert.deepEqual(normalize(null), { flat: {}, hist: {} });
  assert.deepEqual(normalize('nonsense'), { flat: {}, hist: {} });
});

test('normalize: v2 doc splits final facets and history per eid', () => {
  const doc = { version: 2, entries: {
    title: { final: { text: 'hi' }, history: [{ t: 'T1', kind: 'retype', text: 'hi' }] },
    body: { final: {}, history: [{ t: 'T2', kind: 'note', note: 'tighten' }] },
  } };
  const out = normalize(doc);
  assert.deepEqual(out.flat, { title: { text: 'hi' } }); // empty-final entries carry no facets
  assert.deepEqual(out.hist.title, doc.entries.title.history);
  assert.deepEqual(out.hist.body, doc.entries.body.history);
});

test('toDoc: builds v2 doc from flat facets and histories, drops fully-empty entries', () => {
  const flat = { title: { text: 'x' }, ghost: {} };
  const hist = { title: [{ t: 'T1', kind: 'move', transform: { x: 1, y: 0 } }] };
  const doc = toDoc(flat, hist);
  assert.equal(doc.version, 2);
  assert.deepEqual(doc.entries.title, { final: { text: 'x' }, history: hist.title });
  assert.ok(!('ghost' in doc.entries));
});

test('toDoc then normalize round-trips facets and history including notes', () => {
  const hist = { h: [
    { t: 'T1', kind: 'note', note: 'make punchier' },
    { t: 'T2', kind: 'retype', text: 'punchy' },
  ] };
  const flat = { h: { text: 'punchy' } };
  const out = normalize(toDoc(flat, hist));
  assert.deepEqual(out.flat, flat);
  assert.deepEqual(out.hist, hist);
});

test('op: stamps kind and fields with an ISO timestamp', () => {
  const o = op('note', { note: 'fix this' });
  assert.equal(o.kind, 'note');
  assert.equal(o.note, 'fix this');
  assert.match(o.t, /^\d{4}-\d{2}-\d{2}T/);
});

// ---------------------------------------------------------------------------
// Notes: note-only entries must survive serialization; read/remove helpers
// ---------------------------------------------------------------------------

test('toDoc: entry with only a note in history is preserved', () => {
  // Regression: iterating flat keys alone dropped notes on never-nudged elements.
  const flat = {};
  const hist = { subtitle: [{ t: 'T1', kind: 'note', note: 'too long' }] };
  const out = normalize(toDoc(flat, hist));
  assert.deepEqual(out.hist.subtitle, hist.subtitle);
});

test('toDoc: entry with neither facets nor history is still dropped', () => {
  assert.deepEqual(toDoc({ ghost: {} }, { ghost: [] }).entries, {});
});

test('lastNote: returns the most recent note text for an eid', () => {
  const hist = { t: [
    { t: 'T1', kind: 'note', note: 'first' },
    { t: 'T2', kind: 'move', transform: { x: 1, y: 0 } },
    { t: 'T3', kind: 'note', note: 'second' },
  ] };
  assert.equal(lastNote(hist, 't'), 'second');
});

test('lastNote: returns null when there are no notes or no entry', () => {
  assert.equal(lastNote({ t: [{ t: 'T1', kind: 'move', transform: {} }] }, 't'), null);
  assert.equal(lastNote({}, 'x'), null);
});

test('removeNotes: strips every note op, keeps the rest, reports whether it removed', () => {
  const hist = { t: [
    { t: 'T1', kind: 'note', note: 'a' },
    { t: 'T2', kind: 'move', transform: { x: 1, y: 0 } },
    { t: 'T3', kind: 'note', note: 'b' },
  ] };
  assert.equal(removeNotes(hist, 't'), true);
  assert.deepEqual(hist.t, [{ t: 'T2', kind: 'move', transform: { x: 1, y: 0 } }]);
  assert.equal(removeNotes({ t: [{ t: 'T1', kind: 'move', transform: {} }] }, 't'), false);
  assert.equal(removeNotes({}, 'x'), false);
});

test('removeNotes: deletes the history array entirely when only notes remained', () => {
  const hist = { t: [{ t: 'T1', kind: 'note', note: 'a' }] };
  removeNotes(hist, 't');
  assert.ok(!('t' in hist));
});
