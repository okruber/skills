const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { injectBundle, sidecarPaths, seedJSON, decode } = require('../serve.js');

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

// ---------------------------------------------------------------------------
// Helper: build a masked RFC-6455 text frame (opcode 0x01, FIN set, mask bit set).
// ---------------------------------------------------------------------------
function maskedFrame(payloadStr) {
  const data = Buffer.from(payloadStr, 'utf8');
  const len = data.length;
  const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]); // deterministic mask
  let headerLen;
  if (len < 126) {
    headerLen = 2 + 4; // byte0, byte1|len, 4 mask bytes
  } else if (len <= 0xffff) {
    headerLen = 2 + 2 + 4; // byte0, byte1|126, 2-byte len, 4 mask bytes
  } else {
    headerLen = 2 + 8 + 4; // byte0, byte1|127, 8-byte len, 4 mask bytes
  }
  const frame = Buffer.alloc(headerLen + len);
  frame[0] = 0x81; // FIN + opcode text
  let off = 2;
  if (len < 126) {
    frame[1] = 0x80 | len;
  } else if (len <= 0xffff) {
    frame[1] = 0x80 | 126;
    frame.writeUInt16BE(len, 2);
    off = 4;
  } else {
    frame[1] = 0x80 | 127;
    frame.writeBigUInt64BE(BigInt(len), 2);
    off = 10;
  }
  mask.copy(frame, off);
  off += 4;
  for (let i = 0; i < len; i++) frame[off + i] = data[i] ^ mask[i % 4];
  return frame;
}

// ---------------------------------------------------------------------------
// seedJSON escaping
// ---------------------------------------------------------------------------

test('seedJSON: escapes </script> — raw breakout absent, \\u003c form present', () => {
  const result = seedJSON({ text: 'a</script>b' });
  // The raw sequence must not appear — it would break out of an inline script tag.
  assert.ok(!result.includes('</script>'), 'raw </script> must be absent');
  // The escaped form must appear — it decodes back to < inside JS.
  assert.ok(result.includes('\\u003c/script>'), '\\u003c/script> must be present');
});

test('seedJSON: round-trips through JSON.parse for mixed special chars', () => {
  const obj = { text: 'x</script>y\u2028z' };
  const parsed = JSON.parse(seedJSON(obj));
  assert.deepEqual(parsed, obj);
});

test('injectBundle: patch with </script> tag does not produce raw breakout sequence', () => {
  const patch = { t: { text: 'x</script><img src=y onerror=z>' } };
  const out = injectBundle('<html><body></body></html>', patch);
  // The injection must not contain the raw breakout — an attacker would escape the script.
  assert.ok(!out.includes('</script><img'), 'raw breakout sequence must be absent');
  // The escaped form must appear in the seed data.
  assert.ok(out.includes('\\u003c/script>'), 'escaped \\u003c/script> must be present in output');
});

test('seedJSON: escapes U+2028 and U+2029 line terminators', () => {
  const ls = '\u2028';
  const ps = '\u2029';
  const result = seedJSON({ a: ls, b: ps });
  // Raw chars must be absent — they terminate a JS line and break inline scripts.
  assert.ok(!result.includes(ls), 'raw U+2028 must be absent');
  assert.ok(!result.includes(ps), 'raw U+2029 must be absent');
  // Escaped forms must be present.
  assert.ok(result.includes('\\u2028'), '\\u2028 escape must be present');
  assert.ok(result.includes('\\u2029'), '\\u2029 escape must be present');
});

// ---------------------------------------------------------------------------
// decode: partial-frame returns null (never throws)
// ---------------------------------------------------------------------------

test('decode: returns null for empty buffer and single-byte buffer', () => {
  assert.equal(decode(Buffer.alloc(0)), null);
  assert.equal(decode(Buffer.from([0x81])), null);
});

test('decode: returns null for all truncation points inside a 300-byte masked frame header', () => {
  const frame = maskedFrame('x'.repeat(300)); // len0===126 path
  // Only 3 bytes: splits inside the 2-byte extended-length field — the exact pre-fix crash case.
  assert.equal(decode(frame.slice(0, 3)), null, 'split extended-len: 3 bytes must be null');
  // 5 bytes: header + extended-len complete (4 bytes) but only 1 mask byte — split mask.
  assert.equal(decode(frame.slice(0, 5)), null, 'split mask: 5 bytes must be null');
  // 8 bytes: full header + all 4 mask bytes but zero payload bytes.
  assert.equal(decode(frame.slice(0, 8)), null, 'mask only, no payload: 8 bytes must be null');
  // One byte short of the full frame.
  assert.equal(decode(frame.slice(0, frame.length - 1)), null, 'one byte short must be null');
});

test('decode: complete 300-byte masked frame decodes correctly', () => {
  const text = 'x'.repeat(300);
  const frame = maskedFrame(text);
  const result = decode(frame);
  assert.ok(result !== null, 'must not return null for complete frame');
  assert.equal(result.opcode, 1, 'opcode must be 1 (text)');
  assert.equal(result.payload.toString('utf8'), text, 'unmasked payload must equal original text');
  assert.equal(result.consumed, frame.length, 'consumed must equal full frame length');
});

test('decode: two concatenated frames — consumed correctly isolates frame 1, leaving frame 2 intact', () => {
  const text1 = 'frame-one';
  const text2 = 'frame-two';
  const f1 = maskedFrame(text1);
  const f2 = maskedFrame(text2);
  const combined = Buffer.concat([f1, f2]);

  const r1 = decode(combined);
  assert.ok(r1 !== null);
  assert.equal(r1.payload.toString('utf8'), text1, 'frame-1 payload must decode to text1');
  assert.equal(r1.consumed, f1.length, 'consumed must equal frame-1 length exactly');

  // Slice off frame-1 and decode frame-2.
  const r2 = decode(combined.slice(r1.consumed));
  assert.ok(r2 !== null);
  assert.equal(r2.payload.toString('utf8'), text2, 'frame-2 payload must decode to text2');
});

test('decode: small (<126-byte) masked frame decodes and unmasks correctly', () => {
  const text = 'hello, world!';
  const frame = maskedFrame(text);
  // Sanity-check the helper took the short path (byte1 encodes length directly).
  assert.equal(frame[1] & 0x7f, text.length, 'helper must use short-length encoding for len<126');
  const result = decode(frame);
  assert.ok(result !== null);
  assert.equal(result.opcode, 1);
  assert.equal(result.payload.toString('utf8'), text, 'unmasked payload must match original string');
  assert.equal(result.consumed, frame.length);
});
