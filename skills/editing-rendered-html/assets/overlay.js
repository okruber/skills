(function () {
  'use strict';
  var PC = window.PatchCore;
  var STORE = 'erhPatch:' + location.pathname, PREF = 'erhPref';
  // Served: sidecar patch is source of truth. Standalone: fall back to localStorage.
  // normalize() accepts both v1 flat maps and v2 {entries:{eid:{final,history}}} docs.
  var init = PC.normalize(window.__erhServed ? (window.__erhInitialPatch || {}) : load(STORE));
  var patch = init.flat, hist = init.hist;
  var pref = load(PREF);
  var editing = false, sel = null, annotating = false;
  var grid = { on: !!pref.gridOn, step: pref.gridStep || 24 };
  var LIGHT = ['#ffffff','#e6edf3','#cdd9e5','#a5d6ff','#b5e8c9','#ffd9a8','#ffc8dd','#1f2937'];
  var msgEl;

  function load(k){ try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch(e){ return {}; } }
  function saveLocal(){ localStorage.setItem(STORE, JSON.stringify(PC.toDoc(patch, hist))); }
  function savePref(){ localStorage.setItem(PREF, JSON.stringify({ gridOn: grid.on, gridStep: grid.step })); }
  function entry(eid){ return patch[eid] || (patch[eid] = {}); }

  // ---- history ops (v2 patch): append-only trail the agent reads for intent ----
  function recordOp(eid, kind, fields){ (hist[eid] || (hist[eid] = [])).push(PC.op(kind, fields)); }
  var pendingTextEid = null, textTimer = null;
  function scheduleTextOp(eid){ pendingTextEid = eid; clearTimeout(textTimer); textTimer = setTimeout(recordTextOp, 900); }
  function recordTextOp(){
    clearTimeout(textTimer); textTimer = null;
    if(pendingTextEid == null) return;
    var e = patch[pendingTextEid];
    if(e && e.text != null) recordOp(pendingTextEid, 'retype', { text: e.text });
    pendingTextEid = null;
  }
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
  function wireText(node){ node.addEventListener('input', function(){ if(!editing) return; entry(node.dataset.eid).text = textOf(node); scheduleTextOp(node.dataset.eid); saveLocal(); }); }
  function wireDrag(node, grip){
    var sx,sy,bx,by,on=false,moved=false;
    grip.addEventListener('pointerdown', function(e){ if(!editing) return; on=true; moved=false; grip.setPointerCapture(e.pointerId);
      var t=(patch[node.dataset.eid]||{}).transform||{x:0,y:0}; bx=t.x; by=t.y; sx=e.clientX; sy=e.clientY; e.preventDefault(); e.stopPropagation(); select(node); });
    grip.addEventListener('pointermove', function(e){ if(!on) return; moved=true;
      var x=PC.snap(bx+(e.clientX-sx),grid.on,grid.step), y=PC.snap(by+(e.clientY-sy),grid.on,grid.step);
      node.style.transform='translate('+x+'px,'+y+'px)'; entry(node.dataset.eid).transform={x:x,y:y}; if(sel===node) placeBar(node); });
    grip.addEventListener('pointerup', function(e){ if(!on) return; on=false; grip.releasePointerCapture(e.pointerId);
      if(moved){ recordOp(node.dataset.eid, 'move', { transform: (patch[node.dataset.eid]||{}).transform }); saveLocal(); } });
  }
  function wireResize(node, rsz){
    var sx,sy,bw,bh,on=false,moved=false;
    rsz.addEventListener('pointerdown', function(e){ if(!editing) return; on=true; moved=false; rsz.setPointerCapture(e.pointerId);
      var r=node.getBoundingClientRect(); bw=r.width; bh=r.height; sx=e.clientX; sy=e.clientY; e.preventDefault(); e.stopPropagation(); });
    rsz.addEventListener('pointermove', function(e){ if(!on) return; moved=true;
      var w=Math.max(60,PC.snap(bw+(e.clientX-sx),grid.on,grid.step)), h=Math.max(28,PC.snap(bh+(e.clientY-sy),grid.on,grid.step));
      node.style.width=w+'px'; node.style.minHeight=h+'px'; entry(node.dataset.eid).size={w:w,h:h}; });
    rsz.addEventListener('pointerup', function(e){ if(!on) return; on=false; rsz.releasePointerCapture(e.pointerId);
      if(moved){ recordOp(node.dataset.eid, 'size', { size: (patch[node.dataset.eid]||{}).size }); saveLocal(); } });
  }
  function wireSelect(node){ node.addEventListener('click', function(e){ if(!editing) return;
    if(e.target.classList.contains('erh-grip')||e.target.classList.contains('erh-rsz')||e.target.classList.contains('erh-note-badge')) return;
    if(annotating){ openNote(node); return; } select(node); }); }
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
      recordOp(sel.dataset.eid, 'style', { style: st }); saveLocal(); });
    picker.addEventListener('input', function(){ applyColor(this.value); });
  }
  function applyColor(c){ if(!sel) return; var st=entry(sel.dataset.eid).style||(entry(sel.dataset.eid).style={}); sel.style.color=c; st.color=c; recordOp(sel.dataset.eid, 'style', { style: { color: c } }); saveLocal(); }
  function applyGrid(){ document.body.classList.toggle('erh-grid-on', grid.on); document.documentElement.style.setProperty('--erh-gridpx', grid.step+'px');
    var b=document.getElementById('erh-grid-btn'); if(b) b.classList.toggle('on', grid.on); }
  function setEditing(on){ editing=on; document.body.classList.toggle('erh-editing', on);
    document.querySelectorAll('[data-eid]').forEach(function(n){ n.setAttribute('contenteditable', on?'true':'false'); });
    var b=document.getElementById('erh-edit'); if(b) b.classList.toggle('on', on); if(!on) deselect(); }

  function doSave(){
    recordTextOp();
    if(typeof window.__erhSend === 'function'){
      window.__erhSend({ type:'patch', slide: slideName(), payload: JSON.stringify(PC.toDoc(patch, hist)) }); flash('Saved \u2713');
    }
    else { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(PC.toDoc(patch, hist),null,2)); flash('Copied JSON \u2713'); }
  }

  // In-browser bake: clone the live (edited) DOM, strip every overlay artifact, serialize.
  function bakeHTML(){
    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('[data-overlay]').forEach(function(n){ n.remove() });          // grips, rsz, bars, grid
    clone.querySelectorAll('[data-erh-asset]').forEach(function(n){ n.remove() });         // injected css/js
    clone.querySelectorAll('[contenteditable]').forEach(function(n){ n.removeAttribute('contenteditable') });
    clone.querySelectorAll('[data-erh-pos]').forEach(function(n){ n.style.position=''; if(!n.getAttribute('style')) n.removeAttribute('style'); n.removeAttribute('data-erh-pos'); });
    // strip editor-state classes wherever they live (body, selected element, clone itself)
    var EDIT_CLASSES = ['erh-editing','erh-grid-on','erh-selected','erh-annotate'];
    clone.classList.remove.apply(clone.classList, EDIT_CLASSES);
    clone.querySelectorAll('.erh-editing,.erh-grid-on,.erh-selected').forEach(function(n){
      n.classList.remove.apply(n.classList, EDIT_CLASSES);
      if(!n.getAttribute('class')) n.removeAttribute('class');
    });
    // clear the grid CSS var set on <html> during editing
    clone.style.removeProperty('--erh-gridpx');
    if(!clone.getAttribute('style')) clone.removeAttribute('style');
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }
  function doFinalize(){
    recordTextOp();
    if(typeof window.__erhSend === 'function'){ window.__erhSend({ type:'final', slide: slideName(), html: bakeHTML() }); flash('Finalized \u2713'); }
    else { flash('No server: copy not supported for finalize'); }
  }

  // ---- annotation mode (A while editing, click an element, type a note for the agent) ----
  // Pending notes are visible as ✎ badges (edit/annotate modes only); clicking
  // a badge reopens the editor even outside annotate mode.
  function refreshBadges(){
    document.querySelectorAll('.erh-note-badge').forEach(function(b){ b.remove(); });
    Object.keys(hist).forEach(function(eid){
      var note = PC.lastNote(hist, eid); if(note == null) return;
      var n = document.querySelector('[data-eid="' + eid + '"]'); if(!n) return;
      var b = document.createElement('span'); b.className = 'erh-note-badge';
      b.setAttribute('data-overlay','1'); b.setAttribute('contenteditable','false');
      b.title = note; b.textContent = '\u270E';
      b.addEventListener('click', function(e){ e.stopPropagation(); if(!editing) setEditing(true); openNote(n); });
      n.appendChild(b);
    });
  }
  var noteBox = null;
  function openNote(node){
    closeNote();
    var eid = node.dataset.eid;
    var existing = PC.lastNote(hist, eid);
    noteBox = document.createElement('div'); noteBox.id = 'erh-note'; noteBox.setAttribute('data-overlay','1');
    noteBox.innerHTML = '<textarea placeholder="Note for the agent\u2026"></textarea>'
      + '<div class="erh-note-hint"><button type="button" class="erh-note-del">Delete</button>Enter save \u00b7 Esc cancel</div>';
    document.body.appendChild(noteBox);
    var r = node.getBoundingClientRect();
    noteBox.style.left = Math.max(8, Math.min(window.innerWidth - 280, r.left)) + 'px';
    noteBox.style.top = Math.min(window.innerHeight - 120, r.bottom + 8) + 'px';
    var ta = noteBox.querySelector('textarea');
    var del = noteBox.querySelector('.erh-note-del');
    if(existing != null) ta.value = existing; else del.style.display = 'none';
    ta.focus();
    del.addEventListener('click', function(){
      PC.removeNotes(hist, eid); saveLocal(); doSave(); closeNote(); refreshBadges(); flash('Note deleted');
    });
    ta.addEventListener('keydown', function(e){
      e.stopPropagation();
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault();
        var v = ta.value.trim();
        if(v && v !== existing){ recordOp(eid, 'note', { note: v }); }
        else if(!v && existing){ PC.removeNotes(hist, eid); }
        else { closeNote(); return; }
        saveLocal(); doSave(); closeNote(); refreshBadges(); flash(v ? 'Note saved \u2713' : 'Note deleted');
      }
      if(e.key === 'Escape') closeNote();
    });
  }
  function closeNote(){ if(noteBox){ noteBox.remove(); noteBox = null; } }
  function setAnnotating(on){ annotating = on; document.body.classList.toggle('erh-annotate', on);
    flash(on ? 'Annotate: click an element' : 'Annotate off'); if(!on) closeNote(); }

  // ---- deck navigation (served decks only) ----
  function slideName(){ return (window.__erhDeck && window.__erhDeck.names) ? window.__erhDeck.names[window.__erhDeck.index] : undefined; }
  function buildNav(){
    var d = window.__erhDeck; if(!d || d.total < 2) return;
    var nav = document.createElement('div'); nav.id = 'erh-nav'; nav.setAttribute('data-overlay','1');
    nav.innerHTML = '<button id="erh-prev">\u25C4</button><span id="erh-count">' + (d.index+1) + ' / ' + d.total + '</span><button id="erh-next">\u25BA</button>';
    document.body.appendChild(nav);
    window.__erhGo = function(i){ if(i < 0 || i >= d.total) return; doSave(); location.href = '/?s=' + i; };
    nav.querySelector('#erh-prev').addEventListener('click', function(){ window.__erhGo(d.index - 1); });
    nav.querySelector('#erh-next').addEventListener('click', function(){ window.__erhGo(d.index + 1); });
  }

  document.addEventListener('keydown', function(e){
    var typing = e.target.getAttribute('contenteditable')==='true' || /input|textarea|select/i.test(e.target.tagName);
    if(typing) return;
    var k = e.key.toLowerCase();
    if(k==='e') setEditing(!editing);
    if(k==='g'){ grid.on=!grid.on; applyGrid(); savePref(); }
    if(k==='a'){ if(!editing) setEditing(true); setAnnotating(!annotating); }
    if(k==='arrowleft' && window.__erhGo){ e.preventDefault(); window.__erhGo(window.__erhDeck.index - 1); }
    if(k==='arrowright' && window.__erhGo){ e.preventDefault(); window.__erhGo(window.__erhDeck.index + 1); }
    if(e.key==='Escape'){ closeNote(); if(annotating) setAnnotating(false); else deselect(); }
  });
  document.addEventListener('click', function(e){ if(!editing) return; if(!e.target.closest('[data-eid]') && !e.target.closest('#erh-fmt') && !e.target.closest('#erh-bar')) deselect(); });

  function boot(){ buildChrome(); buildNav(); decorate(); applyAll(); applyGrid(); refreshBadges(); setEditing(false); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.__erhBake = bakeHTML; // exposed for headless verification
  window.__erhState = function(){ return { editing: editing, annotating: annotating }; };
})();
