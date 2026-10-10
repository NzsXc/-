/* Technique-coloured travelling gloss, doubled background embers and unchanged four-second flame surges. */
(()=>{
 const effects=new Set(),reduced=matchMedia('(prefers-reduced-motion: reduce)');let raf=0,last=0;
 const noise=x=>{const v=Math.sin(x*12.9898+78.233)*43758.5453;return v-Math.floor(v);};
 function resize(fx){
  const r=fx.badge.getBoundingClientRect(),t=fx.text.getBoundingClientRect();if(!r.width||!r.height)return;
  fx.width=r.width;fx.height=r.height;fx.canvas.width=Math.ceil(r.width*2);fx.canvas.height=Math.ceil(r.height*2);fx.flameCanvas.width=fx.canvas.width;fx.flameCanvas.height=fx.canvas.height;fx.frontCanvas.width=fx.canvas.width;fx.frontCanvas.height=fx.canvas.height;
  fx.left=Math.max(34,t.left-r.left-8);fx.right=Math.min(r.width-30,t.right-r.left+8);
  fx.textTop=t.top-r.top;fx.textHeight=t.height;fx.textBottom=t.bottom-r.top;fx.textLeft=t.left-r.left;fx.textRight=t.right-r.left;fx.centerY=(t.top+t.bottom)/2-r.top;
  const style=getComputedStyle(fx.badge);
  fx.color=fx.options.mode==='skill'?style.getPropertyValue('--tech-color').trim()||'#176bdd':'#9224df';
  fx.light=fx.options.mode==='skill'?style.getPropertyValue('--tech-light').trim()||'#4d9aff':'#d363f0';
  fx.outer=fx.options.mode==='skill'?fx.color:'#bf19e1';
  fx.flameColor=style.getPropertyValue('--tech-color').trim()||'#176bdd';fx.flameLight=style.getPropertyValue('--tech-light').trim()||'#4d9aff';
  fx.glowMask=document.createElement('canvas');fx.glowMask.width=fx.canvas.width;fx.glowMask.height=fx.canvas.height;
  const m=fx.glowMask.getContext('2d'),font=getComputedStyle(fx.text);
  m.scale(2,2);m.font=font.fontWeight+' '+font.fontSize+' '+font.fontFamily;m.textBaseline='middle';m.fillStyle=fx.flameColor;
  if('letterSpacing' in m)m.letterSpacing=font.letterSpacing==='normal'?'0px':font.letterSpacing;
  m.fillText(fx.text.dataset.text||fx.text.textContent,fx.textLeft,fx.centerY);
  draw(fx,fx.options.playing&&!reduced.matches?performance.now():1000);
 }
/* Coherent turbulence changes the shape without translating the whole bolt sideways. */
 const smoothNoise=(seed,t)=>{const a=Math.floor(t),u=t-a,e=u*u*(3-2*u);return noise(seed+a)*(1-e)+noise(seed+a+1)*e;};
 function boltGeometry(fx,index,time){
  const slotSeed=fx.seed+index*29,period=480+noise(slotSeed+4)*530;
  const clock=time+noise(slotSeed+9)*period,cycle=Math.floor(clock/period),phase=clock-cycle*period;
  const seed=slotSeed+cycle*173,duration=210+noise(seed+6)*130,side=index%2?1:-1;
  const centerX=side<0?fx.textLeft+noise(seed+1)*3:fx.textRight-noise(seed+1)*3;
  const depth=2.8+noise(seed+2)*1.5,y30=fx.textTop+fx.textHeight*.3,y70=fx.textTop+fx.textHeight*.7,points=[];
  for(let n=0;n<=20;n++){
   const p=n/20,jag=(smoothNoise(seed+n*31,time/60)-.5)*.65*Math.sin(p*Math.PI);
   points.push([centerX+side*(depth*Math.sin(Math.PI*p)+jag),y30+(y70-y30)*p,p]);
  }
  const progress=Math.min(1,phase/(duration*.8)),tail=Math.max(0,progress-.34);
  const fade=phase<duration?Math.min(1,phase/25)*Math.min(1,(duration-phase)/70):0;
  return {points,progress,tail,alpha:fade,side,centerX,centerY:fx.centerY,split:10,y30,y70,depth};
 }
 function trailPoints(bolt){
  const at=p=>{const t=p*20,i=Math.min(19,Math.floor(t)),u=t-i,a=bolt.points[i],b=bolt.points[i+1];return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,p];};
  const points=[at(bolt.tail)];
  for(let i=Math.floor(bolt.tail*20)+1;i/20<bolt.progress;i++)points.push(bolt.points[i]);
  if(bolt.tail<.5&&bolt.progress>.5&&!points.some(p=>p[2]===.5))points.push(at(.5));
  points.push(at(bolt.progress));return points.sort((a,b)=>a[2]-b[2]);
 }
 /* A one-second swell, repeated every four seconds; no abrupt on/off flare. */
 function flamePulse(elapsed){
  const phase=((elapsed%4000)+4000)%4000;
  return phase<1000?Math.sin(Math.PI*phase/1000)**2:0;
 }
 function drawTextGlow(fx,c,time){
  if(!fx.glowMask)return;
  const breath=1;
  c.save();c.globalCompositeOperation='screen';
  c.globalAlpha=Math.min(.55,.3*fx.options.strength)*breath;c.filter='blur(10px)';c.drawImage(fx.glowMask,0,0,fx.width,fx.height);
  c.globalAlpha=Math.min(.65,.4*fx.options.strength)*breath;c.filter='blur(3px)';c.drawImage(fx.glowMask,0,0,fx.width,fx.height);
  c.restore();
 }
 /* Just a few faint embers, rising through the background rather than covering the text. */
 function sparkGeometry(fx,index,time){
  const seed=fx.seed+index*53,period=1650+noise(seed+2)*1450,lifetime=900+noise(seed+3)*500;
  const clock=time-fx.startTime+noise(seed+4)*period,cycle=Math.floor(clock/period),phase=clock-cycle*period;
  const age=phase/lifetime,born=seed+cycle*79,x0=14+noise(born+8)*(fx.width-28);
  return {x:x0+(noise(born+1)-.5)*10*Math.min(1,age),y:fx.height-5-Math.min(1,age)*(12+noise(born+5)*13),alpha:age<1?Math.sin(Math.PI*age)*.7:0,length:1+noise(born+6)*1.1};
 }
 function drawSparks(fx,c,time){
  c.save();c.lineCap='round';fx.lastSparkCount=0;
  for(let i=0;i<24;i++){
   const p=sparkGeometry(fx,i,time);if(p.alpha<.03)continue;fx.lastSparkCount++;
   c.beginPath();c.moveTo(p.x-.25,p.y+p.length);c.lineTo(p.x,p.y);
   c.strokeStyle=fx.flameColor;c.lineWidth=.8;c.globalAlpha=p.alpha;c.shadowColor=fx.flameColor;c.shadowBlur=2;c.stroke();
   c.beginPath();c.arc(p.x,p.y,.35,0,Math.PI*2);c.fillStyle=fx.flameLight;c.globalAlpha=p.alpha*.85;c.fill();
  }
  c.restore();
 }
  function drawFlames(fx,time){
  const c=fx.flameCanvas.getContext('2d'),strength=fx.options.flame;
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,fx.flameCanvas.width,fx.flameCanvas.height);c.scale(2,2);
  const pulse=fx.options.playing&&!reduced.matches?flamePulse(time-fx.startTime):0;fx.lastPulse=pulse;fx.maxFlameHeight=0;
  if(!strength)return;
  const base=fx.height-2.5,left=8,span=fx.width-16;
  const washHeight=15+9*pulse, wash=c.createLinearGradient(0,base,0,base-washHeight);wash.addColorStop(0,fx.flameColor);wash.addColorStop(1,'transparent');c.fillStyle=wash;c.globalAlpha=(.12+.07*pulse)*strength;c.fillRect(left,base-washHeight,span,washHeight);
  c.lineJoin='round';
  for(let i=0;i<22;i++){
   const seed=fx.seed+i*19,x=left+span*(i+.5)/22+(noise(seed+1)-.5)*8;
   const phase=time*.0032+seed,lean=Math.sin(phase)*2+Math.sin(phase*.63+2);
   const height=Math.min(fx.height-4,(5+noise(seed+4)*11+Math.sin(phase+1)*1.5)*(1+1.15*pulse)),width=(2.5+noise(seed+9)*4.5)*(1+.2*pulse);fx.maxFlameHeight=Math.max(fx.maxFlameHeight,height);
   const gradient=c.createLinearGradient(0,base,0,base-height);
   gradient.addColorStop(0,'transparent');gradient.addColorStop(.28,fx.flameColor);gradient.addColorStop(.75,fx.flameColor);gradient.addColorStop(1,fx.flameLight);
   c.beginPath();c.moveTo(x-width,base);
   c.bezierCurveTo(x-width*1.2,base-height*.36,x+width*.25+lean,base-height*.55,x+lean,base-height);
   c.bezierCurveTo(x+width*.8+lean,base-height*.62,x+width*1.2,base-height*.28,x+width,base);
   c.closePath();c.fillStyle=gradient;c.globalAlpha=(.22+.04*Math.sin(phase)+noise(seed+12)*.045)*strength*(1+.25*pulse);
   c.shadowColor=fx.flameColor;c.shadowBlur=2+3*pulse;c.fill();
   c.beginPath();c.moveTo(x-width*.36,base-1);c.quadraticCurveTo(x-width*.55,base-height*.3,x+lean*.5,base-height*.65);c.quadraticCurveTo(x+width*.55,base-height*.24,x+width*.35,base-1);c.closePath();
   c.shadowBlur=0;c.globalAlpha=.11*strength;c.fillStyle=fx.flameLight;c.fill();
  }
  drawSparks(fx,c,time);
  c.globalAlpha=1;c.shadowBlur=0;
 }
 function electricStroke(c,points,fx,alpha,front){
  if(points.length<2||alpha<.01)return;
  c.beginPath();points.forEach(([x,y],n)=>n?c.lineTo(x,y):c.moveTo(x,y));
  c.globalAlpha=Math.min(.9,alpha*(front?1:.55));c.strokeStyle=fx.color;c.lineWidth=front?.7:.55;c.shadowColor=fx.outer;c.shadowBlur=front?1.5:1.2;c.stroke();
  c.globalAlpha=Math.min(.8,alpha*(front?.72:.32));c.strokeStyle=fx.light;c.lineWidth=front?.28:.22;c.shadowBlur=.65;c.stroke();
 }
 function draw(fx,time){
  if(!fx.width)return;
  drawFlames(fx,time);
  const back=fx.canvas.getContext('2d'),front=fx.frontCanvas.getContext('2d'),strength=fx.options.strength;
  for(const c of [back,front]){
   c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,fx.canvas.width,fx.canvas.height);c.scale(2,2);
   c.lineJoin='miter';c.lineCap='round';c.globalCompositeOperation='source-over';
  }
  drawTextGlow(fx,back,time);
  /* A tiny moving trail curls from 30% to 70% of the text height, then disappears. */
  for(let i=0;i<12;i++){
   const bolt=boltGeometry(fx,i,time),points=trailPoints(bolt);
   electricStroke(back,points.filter(p=>p[2]<=.5),fx,bolt.alpha*strength,false);
   electricStroke(front,points.filter(p=>p[2]>=.5),fx,bolt.alpha*strength,true);
  }
  for(const c of [back,front]){c.globalAlpha=1;c.shadowBlur=0;}fx.frames++;
 }
 function loop(time){
  raf=0;if(!effects.size)return;
  if(time-last>=33&&!document.hidden){last=time;for(const fx of effects)if(fx.visible&&fx.options.playing&&!reduced.matches&&fx.badge.isConnected&&fx.badge.getClientRects().length)draw(fx,time);}
  raf=requestAnimationFrame(loop);
 }
 function attach(badge,options={}){
  const text=badge.querySelector('.title-badge');if(!text)return null;
  const canvas=document.createElement('canvas');canvas.className='title-rising-charge-canvas';canvas.setAttribute('aria-hidden','true');const flameCanvas=document.createElement('canvas');flameCanvas.className='title-ember-canvas';flameCanvas.setAttribute('aria-hidden','true');const frontCanvas=document.createElement('canvas');frontCanvas.className='title-wrap-front-canvas';frontCanvas.setAttribute('aria-hidden','true');badge.append(flameCanvas,canvas,frontCanvas);badge.classList.add('rising-charge-title','wrap-charge-title');
  const fx={badge,text,canvas,flameCanvas,frontCanvas,options:{mode:'reference',strength:1.5,flame:1.5,playing:true,...options},visible:true,startTime:performance.now(),seed:noise(effects.size*37+5)*99,frames:0};
  function setOptions(next){Object.assign(fx.options,next);fx.options.strength=Math.max(.6,Math.min(1.5,Number(fx.options.strength)||1));fx.options.flame=Math.max(0,Math.min(1.5,Number(fx.options.flame)||0));badge.style.setProperty('--charge-play-state',fx.options.playing?'running':'paused');if(!fx.options.playing||reduced.matches)draw(fx,1000);}
  const size=new ResizeObserver(()=>resize(fx));size.observe(badge);
  const visible=new IntersectionObserver(entries=>{fx.visible=entries[0]?.isIntersecting!==false;});visible.observe(badge);
  badge.style.setProperty('--corrupt-duration',(6.4+noise(fx.seed)*2).toFixed(2)+'s');badge.style.setProperty('--corrupt-delay',(-noise(fx.seed+7)*4).toFixed(2)+'s');effects.add(fx);resize(fx);setOptions({});if(!raf)raf=requestAnimationFrame(loop);
  return {setOptions,getFrames:()=>fx.frames,getFlamePulse:flamePulse,getSparkGeometry:time=>Array.from({length:24},(_,i)=>sparkGeometry(fx,i,time)),getVisualMetrics:()=>({pulse:fx.lastPulse,maxFlameHeight:fx.maxFlameHeight,glowColor:fx.flameColor,hasGlyphGlow:!!fx.glowMask,steadyGlow:true,sparks:fx.lastSparkCount}),getEmissionGeometry:()=>({textTop:fx.textTop,textHeight:fx.textHeight,centerY:fx.centerY,textLeft:fx.textLeft,textRight:fx.textRight,flameColor:fx.flameColor,flameLeft:8,flameRight:fx.width-8,width:fx.width}),getBoltGeometry:time=>Array.from({length:12},(_,i)=>boltGeometry(fx,i,time)),destroy(){size.disconnect();visible.disconnect();effects.delete(fx);canvas.remove();flameCanvas.remove();frontCanvas.remove();badge.classList.remove('rising-charge-title','wrap-charge-title');badge.style.removeProperty('--charge-play-state');badge.style.removeProperty('--corrupt-duration');badge.style.removeProperty('--corrupt-delay');if(!effects.size&&raf){cancelAnimationFrame(raf);raf=0;}}};
 }
 reduced.addEventListener('change',()=>{for(const fx of effects)resize(fx);});
  const controllers=new WeakMap();
 const selector='.badge-item.tier-prestige';
 function badgesIn(node){
  if(node.nodeType!==1)return [];
  return [...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)];
 }
 function mount(badge){if(badge.isConnected&&!controllers.has(badge)){const controller=attach(badge);if(controller)controllers.set(badge,controller);}}
 function unmount(badge){if(!badge.isConnected){controllers.get(badge)?.destroy();controllers.delete(badge);}}
 const lifecycle=new MutationObserver(records=>{
  for(const record of records)for(const node of record.removedNodes)for(const badge of badgesIn(node))unmount(badge);
  for(const record of records)for(const node of record.addedNodes)for(const badge of badgesIn(node))mount(badge);
 });
 lifecycle.observe(document.documentElement,{childList:true,subtree:true});
 for(const badge of document.querySelectorAll(selector))mount(badge);
 window.TitlePrestigeEffects={getController:badge=>controllers.get(badge),activeCount:()=>effects.size};

})();










