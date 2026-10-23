(function(){
"use strict";

var esc=function(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")};

/* ───────────────────────────────────────────── hero headline ────────── */
var h1=document.getElementById("heroH1");
var heroLines=["Digital experiences that","connect, scale and perform."];
var wordCount=heroLines.join(" ").split(" ").length, wordAt=0;
h1.innerHTML=heroLines.map(function(line){
 return line.split(" ").map(function(w){
  var i=wordAt++;
  var t=i===wordCount-1?esc(w.replace(/\.$/,""))+'<span class="accent">.</span>':esc(w);
  return '<span class="word" data-d="'+(200+i*40)+'"><span>'+t+'&nbsp;</span></span>';
 }).join("");
}).join("<br>");


/* clock */
function tick(){
 try{
  var f=new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true,timeZone:"America/Los_Angeles"});
  var t=f.format(new Date());
  var a=document.getElementById("clock"),b=document.getElementById("clock2");
  if(a)a.textContent=t; if(b)b.textContent=t;
 }catch(e){}
}
tick();setInterval(tick,1000);

/* hero entrance (page 1), driven by Motion. Travel and timing are measured
   off the reference: rows and markers slide at t=0 while the backdrop settles
   from 1.3, the header drops in at ~0.45s, then the headline, clock, stat and
   button labels land on their own delays. Easing comes from the CSS tokens,
   so the curves stay in one place. Driven off DOM-ready rather than
   window.load: the hero backdrop is a large jpg and gating the entrance on it
   left the fold blank. */
(function(){
 var root=document.documentElement, M=window.Motion;
 if(!root.classList.contains("js-motion"))return;
 if(!M){root.classList.remove("js-motion");return}
 root.classList.add("motion-ready");

 var css=getComputedStyle(root);
 // cubic-bezier() tokens become arrays; sampled linear() springs become a
 // piecewise-linear easing function
 function ease(name){
  var v=css.getPropertyValue(name).trim(), n=(v.match(/-?\d*\.?\d+/g)||[]).map(Number);
  if(v.indexOf("cubic-bezier")===0&&n.length===4)return n;
  if(v.indexOf("linear")===0&&n.length>1){
   var k=n.length-1;
   return function(t){var x=t*k,i=Math.floor(x);return i>=k?n[k]:n[i]+(n[i+1]-n[i])*(x-i)};
  }
  return "easeOut";
 }
 function go(sel,keyframes,opts){
  var els=document.querySelectorAll(sel);
  if(els.length)M.animate(els,keyframes,opts);
 }

 /* Scramble-in, in the shape of GSAP's ScrambleText: random characters cycle
    in place, then lock to the real text from the left once revealDelay has
    passed. Written longhand because the site ships no third-party animation
    library and has to run with no network. Spaces never scramble, so the word
    shape holds still while the letters resolve. */
 function scrambleText(el,o){
  o=o||{};
  var text=el.textContent,
      chars=o.chars||"ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      dur=(o.duration||1)*1000,
      revealAt=(o.revealDelay||0)*1000,
      reroll=30/(o.speed||1),
      t0=performance.now(), lastRoll=0, noise=[];
  (function frame(now){
   var t=now-t0,
       p=Math.min(1,Math.max(0,(t-revealAt)/Math.max(1,dur-revealAt))),
       locked=Math.floor(p*text.length),
       roll=(now-lastRoll)>=reroll;
   if(roll)lastRoll=now;
   var out="";
   for(var i=0;i<text.length;i++){
    var c=text.charAt(i);
    if(i<locked||c===" "){out+=c;continue}
    if(roll||noise[i]===undefined)noise[i]=chars.charAt(Math.random()*chars.length|0);
    out+=noise[i];
   }
   el.textContent=out;
   if(t<dur)requestAnimationFrame(frame); else el.textContent=text;
  })(t0);
 }

 /* Responsive line split, in the shape of SplitText's autoSplit: the caption is
    broken into the lines it actually wraps to at the current width, measured
    from where each word lands, and re-split whenever the width changes where
    those breaks fall. Words stay plain text inside the spans, so a screen
    reader still reads one sentence. */
 function splitLines(el){
  var text=el.getAttribute("data-text");
  if(text==null){text=el.textContent.replace(/\s+/g," ").trim();el.setAttribute("data-text",text)}
  el.innerHTML=text.split(" ").map(function(w){return '<span class="sl-w">'+esc(w)+'</span>'}).join(" ");
  var lines=[],top=null;
  Array.prototype.forEach.call(el.querySelectorAll(".sl-w"),function(w){
   if(top===null||Math.abs(w.offsetTop-top)>2){lines.push([]);top=w.offsetTop}
   lines[lines.length-1].push(w.textContent);
  });
  el.innerHTML=lines.map(function(l){
   return '<span class="sl-line"><span class="sl-in">'+esc(l.join(" "))+'</span></span>';
  }).join("");
 }
 var splitEls=document.querySelectorAll(".hero .split-lines");
 Array.prototype.forEach.call(splitEls,splitLines);
 var lastW=window.innerWidth, splitWait;
 window.addEventListener("resize",function(){
  clearTimeout(splitWait);
  splitWait=setTimeout(function(){
   if(window.innerWidth===lastW)return;
   lastW=window.innerWidth;
   Array.prototype.forEach.call(splitEls,splitLines);     // re-split, at rest
   Array.prototype.forEach.call(document.querySelectorAll(".hero .sl-in"),function(n){n.style.transform="none"});
  },150);
 });

 /* The entrance, measured frame by frame on the reference
    (createstudio.framer.media, 1440x900, two loads agreeing to ~0.1s) and
    timed from the moment its photo starts to show. One composition in two
    beats: the photo swells in with the frame around it, then settles back as
    the type rises into it.
      0      photo  opacity in over .8s, up 40px, scale 1.44 -> 1.11
      .29    nav bar down 48px, 1s          .39  clock up 40px, .45s
      .79    10+, caption and logos up 80px, .9s; button labels up 70px, .52s
      2.4    photo scale 1.11 -> 1, 1.2s (a gentler, cubic ease-out)
      2.63   // 00.0x labels up 80px, .95s   2.86 Create\Studio up 80px
             inside its mask, .9s            3.05 headline up 20px, .6s
      3.68   showreel card up 66px, .85s
    Everything but the headline runs on the reference's steep ease-out (half
    the travel in the first tenth); the photo swell starts gently and the
    headline, which arrives word by word there, eases in and out. */
 function countUp(el){
  var to=parseFloat(el.dataset.to)||0,dur=parseFloat(el.dataset.dur)||600,sfx=el.dataset.suffix||"",t0=performance.now();
  (function step(t){var p=Math.min(1,(t-t0)/dur);el.textContent=Math.round(to*(1-Math.pow(1-p,4)))+sfx;if(p<1)requestAnimationFrame(step)})(t0);
 }
 var OUT=[.16,1,.3,1], SWELL=[.4,0,.2,1];
 function photoIn(){
  go(".hero-media",{opacity:[.001,1],y:[40,0]},{duration:.8,ease:SWELL});
  go(".hero-lqip",{y:[40,0]},{duration:.8,ease:SWELL});
  go(".hero-media,.hero-lqip",{scale:[1.44,1.11,1.11,1]},{duration:3.6,times:[0,.222,.667,1],ease:[SWELL,"linear",[.33,1,.68,1]]});
  // the hero clip waits for the swell to settle before it fades in
  setTimeout(function(){window.__heroIntro=true;document.dispatchEvent(new Event("hero:intro"))},3600);
 }
 function play(photoLate){
  if(!photoLate)photoIn();

  go(".hdr-logo,.hdr .nav,.hdr-right>a",{opacity:[.001,1],y:[-48,0]},{duration:1,delay:.29,ease:OUT});
  go(".hx-fade6",{opacity:[.001,1]},{duration:1,delay:.29,ease:OUT});

  go(".hx-time",{opacity:[.001,1],y:[40,0]},{duration:.45,delay:.39,ease:OUT});
  go(".hx-time .hair",{opacity:[1,.7]},{duration:.45,delay:.39,ease:OUT});
  // the studio lines decode in place beside the clock
  go(".hx-fade",{opacity:[.001,1]},{duration:.4,delay:.39,ease:OUT});
  document.querySelectorAll(".hero .hx-fade").forEach(function(el){
   setTimeout(function(){scrambleText(el,{duration:1,revealDelay:.25,speed:.35});},390);
  });

  go(".hx-pop,.hx-lift",{opacity:[.001,1],y:[80,0]},{duration:.9,delay:.79,ease:OUT});
  document.querySelectorAll(".hero .count").forEach(function(el){setTimeout(function(){countUp(el)},790)});
  go(".hero .btn",{opacity:[.001,1]},{duration:.3,delay:.79,ease:OUT});
  document.querySelectorAll(".hero .lmask").forEach(function(m){
   M.animate(m.firstElementChild,{y:[70,0]},{duration:.52,delay:.79,ease:OUT});
  });

  go(".hx-mark",{opacity:[.001,1],y:[80,0]},{duration:.95,delay:2.63,ease:OUT});
  go(".hero-mark-text",{opacity:[.001,1],y:[80,0]},{duration:.9,delay:2.86,ease:OUT});
  go("#heroH1",{opacity:[.001,1],y:[20,0]},{duration:.6,delay:3.05,ease:[.45,0,.55,1]});
  go(".hero-card",{opacity:[.001,1],y:[66,0]},{duration:.85,delay:3.68,ease:OUT});
 }
 // The whole composition starts from the photo, so wait until it is decoded:
 // starting earlier played the type over an empty black hero while the 1.8MB
 // photo was still painting in, strip by strip, seconds later. If the photo is
 // very slow the type goes ahead after 4s, and the photo, kept invisible while it
 // downloads, swells in by itself the moment it is ready.
 function arm(){
  var img=document.querySelector(".hero-poster"), done=false, late=false;
  function ready(){
   if(!done){done=true;requestAnimationFrame(function(){requestAnimationFrame(function(){play(false)})});return}
   if(late){late=false;requestAnimationFrame(photoIn)}
  }
  function timeout(){if(done)return;done=true;late=true;play(true)}
  if(img&&!(img.complete&&img.naturalWidth)&&img.decode){
   img.decode().then(ready,ready);
   setTimeout(timeout,4000);
  }else ready();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",arm);
 else arm();

 // Scroll-away, measured on the reference (createstudio.framer.media) at
 // 1440 and 390 wide by sampling every element's position against scrollY.
 // The hero is not pinned and nothing fades or scales: the photo scrolls with
 // the page (1.0x) and each block moves at its own constant rate, linear in
 // scrollY, rising out of a mask at the slot it started in, so it leaves
 // from its top edge down (the wordmark's top, then the showreel head, then
 // the first line of the studio copy...). Rates, as screen speed / page speed:
 //   side labels 0.9 (they drop out through the bottom of their masks)
 //   buttons 1.2, studio copy 1.3, headline and clock 1.4, showreel 1.5,
 //   10+ corner 1.6, its logos and the wordmark 1.7, "let's create" 1.8
 // The offset is read straight off scrollY every frame, with no smoothing, so
 // it stops the instant scrolling stops and reverses exactly on the way up.
 // Only `translate` and `clip-path` are touched, which the load entrance
 // never animates, and at scrollY 0 both are cleared.
 var hero=document.querySelector(".hero");
 if(!hero)return;
 function q(sel){return [].slice.call(hero.querySelectorAll(sel))}
 var info=hero.querySelector(".hero-info");
 var layers=[];
 function add(els,k,mask){els.forEach(function(el){if(el)layers.push({el:el,k:k,mask:mask})})}
 add(q(".rail"),-.1,true);
 add([hero.querySelector(".hero-h1")],.4,true);
 add([hero.querySelector(".hero-stat")],.6,true);
 add([hero.querySelector(".hero-logos")],.1,false);          // on top of the corner's .6
 add([hero.querySelector(".hero-mark-text")],.7,false);      // already inside its own mask
 add(info?[info.children[0]]:[],.3,true);                    // the two lines of studio copy
 add([hero.querySelector(".hx-time")],.4,true);
 add(info?q(".hero-info>.flex"):[],.2,true);                 // See work / Let's chat
 add([hero.querySelector(".hero-card")],.5,true);
 var create=hero.querySelector(".hero-create"), raf=0, drawn=-1;

 function draw(){
  raf=0;
  // past twice the hero's height it is long gone, so hold the final state
  var y=Math.min(Math.max(0,scrollY),hero.offsetHeight*2);
  if(y===drawn)return;
  drawn=y;
  layers.forEach(function(l){
   var d=l.k*y;                                                 // how far it has moved up past its slot
   l.el.style.translate=d?"0 "+(-d).toFixed(1)+"px":"";
   // the mask stays where the block started: clip what has risen above it
   // (or, moving slower than the page, what has sunk below it)
   l.el.style.clipPath=l.mask&&d?(d>0?"inset("+d.toFixed(1)+"px -100vw -100vh -100vw)":"inset(-100vh -100vw "+(-d).toFixed(1)+"px -100vw)"):"";
  });
  if(create)create.style.translate="-50% "+(-.8*y).toFixed(1)+"px";
 }
 addEventListener("scroll",function(){if(!raf)raf=requestAnimationFrame(draw)},{passive:true});
 addEventListener("resize",function(){drawn=-1;draw()});
 draw();
})();

/* Hero footage. The poster carries the hero while the page loads. The clip
   starts downloading once the page has finished loading, plays once enough of
   it is buffered to run without stalling and the poster's entrance swell has
   settled, and fades in over the poster after a real frame has been
   presented. A slow, failed, refused (autoplay) or reduced-motion clip simply
   leaves the poster up. */
(function(){
 var v=document.querySelector(".hero-vid"), root=document.documentElement;
 if(!v||!v.dataset.src)return;
 var mq=matchMedia("(prefers-reduced-motion: reduce)"), started=false, retry=false, buffered=false, intro=false;
 function settle(){if(window.__heroSettled)return;window.__heroSettled=true;document.dispatchEvent(new Event("hero:settled"))}
 function show(){if(!mq.matches)v.classList.add("on");settle()}
 function tryPlay(){if(mq.matches||!buffered||!intro)return;var t=v.play();if(t&&t.catch)t.catch(blocked)}
 // autoplay refused: keep the poster, and try again on the first interaction
 function blocked(){
  settle();if(retry)return;retry=true;
  function again(){["pointerdown","keydown","touchstart"].forEach(function(e){removeEventListener(e,again)});tryPlay()}
  ["pointerdown","keydown","touchstart"].forEach(function(e){addEventListener(e,again,{passive:true})});
 }
 function ready(){if(buffered)return;buffered=true;tryPlay()}
 function introDone(){if(intro)return;intro=true;tryPlay()}
 function load(){
  if(started||mq.matches)return;started=true;
  v.addEventListener("canplaythrough",ready,{once:true});
  // Some browsers never call a clip playable through. Starting on a timer
  // instead stalled the loop every few seconds over slow connections, so the
  // fallback is the whole clip having arrived.
  v.addEventListener("progress",function(){
   var b=v.buffered;if(b.length&&v.duration&&b.end(b.length-1)>=v.duration-.1)ready();
  });
  v.src=v.dataset.src;v.removeAttribute("data-src");v.preload="auto";v.load();
 }
 v.addEventListener("playing",function(){
  if(v.requestVideoFrameCallback)v.requestVideoFrameCallback(show);
  else requestAnimationFrame(function(){requestAnimationFrame(show)});
 });
 v.addEventListener("error",function(){v.classList.remove("on");settle()});
 function motion(){if(mq.matches){v.pause();v.classList.remove("on")}else if(started)tryPlay();else load()}
 if(mq.addEventListener)mq.addEventListener("change",motion);else if(mq.addListener)mq.addListener(motion);
 if(mq.matches||(navigator.connection&&navigator.connection.saveData)){settle();return}
 if(!root.classList.contains("motion-ready")||window.__heroIntro)introDone();
 else{document.addEventListener("hero:intro",introDone,{once:true});setTimeout(introDone,8000)}
 if(document.readyState==="complete")load();else addEventListener("load",load,{once:true});
})();

/* The showreel footage waits for the hero clip, so the two are not
   splitting the connection while the hero is still coming in. */
(function(){
 var v=document.querySelector(".reel video[data-src]");
 if(!v)return;
 function load(){if(!v.dataset.src)return;v.src=v.dataset.src;v.removeAttribute("data-src");v.preload="auto";
  var t=v.play();if(t&&t.catch)t.catch(function(){})}
 if(window.__heroSettled||!document.querySelector(".hero-vid"))load();
 else{document.addEventListener("hero:settled",load,{once:true});setTimeout(load,20000)}
})();


/* counters */
var cio=new IntersectionObserver(function(es){
 es.forEach(function(e){
  if(!e.isIntersecting)return; cio.unobserve(e.target);
  var el=e.target,to=parseFloat(el.dataset.to)||0,dec=parseInt(el.dataset.dec||"0",10),sfx=el.dataset.suffix||"";
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){el.textContent=to.toFixed(dec)+sfx;return}
  var dur=parseFloat(el.dataset.dur)||1900, wait=parseFloat(el.dataset.delay)||0;
  setTimeout(function(){
   var t0=performance.now();
   (function step(t){
    var p=Math.min(1,(t-t0)/dur),v=to*(1-Math.pow(1-p,4));
    el.textContent=v.toFixed(dec)+sfx;
    if(p<1)requestAnimationFrame(step);
   })(t0);
  },wait);
 });
},{threshold:.4});
document.querySelectorAll(".count").forEach(function(el){
 // the hero's counter is part of the entrance timeline when that runs
 if(el.closest(".hero")&&document.documentElement.classList.contains("motion-ready"))return;
 cio.observe(el);
});

/* story section (page 2), measured on the reference at 1440x900 and
   1920x1080. It is built there as four full-screen layers stacked one stage
   height apart in a 4.3-stage track; each holds one phrase in its own row and
   sticks when it reaches the top. So each phrase rides up from below with its
   layer while shrinking into its row, and once it has landed it settles back
   while the next one arrives. Nothing fades; all four end on screen together.
   With s = scroll into the section and V = the stage height, per phrase:
     arrive  s (i-1)V..iV   rises from V below, scale 3 / 4 / 4 / 2 -> 1
     settle  listen   V..2V      scale 1 -> .8, down .26 of a row (50 of 192px)
             imagine  2V..3V     scale 1 -> .8, up .16 of a row (30px)
             create   3V..3.3V   scale 1 -> .8, up .52 of a row (100px)
     leave   past 3.3V the stage lets go; "beautiful things" also drifts up
             .186px per px and grows .065 per stage as it goes
   All linear in scroll, scaled about each row's centre, read straight off
   scrollY each frame: it stops when scrolling stops and reverses exactly. */
(function(){
 var section=document.getElementById("story-section");
 var lines=section?section.querySelectorAll(".story-line"):[];
 var M=window.Motion;
 // without js-motion (reduced motion, or no library) the phrases stay stacked
 if(!section||lines.length!==4||!M||!document.documentElement.classList.contains("js-motion"))return;
 var stage=section.querySelector(".story-sticky");

 var FROM=[3,4,4,2];                                          // arrival scale
 var SETTLE=[[1,2,.2604],[2,3,-.15625],[3,3.3,-.5208]];      // [from V, to V, move in rows]
 function clamp(v){return v<0?0:v>1?1:v}
 var raf=0;
 function draw(){
  raf=0;
  var V=stage.offsetHeight||innerHeight, s=-section.getBoundingClientRect().top;
  if(s<-V*1.2||s>section.offsetHeight+V)return;              // nowhere near: leave it
  for(var i=0;i<4;i++){
   var line=lines[i], R=line.offsetHeight;
   var arrive=clamp((s-(i-1)*V)/V);
   var sc=FROM[i]+(1-FROM[i])*arrive;
   var y=i?Math.max(0,i*V-s):0;                              // its layer still rising
   if(i<3){
    var st=SETTLE[i], t=clamp((s-st[0]*V)/((st[1]-st[0])*V));
    sc*=1-.2*t; y+=st[2]*R*t;
   }else{
    var out=Math.max(0,s-3.3*V);
    y-=.186*out; sc*=1+.065*out/V;
   }
   line.style.transform="translate3d(0,"+y.toFixed(2)+"px,0) scale("+sc.toFixed(4)+")";
  }
 }
 function ask(){if(!raf)raf=requestAnimationFrame(draw)}
 addEventListener("scroll",ask,{passive:true});
 addEventListener("resize",ask);
 draw();

 var track={target:section,offset:["start start","end end"]};
 // unchanged water drift across the pinned stretch
 var water=section.querySelector(".story-water");
 if(water)M.scroll(function(p){
  water.style.transform="translate3d(0,"+((0.5-p)*300).toFixed(2)+"px,0)";
 },track);
})();

/* page 2 footage: the water poster holds the section until it comes near, so
   the clip never shares the connection with the hero's; it then plays only
   while the section is on screen */
(function(){
 var clips=document.querySelectorAll(".story-water video");
 if(!clips.length)return;
 var section=document.getElementById("story-section");
 if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 /* the back layer is the same clip mirrored, so hold it half a loop behind:
    in sync the two copies read as one symmetrical frame, not as depth */
 var back=clips[1];
 if(back)back.addEventListener("loadedmetadata",function(){
  if(back.duration)back.currentTime=back.duration/2;
 },{once:true});
 function load(){clips.forEach(function(v){if(v.dataset.src){v.src=v.dataset.src;v.removeAttribute("data-src");v.preload="auto"}})}
 // fetched once the hero clip has settled, or sooner if the visitor gets here first
 if(window.__heroSettled)load();else document.addEventListener("hero:settled",load,{once:true});
 new IntersectionObserver(function(es){
  es.forEach(function(e){
   if(e.isIntersecting)load();
   clips.forEach(function(v){
    if(e.isIntersecting){var t=v.play();if(t&&t.catch)t.catch(function(){})}
    else v.pause();
   });
  });
 }).observe(section);
})();


/* header hide on scroll-down */
var hdr=document.getElementById("hdr"),last=window.scrollY,heroEl=document.querySelector(".hero");
function overHero(){hdr.classList.toggle("over-hero",!!heroEl&&window.scrollY<heroEl.offsetHeight-hdr.offsetHeight)}
window.addEventListener("scroll",function(){
 var y=window.scrollY;
 hdr.classList.toggle("hide", y>260 && y>last);
 overHero();
 last=y;
},{passive:true});
window.addEventListener("resize",overHero);
overHero();

/* showreel: hold on the poster frame when the viewer asks for reduced motion */
(function(){
 var vids=document.querySelectorAll(".reel video,.foot-vid"); if(!vids.length)return;
 var mq=window.matchMedia("(prefers-reduced-motion: reduce)");
 function apply(){
  Array.prototype.forEach.call(vids,function(v){
   if(mq.matches){v.removeAttribute("autoplay");v.pause();v.currentTime=0;}
   else v.play().catch(function(){});
  });
 }
 apply();
 if(mq.addEventListener)mq.addEventListener("change",apply);else if(mq.addListener)mq.addListener(apply);
})();
})();
