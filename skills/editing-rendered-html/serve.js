'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MIME_TYPES = { '.css': 'text/css', '.js': 'application/javascript' };

// ---------- pure helpers (unit-tested) ----------
function sidecarPaths(target) {
  const dir = path.dirname(target);
  const base = path.basename(target).replace(/\.html?$/i, '');
  return { patch: path.join(dir, base + '.patch.json'), final: path.join(dir, base + '.final.html') };
}

// Sorted slide list for a directory: .html only, excluding .final.html bakes.
function listSlides(dir) {
  let names;
  try { names = fs.readdirSync(dir); } catch (e) { return []; }
  return names
    .filter((n) => /\.html?$/i.test(n) && !/\.final\.html?$/i.test(n))
    .sort();
}

// Per-slide sidecar paths inside a deck directory.
function slidePaths(dir, name) {
  const safe = path.basename(name); // blocks traversal via crafted slide names
  const base = safe.replace(/\.html?$/i, '');
  return {
    source: path.join(dir, safe),
    patch: path.join(dir, base + '.patch.json'),
    final: path.join(dir, base + '.final.html'),
  };
}

// Serialize an object for safe embedding inside an inline <script>. JSON has no
// '<' outside string values, and '\u003c' in a JS string literal is '<', so this
// round-trips exactly while preventing </script> breakout and U+2028/2029 line
// terminators that would otherwise break the inline script.
function seedJSON(obj) {
  return JSON.stringify(obj || {})
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function injectBundle(html, initialPatch, deck) {
  const deckSeed = deck ? 'window.__erhDeck=' + seedJSON(deck) + ';' : '';
  const seed = '<script data-erh-asset="1">window.__erhServed=true;window.__erhInitialPatch='
    + seedJSON(initialPatch) + ';' + deckSeed + '</script>';
  const transport = '<script data-erh-asset="1">(function(){var ws;function open(){ws=new WebSocket("ws://"+location.host);'
    + 'ws.onclose=function(){setTimeout(open,1000)};}open();window.__erhSend=function(m){'
    + 'if(ws&&ws.readyState===1)ws.send(JSON.stringify(m));};})();</script>';
  const bundle = '\n<link rel="stylesheet" href="/__erh/overlay.css" data-erh-asset="1">\n'
    + seed + '\n'
    + '<script src="/__erh/patch-core.js" data-erh-asset="1"></script>\n'
    + transport + '\n'
    + '<script src="/__erh/overlay.js" data-erh-asset="1"></script>\n';
  if (html.includes('</body>')) return html.replace('</body>', bundle + '</body>');
  return html + bundle;
}

// Minimal RFC-6455 text-frame decoder (vendored from the brainstorm companion).
// Returns null when the buffer does not yet hold a complete frame — including a
// split header — so the caller can wait for more bytes instead of throwing.
function decode(buf) {
  if (buf.length < 2) return null;
  const len0 = buf[1] & 0x7f; let off = 2, len = len0;
  if (len0 === 126) { if (buf.length < 4) return null; len = buf.readUInt16BE(2); off = 4; }
  else if (len0 === 127) { if (buf.length < 10) return null; len = Number(buf.readBigUInt64BE(2)); off = 10; }
  const masked = buf[1] & 0x80; let mask;
  if (masked) { if (buf.length < off + 4) return null; mask = buf.slice(off, off + 4); off += 4; }
  if (buf.length < off + len) return null;
  const payload = buf.slice(off, off + len);
  if (masked) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
  return { opcode: buf[0] & 0x0f, payload, consumed: off + len };
}

module.exports = { sidecarPaths, injectBundle, seedJSON, decode, listSlides, slidePaths };

// ---------- server (runs only when invoked directly) ----------
if (require.main === module) {
  const target = process.argv[2];
  if (!target) { console.error('usage: node serve.js <file.html | deck-dir> [--port N]'); process.exit(1); }
  const portArg = process.argv.indexOf('--port');
  const PORT = portArg > -1 ? Number(process.argv[portArg + 1]) : 0;
  const ASSET_DIR = path.join(__dirname, 'assets');
  const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

  // Deck mode when the target is a directory; single-file mode otherwise.
  const isDeck = (() => { try { return fs.statSync(target).isDirectory(); } catch (e) { return false; } })();
  const slides = isDeck ? listSlides(target) : null;
  if (isDeck && !slides.length) { console.error(JSON.stringify({ event: 'no-slides', dir: target })); process.exit(1); }

  function resolveSlide(name) {
    if (!isDeck) { const p = sidecarPaths(target); return { source: target, paths: p }; }
    const base = path.basename(String(name || ''));
    if (!slides.includes(base)) return null;
    return { source: slidePaths(target, base).source, paths: slidePaths(target, base) };
  }
  function currentSlide(url) {
    if (!isDeck) return resolveSlide();
    const m = /[?&]s=(\d+)/.exec(url || '');
    const i = Math.max(0, Math.min(slides.length - 1, m ? Number(m[1]) : 0));
    return Object.assign(resolveSlide(slides[i]), { index: i });
  }

  const server = http.createServer((req, res) => {
    try {
      const u = req.url || '/';
      if (u === '/' || u.startsWith('/?')) {
        const slide = currentSlide(u);
        let html;
        try { html = fs.readFileSync(slide.source, 'utf8'); }
        catch (e) { res.writeHead(500); res.end('source unavailable'); return; }
        let init; try { init = JSON.parse(fs.readFileSync(slide.paths.patch, 'utf8')); } catch (e) { init = {}; }
        const deckSeed = isDeck ? { index: slide.index, total: slides.length, names: slides } : undefined;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(injectBundle(html, init, deckSeed));
        return;
      }
      if (req.url.startsWith('/__erh/')) {
        const file = path.join(ASSET_DIR, path.basename(req.url)); // basename blocks traversal
        let st = null;
        try { st = fs.statSync(file); } catch (e) { st = null; }
        if (st && st.isFile()) {
          res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(file)] || 'application/octet-stream' });
          res.end(fs.readFileSync(file));
          return;
        }
      }
      res.writeHead(404); res.end('not found');
    } catch (e) {
      try { res.writeHead(500); res.end('error'); } catch (_) {}
    }
  });

  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key']; if (!key) { socket.destroy(); return; }
    const accept = crypto.createHash('sha1').update(key + WS_MAGIC).digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    let buf = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      let f;
      while ((f = decode(buf))) {
        buf = buf.slice(f.consumed);
        if (f.opcode === 0x08) { socket.end(); return; }
        if (f.opcode === 0x01) {
          let msg; try { msg = JSON.parse(f.payload.toString()); } catch (e) { continue; }
          if (msg.type === 'patch') {
            const slide = resolveSlide(msg.slide);
            if (!slide) { console.log(JSON.stringify({ event: 'patch-skipped', reason: 'unknown-slide' })); continue; }
            let parsed; try { parsed = JSON.parse(msg.payload); } catch (e) { continue; }
            fs.writeFileSync(slide.paths.patch, JSON.stringify(parsed, null, 2));
            console.log(JSON.stringify({ event: 'patch-saved', file: slide.paths.patch }));
          } else if (msg.type === 'final') {
            const slide = resolveSlide(msg.slide);
            if (!slide) { console.log(JSON.stringify({ event: 'finalize-skipped', reason: 'unknown-slide' })); continue; }
            fs.writeFileSync(slide.paths.final, msg.html);
            console.log(JSON.stringify({ event: 'finalized', file: slide.paths.final }));
          }
        }
      }
    });
    socket.on('error', () => {});
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && PORT !== 0) {
      console.error(JSON.stringify({ event: 'port-in-use', port: PORT, action: 'retrying on a free port' }));
      server.listen(0, '127.0.0.1');
    } else {
      console.error(JSON.stringify({ event: 'server-error', error: e.message }));
      process.exit(1);
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    const url = 'http://localhost:' + server.address().port;
    const out = isDeck
      ? { event: 'serving', mode: 'deck', target, url, slides: slides.length }
      : (() => { const p = sidecarPaths(target); return { event: 'serving', mode: 'single', target, url, patch: p.patch, final: p.final }; })();
    console.log(JSON.stringify(out));
  });
}
