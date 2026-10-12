/* Observe live badges only; layout coordinates remain stable during profile scale-in. */
(()=>{
 const effects=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');let raf=0,last=0;
 function visible(fx){return fx.badge.isConnected&&fx.inView&&!document.hidden&&!fx.badge.closest('[hidden]')&&fx.canvas.clientWidth>0&&fx.canvas.clientHeight>0;}
 function draw(fx){if(!fx.width||!fx.height)return;fx.context.setTransform(fx.dpr,0,0,fx.dpr,0,0);window.Season2TitleArt.draw(fx.context,fx.width,fx.height,fx.time,fx.design);}
 function resize(fx){
  const width=fx.canvas.clientWidth,height=fx.canvas.clientHeight;if(!width||!height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  if(width===fx.width&&height===fx.height&&dpr===fx.dpr)return;
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
  for(const record of records){const fx=effects.get(record.target);if(!fx)continue;fx.inView=record.isIntersecting;if(visible(fx)){resize(fx);draw(fx);}}
  schedule();
 },{rootMargin:'0px'}):null;
 function attach(badge){
  if(effects.has(badge))return;const canvas=badge.querySelector('.s2-canvas'),context=canvas?.getContext('2d');if(!context)return;
  const fx={badge,canvas,context,design:badge.dataset.season2Design,width:0,height:0,dpr:1,time:0,inView:!intersection};
  fx.resizeObserver=new ResizeObserver(()=>{resize(fx);schedule();});effects.set(badge,fx);fx.resizeObserver.observe(canvas);intersection?.observe(badge);resize(fx);schedule();
 }
 function scan(node){if(node.nodeType!==1)return;if(node.matches('.season2-ribbon'))attach(node);node.querySelectorAll('.season2-ribbon').forEach(attach);}
 const mutations=new MutationObserver(records=>{prune();for(const record of records)if(record.type==='childList')record.addedNodes.forEach(scan);schedule();});
 mutations.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','style']});
 document.querySelectorAll('.season2-ribbon').forEach(attach);
 function refresh(){prune();for(const fx of effects.values())if(visible(fx)){resize(fx);draw(fx);}if(raf&&!needed()){cancelAnimationFrame(raf);raf=0;last=0;}schedule();}
 reduced.addEventListener('change',refresh);document.addEventListener('visibilitychange',refresh);window.addEventListener('resize',refresh);window.addEventListener('pageshow',refresh);
 window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0;last=0;});
})();
