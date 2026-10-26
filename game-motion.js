/* Animation lifecycle is independent of match state, transport and resources. */
(()=>{
 'use strict';
 const art=window.GameMotionArt;if(!art)return;const records=new Set(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let raf=0,last=0,time=0,resultKey='',overlay=null;
 const node=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!=null)n.textContent=text;return n;};
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries){const record=[...records].find(r=>r.canvas===entry.target);if(record){record.inView=entry.isIntersecting;record.dirty=true;}}wake();}):null;
 const sizes=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{for(const entry of entries){const record=[...records].find(r=>r.canvas===entry.target);if(record)record.dirty=true;}wake();}):null;
 function register(owner,type,cls,options={}){
  const canvas=node('canvas',cls);canvas.setAttribute('aria-hidden','true');owner.prepend(canvas);
  const record={owner,canvas,type,dirty:true,inView:true,...options};records.add(record);observer?.observe(canvas);sizes?.observe(canvas);wake();return record;
 }
 function remove(record){observer?.unobserve(record.canvas);sizes?.unobserve(record.canvas);record.canvas.remove();records.delete(record);}
 function visible(record){if(!record.canvas.isConnected)return false;const screen=record.owner.closest('.screen');return (!screen||screen.classList.contains('active'))&&!record.owner.closest('[hidden]')&&record.inView;}
 function wake(){if(!raf&&!document.hidden)raf=requestAnimationFrame(draw);}
 function draw(now){
  raf=0;if(!reduced.matches&&last&&now-last<40){raf=requestAnimationFrame(draw);return;}const dt=last?Math.min((now-last)/1000,.1):0;last=now;if(document.hidden)return;
  if(!reduced.matches)time+=dt;
  let animated=false;
  for(const record of [...records]){
   if(!record.canvas.isConnected){remove(record);continue;}
   if(!visible(record))continue;animated=true;if(reduced.matches&&!record.dirty)continue;
   const box=record.canvas.getBoundingClientRect();if(!box.width||!box.height)continue;
   const dpr=Math.min(devicePixelRatio||1,1.6),w=Math.round(box.width*dpr),h=Math.round(box.height*dpr);
   if(record.canvas.width!==w||record.canvas.height!==h){record.canvas.width=w;record.canvas.height=h;}
   const c=record.canvas.getContext('2d');if(!c)continue;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,box.width,box.height);
   const t=(reduced.matches?3:time)+(record.phase||0);
   if(record.type==='home')art.home(c,box.width,box.height,t);
   else if(record.type==='water')art.water(c,box.width,box.height,t,true);
   else if(record.type==='card')art.card(c,box.width,box.height,t,record.style);
   else if(record.type==='result')art.crystal(c,box.width,box.height,reduced.matches?3:Math.max(0,time-record.started),record.loss);
   record.dirty=false;
  }
  if(animated&&!reduced.matches)raf=requestAnimationFrame(draw);
 }
 function sync(){for(const record of records)record.dirty=true;wake();}
 function clearResult(){
  resultKey='';if(overlay){for(const record of [...records])if(overlay.contains(record.canvas))remove(record);overlay.remove();overlay=null;}
  document.getElementById('battleScreen')?.classList.remove('hasGameResult');
 }
 function showResult({text,winnerName,localPlayer=0,spectator=false}){
  const match=/^([12])P WIN$/.exec(text),screen=document.getElementById('battleScreen');
  if(!match||!screen){clearResult();return;}
  const winner=Number(match[1]),perspective=!spectator&&(localPlayer===1||localPlayer===2),loss=perspective&&winner!==localPlayer,key=[text,winnerName,perspective?localPlayer:0].join('|');
  if(key===resultKey&&overlay)return;clearResult();resultKey=key;
  overlay=node('div','gameResultOverlay');overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');
  const panel=node('div','gameResultPanel'),heading=node('div','gameResultWord',perspective?(loss?'DEFEAT':'VICTORY'):'WINNER');
  panel.append(node('div','gameResultEyebrow',loss?'NEXT CHALLENGE':'MATCH COMPLETE'),heading,node('div','gameResultWinner',winnerName+' WIN'));
  overlay.append(panel);screen.append(overlay);screen.classList.add('hasGameResult');register(panel,'result','gameResultCanvas',{loss,started:time});sync();
 }
 function applyCardStyle(panel,id){
  if(!panel)return;id=id==='obsidian'||id==='abyss'?id:'';
  const current=[...records].find(r=>r.owner===panel&&r.type==='card');
  panel.dataset.cardStyle=id;
  if(current){if(!id)remove(current);else{current.style=id;current.dirty=true;}}
  else if(id)register(panel,'card','playerCardStyleCanvas',{style:id});
  wake();
 }
 function preview(id){
  const sample=node('div','playerCardStyleSample');sample.dataset.cardStyle=id;
  const name=id==='obsidian'?'黒曜プラチナ':id==='abyss'?'深海プリズム':'標準';
  sample.append(node('span','playerCardStyleSampleCode','PLAYER CARD'),node('strong','playerCardStyleSampleName',name),node('span','playerCardStyleSampleRule'));
  if(id)register(sample,'card','playerCardStyleCanvas',{style:id});return sample;
 }
 function updateTechniques(techniques){
  for(const [slot,tech]of techniques.entries()){
   const card=document.querySelectorAll('#techScreen .techCard')[slot];if(!card||!tech)continue;
   const body=card.querySelector('.techCardBody');let meta=body.querySelector('.gameTechMeta'),image=body.querySelector('.gameTechImage');
   if(!meta){meta=node('div','gameTechMeta');meta.append(node('span','gameTechSlot','SLOT '+String(slot+1).padStart(2,'0')),node('span','gameTechCost'));body.prepend(meta);}
   meta.querySelector('.gameTechCost').textContent='通常消費 '+tech.cost;
   const kind=window.BattleActionArt?.kindOf(tech);
   if(kind){if(!image){image=node('img','gameTechImage');image.alt='';image.draggable=false;body.prepend(image);}image.src=window.BattleActionArt.imageSource(kind);}
   card.classList.remove('gameTechChanged');void card.offsetWidth;card.classList.add('gameTechChanged');
  }
  sync();
 }
 const home=document.getElementById('modeScreen');if(home)register(home,'home','gameHomeCanvas');
 document.querySelectorAll('#techScreen .techCard').forEach((card,i)=>register(card,'water','gameTechWater',{phase:i*1.6}));
 document.querySelectorAll('#techScreen .techArrow').forEach((button,i)=>{button.textContent=i%2?'→':'←';});
 const message=document.getElementById('resultMessage');if(message)new MutationObserver(()=>{if(!message.classList.contains('resultShow')||!message.textContent)clearResult();}).observe(message,{attributes:true,childList:true,subtree:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else sync();});
 reduced.addEventListener('change',sync);window.addEventListener('resize',sync);
 window.GameMotion=Object.freeze({sync,showResult,clearResult,applyCardStyle,preview,updateTechniques});
})();
