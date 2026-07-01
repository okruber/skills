'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// ---------- pure helpers (unit-tested) ----------
function sidecarPaths(target) {
  const dir = path.dirname(target);
  const base = path.basename(target).replace(/\.html?$/i, '');
  return { patch: path.join(dir, base + '.patch.json'), final: path.join(dir, base + '.final.html') };
}

function injectBundle(html, initialPatch) {
  const seed = '<script data-erh-asset="1">window.__erhServed=true;window.__erhInitialPatch='
    + JSON.stringify(initialPatch || {}) + ';</script>';
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

module.exports = { sidecarPaths, injectBundle };

// ---------- server (runs only when invoked directly) ----------
if (require.main === module) {
  const target = process.argv[2];
  if (!target) { console.error('usage: node serve.js <file.html> [--port N]'); process.exit(1); }
  const portArg = process.argv.indexOf('--port');
  const PORT = portArg > -1 ? Number(process.argv[portArg + 1]) : 0;
  const ASSET_DIR = path.join(__dirname, 'assets');
  const paths = sidecarPaths(target);
  const MIME = { '.css': 'text/css', '.js': 'application/javascript' };

  function readInitialPatch() {
    try { return JSON.parse(fs.readFileSync(paths.patch, 'utf8')); } catch (e) { return {}; }
  }

  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      const html = fs.readFileSync(target, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(injectBundle(html, readInitialPatch()));
      return;
    }
    if (req.url.startsWith('/__erh/')) {
      const file = path.join(ASSET_DIR, path.basename(req.url));
      if (fs.existsSync(file)) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(fs.readFileSync(file));
        return;
      }
    }
    res.writeHead(404); res.end('not found');
  });

  // --- minimal RFC-6455 (text frames only), vendored from the brainstorm companion ---
  const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  function decode(buf) {
    if (buf.length < 2) return null;
    const len0 = buf[1] & 0x7f; let off = 2, len = len0;
    if (len0 === 126) { len = buf.readUInt16BE(2); off = 4; }
    else if (len0 === 127) { len = Number(buf.readBigUInt64BE(2)); off = 10; }
    const masked = buf[1] & 0x80; let mask;
    if (masked) { mask = buf.slice(off, off + 4); off += 4; }
    if (buf.length < off + len) return null;
    const payload = buf.slice(off, off + len);
    if (masked) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    return { opcode: buf[0] & 0x0f, payload, consumed: off + len };
  }

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
            fs.writeFileSync(paths.patch, JSON.stringify(JSON.parse(msg.payload), null, 2));
            console.log(JSON.stringify({ event: 'patch-saved', file: paths.patch }));
          } else if (msg.type === 'final') {
            fs.writeFileSync(paths.final, msg.html);
            console.log(JSON.stringify({ event: 'finalized', file: paths.final }));
          }
        }
      }
    });
    socket.on('error', () => {});
  });

  server.listen(PORT, '127.0.0.1', () => {
    const url = 'http://localhost:' + server.address().port;
    console.log(JSON.stringify({ event: 'serving', target, url, patch: paths.patch, final: paths.final }));
  });
}
