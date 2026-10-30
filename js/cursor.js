/* Custom cursors: fifteen styles, picked from the panel on the right and
   remembered between visits (and between tabs). Mouse and trackpad only --
   touch devices keep their native behaviour and never see the panel. The
   cursor is its own fixed layer and never moves page elements, so the Motion
   entrance and the scroll choreography are untouched. Looks live in
   css/cursor.css; this file only positions parts and sets state classes. */
(function(){
"use strict";

// dot / ring / label: how much of the way to the pointer each part closes per
// 60fps frame (1 = pinned to it). mag: the ring wraps what it is over.
var STYLES=[
 {name:"Minimal circle",dot:.35},
 {name:"Small dot",dot:1},
 {name:"Outline circle",ring:.18},
 {name:"Crosshair",dot:1},
 {name:"Magnetic follow",dot:1,ring:.16,mag:true},
 {name:"Expanding hover",dot:1,ring:.22},
 {name:"Inverted colour",dot:.3},
 {name:"Soft blur",dot:1,ring:.14},
 {name:"Ring + centre dot",dot:1,ring:.15},
 {name:"Styled arrow",dot:1},
 {name:"Text follow",dot:1,label:.14},
 {name:"Smooth trail",dot:1,trail:.38},
 {name:"Rotating ring",dot:1,ring:.2},
 {name:"Plus symbol",dot:.5},
 {name:"Premium hover",dot:1,ring:.16,label:.16}
];
var KEY="create-cursor", FALLBACK=15, TRAIL=6;
var INTERACTIVE='a[href],button,[role="button"],[role="radio"],label,select,summary,[tabindex]:not([tabindex="-1"])';
var TEXT='input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),textarea,[contenteditable=""],[contenteditable="true"]';

var root=document.documentElement;
var fine=matchMedia("(hover: hover) and (pointer: fine)");
var still=matchMedia("(prefers-reduced-motion: reduce)");

function stored(){try{var n=parseInt(localStorage.getItem(KEY),10);if(n>=1&&n<=STYLES.length)return n}catch(e){}return FALLBACK}
function store(n){try{localStorage.setItem(KEY,String(n))}catch(e){}}
function two(n){return (n<10?"0":"")+n}
function trails(){var s="";for(var i=0;i<3;i++)s+='<i class="c-trail" style="--i:'+(i+1)+'"></i>';return s}
function mini(n){
 return '<span class="cur-mini" data-v="'+n+'" aria-hidden="true"><span class="cur-p">'+trails()+
  '<i class="c-ring"></i><i class="c-dot"></i><i class="c-label"></i></span></span>';
}

/* ── the cursor layer ── */
var cur=document.createElement("div");
cur.className="cur";
cur.setAttribute("aria-hidden","true");
var markup="";
for(var i=0;i<TRAIL;i++)markup+='<span class="cur-p"><i class="c-trail" style="--i:'+i+'"></i></span>';
cur.innerHTML=markup+'<span class="cur-p"><i class="c-ring"></i></span><span class="cur-p"><i class="c-dot"></i></span><span class="cur-p"><i class="c-label">Explore</i></span>';
var wraps=cur.querySelectorAll(".cur-p");
var trailEls=[].slice.call(wraps,0,TRAIL), ringEl=wraps[TRAIL], dotEl=wraps[TRAIL+1], labelEl=wraps[TRAIL+2];
var ringShape=ringEl.firstChild, labelText=labelEl.firstChild;

function pt(){return {x:-200,y:-200}}
var P=pt(), D=pt(), R=pt(), L=pt(), T=[];
for(i=0;i<TRAIL;i++)T.push(pt());
var style=STYLES[FALLBACK-1], hit=null, live=false, raf=0, last=0, recheck=false;

function snap(){[D,R,L].concat(T).forEach(function(o){o.x=P.x;o.y=P.y})}
// frame-rate independent: the same feel at 60Hz and 144Hz
function k(f,dt){return !f||f>=1||still.matches?1:1-Math.pow(1-f,dt/16.667)}
function chase(a,b,f){a.x+=(b.x-a.x)*f;a.y+=(b.y-a.y)*f;return Math.abs(b.x-a.x)+Math.abs(b.y-a.y)}
function put(el,o){el.style.transform="translate3d("+o.x.toFixed(1)+"px,"+o.y.toFixed(1)+"px,0)"}

function frame(now){
 raf=0;
 var dt=last?Math.min(64,now-last):16.667;last=now;
 // scrolling slides the page under a still pointer, so ask again what it is over
 if(recheck){recheck=false;classify(document.elementFromPoint(P.x,P.y))}
 var rest=chase(D,P,k(style.dot,dt));
 var target=P;
 if(style.mag&&hit&&hit.el){
  var r=hit.el.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  target={x:cx+(P.x-cx)*.12,y:cy+(P.y-cy)*.12};
  ringShape.style.setProperty("--mw",(r.width+14).toFixed(1)+"px");
  ringShape.style.setProperty("--mh",(r.height+14).toFixed(1)+"px");
 }
 rest+=chase(R,target,k(style.ring,dt));
 rest+=chase(L,P,k(style.label,dt));
 if(style.trail&&!still.matches){
  for(var j=0,prev=D;j<TRAIL;j++){rest+=chase(T[j],prev,k(style.trail,dt));put(trailEls[j],T[j]);prev=T[j]}
 }
 put(dotEl,D);put(ringEl,R);put(labelEl,L);
 if(rest>.2){if(!raf)raf=requestAnimationFrame(frame)}else last=0;
}
function kick(){if(!raf)raf=requestAnimationFrame(frame)}

// the first solid background behind an element, as [r,g,b]
function surface(el){
 for(;el&&el.nodeType===1;el=el.parentElement){
  var c=(getComputedStyle(el).backgroundColor.match(/[\d.]+/g)||[]).map(Number);
  if(c.length===3||(c.length===4&&c[3]>.5))return c;
 }
 return null;
}

/* what the pointer is over decides the hover state and the label */
function classify(t){
 var h=null, el;
 if(t&&t.closest){
  if((el=t.closest(TEXT)))h={kind:"text",el:el};
  else if((el=t.closest(".reel,video")))h={kind:"media",el:el.closest("a,button")||el,label:"Play"};
  else if((el=t.closest(INTERACTIVE)))h={kind:"link",el:el,label:el.getAttribute("data-cursor-label")||(el.closest(".cp")?"Pick":"Open")};
  else if((el=t.closest("img"))&&!el.closest(".hero-bg"))h={kind:"image",el:el,label:"View"};
 }
 if((h&&h.el)===(hit&&hit.el)&&(h&&h.kind)===(hit&&hit.kind))return;
 hit=h;
 var over=!!h&&h.kind!=="text";
 cur.classList.toggle("is-hover",over);
 cur.classList.toggle("is-mag",over);
 cur.classList.toggle("is-media",!!h&&h.kind==="media");
 cur.classList.toggle("is-text",!!h&&h.kind==="text");
 labelText.textContent=over?h.label:"Explore";
 // an accent cursor over an accent button would vanish, so it turns ink there
 var bg=over&&surface(h.el);
 cur.classList.toggle("on-accent",!!bg&&Math.abs(bg[0]-255)+Math.abs(bg[1]-96)+Math.abs(bg[2]-65)<90);
 if(over){
  var br=parseFloat(getComputedStyle(h.el).borderTopLeftRadius)||0;
  ringShape.style.setProperty("--mr",(br?br+7:10)+"px");
 }
 kick();
}

function pointer(e){return e.pointerType==="mouse"||e.pointerType==="pen"}
addEventListener("pointermove",function(e){
 if(!pointer(e))return;
 P.x=e.clientX;P.y=e.clientY;
 if(!live){live=true;snap();cur.classList.add("is-live")}
 cur.classList.remove("is-gone");
 kick();
},{passive:true});
addEventListener("pointerover",function(e){if(pointer(e))classify(e.target)},{passive:true});
addEventListener("pointerdown",function(e){if(pointer(e))cur.classList.add("is-down")},{passive:true});
addEventListener("pointerup",function(){cur.classList.remove("is-down")},{passive:true});
addEventListener("blur",function(){cur.classList.remove("is-down");cur.classList.add("is-gone")});
document.addEventListener("mouseout",function(e){if(!e.relatedTarget)cur.classList.add("is-gone")});
addEventListener("scroll",function(){if(live){recheck=true;kick()}},{passive:true});

/* ── the panel ── */
var panel=document.createElement("div");
panel.className="cp";
var items=STYLES.map(function(s,n){
 n++;
 return '<button type="button" class="cp-item" role="radio" aria-checked="false" tabindex="-1" data-cursor="'+n+'" data-name="'+s.name+'" aria-label="Cursor '+two(n)+', '+s.name+'">'+
  mini(n)+'<span class="cp-n">'+two(n)+'</span></button>';
}).join("");
panel.innerHTML=
 '<button type="button" class="cp-toggle" aria-expanded="false" aria-controls="cp-box" aria-label="Cursor styles"><span class="cp-pv"></span><span class="cp-num"></span></button>'+
 '<div class="cp-box" id="cp-box" hidden><div class="cp-head"><span>Cursor</span>'+
 '<button type="button" class="cp-close" aria-label="Close cursor styles"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.3"/></svg></button></div>'+
 '<div class="cp-list" role="radiogroup" aria-label="Cursor style">'+items+'</div></div>';
var toggle=panel.querySelector(".cp-toggle"), box=panel.querySelector(".cp-box"), list=[].slice.call(panel.querySelectorAll(".cp-item"));

function open(focus){
 toggle.hidden=true;box.hidden=false;toggle.setAttribute("aria-expanded","true");
 if(focus)panel.querySelector('[aria-checked="true"]').focus();
}
function close(focus){
 if(box.hidden)return;
 box.hidden=true;toggle.hidden=false;toggle.setAttribute("aria-expanded","false");
 if(focus)toggle.focus();
}
function pick(n,keep){
 style=STYLES[n-1];
 cur.setAttribute("data-v",n);
 list.forEach(function(b,j){var on=j===n-1;b.setAttribute("aria-checked",on);b.tabIndex=on?0:-1});
 toggle.firstChild.innerHTML=mini(n);
 toggle.lastChild.textContent=two(n);
 toggle.setAttribute("aria-label","Cursor styles, current: "+two(n)+" "+style.name);
 if(!keep)store(n);
 snap();kick();
}

toggle.addEventListener("click",function(e){open(e.detail===0)});
panel.querySelector(".cp-close").addEventListener("click",function(e){close(e.detail===0)});
list.forEach(function(b){b.addEventListener("click",function(){pick(+b.getAttribute("data-cursor"))})});
panel.querySelector(".cp-list").addEventListener("keydown",function(e){
 var at=list.indexOf(document.activeElement), to=null;
 if(at<0)return;
 if(e.key==="ArrowDown"||e.key==="ArrowRight")to=(at+1)%list.length;
 else if(e.key==="ArrowUp"||e.key==="ArrowLeft")to=(at-1+list.length)%list.length;
 else if(e.key==="Home")to=0;
 else if(e.key==="End")to=list.length-1;
 if(to===null)return;
 e.preventDefault();pick(to+1);list[to].focus();
});
panel.addEventListener("keydown",function(e){if(e.key==="Escape")close(true)});
document.addEventListener("pointerdown",function(e){if(!panel.contains(e.target))close(false)});
addEventListener("storage",function(e){if(e.key===KEY){var n=parseInt(e.newValue,10);if(n>=1&&n<=STYLES.length)pick(n,true)}});

/* only a fine, hovering pointer gets any of this */
function apply(){
 var on=fine.matches;
 root.classList.toggle("cur-on",on);
 cur.hidden=!on;panel.hidden=!on;
 if(!on)close(false);
}
document.body.appendChild(cur);
document.body.appendChild(panel);
pick(stored(),true);
apply();
if(fine.addEventListener)fine.addEventListener("change",apply);else if(fine.addListener)fine.addListener(apply);
})();
