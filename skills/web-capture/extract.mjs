#!/usr/bin/env node
// web-capture: zero-dependency CDP harness.
//
// Connects to an already-running, *real logged-in* Chrome over the DevTools
// protocol (--remote-debugging-port), navigates to a URL in a fresh tab, runs
// an extraction expression, and prints JSON. Because the browser is a genuine
// authenticated human session, login-gated / anti-bot sites serve it normally.
//
// No npm install, no Playwright, no browser download: it speaks raw CDP over
// Node's built-in global WebSocket (stable since Node 22). Nothing to resolve
// from an npx cache.
//
// Usage:
//   node extract.mjs <url> [options]
//
// Options:
//   --port <n>        DevTools port (default 9222)
//   --eval <expr>     JS expression to extract with (evaluated in the page)
//   --eval-file <p>   File whose contents are the JS extraction expression
//   --wait <ms>       Extra settle time after load for SPAs (default 4000)
//   --raw             Print only the extraction result (no wrapper/signals)
//   --keep-open       Leave the tab open after extracting (default: close it)
//
// With no --eval/--eval-file, a generic extraction runs: page title + the
// readable text of <article>/<main>/<body>. When the generic pass is thin
// (SPA, custom DOM, partial content), pass a site-tailored snippet via
// --eval/--eval-file. See SKILL.md for the X thread/longform worked example.

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--'));
function opt(name, def) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
}
const flag = (name) => args.includes(`--${name}`);

if (!url) {
  console.error('usage: node extract.mjs <url> [--port 9222] [--eval <expr>|--eval-file <p>] [--wait 4000] [--raw] [--keep-open]');
  process.exit(2);
}

const port = Number(opt('port', '9222'));
const settleMs = Number(opt('wait', '4000'));

import { readFileSync } from 'node:fs';

// --- extraction expression -------------------------------------------------
const GENERIC = `(() => {
  const pick = document.querySelector('article') || document.querySelector('main') || document.body;
  return {
    title: document.title,
    url: location.href,
    text: ((pick && pick.innerText) || '').trim().slice(0, 20000),
  };
})()`;

// Always-run probe: cheap signal the agent uses to spot a login wall / anti-bot
// interstitial regardless of the (possibly custom) extraction above.
const PROBE = `(() => ({
  title: document.title,
  sample: ((document.body && document.body.innerText) || '').slice(0, 600),
}))()`;

let expression = GENERIC;
const evalFile = opt('eval-file', null);
const evalInline = opt('eval', null);
if (evalFile) expression = readFileSync(evalFile, 'utf8');
else if (evalInline) expression = evalInline;

// --- minimal CDP client over the built-in WebSocket ------------------------
class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', (e) => rej(new Error('WS error: ' + (e.message || 'connect failed'))));
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id != null && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        for (const l of this.listeners) l(msg);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }
  once(method, sessionId, timeoutMs) {
    return new Promise((resolve) => {
      const timer = timeoutMs ? setTimeout(() => { cleanup(); resolve(null); }, timeoutMs) : null;
      const l = (msg) => {
        if (msg.method === method && (!sessionId || msg.sessionId === sessionId)) { cleanup(); resolve(msg.params); }
      };
      const cleanup = () => { if (timer) clearTimeout(timer); this.listeners = this.listeners.filter((x) => x !== l); };
      this.listeners.push(l);
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Discover the browser-level WebSocket endpoint.
  let version;
  try {
    version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  } catch {
    throw new Error(`no DevTools endpoint on :${port} — is Chrome running with --remote-debugging-port=${port}? (see SKILL.md launch pattern)`);
  }
  const cdp = new CDP(version.webSocketDebuggerUrl);
  await cdp.ready;

  let targetId, sessionId;
  try {
    // Open a blank tab first, attach, enable domains, THEN navigate — avoids the
    // load-event race you get when createTarget navigates before you attach.
    ({ targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' }));
    ({ sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true }));
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);

    const loaded = cdp.once('Page.loadEventFired', sessionId, 45000);
    await cdp.send('Page.navigate', { url }, sessionId);
    await loaded; // resolves null on timeout — we still try to extract
    await sleep(settleMs); // let SPA content render

    const probe = await cdp.send('Runtime.evaluate', { expression: PROBE, returnByValue: true }, sessionId);
    const ex = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);

    if (ex.exceptionDetails) {
      throw new Error('extraction expression threw: ' + (ex.exceptionDetails.exception?.description || ex.exceptionDetails.text));
    }

    const result = ex.result?.value;
    if (flag('raw')) {
      console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
    } else {
      const s = probe.result?.value || {};
      const sample = s.sample || '';
      const loggedOutGuess = /log ?in|sign ?up|sign in|create account|subscribe to (read|continue)|you.?re logged out|verify you are human|just a moment|attention required|enable javascript|access denied|are you a robot/i.test(sample);
      console.log(JSON.stringify({
        requestedUrl: url,
        title: s.title,
        loggedOutGuess,
        signalSample: sample.replace(/\s+/g, ' ').trim().slice(0, 300),
        extraction: result,
      }, null, 2));
    }
  } finally {
    if (targetId && !flag('keep-open')) { try { await cdp.send('Target.closeTarget', { targetId }); } catch {} }
    cdp.close();
  }
}

main().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
