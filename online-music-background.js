/* One analyser taps the shared media source before the output volume gain. */
(()=>{
 'use strict';
 const audio=document.getElementById('onlineMenuBGM');if(!audio)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),strength=.5,count=48;
 const canvas=document.createElement('canvas');canvas.className='onlineMusicCanvas';canvas.setAttribute('aria-hidden','true');
 const strokes=Array.from({length:112},(_,i)=>{const tint=Math.random();return {phase:i*.137,angle:i*2.399,color:'rgba('+Math.round(255-145*tint)+','+Math.round(255-41*tint)+',255,.65)',width:1+Math.random()*.6};});
 const levels=new Float32Array(count);let owner=null,raf=0,last=0,time=3,previousBass=0,pulse=0,graph=null,freq=null,wave=null;
 const clamp=n=>Math.max(0,Math.min(1,n)),mod=n=>(n%1+1)%1;
 function wake(){if(!raf&&owner&&!document.hidden)raf=requestAnimationFrame(draw);}
 function sync(){
  const screen=document.querySelector('.screen.active'),wanted=window.onlineMusicContext&&screen?.id!=='battleScreen'?screen:null;
  if(owner!==wanted){owner?.classList.remove('musicReactiveBackground');canvas.remove();owner=wanted;if(owner){owner.classList.add('musicReactiveBackground');owner.prepend(canvas);}}
  if(!owner){cancelAnimationFrame(raf);raf=0;last=0;levels.fill(0);previousBass=pulse=0;return;}wake();
 }
 function draw(now){
  raf=0;if(!owner||document.hidden)return;
  if(last&&now-last<16){wake();return;}const dt=last?Math.min(.1,(now-last)/1000):1/60;last=now;
  const box=canvas.getBoundingClientRect(),w=box.width,h=box.height;if(!w||!h)return;
  const dpr=Math.min(devicePixelRatio||1,1.5),cw=Math.round(w*dpr),ch=Math.round(h*dpr);
  if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
  const c=canvas.getContext('2d');if(!c)return;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const next=window.GameAudio?.analysis(audio);
  if(next!==graph){graph=next;if(graph){freq=new Float32Array(graph.analyser.frequencyBinCount);wave=new Float32Array(graph.analyser.fftSize);}}
  const active=graph&&graph.context.state==='running'&&!audio.paused&&!audio.ended&&!audio.muted&&!reduced.matches;
  let rms=0,bass=0,bassN=0;
  if(active){graph.analyser.getFloatFrequencyData(freq);graph.analyser.getFloatTimeDomainData(wave);for(const n of wave)rms+=n*n;rms=Math.sqrt(rms/wave.length);}
  for(let i=0;i<count;i++){
   let value=0;const f0=40*Math.pow(200,i/count),f1=40*Math.pow(200,(i+1)/count);
   if(active){const fft=graph.analyser.fftSize,rate=graph.context.sampleRate,first=Math.max(1,Math.floor(f0/rate*fft)),end=Math.min(freq.length-1,Math.max(first,Math.ceil(f1/rate*fft)));let energy=0;for(let bin=first;bin<=end;bin++)energy+=Math.pow(10,freq[bin]/10);const db=10*Math.log10(Math.max(1e-15,energy/(end-first+1)));value=Math.pow(clamp((db+72)/50),1.25);}
   levels[i]=!active?0:value>=levels[i]?value:levels[i]+(value-levels[i])*(1-Math.exp(-dt/.065));if(f1<=210){bass+=levels[i];bassN++;}
  }
  bass/=Math.max(1,bassN);const drive=active?clamp((rms*4.5+bass*.45)*strength):0;
  if(active){if(bass-previousBass>.045)pulse=clamp((bass-previousBass)*4)*strength;previousBass=bass;}else{previousBass=pulse=0;}
  pulse*=Math.exp(-dt*7);if(!reduced.matches)time+=dt*(drive*3.8+pulse*2.2);
  const glow=c.createRadialGradient(w*.5,h*.43,0,w*.5,h*.43,w*.65);glow.addColorStop(0,'rgba(105,126,220,.09)');glow.addColorStop(1,'rgba(30,66,104,0)');c.fillStyle=glow;c.fillRect(0,0,w,h);
  for(let i=0;i<strokes.length;i++){
   const s=strokes[i],p=mod(time*(.012+i%5*.002)+s.phase),a=s.angle,r=.07+p*p*.9,value=clamp(levels[(i*17)%count]*strength);
   const dx=Math.cos(a)*w,dy=Math.sin(a)*h,norm=Math.hypot(dx,dy),ux=dx/norm,uy=dy/norm,x=w*.5+dx*r,y=h*.43+dy*r,length=8+Math.pow(value,.9)*(40+Math.min(w,h)*.11);
   c.beginPath();c.moveTo(x-ux*length*.35,y-uy*length*.35);c.lineTo(x+ux*length*.65,y+uy*length*.65);c.strokeStyle=s.color;c.lineWidth=s.width;c.stroke();
  }
  if(active&&!reduced.matches)wake();
 }
 window.addEventListener('game-screen-change',sync);
 for(const event of ['play','playing','pause','ended','volumechange'])audio.addEventListener(event,wake);
 document.addEventListener('pointerdown',wake,{passive:true});document.addEventListener('keydown',wake);
 document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);raf=0;last=0;if(!document.hidden)sync();});
 reduced.addEventListener('change',()=>{last=0;wake();});window.addEventListener('resize',wake);
 // Context routing can become ready after the media's initial play event.
 window.addEventListener('game-audio-ready',wake);
 window.OnlineMusicBackground=Object.freeze({sync});sync();
})();
