/* A shared server-time timeline: 0.8 s entry, 3 s drift, 1 s exit. */
(()=>{
 const ENTER_MS=800,HOLD_MS=3000,EXIT_MS=500,DURATION_MS=ENTER_MS+HOLD_MS+EXIT_MS;
 let current=null,frame=0,lastKey=null;
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function motion(elapsed,from,near,to,direction=1){
  if(elapsed<0)return from;
  if(elapsed<ENTER_MS){const t=elapsed/ENTER_MS;return from+(near-from)*(1-Math.pow(1-t,3));}
  const drift=direction*28;
  if(elapsed<ENTER_MS+HOLD_MS)return near+drift*(elapsed-ENTER_MS)/HOLD_MS;
  return near+drift+(to-near-drift)*clamp((elapsed-ENTER_MS-HOLD_MS)/EXIT_MS,0,1);
 }
 function ratingText(value){return typeof value==='number'&&Number.isFinite(value)?String(value):'-';}
 function node(tag,cls,text){const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;}
 function card(side,profile){
  const el=node('section','intro-card intro-p'+side);el.setAttribute('aria-label',side+'P プレイヤーカード');
  const header=node('div','intro-card-header');
  const name=node('div','intro-name',String(profile?.name||'プレイヤー'+side));name.title=name.textContent;
  const rating=node('div','intro-rating');rating.append(node('span','intro-rating-label','RATE'),node('strong','intro-rating-value',ratingText(profile?.rating)));
  header.append(name,rating);
  const titles=node('div','intro-titles');
  for(let i=1;i<=3;i++){const line=node('div','intro-title');line.append(node('span','intro-title-index','称号 0'+i),node('span','intro-title-value','-'));titles.append(line);}
  const footer=node('div','intro-card-footer');footer.append(node('span','intro-player-number','PLAYER 0'+side),node('span','intro-bars','▰ ▰ ▰ ▰ ▰'),node('span','intro-online','ONLINE'));
  el.append(node('div','intro-card-scan'),header,titles,footer);return el;
 }
 function cancel(){
  cancelAnimationFrame(frame);frame=0;
  if(current){current.layer.remove();current.screen.classList.remove('player-intro-active');current=null;}
 }
 function reset(){cancel();lastKey=null;}
 function layout(){
  if(!current)return;
  const {layer,cards}=current,rect=layer.getBoundingClientRect();
  current.positions=cards.map((el,i)=>{
   const area=document.getElementById('player'+(i+1)+'Area')?.getBoundingClientRect();
   const w=el.offsetWidth,h=el.offsetHeight;
   // Follow the real player's battle panel, including the existing mirrored 2P view.
   const lower=area?area.top+area.height/2>=rect.top+rect.height/2:i===0;
   const direction=lower?1:-1;
   const near=clamp(area?area.left+area.width/2-rect.left-w/2:lower?24:rect.width-w-24,12,Math.max(12,rect.width-w-12));
   const top=clamp(area?area.top+area.height/2-rect.top-h/2:lower?rect.height-h-36:36,12,Math.max(12,rect.height-h-12));
   el.style.top=top+'px';
   return {from:lower?-w-48:rect.width+48,near,to:lower?rect.width+48:-w-48,direction};
  });
 }
 function tick(){
  frame=0;if(!current)return;
  const c=current;
  if(!c.screen.classList.contains('active')){cancel();return;}
  const elapsed=c.now()-c.startAt;
  if(elapsed>=DURATION_MS){cancel();return;}
  c.layer.style.visibility=elapsed<0?'hidden':'visible';
  c.cards.forEach((el,i)=>{const p=c.positions[i];el.style.transform='translate3d('+motion(elapsed,p.from,p.near,p.to,p.direction)+'px,0,0)';});
  c.layer.style.setProperty('--intro-energy',String(elapsed<ENTER_MS?clamp(elapsed/ENTER_MS,0,1):clamp((DURATION_MS-elapsed)/EXIT_MS,0,1)));
  frame=requestAnimationFrame(tick);
 }
 function start({key,startAt,now,players}){
  if(lastKey===key)return;
  cancel();lastKey=key;
  const screen=document.getElementById('battleScreen');
  if(!screen||!Number.isFinite(startAt)||now()>=startAt+DURATION_MS)return;
  const layer=node('div','player-intro-layer');layer.id='playerIntroLayer';
  layer.setAttribute('role','group');layer.setAttribute('aria-label','対戦プレイヤー紹介');
  const energy=node('div','intro-energy');energy.setAttribute('aria-hidden','true');
  energy.innerHTML='<svg viewBox="0 0 1000 600" preserveAspectRatio="none"><path class="intro-energy-halo" d="M180 -30 L272 93 L252 99 L407 240 L386 247 L548 370 L530 380 L822 640"/><path class="intro-energy-core" d="M180 -30 L272 93 L252 99 L407 240 L386 247 L548 370 L530 380 L822 640"/><path class="intro-energy-branch" d="M407 240 L462 244 L495 279 M548 370 L468 380 L457 411 M272 93 L334 102 L350 132 M643 485 L686 470 L720 510"/><path class="intro-energy-sparks" d="M180 -30 L272 93 L252 99 L407 240 L386 247 L548 370 L530 380 L822 640"/></svg>';
  const cards=[card(1,players?.[1]),card(2,players?.[2])];
  layer.append(energy,...cards);screen.append(layer);screen.classList.add('player-intro-active');
  current={screen,layer,cards,now,startAt};layout();tick();
 }
 window.addEventListener('resize',layout);
 window.PlayerIntro={ENTER_MS,HOLD_MS,EXIT_MS,DURATION_MS,start,cancel,reset,isActive:()=>!!current,motion,ratingText};
})();
