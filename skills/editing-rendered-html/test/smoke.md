# Headless smoke — editing-rendered-html

End-to-end verification of the full loop (serve → edit → save → finalize → bake).
The unit suites (`node --test "skills/editing-rendered-html/test/*.test.js"`, 14 tests)
cover the pure helpers; this smoke covers the browser + server round-trip they can't.

> Node ≥ 21 required. On Node v25, `node --test <dir>` no longer scans a directory —
> pass a glob (`"…/test/*.test.js"`) or a file path.

## 1. Unit suites

```bash
node --test "skills/editing-rendered-html/test/*.test.js"
# expect: tests 14, pass 14, fail 0
```

## 2. Start the server on the fixture

```bash
node skills/editing-rendered-html/serve.js skills/editing-rendered-html/fixtures/sample.html --port 0 &
# prints: {"event":"serving","url":"http://localhost:PORT","patch":"…","final":"…"}
```

Note the `url`.

## 3. Drive the loop headless (browser tool)

Open the `url`, then run:

```js
// sanity: overlay booted
await tab.evaluate(() => ({
  hasBar: !!document.getElementById('erh-bar'),
  served: window.__erhServed === true,
  hasSend: typeof window.__erhSend === 'function',
  grips: document.querySelectorAll('.erh-grip').length   // 9 for the fixture
}));

await tab.click('#erh-edit');                      // enter edit mode
// move the title via its grip (~+50,+30, grid off)
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
await tab.click('#erh-save');                       // -> writes <name>.patch.json
await tab.click('#erh-final');                      // -> writes <name>.final.html
await wait(300);                                    // let WS frames flush to disk

const baked = await tab.evaluate(() => window.__erhBake());
const A = s => new RegExp(s).test(baked);
display({
  anyArtifact: ['data-overlay','erh-grip','__erh/','erh-editing','erh-selected',
                'erh-grid-on','--erh-gridpx','contenteditable','data-erh-pos'].some(A),
  titleMoved: baked.includes('translate('),
  retyped: baked.includes('Nudged copy')
});
// expect: anyArtifact:false, titleMoved:true, retyped:true
// (data-cmux-* attrs come from the cmux test browser, not the overlay — ignore)
```

## 4. Assert the on-disk sidecars

```bash
cat skills/editing-rendered-html/fixtures/sample.patch.json
# expect: {"title":{"transform":{"x":50,"y":30}}, "subtitle":{"text":"Nudged copy"}}

grep -c 'data-overlay\|erh-grip\|__erh/\|erh-editing\|erh-selected\|erh-grid-on\|--erh-gridpx\|contenteditable\|data-erh-pos' \
  skills/editing-rendered-html/fixtures/sample.final.html
# expect: 0 (grep exits 1 on zero matches — that is the pass)
```

## 5. Clean up

```bash
pkill -f "serve.js skills/editing-rendered-html/fixtures/sample.html"
rm -f skills/editing-rendered-html/fixtures/sample.patch.json \
      skills/editing-rendered-html/fixtures/sample.final.html
```
