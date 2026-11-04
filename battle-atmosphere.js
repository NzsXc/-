/* Read-only battle scenery and countdown. Never schedules or resolves a turn. */
(()=>{
 'use strict';
 const screen=document.getElementById('battleScreen'),digit=document.getElementById('countdown'),ring=document.getElementById('countdownRing');if(!screen||!digit)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),TAU=Math.PI*2,SEGMENTS=10,mod=n=>(n%1+1)%1;
 const canvas=document.createElement('canvas'),timer=document.createElement('canvas');
 canvas.className='battleAtmosphereCanvas';timer.className='battleSegmentTimer';timer.hidden=true;
 for(const n of [canvas,timer])n.setAttribute('aria-hidden','true');timer.dataset.direction='counterclockwise';timer.dataset.segments=String(SEGMENTS);screen.classList.add('battleAtmosphere');screen.prepend(canvas);screen.append(timer);
 let raf=0,last=0,time=3,geometry=null,geometryAt=0,number=null,total=3,changedAt=0,sourceText='',dirty=true;
 function active(){return screen.classList.contains('active')&&!document.hidden;}
 function context(n,w,h){const dpr=Math.min(devicePixelRatio||1,1.5),pw=Math.round(w*dpr),ph=Math.round(h*dpr);if(n.width!==pw||n.height!==ph){n.width=pw;n.height=ph;}const c=n.getContext('2d');if(!c)return null;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);return c;}
 function syncNumber(){
  const text=digit.textContent.trim(),numeric=/^\d+$/.test(text)?Number(text):null;
  const phaseTotal=ring?.classList.contains('active')?10:3;
  if(text!==sourceText||phaseTotal!==total){changedAt=performance.now();sourceText=text;total=Math.max(phaseTotal,numeric||0);number=numeric;dirty=true;}
  digit.classList.toggle('battleSegmentNumber',number!==null&&number>0);
  timer.hidden=!active()||number===null||number<=0||screen.classList.contains('hasGameResult');
  wake();
 }
 function geometryNow(now){
  const box=screen.getBoundingClientRect(),a=document.getElementById('player1Area')?.getBoundingClientRect(),b=document.getElementById('player2Area')?.getBoundingClientRect(),counter=digit.getBoundingClientRect();
  if(!box.width||!box.height||!a?.width||!b?.width)return null;
  let dx=(b.x+b.width/2)-(a.x+a.width/2),dy=(b.y+b.height/2)-(a.y+a.height/2),length=Math.hypot(dx,dy);if(length<1){dx=0;dy=-1;length=1;}
  const ux=dx/length,uy=dy/length,nx=-uy,ny=ux,w=box.width,h=box.height;
  const size=Math.min(156,Math.max(76,counter.height*1.42));
  timer.style.left=counter.x+counter.width/2-box.x+'px';timer.style.top=counter.y+counter.height/2-box.y+'px';timer.style.width=size+'px';timer.style.height=size+'px';
  canvas.dataset.axis=Math.abs(ux)<.15?'vertical':Math.abs(uy)<.15?'horizontal':'diagonal';
  canvas.dataset.ux=ux.toFixed(5);canvas.dataset.uy=uy.toFixed(5);
  geometryAt=now;return {w,h,ux,uy,nx,ny,along:(Math.abs(ux)*w+Math.abs(uy)*h)/2+60,across:(Math.abs(nx)*w+Math.abs(ny)*h)/2+30,size};
 }
 function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
 function scenery(g){
  const c=context(canvas,g.w,g.h);if(!c)return;
  glow(c,g.w*.15,g.h*.75,Math.max(g.w,g.h)*.7,'rgba(81,181,219,.085)');glow(c,g.w*.85,g.h*.2,Math.max(g.w,g.h)*.6,'rgba(158,129,221,.085)');
  const t=reduced.matches?3:time;
  for(let i=0;i<74;i++){
   const reverse=i%2===1,velocity=38+i%5*7,progress=mod(t*velocity/(g.along*2)+i*.61803398875),p=reverse?1-progress:progress,distance=(p*2-1)*g.along,spread=(mod(i*.41421356237)*2-1)*g.across;
   const x=g.w/2+g.ux*distance+g.nx*spread,y=g.h/2+g.uy*distance+g.ny*spread,alpha=(.35+.65*Math.pow(Math.sin(Math.PI*p),.6))*.85,length=25+i%5*10,direction=reverse?-1:1;
   c.beginPath();c.moveTo(x-g.ux*length*direction,y-g.uy*length*direction);c.lineTo(x,y);c.strokeStyle=reverse?'rgba(193,166,255,'+alpha*.56+')':'rgba(187,232,255,'+alpha*.66+')';c.lineWidth=.6+i%3*.35;c.stroke();
  }
 }
 function countdown(now,g){
  if(timer.hidden)return;
  const c=context(timer,g.size,g.size);if(!c)return;
  const elapsed=reduced.matches?0:Math.min(.999,Math.max(0,(now-changedAt)/1000)),remaining=Math.max(0,number-elapsed),ratio=Math.max(0,Math.min(1,remaining/total)),lit=Math.ceil(ratio*SEGMENTS),x=g.size/2,y=g.size/2,r=g.size*.38,color=number<=Math.max(1,total*.3)?'#f4cc9d':'#a8e9fb';
  // Reverse the prototype's winding: segment indices now advance counterclockwise.
  for(let i=0;i<SEGMENTS;i++){const a=-Math.PI/2-i*TAU/SEGMENTS-.035;c.beginPath();c.arc(x,y,r,a,a-TAU/SEGMENTS+.09,true);c.lineWidth=Math.max(3,g.size*.037);c.lineCap='butt';c.strokeStyle=i<lit?color:'#274458';c.stroke();}
  c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.font='500 '+(g.size<90?23:Math.round(g.size*.29))+'px Consolas,monospace';c.fillText(remaining.toFixed(1),x,y);
  if(g.size>=110){c.font='400 9px Arial,sans-serif';c.fillStyle='#9bb6c9';c.fillText('SECONDS',x,y+g.size*.2);}
  timer.dataset.remaining=remaining.toFixed(1);timer.dataset.total=String(total);timer.dataset.lit=String(lit);
 }
 function wake(){if(active()){if(!raf)raf=requestAnimationFrame(draw);}else{cancelAnimationFrame(raf);raf=0;last=0;timer.hidden=true;}}
 function sync(){geometry=null;dirty=true;syncNumber();}
 function draw(now){
  raf=0;if(!active()){last=0;timer.hidden=true;return;}
  if(last&&now-last<32){wake();return;}const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(!reduced.matches)time+=dt;
  if(!geometry||now-geometryAt>250)geometry=geometryNow(now);if(!geometry)return;
  if(dirty||!reduced.matches){scenery(geometry);countdown(now,geometry);}dirty=false;if(!reduced.matches)wake();
 }
 new MutationObserver(syncNumber).observe(digit,{childList:true,characterData:true,subtree:true});
 if(ring)new MutationObserver(syncNumber).observe(ring,{attributes:true,attributeFilter:['class']});
 new MutationObserver(sync).observe(screen,{attributes:true,attributeFilter:['class','data-local-player']});
 const resize=typeof ResizeObserver==='function'?new ResizeObserver(sync):null;for(const n of [screen,document.getElementById('player1Area'),document.getElementById('player2Area'),document.getElementById('battleCenter')])if(n)resize?.observe(n);
 window.addEventListener('game-screen-change',sync);window.addEventListener('resize',sync);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
 window.BattleAtmosphere=Object.freeze({sync});sync();
})();
