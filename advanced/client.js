// UI lifecycle for Advanced. Hooks return immediately for all other room modes.
(()=>{
 const choices=new Map();let current=null,sending=false,epoch=0,selection=null,dock=null,enemyDock=null,windowPanel=null;
 const advanced=m=>m?.roomRules?.mode==='advanced';
 const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;};
 function select(m){
  const screen=document.getElementById('techScreen');if(!screen)return;
  screen.classList.toggle('advancedSelection',advanced(m)&&m.phase==='select');
  if(!advanced(m)||m.phase!=='select'){if(selection)selection.hidden=true;return;}
  const saved=m.advanced?.selected?.[m.you],key=m.id;
  if(saved)choices.set(key,saved);
  if(!selection){selection=node('fieldset','advancedSkillSelection');selection.id='advancedSkillSelection';screen.querySelector('.techSelect').insertBefore(selection,document.getElementById('techConfirmButton'));}
  selection.hidden=false;
  const signature=JSON.stringify([key,saved,!!m.ready[m.you],choices.get(key)]);
  if(selection.dataset.signature===signature)return;selection.dataset.signature=signature;
  const legend=node('legend',null,'スキルを1つ選択');selection.replaceChildren(legend);
  for(const skill of window.AdvancedRules.SKILLS){
   const label=node('label','advancedSkillChoice'),radio=node('input');radio.type='radio';radio.name='advancedSkill';radio.value=skill.id;radio.checked=choices.get(key)===skill.id;radio.disabled=!!m.ready[m.you];
   const text=node('span'),title=node('strong',null,skill.name+' · '+skill.limit+'/'+skill.limit+'回'),description=node('small',null,skill.description);text.append(title,description);label.append(radio,text);selection.append(label);
   radio.addEventListener('change',()=>{choices.set(key,skill.id);selection.dataset.signature='';const button=document.getElementById('techConfirmButton');button.disabled=!!m.ready[m.you]||rankedSending;});
  }
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
 const artParts={boost:['energy-halo','battery','bolt','spark s1','spark s2'],heal:['heal-pulse','medical-cross','mote m1','mote m2','mote m3'],chain:['chain-link link-a','chain-link link-b','break-flash','break-ray ray-a','break-ray ray-b'],cleanse:['cleanse-orbit orbit-a','cleanse-orbit orbit-b','cleanse-core','cleanse-star','debris'],invincible:['star-glow','invincible-star','star-gleam','star-spark']};
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
  const enabled=advanced(m)&&!!m.state,screen=document.getElementById('battleScreen');
  screen?.classList.toggle('advancedMode',enabled);
  if(!enabled){screen?.classList.remove('advancedSkillChoosing');window.AdvancedCutin?.cancel();current=null;if(dock)dock.hidden=true;if(enemyDock)enemyDock.hidden=true;if(windowPanel)windowPanel.hidden=true;if(!advanced(m)&&selection){selection.hidden=true;document.getElementById('techScreen')?.classList.remove('advancedSelection');}return;}
  current=m;ensureBattle();dock.hidden=false;enemyDock.hidden=false;
  const you=m.you,skill=window.AdvancedRules.byId[m.advanced?.selected?.[you]],other=window.AdvancedRules.byId[m.advanced?.selected?.[3-you]],used=m.advanced?.current?.[you]?.used||0;
  const duration=window.AdvancedRules.WINDOW_MS,ends=m.skillWindow?.endAt??m.opensAt,starts=m.skillWindow?.startAt??ends-duration,open=!m.closed&&!rankedAnimating&&now>=starts&&now<ends;
  if(open)PlayerIntro.cancel();windowPanel.hidden=!open;
  screen.classList.toggle('advancedSkillChoosing',open);
  dock.classList.toggle('skillWindowOpen',open);enemyDock.classList.toggle('skillWindowOpen',open);
  if(open){const left=Math.max(0,Math.min(duration/1000,(ends-now)/1000));windowPanel.querySelector('.advancedSkillSeconds').textContent=left.toFixed(1)+'秒';windowPanel.querySelector('.advancedSkillFill').style.transform='scaleX('+(left*1000/duration)+')';windowPanel.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',left.toFixed(2));}
  const button=dock.querySelector('button');button.disabled=!open||sending||!skill||used>=skill.limit||!!window.AdvancedRules.forTurn(m.advanced,m.state.turn)[you];
  paint(button,skill?.id);button.classList.toggle('exhausted',!!skill&&used>=skill.limit);button.setAttribute('aria-busy',String(sending));
  button.querySelector('.advancedSkillName').textContent=skill?.name||'スキル未選択';
  button.querySelector('.advancedSkillUses').textContent=skill?Math.max(0,skill.limit-used)+'/'+skill.limit:'';
  button.querySelector('.advancedSkillDescription').textContent=sending?'発動中…':skill?.description||'';
  dock.querySelector('#advancedOpponentSkill').textContent=other?'相手：'+other.name+' · '+Math.max(0,other.limit-(m.advanced?.current?.[3-you]?.used||0))+'/'+other.limit+'回':'';
  const label=skill?skill.name+'、残り'+Math.max(0,skill.limit-used)+'/'+skill.limit+'回。'+(sending?'発動中…':skill.description)+'。'+(open?'スキル選択猶予':'ターン開始時の3秒間に使用'):'';
  button.setAttribute('aria-label',label);button.title=label+'\n'+dock.querySelector('#advancedOpponentSkill').textContent;
  const enemyButton=enemyDock.querySelector('button'),otherUsed=m.advanced?.current?.[3-you]?.used||0;
  paint(enemyButton,other?.id);enemyButton.classList.toggle('exhausted',!!other&&otherUsed>=other.limit);
  enemyButton.querySelector('.advancedSkillName').textContent=other?.name||'スキル未選択';
  enemyButton.querySelector('.advancedSkillUses').textContent=other?Math.max(0,other.limit-otherUsed)+'/'+other.limit:'';
  enemyButton.querySelector('.advancedSkillDescription').textContent=other?.description||'';
  enemyButton.setAttribute('aria-label',other?'相手：'+other.name+'、残り'+Math.max(0,other.limit-otherUsed)+'/'+other.limit+'回。'+other.description:'相手のスキル未選択');enemyButton.title=enemyButton.getAttribute('aria-label');
  for(const [side,target]of [[you,button],[3-you,enemyButton]])target.classList.toggle('usedThisTurn',!!window.AdvancedRules.forTurn(m.advanced,m.state.turn)[side]);
  place();window.AdvancedCutin?.sync(m,now,{blocked:rankedAnimating});
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
 function reset(){window.AdvancedCutin?.reset();epoch++;sending=false;current=null;choices.clear();if(selection)selection.hidden=true;if(dock)dock.hidden=true;if(enemyDock)enemyDock.hidden=true;if(windowPanel)windowPanel.hidden=true;document.getElementById('battleScreen')?.classList.remove('advancedMode','advancedSkillChoosing');document.getElementById('techScreen')?.classList.remove('advancedSelection');}
 window.AdvancedSkills={select,ready,loadout,sync,reset,usedForTurn};
})();
