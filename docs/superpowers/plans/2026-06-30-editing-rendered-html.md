# editing-rendered-html Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a model-invoked skill that makes agent-generated HTML editable-by-default in the browser (move/retype/resize/font-size/align/light-color/grid-snap), captures hand-edits ("nudges") as a regeneration-safe sidecar patch the agent reads each turn, and bakes to a clean standalone file on finalize.

**Architecture:** The overlay (CSS + JS) is injected at **serve time** by a tiny zero-dependency Node server, so the source `.html` stays clean — its only addition is semantic `data-eid` attributes. Edits accumulate in-browser as a patch keyed by `data-eid`; **Save** sends the patch over a WebSocket and the server writes `<name>.patch.json` (the channel the agent reads). **Finalize** serializes the live edited DOM minus all injected overlay chrome and the server writes `<name>.final.html`. Pure patch logic lives in `patch-core.js`, shared by the browser and Node unit tests.

**Tech Stack:** Node.js (built-in `http`, `fs`, `crypto`; built-in `node --test`) — **zero npm dependencies** (the okruber store is symlinked, never `npm install`ed). Vanilla browser JS/CSS. RFC-6455 WebSocket framing vendored from the superpowers brainstorm companion server.

**Spec:** `docs/superpowers/specs/2026-06-30-editing-rendered-html-design.md`

**Refinement vs spec:** The spec sketched a server-side `bake.js`. Server-side HTML flattening needs a DOM-parser dependency, which the zero-dep store forbids. Bake therefore runs **in the browser** (where the patched DOM already exists) and the server writes the bytes. Identical behavior and clean output; the component moves to where the DOM lives. No separate `bake.js` file — bake is a function in `overlay.js`.

---

## File Structure

```
skills/editing-rendered-html/
  SKILL.md                 # model-invoked procedure: tag data-eids → serve → read patch → finalize
  assets/
    patch-core.js          # pure, runtime-agnostic: snap(), prune(), entryToStyle(); UMD-style exports
    overlay.css            # edit-mode styling: grips, resize handles, format bar, grid, control bar
    overlay.js             # DOM engine: decorate, drag, resize, format, grid, save, finalize(bake)
  serve.js                 # serve any HTML, inject overlay bundle, WS → write patch.json / final.html
  test/
    patch-core.test.js     # node --test unit tests for the pure core
  fixtures/
    sample.html            # data-eid-tagged sample for headless + manual verification
```

- `patch-core.js` holds every pure decision (snap math, prune, entry→CSS) so it is unit-testable under `node --test` without a DOM.
- `overlay.js` does only DOM wiring and calls `patch-core`. Its DOM-dependent parts (decorate/strip) are verified by headless smoke test, not unit test.
- `serve.js` is the only process; it injects the bundle and persists both artifacts.

---

## Task 1: Scaffold skill directory, fixture, and plugin registration

**Files:**
- Create: `skills/editing-rendered-html/fixtures/sample.html`
- Modify: `.claude-plugin/plugin.json`

- [ ] **Step 1: Create the directory tree**

Run:
```bash
mkdir -p skills/editing-rendered-html/assets skills/editing-rendered-html/test skills/editing-rendered-html/fixtures
```

- [ ] **Step 2: Write the tagged sample fixture**

Create `skills/editing-rendered-html/fixtures/sample.html` — a clean source file with `data-eid` tags and NO overlay code (overlay is injected at serve time):

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Sample</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0d1117}
  .slide{position:relative;width:960px;aspect-ratio:16/9;margin:40px auto;color:#fff;
    background:linear-gradient(135deg,#1f6feb,#0a3069);border-radius:10px;overflow:hidden}
  .pad{position:absolute;inset:0;padding:46px 54px}
  .eyebrow{font-size:13px;letter-spacing:.18em;text-transform:uppercase;opacity:.85;margin:0 0 14px}
  .title{font-size:46px;line-height:1.05;font-weight:800;margin:0 0 12px;max-width:78%}
  .subtitle{font-size:18px;line-height:1.4;opacity:.92;margin:0;max-width:62%}
  .card{position:absolute;right:54px;width:188px;padding:16px;border-radius:12px;
    background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22)}
  #card-a{top:120px} #card-b{top:250px}
  .card h4{margin:0 0 6px;font-size:15px} .card p{margin:0;font-size:12.5px;opacity:.9}
</style>
</head>
<body>
  <div class="slide">
    <div class="pad">
      <p class="eyebrow" data-eid="eyebrow">Q3 Strategy Review</p>
      <h1 class="title" data-eid="title">Shipping the last 20% without friction</h1>
      <p class="subtitle" data-eid="subtitle">Direct manipulation for layout and copy.</p>
      <div class="card" id="card-a" data-eid="card-a">
        <h4 data-eid="card-a-h">Direct edit</h4>
        <p data-eid="card-a-p">Retype text in place.</p>
      </div>
      <div class="card" id="card-b" data-eid="card-b">
        <h4 data-eid="card-b-h">Drag to place</h4>
        <p data-eid="card-b-p">Nudge by hand.</p>
      </div>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 3: Register the skill in the plugin manifest**

Modify `.claude-plugin/plugin.json` to add the new skill to the `skills` array:

```json
{
  "name": "okruber-skills",
  "description": "okruber's personal agent skills.",
  "skills": [
    "./skills/jira-ticket-breakdown",
    "./skills/editing-rendered-html"
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add skills/editing-rendered-html/fixtures/sample.html .claude-plugin/plugin.json
git commit -m "feat(editing-rendered-html): scaffold skill dir, sample fixture, plugin registration"
```

---

## Task 2: `patch-core.js` — pure logic with unit tests (TDD)

**Files:**
- Create: `skills/editing-rendered-html/assets/patch-core.js`
- Test: `skills/editing-rendered-html/test/patch-core.test.js`

**Note:** Test authoring for non-trivial logic is normally delegated to the Tester agent. The complete test code is included here so the plan is self-contained; the implementer may hand it to the Tester agent verbatim.

- [ ] **Step 1: Write the failing tests**

Create `skills/editing-rendered-html/test/patch-core.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test "skills/editing-rendered-html/test/*.test.js"`
Expected: FAIL — `Cannot find module '../assets/patch-core.js'`.

- [ ] **Step 3: Write the minimal implementation**

Create `skills/editing-rendered-html/assets/patch-core.js`:

```js
// Pure, runtime-agnostic patch logic. No DOM, no Node APIs.
// Shared by the browser overlay and node --test.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api; // node
  if (typeof window !== 'undefined') window.PatchCore = api;                 // browser
})(this, function () {
  'use strict';

  // Round a delta. When grid is on, lock to the nearest multiple of step.
  function snap(v, gridOn, step) {
    return gridOn ? Math.round(v / step) * step : Math.round(v);
  }

  // Drop patch entries that carry no facets.
  function prune(patch) {
    const out = {};
    for (const k in patch) {
      if (patch[k] && Object.keys(patch[k]).length) out[k] = patch[k];
    }
    return out;
  }

  // Convert a single patch entry into a map of CSS properties to apply.
  function entryToStyle(entry) {
    const css = {};
    if (entry.transform) {
      css.transform = 'translate(' + entry.transform.x + 'px,' + entry.transform.y + 'px)';
    }
    if (entry.size) {
      if (entry.size.w != null) css.width = entry.size.w + 'px';
      if (entry.size.h != null) css.minHeight = entry.size.h + 'px';
    }
    if (entry.style) {
      if (entry.style.fontSize) css.fontSize = entry.style.fontSize;
      if (entry.style.color) css.color = entry.style.color;
      if (entry.style.textAlign) css.textAlign = entry.style.textAlign;
    }
    return css;
  }

  return { snap, prune, entryToStyle };
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test "skills/editing-rendered-html/test/*.test.js"`
Expected: PASS — 9 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add skills/editing-rendered-html/assets/patch-core.js skills/editing-rendered-html/test/patch-core.test.js
git commit -m "feat(editing-rendered-html): patch-core pure logic + unit tests"
```

---

## Task 3: `overlay.css` — edit-mode styling

**Files:**
- Create: `skills/editing-rendered-html/assets/overlay.css`

This is presentation only; verified visually in the prototype. No unit test — exercised by the headless smoke test in Task 7.

- [ ] **Step 1: Write the stylesheet**

Create `skills/editing-rendered-html/assets/overlay.css`:

```css
/* All selectors are overlay-scoped so injection cannot disturb the page until edit mode is on. */
:root{ --erh-accent:#58a6ff; --erh-accent2:#3fb950; --erh-grid:rgba(120,170,255,.35); }

/* control bar (injected, stripped on bake) */
#erh-bar{position:fixed;top:12px;left:12px;z-index:2147483000;display:flex;gap:8px;align-items:center;
  padding:7px 9px;background:#0b0f14;border:1px solid #30363d;border-radius:10px;
  box-shadow:0 8px 24px rgba(0,0,0,.5);font:600 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e6edf3}
#erh-bar button{appearance:none;border:1px solid #30363d;background:#161b22;color:#e6edf3;
  padding:7px 12px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
#erh-bar button:hover{border-color:var(--erh-accent)}
#erh-bar button.on{background:var(--erh-accent2);color:#04140a;border-color:var(--erh-accent2)}
#erh-bar .erh-step{background:#161b22;color:#e6edf3;border:1px solid #30363d;border-radius:6px;padding:5px 6px;font-size:12px}
#erh-bar .erh-msg{font-weight:600;color:var(--erh-accent2);min-width:10px}

/* edit affordances — only active under body.erh-editing */
body.erh-editing [data-eid]{outline:1px dashed rgba(120,170,255,.55);outline-offset:4px;border-radius:4px}
body.erh-editing [data-eid]:hover{outline-color:var(--erh-accent)}
body.erh-editing [data-eid].erh-selected{outline:2px solid var(--erh-accent);background:rgba(88,166,255,.10)}
[data-eid][contenteditable="true"]:focus{outline:2px solid var(--erh-accent2)}

.erh-grip{position:absolute;top:-13px;left:-13px;width:24px;height:24px;border-radius:7px;
  background:var(--erh-accent);color:#04101f;font:800 13px sans-serif;display:none;
  align-items:center;justify-content:center;cursor:grab;z-index:2147482000;
  box-shadow:0 2px 8px rgba(0,0,0,.5);user-select:none;touch-action:none}
body.erh-editing [data-eid] > .erh-grip{display:flex}
.erh-grip:active{cursor:grabbing}
.erh-rsz{position:absolute;right:-9px;bottom:-9px;width:16px;height:16px;border-radius:4px;
  background:#fff;border:2px solid var(--erh-accent);cursor:nwse-resize;display:none;z-index:2147482000;touch-action:none}
body.erh-editing [data-eid].erh-selected > .erh-rsz{display:block}

/* floating format bar */
#erh-fmt{position:fixed;z-index:2147483000;display:none;gap:6px;align-items:center;padding:7px 8px;
  background:#0b0f14;border:1px solid #30363d;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.5)}
#erh-fmt.show{display:flex}
#erh-fmt button{width:30px;height:28px;border-radius:6px;border:1px solid #30363d;background:#161b22;color:#e6edf3;font:700 13px sans-serif;cursor:pointer}
#erh-fmt button:hover{border-color:var(--erh-accent)}
#erh-fmt .erh-sw{width:20px;height:20px;border-radius:50%;border:1px solid rgba(255,255,255,.4);cursor:pointer;padding:0}
#erh-fmt .erh-div{width:1px;height:22px;background:#30363d}
#erh-fmt input[type=color]{width:26px;height:26px;border:none;background:none;cursor:pointer;padding:0}

/* grid overlay — no opacity transition (throttled in background tabs) */
#erh-grid{position:fixed;inset:0;pointer-events:none;z-index:2147481000;display:none}
body.erh-grid-on #erh-grid{display:block;
  background-image:linear-gradient(var(--erh-grid) 1px,transparent 1px),linear-gradient(90deg,var(--erh-grid) 1px,transparent 1px);
  background-size:var(--erh-gridpx,24px) var(--erh-gridpx,24px)}
```

- [ ] **Step 2: Commit**

```bash
git add skills/editing-rendered-html/assets/overlay.css
git commit -m "feat(editing-rendered-html): overlay stylesheet"
```

---

## Task 4: `overlay.js` — DOM engine, save, and in-browser bake

**Files:**
- Create: `skills/editing-rendered-html/assets/overlay.js`

Depends on `window.PatchCore` (Task 2) and a `window.__erhSend(msg)` transport injected by `serve.js` (Task 5). DOM behavior is verified by the headless smoke test in Task 7.

- [ ] **Step 1: Write the engine**

Create `skills/editing-rendered-html/assets/overlay.js`:

```js
(function () {
  'use strict';
  var PC = window.PatchCore;
  var STORE = 'erhPatch:' + location.pathname, PREF = 'erhPref';
  // Served: sidecar patch is source of truth. Standalone: fall back to localStorage.
  var patch = window.__erhServed ? (window.__erhInitialPatch || {}) : load(STORE), pref = load(PREF);
  var editing = false, sel = null;
  var grid = { on: !!pref.gridOn, step: pref.gridStep || 24 };
  var LIGHT = ['#ffffff','#e6edf3','#cdd9e5','#a5d6ff','#b5e8c9','#ffd9a8','#ffc8dd','#1f2937'];
  var msgEl;

  function load(k){ try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch(e){ return {}; } }
  function saveLocal(){ localStorage.setItem(STORE, JSON.stringify(PC.prune(patch))); }
  function savePref(){ localStorage.setItem(PREF, JSON.stringify({ gridOn: grid.on, gridStep: grid.step })); }
  function entry(eid){ return patch[eid] || (patch[eid] = {}); }
  function textOf(n){ var s='',i; for(i=0;i<n.childNodes.length;i++){ if(n.childNodes[i].nodeType===3) s+=n.childNodes[i].nodeValue; } return s.trim(); }
  function setText(n,t){ var tn=null,i; for(i=0;i<n.childNodes.length;i++){ if(n.childNodes[i].nodeType===3){ tn=n.childNodes[i]; break; } } if(tn) tn.nodeValue=t; else n.insertBefore(document.createTextNode(t), n.firstChild); }
  function flash(m){ if(msgEl){ msgEl.textContent=m; setTimeout(function(){ msgEl.textContent=''; }, 2600); } }

  function applyAll(){
    Object.keys(patch).forEach(function(eid){
      var n = document.querySelector('[data-eid="'+eid+'"]'); if(!n) return;
      if(patch[eid].text != null) setText(n, patch[eid].text);
      var css = PC.entryToStyle(patch[eid]);
      for(var k in css) n.style[k] = css[k];
    });
  }

  function decorate(){
    document.querySelectorAll('[data-eid]').forEach(function(node){
      if(getComputedStyle(node).position === 'static'){ node.style.position = 'relative'; node.setAttribute('data-erh-pos','1'); }
      var grip = document.createElement('div'); grip.className='erh-grip'; grip.textContent='\u273A'; grip.setAttribute('contenteditable','false'); grip.setAttribute('data-overlay','1');
      var rsz = document.createElement('div'); rsz.className='erh-rsz'; rsz.setAttribute('contenteditable','false'); rsz.setAttribute('data-overlay','1');
      node.appendChild(grip); node.appendChild(rsz);
      wireDrag(node, grip); wireResize(node, rsz); wireSelect(node); wireText(node);
    });
  }
  function wireText(node){ node.addEventListener('input', function(){ if(!editing) return; entry(node.dataset.eid).text = textOf(node); saveLocal(); }); }
  function wireDrag(node, grip){
    var sx,sy,bx,by,on=false;
    grip.addEventListener('pointerdown', function(e){ if(!editing) return; on=true; grip.setPointerCapture(e.pointerId);
      var t=(patch[node.dataset.eid]||{}).transform||{x:0,y:0}; bx=t.x; by=t.y; sx=e.clientX; sy=e.clientY; e.preventDefault(); e.stopPropagation(); select(node); });
    grip.addEventListener('pointermove', function(e){ if(!on) return;
      var x=PC.snap(bx+(e.clientX-sx),grid.on,grid.step), y=PC.snap(by+(e.clientY-sy),grid.on,grid.step);
      node.style.transform='translate('+x+'px,'+y+'px)'; entry(node.dataset.eid).transform={x:x,y:y}; if(sel===node) placeBar(node); });
    grip.addEventListener('pointerup', function(e){ if(!on) return; on=false; grip.releasePointerCapture(e.pointerId); saveLocal(); });
  }
  function wireResize(node, rsz){
    var sx,sy,bw,bh,on=false;
    rsz.addEventListener('pointerdown', function(e){ if(!editing) return; on=true; rsz.setPointerCapture(e.pointerId);
      var r=node.getBoundingClientRect(); bw=r.width; bh=r.height; sx=e.clientX; sy=e.clientY; e.preventDefault(); e.stopPropagation(); });
    rsz.addEventListener('pointermove', function(e){ if(!on) return;
      var w=Math.max(60,PC.snap(bw+(e.clientX-sx),grid.on,grid.step)), h=Math.max(28,PC.snap(bh+(e.clientY-sy),grid.on,grid.step));
      node.style.width=w+'px'; node.style.minHeight=h+'px'; entry(node.dataset.eid).size={w:w,h:h}; });
    rsz.addEventListener('pointerup', function(e){ if(!on) return; on=false; rsz.releasePointerCapture(e.pointerId); saveLocal(); });
  }
  function wireSelect(node){ node.addEventListener('click', function(e){ if(!editing) return; if(e.target.classList.contains('erh-grip')||e.target.classList.contains('erh-rsz')) return; select(node); }); }
  function placeBar(node){ var r=node.getBoundingClientRect(); var top=r.top-46; if(top<8) top=r.bottom+10; fmt.style.left=Math.max(8,Math.min(window.innerWidth-260,r.left))+'px'; fmt.style.top=top+'px'; }
  function select(node){ if(sel) sel.classList.remove('erh-selected'); sel=node; node.classList.add('erh-selected'); fmt.classList.add('show'); placeBar(node);
    var cur=(patch[node.dataset.eid]||{}).style||{}; picker.value=/^#/.test(cur.color||'')?cur.color:'#ffffff'; }
  function deselect(){ if(sel) sel.classList.remove('erh-selected'); sel=null; fmt.classList.remove('show'); }

  // ---- control bar + format bar + grid layer (all data-overlay, stripped on bake) ----
  var fmt, picker;
  function buildChrome(){
    var bar = document.createElement('div'); bar.id='erh-bar'; bar.setAttribute('data-overlay','1');
    bar.innerHTML = '<button id="erh-edit">\u270E Edit</button><button id="erh-grid-btn">\u25A6 Grid</button>'
      + '<select class="erh-step" id="erh-step"><option>8</option><option>16</option><option selected>24</option><option>32</option></select>'
      + '<button id="erh-save">\u21EA Save</button><button id="erh-final">\u2714 Finalize</button><span class="erh-msg" id="erh-msg"></span>';
    document.body.appendChild(bar);

    fmt = document.createElement('div'); fmt.id='erh-fmt'; fmt.setAttribute('data-overlay','1');
    fmt.innerHTML = '<button data-act="font-">A-</button><button data-act="font+">A+</button><span class="erh-div"></span>'
      + '<button data-act="al-left">\u2B05</button><button data-act="al-center">\u2B0C</button><button data-act="al-right">\u27A1</button>'
      + '<span class="erh-div"></span><span id="erh-sw"></span><input type="color" id="erh-picker" value="#ffffff">';
    document.body.appendChild(fmt);
    picker = fmt.querySelector('#erh-picker');
    var sw = fmt.querySelector('#erh-sw');
    LIGHT.forEach(function(c){ var b=document.createElement('button'); b.className='erh-sw'; b.style.background=c; b.title=c; b.addEventListener('click', function(){ applyColor(c); }); sw.appendChild(b); });

    var gl = document.createElement('div'); gl.id='erh-grid'; gl.setAttribute('data-overlay','1'); document.body.appendChild(gl);

    msgEl = bar.querySelector('#erh-msg');
    bar.querySelector('#erh-edit').addEventListener('click', function(){ setEditing(!editing); });
    bar.querySelector('#erh-grid-btn').addEventListener('click', function(){ grid.on=!grid.on; applyGrid(); savePref(); });
    bar.querySelector('#erh-step').value=String(grid.step);
    bar.querySelector('#erh-step').addEventListener('change', function(){ grid.step=parseInt(this.value,10); applyGrid(); savePref(); });
    bar.querySelector('#erh-save').addEventListener('click', doSave);
    bar.querySelector('#erh-final').addEventListener('click', doFinalize);

    fmt.addEventListener('click', function(e){ var b=e.target.closest('button'); if(!b||!sel||!b.dataset.act) return;
      var st=entry(sel.dataset.eid).style||(entry(sel.dataset.eid).style={}); var cur=parseFloat(getComputedStyle(sel).fontSize);
      var act=b.dataset.act;
      if(act==='font-'){ var s=Math.max(8,Math.round(cur-2)); sel.style.fontSize=s+'px'; st.fontSize=s+'px'; }
      if(act==='font+'){ var s2=Math.round(cur+2); sel.style.fontSize=s2+'px'; st.fontSize=s2+'px'; }
      if(act==='al-left'){ sel.style.textAlign='left'; st.textAlign='left'; }
      if(act==='al-center'){ sel.style.textAlign='center'; st.textAlign='center'; }
      if(act==='al-right'){ sel.style.textAlign='right'; st.textAlign='right'; }
      saveLocal(); });
    picker.addEventListener('input', function(){ applyColor(this.value); });
  }
  function applyColor(c){ if(!sel) return; var st=entry(sel.dataset.eid).style||(entry(sel.dataset.eid).style={}); sel.style.color=c; st.color=c; saveLocal(); }
  function applyGrid(){ document.body.classList.toggle('erh-grid-on', grid.on); document.documentElement.style.setProperty('--erh-gridpx', grid.step+'px');
    var b=document.getElementById('erh-grid-btn'); if(b) b.classList.toggle('on', grid.on); }
  function setEditing(on){ editing=on; document.body.classList.toggle('erh-editing', on);
    document.querySelectorAll('[data-eid]').forEach(function(n){ n.setAttribute('contenteditable', on?'true':'false'); });
    var b=document.getElementById('erh-edit'); if(b) b.classList.toggle('on', on); if(!on) deselect(); }

  function doSave(){
    if(typeof window.__erhSend === 'function'){ window.__erhSend({ type:'patch', payload: JSON.stringify(PC.prune(patch)) }); flash('Saved \u2713'); }
    else { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(PC.prune(patch),null,2)); flash('Copied JSON \u2713'); }
  }

  // In-browser bake: clone the live (edited) DOM, strip every overlay artifact, serialize.
  function bakeHTML(){
    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('[data-overlay]').forEach(function(n){ n.remove() });          // grips, rsz, bars, grid
    clone.querySelectorAll('[data-erh-asset]').forEach(function(n){ n.remove() });         // injected css/js
    clone.querySelectorAll('[contenteditable]').forEach(function(n){ n.removeAttribute('contenteditable') });
    clone.querySelectorAll('[data-erh-pos]').forEach(function(n){ n.style.position=''; if(!n.getAttribute('style')) n.removeAttribute('style'); n.removeAttribute('data-erh-pos'); });
    clone.classList.remove('erh-editing','erh-grid-on');
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }
  function doFinalize(){
    if(typeof window.__erhSend === 'function'){ window.__erhSend({ type:'final', html: bakeHTML() }); flash('Finalized \u2713'); }
    else { flash('No server: copy not supported for finalize'); }
  }

  document.addEventListener('keydown', function(e){
    var typing = e.target.getAttribute('contenteditable')==='true' || /input|textarea|select/i.test(e.target.tagName);
    if(typing) return;
    if(e.key==='e') setEditing(!editing);
    if(e.key==='g'){ grid.on=!grid.on; applyGrid(); savePref(); }
    if(e.key==='Escape') deselect();
  });
  document.addEventListener('click', function(e){ if(!editing) return; if(!e.target.closest('[data-eid]') && !e.target.closest('#erh-fmt') && !e.target.closest('#erh-bar')) deselect(); });

  function boot(){ buildChrome(); decorate(); applyAll(); applyGrid(); setEditing(false); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.__erhBake = bakeHTML; // exposed for headless verification
})();
```

- [ ] **Step 2: Commit**

```bash
git add skills/editing-rendered-html/assets/overlay.js
git commit -m "feat(editing-rendered-html): overlay DOM engine, save, in-browser bake"
```

---

## Task 5: `serve.js` — inject bundle, persist patch & final (TDD on pure helpers)

**Files:**
- Create: `skills/editing-rendered-html/serve.js`
- Test: `skills/editing-rendered-html/test/serve.test.js`

Socket wiring is verified by the headless smoke (Task 7). The two pure helpers — `injectBundle()` and `sidecarPaths()` — are unit-tested here.

**Source-of-truth contract:** On a served page the **sidecar `*.patch.json` is the single source of truth**. `serve.js` injects `window.__erhServed=true` and `window.__erhInitialPatch=<sidecar-or-{}>`; the overlay loads from that and ignores localStorage when served (prevents double-application after the agent folds nudges into source and clears the sidecar). localStorage autosave remains only for the standalone/no-server fallback.

- [ ] **Step 1: Write the failing tests**

Create `skills/editing-rendered-html/test/serve.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test skills/editing-rendered-html/test/serve.test.js`
Expected: FAIL — `Cannot find module '../serve.js'`.

- [ ] **Step 3: Write the implementation**

Create `skills/editing-rendered-html/serve.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test skills/editing-rendered-html/test/serve.test.js`
Expected: PASS — 5 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add skills/editing-rendered-html/serve.js skills/editing-rendered-html/test/serve.test.js
git commit -m "feat(editing-rendered-html): serve.js bundle injection + patch/final persistence"
```

---

## Task 6: `SKILL.md` — model-invoked procedure

**Files:**
- Create: `skills/editing-rendered-html/SKILL.md`

Follows `writing-great-skills`: leading word **nudge**, description = triggers only (no workflow summary), model-invoked (no `disable-model-invocation`). `name` must equal the directory name `editing-rendered-html`.

- [ ] **Step 1: Write SKILL.md**

Create `skills/editing-rendered-html/SKILL.md`:

```markdown
---
name: editing-rendered-html
description: Use when generating an HTML visual, slide, deck, diagram, or page the user will want to fine-tune, or when the user asks to edit/move/resize/retype/nudge elements directly in a rendered HTML page instead of describing changes in prose. Triggers include "let me edit this", "move that to the left", "nudge the layout", "make this editable", "tweak the render".
---

# editing-rendered-html

## Overview

Make agent-authored HTML editable-by-default in the browser so the user fixes the last 20% — position, copy, size, color — by hand. Hand-edits ("**nudges**") are captured as a regeneration-safe patch you read each turn; on finalize the page bakes to a clean standalone file.

Core principle: the source HTML stays clean; nudges live in a sidecar patch keyed by `data-eid`; you fold nudges into source and regenerate, and the patch reattaches because the eids are stable.

## When to use

- You are generating an HTML visual/slide/deck/diagram/page the user will refine.
- The user wants to move/resize/retype/recolor elements directly in the render.

Not this skill: editing the agent's own structure/logic (that stays your job); editing third-party HTML you did not author with `data-eid` tags.

## Procedure

1. **Author clean + tag.** Write the HTML normally. Add a stable, semantic `data-eid="..."` to every element the user may want to nudge (headings, subheadings, captions, cards, images). Keep eids stable across regenerations — that is what makes nudges survive.
2. **Serve.** Start the overlay server and give the user the URL:
   `node skills/editing-rendered-html/serve.js <path/to/file.html>`
   It prints a JSON line with `url`, `patch`, and `final` paths. Tell the user the URL and that they can press **E** to edit, **G** for grid snap, drag the blue grip to move, click text to retype, drag the corner to resize, select for the format bar, then **Save**.
3. **Read nudges.** On your next turn read the sidecar `*.patch.json`. It is a diff keyed by `data-eid` (`{eid:{text,transform,size,style}}`). Fold each nudge into the source HTML, then regenerate. Report orphan eids (in the patch but no longer in source) rather than applying them blindly.
4. **Finalize.** When the user is done, have them click **Finalize** (writes `*.final.html`), or keep iterating from step 2. Stop the server. Deliver `*.final.html` — clean markup, no overlay.

## Capabilities (what the user can nudge)

move · retype · resize · font-size · align · light-color · grid-snap toggle. Grid snap is an editor preference (per-browser), not part of the patch.

## Common mistakes

- **Unstable eids** — renaming/reordering eids on regen orphans the patch. Keep them stable and semantic.
- **Baking the overlay into source** — never paste overlay code into the HTML; it is injected at serve time only.
- **Applying orphan patch entries** — if an eid is gone from source, report it; do not guess.
- **Telling the user to run slash commands** — there are none; serving is automatic on your side.
```

- [ ] **Step 2: Commit**

```bash
git add skills/editing-rendered-html/SKILL.md
git commit -m "feat(editing-rendered-html): model-invoked SKILL.md procedure"
```

---

## Task 7: End-to-end headless verification, bootstrap symlink, final commit

**Files:**
- Create: `skills/editing-rendered-html/test/smoke.md` (documented manual/headless steps)
- Run: `bootstrap.sh`

The full loop crosses a real browser + server, so it is verified with the browser tool (mirrors the prototype verification done during design), not `node --test`.

- [ ] **Step 1: Run the unit suites together**

Run: `node --test "skills/editing-rendered-html/test/*.test.js"`
Expected: PASS — patch-core (9) + serve (5) = 14 tests, 0 failures.

- [ ] **Step 2: Start the server on the fixture**

Run: `node skills/editing-rendered-html/serve.js skills/editing-rendered-html/fixtures/sample.html --port 0 &`
Expected: a JSON line `{"event":"serving","url":"http://localhost:PORT",...}`. Note the URL.

- [ ] **Step 3: Headless smoke via the browser tool**

Open the URL, then in a `browser run` exercise the loop and assert results:

```js
await tab.click('#erh-edit');                      // enter edit mode
// move the title heading via its grip
await tab.evaluate(() => {
  const n = document.querySelector('[data-eid="title"]');
  const g = n.querySelector('.erh-grip');
  const r = g.getBoundingClientRect();
  const P=(x,y)=>({clientX:x,clientY:y,bubbles:true,pointerId:1});
  g.dispatchEvent(new PointerEvent('pointerdown',P(r.x+5,r.y+5)));
  g.dispatchEvent(new PointerEvent('pointermove',P(r.x+55,r.y+35)));
  g.dispatchEvent(new PointerEvent('pointerup',P(r.x+55,r.y+35)));
});
// retype the subtitle
await tab.evaluate(() => {
  const n = document.querySelector('[data-eid="subtitle"]');
  n.focus();
  const tn = [...n.childNodes].find(c=>c.nodeType===3); tn.nodeValue = 'Nudged copy';
  n.dispatchEvent(new Event('input',{bubbles:true}));
});
await tab.click('#erh-save');                       // Save -> writes patch.json
await tab.click('#erh-final');                      // Finalize -> writes final.html
const baked = await tab.evaluate(() => window.__erhBake());
display({ hasOverlayInBake: /data-overlay|erh-grip|__erh/.test(baked),
          titleMoved: baked.includes('translate('),
          retyped: baked.includes('Nudged copy') });
```

Expected: `hasOverlayInBake:false`, `titleMoved:true`, `retyped:true`.

- [ ] **Step 4: Assert the sidecar files on disk**

Run: `cat skills/editing-rendered-html/fixtures/sample.patch.json`
Expected: JSON containing `"title":{"transform":{"x":50,"y":30}}` (snap off → ~50,30) and `"subtitle":{"text":"Nudged copy"}`.

Run: `grep -c 'data-overlay\|erh-grip\|__erh/' skills/editing-rendered-html/fixtures/sample.final.html`
Expected: `0` (no overlay artifacts in the baked file).

- [ ] **Step 5: Stop the server and clean test artifacts**

Run:
```bash
kill %1 2>/dev/null
rm -f skills/editing-rendered-html/fixtures/sample.patch.json skills/editing-rendered-html/fixtures/sample.final.html
```

- [ ] **Step 6: Record the smoke procedure**

Create `skills/editing-rendered-html/test/smoke.md` documenting Steps 2-4 verbatim so the headless loop is repeatable.

- [ ] **Step 7: Symlink into the canonical store**

Run: `./bootstrap.sh`
Expected: `~/.agents/skills/editing-rendered-html` resolves to `skills/editing-rendered-html`. Verify: `ls -l ~/.agents/skills/editing-rendered-html`.

- [ ] **Step 8: Final commit**

```bash
git add skills/editing-rendered-html/test/smoke.md
git commit -m "test(editing-rendered-html): headless smoke procedure + bootstrap symlink"
```

---

## Self-Review

**Spec coverage:**
- *nudge loop* → Tasks 4 (save), 5 (persist), 6 (read/fold procedure). ✓
- *clean source + data-eid* → Task 1 fixture, Task 6 step 1. ✓
- *serve-time overlay injection* → Task 5 `injectBundle`. ✓
- *patch schema {text,transform,size,style}* → Task 2 `entryToStyle` + Task 4 capture. ✓
- *B-tier engine (move incl. headers, retype, resize, font/align/light-color, grid snap)* → Tasks 3-4. ✓
- *bake to clean final* → Task 4 `bakeHTML` + Task 5 final write; verified Task 7. ✓
- *error handling (orphan eid, no patch, standalone, no transition)* → Task 6 mistakes, Task 4 fallback + grid CSS, Task 5 `readInitialPatch`. ✓
- *TDD verification* → Tasks 2,5 unit; Task 7 headless. ✓
- *packaging (plugin.json, bootstrap, commit)* → Task 1 + Task 7. ✓

**Refinement logged:** server-side `bake.js` → in-browser `bakeHTML` (zero-dep constraint). Spec updated note belongs in spec; flagged in plan header.

**Placeholder scan:** no TBD/TODO; every code step shows complete code; commands have expected output. ✓

**Type/name consistency:** `snap/prune/entryToStyle` (patch-core) used identically in overlay.js and tests; `injectBundle/sidecarPaths` consistent across serve.js and serve.test.js; `__erhSend/__erhServed/__erhInitialPatch/__erhBake` consistent across serve.js and overlay.js; `data-overlay`/`data-erh-asset`/`data-erh-pos` strip markers consistent between overlay.js (set) and bakeHTML (remove). ✓
