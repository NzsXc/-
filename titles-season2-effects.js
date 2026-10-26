/* Observe live badges only; layout coordinates remain stable during profile scale-in. */
(()=>{
 const effects=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');let raf=0,last=0;
 function visible(fx){return fx.badge.isConnected&&fx.inView&&!document.hidden&&!fx.badge.closest('[hidden]')&&fx.canvas.clientWidth>0&&fx.canvas.clientHeight>0;}
 function draw(fx){if(!fx.width||!fx.height)return;fx.context.setTransform(fx.dpr,0,0,fx.dpr,0,0);window.Season2TitleArt.draw(fx.context,fx.width,fx.height,fx.time,fx.design);}
 function fitLabel(fx){
  if(window.TitlePlateLayout){window.TitlePlateLayout.fit(fx.badge);return;}
  const {badge}=fx,label=badge.querySelector('.title-badge');if(!label||!badge.clientWidth||!badge.clientHeight)return;
  // Offset/scroll sizes are layout coordinates, unaffected by profile scale-in.
  const left=badge.querySelector('.s2-crown-medal')||badge.querySelector('.s2-left'),right=badge.querySelector('.s2-right');
  if(!left||!right)return;
  const start=left.offsetLeft+left.offsetWidth+4,end=right.offsetLeft-4,available=Math.max(1,end-start);
  label.style.removeProperty('font-size');
  // Measure unconstrained: centered overflow can extend left of scrollWidth's origin.
  label.style.maxWidth='none';label.style.transform='translateX('+((start+end-badge.clientWidth)/2)+'px)';
  const preferred=parseFloat(getComputedStyle(label).fontSize),natural=label.scrollWidth;
  const ratio=Math.min(1,available/Math.max(1,natural),badge.clientHeight*.74/Math.max(1,label.scrollHeight));
  if(ratio<1)label.style.fontSize=(Math.floor(preferred*ratio*100)/100)+'px';
  // Font hinting/fallback glyphs need not scale linearly at small sizes.
  for(let attempt=0;attempt<3&&label.scrollWidth>available;attempt++){
   const size=parseFloat(getComputedStyle(label).fontSize);
   label.style.fontSize=(Math.floor(size*Math.max(.1,(available-1)/label.scrollWidth)*100)/100)+'px';
  }
  label.style.maxWidth=available+'px';
 }
 function resize(fx){
  const width=fx.canvas.clientWidth,height=fx.canvas.clientHeight;if(!width||!height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  if(width===fx.width&&height===fx.height&&dpr===fx.dpr)return;
  fitLabel(fx);
  fx.width=width;fx.height=height;fx.dpr=dpr;fx.canvas.width=Math.round(width*dpr);fx.canvas.height=Math.round(height*dpr);draw(fx);
 }
 function dispose(fx){fx.resizeObserver.disconnect();intersection?.unobserve(fx.badge);effects.delete(fx.badge);}
 function prune(){for(const fx of effects.values())if(!fx.badge.isConnected)dispose(fx);}
 function needed(){return !reduced.matches&&Array.from(effects.values()).some(visible);}
 function schedule(){if(!raf&&needed()){last=0;raf=requestAnimationFrame(frame);}}
 function frame(now){
  raf=0;prune();if(!needed()){last=0;return;}
  if(last&&now-last<32){raf=requestAnimationFrame(frame);return;}
  const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  for(const fx of effects.values())if(visible(fx)){resize(fx);fx.time+=dt;draw(fx);}
  raf=requestAnimationFrame(frame);
 }
 const intersection=typeof IntersectionObserver==='function'?new IntersectionObserver(records=>{
  for(const record of records){const fx=effects.get(record.target);if(!fx)continue;fx.inView=record.isIntersecting;if(visible(fx)){fitLabel(fx);resize(fx);draw(fx);}}
  schedule();
 },{rootMargin:'0px'}):null;
 function attach(badge){
  if(effects.has(badge))return;const canvas=badge.querySelector('.s2-canvas'),context=canvas?.getContext('2d');if(!context)return;
  const fx={badge,canvas,context,design:badge.dataset.season2Design,width:0,height:0,dpr:1,time:0,inView:!intersection};
  fx.resizeObserver=new ResizeObserver(()=>{resize(fx);schedule();});effects.set(badge,fx);fx.resizeObserver.observe(canvas);intersection?.observe(badge);resize(fx);schedule();
 }
 function scan(node){if(node.nodeType!==1)return;if(node.matches('.season2-ribbon'))attach(node);node.querySelectorAll('.season2-ribbon').forEach(attach);}
 const mutations=new MutationObserver(records=>{prune();for(const record of records){if(record.type==='childList')record.addedNodes.forEach(scan);if(record.type==='attributes'&&effects.has(record.target))fitLabel(effects.get(record.target));}schedule();});
 mutations.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','style']});
 document.querySelectorAll('.season2-ribbon').forEach(attach);
 function refresh(){prune();for(const fx of effects.values())if(visible(fx)){fitLabel(fx);resize(fx);draw(fx);}if(raf&&!needed()){cancelAnimationFrame(raf);raf=0;last=0;}schedule();}
 document.fonts?.ready.then(refresh);document.fonts?.addEventListener('loadingdone',refresh);
 reduced.addEventListener('change',refresh);document.addEventListener('visibilitychange',refresh);window.addEventListener('resize',refresh);window.addEventListener('pageshow',refresh);
 window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0;last=0;});
})();
