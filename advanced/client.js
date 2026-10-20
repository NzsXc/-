// UI lifecycle for Advanced. Hooks return immediately for all other room modes.
(()=>{
 const choices=new Map();let current=null,selecting=null,sending=false,epoch=0,selection=null,dock=null,enemyDock=null,windowPanel=null;
 let observerFrame=0;
 const advanced=m=>window.AdvancedRules.hasSkills(m?.roomRules);
 const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;};
 function select(m){
  const screen=document.getElementById('techScreen');if(!screen)return;
  screen.classList.toggle('advancedSelection',advanced(m)&&m.phase==='select');
  if(!advanced(m)||m.phase!=='select'){if(selection)selection.hidden=true;return;}
  selecting=m;const saved=m.advanced?.selected?.[m.you],key=m.id;
  choices.set(key,saved||choices.get(key)||window.AdvancedRules.SKILLS[0].id);
  if(!selection){
   selection=node('div','techCard advancedSkillSelection');selection.id='advancedSkillSelection';selection.setAttribute('role','group');selection.setAttribute('aria-label','スキル選択');
   const prev=node('button','techArrow','＜'),next=node('button','techArrow','＞'),body=node('div','techCardBody');
   prev.type=next.type='button';prev.setAttribute('aria-label','前のスキル');next.setAttribute('aria-label','次のスキル');prev.onclick=()=>cycle(-1);next.onclick=()=>cycle(1);
   const name=node('div','techIcon');name.id='advancedSkillTitle';name.setAttribute('aria-live','polite');const description=node('div','techCardDescription');description.id='advancedSkillChoiceDescription';body.append(name,description);selection.append(prev,body,next);
   screen.querySelector('.techSelect').insertBefore(selection,document.getElementById('techConfirmButton'));
  }
  selection.hidden=false;
  const signature=JSON.stringify([key,saved,!!m.ready[m.you],choices.get(key),rankedSending]);
  if(selection.dataset.signature===signature)return;selection.dataset.signature=signature;
  const skill=window.AdvancedRules.byId[choices.get(key)];selection.dataset.skill=skill.id;
  selection.querySelector('#advancedSkillTitle').textContent=skill.name;
  selection.querySelector('#advancedSkillChoiceDescription').textContent=skill.description+' / '+skill.limit+'回まで使用可能';
  selection.querySelectorAll('button').forEach(button=>button.disabled=!!m.ready[m.you]||rankedSending);
 }
 function cycle(delta){
  const m=selecting;if(!m||m.ready[m.you]||rankedSending)return;
  const skills=window.AdvancedRules.SKILLS,index=skills.findIndex(skill=>skill.id===choices.get(m.id));choices.set(m.id,skills[(index+delta+skills.length)%skills.length].id);select(m);
  document.getElementById('techConfirmButton').disabled=!ready(m);
 }
 function ready(m){return !advanced(m)||!!(m.advanced?.selected?.[m.you]||choices.get(m.id));}
 function loadout(m){if(!advanced(m))return {};const id=m.advanced?.selected?.[m.you]||choices.get(m.id);if(!window.AdvancedRules.byId[id])throw Error('スキルを1つ選択してください。');return {advancedSkill:id};}
 function ensureBattle(){
  if(!dock){
   dock=node('section','advancedSkillDock');dock.id='advancedSkillDock';dock.setAttribute('aria-label','Advancedスキル');
   const button=node('button','advancedSkillButton advancedSkillOrb');button.type='button';button.id='advancedSkillButton';button.setAttribute('data-no-ui-se','');button.addEventListener('click',activate);
   button.append(node('span','advancedSkillArt'),node('strong','advancedSkillName'),node('span','advancedSkillUses'),node('small','advancedSkillDescription'));
   const other=node('span','advancedOpponentSkill');other.id='advancedOpponentSkill';dock.append(button,other);document.getElementById('battleScreen').append(dock);
  }
  if(!enemyDock){
   enemyDock=node('section','advancedSkillDock advancedEnemySkillDock');enemyDock.id='advancedEnemySkillDock';enemyDock.setAttribute('aria-label','相手のAdvancedスキル');
   const button=node('button','advancedSkillButton advancedSkillOrb advancedEnemySkillButton');button.type='button';button.id='advancedEnemySkillButton';button.disabled=true;
   button.append(node('span','advancedSkillArt'),node('strong','advancedSkillName'),node('span','advancedSkillUses'),node('small','advancedSkillDescription'));
   enemyDock.append(button);document.getElementById('battleScreen').append(enemyDock);
  }
  if(!windowPanel){
   windowPanel=node('section','advancedSkillWindow');windowPanel.id='advancedSkillWindow';windowPanel.setAttribute('aria-label','スキル選択猶予');
   const heading=node('div','advancedSkillWindowHeading');heading.append(node('strong',null,'スキル選択猶予'),node('span','advancedSkillSeconds'));
   const track=node('div','advancedSkillTrack'),fill=node('div','advancedSkillFill');track.setAttribute('role','progressbar');track.setAttribute('aria-label','スキル選択猶予の残り時間');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(window.AdvancedRules.WINDOW_MS/1000));track.append(fill);
   const controls=node('div','advancedBattleControls');
   windowPanel.append(heading,track);controls.append(document.getElementById('battleHomeButton'),windowPanel);document.getElementById('battleCenter').append(controls);
  }
 }
 const artParts={boost:['energy-halo','battery','bolt','spark s1','spark s2'],heal:['heal-pulse','medical-cross','mote m1','mote m2','mote m3'],chain:['chain-link link-a','chain-link link-b','break-flash','break-ray ray-a','break-ray ray-b'],cleanse:['cleanse-orbit orbit-a','cleanse-orbit orbit-b','cleanse-core','cleanse-star','debris'],invincible:['star-glow','invincible-star','star-gleam','star-spark'],stance:['stance-aura','stance-blade blade-a','stance-blade blade-b','stance-spark']};
 function paint(button,id){
  if(button.dataset.skill===id)return;button.dataset.skill=id||'';
  const art=button.querySelector('.advancedSkillArt');art.setAttribute('aria-hidden','true');art.replaceChildren(...(artParts[id]||[]).map(cls=>node('span',cls)));
 }
 function place(){
  if(!dock||dock.hidden||!current)return;
  const screen=document.getElementById('battleScreen'),s=screen.getBoundingClientRect();
  for(const [target,side,enemy]of [[dock,current.you,false],[enemyDock,3-current.you,true]]){
   const area=document.getElementById('player'+side+'Area');if(!area||!target)continue;
   const r=area.getBoundingClientRect(),size=target.offsetWidth;
   const left=Math.max(0,enemy?r.left-s.left:r.right-s.left-size)+'px',top=Math.max(0,enemy?r.bottom-s.top+5:r.top-s.top-size-5)+'px';
   if(target.style.left!==left)target.style.left=left;if(target.style.top!==top)target.style.top=top;
  }
 }
 window.addEventListener('resize',place);window.addEventListener('scroll',place,{passive:true});
 function sync(m,now){
  for(const side of [1,2]){const name=document.querySelector('#player'+side+'Area .playerName');let badge=document.getElementById('p'+side+'Stance');if(!badge&&name){badge=document.createElement('span');badge.id='p'+side+'Stance';badge.className='enhanceIndicator';badge.setAttribute('role','status');name.append(badge);}if(badge){badge.hidden=!(advanced(m)&&m.state&&window.AdvancedRules.presentationComplete(m,now)&&window.AdvancedRules.forTurn(m.advanced,m.state.turn)[side]?.id==='stance');badge.textContent='↑ 攻撃態勢+1';badge.title='攻撃態勢：このターンの攻撃力+1';}}
  const enabled=advanced(m)&&!!m.state,screen=document.getElementById('battleScreen');
  screen?.classList.toggle('advancedMode',enabled);
  if(!enabled){screen?.classList.remove('advancedSkillChoosing');window.AdvancedCutin?.cancel();current=null;if(dock)dock.hidden=true;if(enemyDock)enemyDock.hidden=true;if(windowPanel)windowPanel.hidden=true;if(!advanced(m)&&selection){selection.hidden=true;document.getElementById('techScreen')?.classList.remove('advancedSelection');}return;}
  current=m;ensureBattle();dock.hidden=false;enemyDock.hidden=false;
  const you=m.you,skill=window.AdvancedRules.byId[m.advanced?.selected?.[you]],other=window.AdvancedRules.byId[m.advanced?.selected?.[3-you]],actualUsed=m.advanced?.current?.[you]?.used||0;
  const used=window.AdvancedRules.visibleUses(m,you,now),revealed=window.AdvancedRules.presentationComplete(m,now);
  const duration=window.AdvancedRules.WINDOW_MS,ends=m.skillWindow?.endAt??m.opensAt,starts=m.skillWindow?.startAt??ends-duration,animating=!m.spectator&&rankedAnimating,open=!m.closed&&!animating&&now>=starts&&now<ends;
  if(open)PlayerIntro.cancel();windowPanel.hidden=!open;
  screen.classList.toggle('advancedSkillChoosing',open);
  dock.classList.toggle('skillWindowOpen',open);enemyDock.classList.toggle('skillWindowOpen',open);
  if(open){const left=Math.max(0,Math.min(duration/1000,(ends-now)/1000));windowPanel.querySelector('.advancedSkillSeconds').textContent=left.toFixed(1)+'秒';windowPanel.querySelector('.advancedSkillFill').style.transform='scaleX('+(left*1000/duration)+')';windowPanel.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',left.toFixed(2));}
  const button=dock.querySelector('button');button.disabled=!!m.spectator||!open||sending||!skill||actualUsed>=skill.limit||!!window.AdvancedRules.forTurn(m.advanced,m.state.turn)[you];
  paint(button,skill?.id);button.classList.toggle('exhausted',!!skill&&used>=skill.limit);button.setAttribute('aria-busy',String(sending));
  button.querySelector('.advancedSkillName').textContent=skill?.name||'スキル未選択';
  button.querySelector('.advancedSkillUses').textContent=skill?Math.max(0,skill.limit-used)+'/'+skill.limit:'';
  button.querySelector('.advancedSkillDescription').textContent=sending?'発動中…':skill?.description||'';
  dock.querySelector('#advancedOpponentSkill').textContent=other?(m.spectator?'2P：':'相手：')+other.name+' · '+Math.max(0,other.limit-window.AdvancedRules.visibleUses(m,3-you,now))+'/'+other.limit+'回':'';
  const label=skill?skill.name+'、残り'+Math.max(0,skill.limit-used)+'/'+skill.limit+'回。'+(sending?'発動中…':skill.description)+'。'+(open?'スキル選択猶予':'ターン開始時の3秒間に使用'):'';
  button.setAttribute('aria-label',label);button.title=label+'\n'+dock.querySelector('#advancedOpponentSkill').textContent;
  const enemyButton=enemyDock.querySelector('button'),otherUsed=window.AdvancedRules.visibleUses(m,3-you,now);
  paint(enemyButton,other?.id);enemyButton.classList.toggle('exhausted',!!other&&otherUsed>=other.limit);
  enemyButton.querySelector('.advancedSkillName').textContent=other?.name||'スキル未選択';
  enemyButton.querySelector('.advancedSkillUses').textContent=other?Math.max(0,other.limit-otherUsed)+'/'+other.limit:'';
  enemyButton.querySelector('.advancedSkillDescription').textContent=other?.description||'';
  enemyButton.setAttribute('aria-label',other?(m.spectator?'2P：':'相手：')+other.name+'、残り'+Math.max(0,other.limit-otherUsed)+'/'+other.limit+'回。'+other.description:'相手のスキル未選択');enemyButton.title=enemyButton.getAttribute('aria-label');
  if(m.spectator){button.setAttribute('aria-label','1P：'+label);button.title=button.getAttribute('aria-label');}
  for(const [side,target]of [[you,button],[3-you,enemyButton]])target.classList.toggle('usedThisTurn',revealed&&!!window.AdvancedRules.forTurn(m.advanced,m.state.turn)[side]);
  place();window.AdvancedCutin?.sync(m,now,{blocked:animating});
 }
 async function activate(){
  const m=current;if(!m||sending||!advanced(m)||document.getElementById('advancedSkillButton').disabled)return;
  if(typeof playBattleSE==='function')playBattleSE('seAdvancedSkill');
  const generation=epoch;sending=true;sync(m,rankedClockServer+performance.now()-rankedClockAt);
  try{const r=await rankedCommandRpc({op:'advancedSkill',matchId:m.id,turn:m.state.turn});if(generation===epoch&&rankedActive&&rankedMatch?.id===m.id){sending=false;rankedApply(r.match);}}
  catch(error){if(generation===epoch){sending=false;rankedMessage('スキルを発動できませんでした：'+error.message);}}
  finally{if(generation===epoch&&rankedMatch)sync(rankedMatch,rankedClockServer+performance.now()-rankedClockAt);}
 }
 function usedForTurn(m,turn=m?.state?.turn){
  if(!advanced(m))return [];
  const receipts=window.AdvancedRules.forTurn(m.advanced,turn);
  return [1,2].flatMap(player=>{const id=m.advanced?.selected?.[player],skill=window.AdvancedRules.byId[id];return skill&&receipts[player]?.id===id?[{player,id,name:skill.name,description:skill.description,turn,used:receipts[player].used}]:[];});
 }
 function observe(m,onComplete){
  cancelAnimationFrame(observerFrame);observerFrame=0;
  if(!m){sync(null,0);return;}
  const receivedAt=performance.now();let completed=false;
  const tick=()=>{
   observerFrame=0;const now=m.serverNow+performance.now()-receivedAt;
   sync(m,now);
   if(!completed&&window.AdvancedRules.presentationComplete(m,now)){completed=true;onComplete?.(m.skillResult);}
   if(!m.closed)observerFrame=requestAnimationFrame(tick);
  };tick();
 }
 function reset(){document.querySelectorAll('[id$=Stance]').forEach(el=>{el.hidden=true;});cancelAnimationFrame(observerFrame);observerFrame=0;window.AdvancedCutin?.reset();epoch++;sending=false;current=selecting=null;choices.clear();if(selection)selection.hidden=true;if(dock)dock.hidden=true;if(enemyDock)enemyDock.hidden=true;if(windowPanel)windowPanel.hidden=true;document.getElementById('battleScreen')?.classList.remove('advancedMode','advancedSkillChoosing');document.getElementById('techScreen')?.classList.remove('advancedSelection');}
 window.AdvancedSkills={select,ready,loadout,sync,reset,observe,usedForTurn,paintArt:paint};
})();


