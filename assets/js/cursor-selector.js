/* Custom cursors: twenty-five styles, picked from the panel on the right and
   remembered between visits (and between tabs), so HOME and STORY share one.
   Mouse and trackpad only -- touch devices keep their native behaviour and
   never see the panel. The cursor is its own fixed layer and never moves page
   elements, so the Motion entrance and the scroll choreography are untouched.
   Looks live in assets/css/cursor-selector.css; this file positions parts,
   runs the per-frame effects and sets state classes. */
(function(){
"use strict";

// dot / ring / label / trail: how much of the way to its target each part
// closes per 60fps frame (1 = pinned to the pointer). mag: the ring wraps what
// it is over. fx: a per-frame or per-event behaviour of that style alone.
var STYLES=[
 {name:"Minimal Circle",dot:.35},
 {name:"Solid Dot",dot:1},
 {name:"Outline Circle",ring:.18},
 {name:"Crosshair",dot:1},
 {name:"Magnetic Follow",dot:1,ring:.16,mag:true},
 {name:"Expanding Hover",dot:1,ring:.22},
 {name:"Inverted Colour",dot:.3},
 {name:"Soft Blur",dot:1,ring:.14},
 {name:"Ring with Dot",dot:1,ring:.15},
 {name:"Minimal Arrow",dot:1},
 {name:"Text Follow",dot:1,label:.14},
 {name:"Trailing Cursor",dot:1,trail:.38},
 {name:"Rotating Ring",dot:1,ring:.2},
 {name:"Plus Symbol",dot:.5},
 {name:"Premium Interactive",dot:1,ring:.16,label:.16},
 {name:"Triangle Glow",dot:.45,fx:"orient"},
 {name:"Diamond",dot:1,ring:.2},
 {name:"Curve Trail",dot:1,fx:"curve"},
 {name:"Ripple Effect",dot:1,ring:.25,fx:"ripple"},
 {name:"Leaf Cursor",dot:.3,fx:"sway"},
 {name:"Sparkle",dot:.6,fx:"sparkle"},
 {name:"Progress Ring",dot:1,ring:.22},
 {name:"Double Arrow",dot:1},
 {name:"Pixel Style",dot:1,fx:"pixel"},
 {name:"Dotted Circle",dot:1,ring:.18,fx:"squash"}
];
var KEY="create-cursor", FALLBACK=15, TRAIL=6, CURVE=26, MAX_FX=16;
var INTERACTIVE='a[href],button,[role="button"],[role="radio"],label,select,summary,[tabindex]:not([tabindex="-1"])';
var TEXT='input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),textarea,[contenteditable=""],[contenteditable="true"]';
var RING_SVG='<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="trk" cx="22" cy="22" r="19"/><circle class="bar" cx="22" cy="22" r="19"/></svg>';

var root=document.documentElement;
var fine=matchMedia("(hover: hover) and (pointer: fine)");
var still=matchMedia("(prefers-reduced-motion: reduce)");

function stored(){try{var n=parseInt(localStorage.getItem(KEY),10);if(n>=1&&n<=STYLES.length)return n}catch(e){}return FALLBACK}
function store(n){try{localStorage.setItem(KEY,String(n))}catch(e){}}
function two(n){return (n<10?"0":"")+n}
function mini(n){
 var t="";for(var i=1;i<=3;i++)t+='<i class="c-trail" style="--i:'+i+'"></i>';
 return '<span class="cur-mini" data-v="'+n+'" aria-hidden="true"><span class="cur-p">'+t+
  '<i class="c-ring">'+RING_SVG+'</i><i class="c-dot"></i><i class="c-label"></i></span></span>';
}

/* ── the cursor layer ── */
var cur=document.createElement("div");
cur.className="cur";
cur.setAttribute("aria-hidden","true");
var markup='<svg class="c-curve"><path/></svg><span class="c-fx"></span>';
for(var i=0;i<TRAIL;i++)markup+='<span class="cur-p"><i class="c-trail" style="--i:'+i+'"></i></span>';
cur.innerHTML=markup+'<span class="cur-p"><i class="c-ring">'+RING_SVG+'</i></span><span class="cur-p"><i class="c-dot"></i></span><span class="cur-p"><i class="c-label">Explore</i></span>';
var wraps=cur.querySelectorAll(".cur-p");
var trailEls=[].slice.call(wraps,0,TRAIL), ringEl=wraps[TRAIL], dotEl=wraps[TRAIL+1], labelEl=wraps[TRAIL+2];
var ringShape=ringEl.firstChild, dotShape=dotEl.firstChild, labelText=labelEl.firstChild;
var curvePath=cur.querySelector(".c-curve path"), fxLayer=cur.querySelector(".c-fx");

function pt(){return {x:-200,y:-200}}
var P=pt(), PP=pt(), D=pt(), R=pt(), L=pt(), V={x:0,y:0}, T=[], H=[];
for(i=0;i<TRAIL;i++)T.push(pt());
var style=STYLES[FALLBACK-1], hit=null, enabled=false, live=false, raf=0, last=0, recheck=false;
var angle=0, squash=1, travel=0, scrollWait=0;

function snap(){[D,R,L,PP].concat(T).forEach(function(o){o.x=P.x;o.y=P.y});V.x=V.y=0;H.length=0}
// frame-rate independent: the same feel at 60Hz and 144Hz
function k(f,dt){return !f||f>=1||still.matches?1:1-Math.pow(1-f,dt/16.667)}
function chase(a,b,f){a.x+=(b.x-a.x)*f;a.y+=(b.y-a.y)*f;return Math.abs(b.x-a.x)+Math.abs(b.y-a.y)}
function put(el,o,grid){
 var x=grid?Math.round(o.x/4)*4:o.x, y=grid?Math.round(o.y/4)*4:o.y;
 el.style.transform="translate3d("+x.toFixed(1)+"px,"+y.toFixed(1)+"px,0)";
}

/* short-lived marks (ripples, sparkles) stay where they were made and remove
   themselves when their animation ends */
function spawn(cls,at,scatter){
 if(still.matches||fxLayer.childElementCount>=MAX_FX)return;
 var el=document.createElement("i"), x=at.x, y=at.y;
 el.className=cls;
 if(scatter){
  x+=(Math.random()-.5)*16;y+=(Math.random()-.5)*16;
  el.style.setProperty("--s",(.5+Math.random()*.7).toFixed(2));
  el.style.setProperty("--rot",(Math.random()*90|0)+"deg");
 }
 el.style.left=x.toFixed(1)+"px";el.style.top=y.toFixed(1)+"px";
 el.addEventListener("animationend",function(){el.remove()},{once:true});
 fxLayer.appendChild(el);
}
function clearFx(){fxLayer.textContent="";curvePath.removeAttribute("d")}

// the per-frame part of the styles that have one; returns how far from rest
function effects(dt,speed){
 var fx=style.fx, d, to;
 if(fx==="orient"){                                   // point along the travel
  if(speed<1.2)return 0;
  to=Math.atan2(V.y,V.x)*180/Math.PI;
  d=((to-angle)%360+540)%360-180;                     // the short way round
  angle+=d*k(.3,dt);
  dotShape.style.setProperty("--r",angle.toFixed(1)+"deg");
  return Math.abs(d)>.5?1:0;
 }
 if(fx==="sway"){                                     // swing with sideways speed
  to=Math.max(-38,Math.min(38,V.x*2.4))+(hit&&hit.kind!=="text"?-45:0);
  d=to-angle;angle+=d*k(.12,dt);
  dotShape.style.setProperty("--r",angle.toFixed(1)+"deg");
  return Math.abs(d);
 }
 if(fx==="squash"){                                   // dots pull in with speed
  to=1-Math.min(speed/50,.32);
  d=to-squash;squash+=d*k(.2,dt);
  ringShape.style.setProperty("--k",squash.toFixed(3));
  return Math.abs(d)*10;
 }
 if(fx==="curve"){
  H.unshift({x:D.x,y:D.y});if(H.length>CURVE)H.length=CURVE;
  var s="M"+H[0].x.toFixed(1)+" "+H[0].y.toFixed(1);
  for(var j=1;j<H.length-1;j++){
   s+="Q"+H[j].x.toFixed(1)+" "+H[j].y.toFixed(1)+" "+((H[j].x+H[j+1].x)/2).toFixed(1)+" "+((H[j].y+H[j+1].y)/2).toFixed(1);
  }
  curvePath.setAttribute("d",s);
  var tail=H[H.length-1];
  return Math.abs(tail.x-H[0].x)+Math.abs(tail.y-H[0].y);
 }
 if(fx==="sparkle"){
  travel+=speed*dt/16.667;
  if(travel>26){travel=0;spawn("c-spark",D,true)}
 }
 return 0;
}

function frame(now){
 raf=0;
 if(!enabled)return;
 var dt=last?Math.min(64,now-last):16.667;last=now;
 // scrolling slides the page under a still pointer, so ask again what it is over
 if(recheck){recheck=false;classify(document.elementFromPoint(P.x,P.y))}
 var per=16.667/dt, ev=k(.25,dt);
 V.x+=((P.x-PP.x)*per-V.x)*ev;V.y+=((P.y-PP.y)*per-V.y)*ev;
 PP.x=P.x;PP.y=P.y;
 var speed=Math.sqrt(V.x*V.x+V.y*V.y);
 var rest=chase(D,P,k(style.dot,dt))+speed;
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
 if(style.fx)rest+=effects(dt,speed);
 put(dotEl,D,style.fx==="pixel");put(ringEl,R);put(labelEl,L);
 if(rest>.2){if(!raf)raf=requestAnimationFrame(frame)}else last=0;
}
function kick(){if(enabled&&!raf)raf=requestAnimationFrame(frame)}

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
  if(style.fx==="ripple"&&live)spawn("c-ripple is-soft",P);
 }
 kick();
}

function mouse(e){return enabled&&(e.pointerType==="mouse"||e.pointerType==="pen")}
function onMove(e){
 if(!mouse(e))return;
 P.x=e.clientX;P.y=e.clientY;
 if(!live){live=true;snap();cur.classList.add("is-live")}
 cur.classList.remove("is-gone");
 kick();
}
function onOver(e){if(mouse(e))classify(e.target)}
function onDown(e){
 if(!mouse(e))return;
 cur.classList.add("is-down");
 if(style.fx==="ripple")spawn("c-ripple",P);
}
function onUp(){cur.classList.remove("is-down")}
function onBlur(){cur.classList.remove("is-down");cur.classList.add("is-gone")}
function onOut(e){if(!e.relatedTarget)cur.classList.add("is-gone")}
function onScroll(){
 var max=root.scrollHeight-innerHeight;
 cur.style.setProperty("--p",max>0?Math.min(1,scrollY/max).toFixed(3):"0");
 cur.classList.add("is-scrolling");
 clearTimeout(scrollWait);
 scrollWait=setTimeout(function(){cur.classList.remove("is-scrolling")},220);
 if(live){recheck=true;kick()}
}
var LISTEN=[[window,"pointermove",onMove],[window,"pointerover",onOver],[window,"pointerdown",onDown],[window,"pointerup",onUp],
 [window,"blur",onBlur],[document,"mouseout",onOut],[window,"scroll",onScroll]];

/* ── the panel ── */
var panel=document.createElement("div");
panel.className="cp";
var items=STYLES.map(function(s,n){
 n++;
 return '<button type="button" class="cp-item" role="radio" aria-checked="false" tabindex="-1" data-cursor="'+n+'" aria-label="Cursor '+two(n)+', '+s.name+'">'+
  mini(n)+'<span class="cp-n">'+two(n)+'</span><span class="cp-name">'+s.name+'</span></button>';
}).join("");
panel.innerHTML=
 '<button type="button" class="cp-toggle" aria-expanded="false" aria-controls="cp-box" aria-label="Cursor styles"><span class="cp-pv"></span><span class="cp-num"></span></button>'+
 '<div class="cp-box" id="cp-box" hidden><div class="cp-head"><span>Cursor <b>'+STYLES.length+'</b></span>'+
 '<button type="button" class="cp-close" aria-label="Close cursor styles"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.3"/></svg></button></div>'+
 '<div class="cp-list" role="radiogroup" aria-label="Cursor style">'+items+'</div></div>';
var toggle=panel.querySelector(".cp-toggle"), box=panel.querySelector(".cp-box"), list=[].slice.call(panel.querySelectorAll(".cp-item"));

function current(){return panel.querySelector('[aria-checked="true"]')}
function open(focus){
 toggle.hidden=true;box.hidden=false;toggle.setAttribute("aria-expanded","true");
 current().scrollIntoView({block:"nearest"});
 if(focus)current().focus();
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
 // per-frame values belong to the old style
 angle=0;squash=1;travel=0;
 dotShape.style.removeProperty("--r");ringShape.style.removeProperty("--k");
 clearFx();
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
function outside(e){if(!panel.contains(e.target))close(false)}
function synced(e){if(e.key===KEY){var n=parseInt(e.newValue,10);if(n>=1&&n<=STYLES.length)pick(n,true)}}
LISTEN.push([document,"pointerdown",outside],[window,"storage",synced]);

/* only a fine, hovering pointer gets any of this; switching away (a tablet
   losing its mouse, say) removes the listeners and stops the loop */
function apply(){
 var on=fine.matches;
 if(on===enabled)return;
 enabled=on;
 root.classList.toggle("cur-on",on);
 cur.hidden=!on;panel.hidden=!on;
 LISTEN.forEach(function(l){l[0][on?"addEventListener":"removeEventListener"](l[1],l[2],{passive:true})});
 if(!on){
  close(false);
  if(raf)cancelAnimationFrame(raf);
  raf=0;last=0;live=false;hit=null;clearFx();
  cur.classList.remove("is-live","is-hover","is-mag","is-media","is-text","is-down","on-accent");
 }
}
document.body.appendChild(cur);
document.body.appendChild(panel);
pick(stored(),true);
apply();
onScroll();
if(fine.addEventListener)fine.addEventListener("change",apply);else if(fine.addListener)fine.addListener(apply);
})();
