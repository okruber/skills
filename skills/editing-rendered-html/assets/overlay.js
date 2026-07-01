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
    // strip editor-state classes wherever they live (body, selected element, clone itself)
    var EDIT_CLASSES = ['erh-editing','erh-grid-on','erh-selected'];
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
