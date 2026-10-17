// UI lifecycle for Advanced. Hooks return immediately for all other room modes.
(()=>{
 const choices=new Map();let current=null,sending=false,epoch=0,selection=null,dock=null,windowPanel=null;
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
   const button=node('button','advancedSkillButton');button.type='button';button.id='advancedSkillButton';button.addEventListener('click',activate);
   button.append(node('strong','advancedSkillName'),node('span','advancedSkillUses'),node('small','advancedSkillDescription'));
   const other=node('span','advancedOpponentSkill');other.id='advancedOpponentSkill';dock.append(button,other);document.getElementById('battleScreen').append(dock);
  }
  if(!windowPanel){
   windowPanel=node('section','advancedSkillWindow');windowPanel.id='advancedSkillWindow';windowPanel.setAttribute('aria-label','スキル選択猶予');
   const heading=node('div','advancedSkillWindowHeading');heading.append(node('strong',null,'スキル選択猶予'),node('span','advancedSkillSeconds'));
   const track=node('div','advancedSkillTrack'),fill=node('div','advancedSkillFill');track.setAttribute('role','progressbar');track.setAttribute('aria-label','スキル選択猶予の残り時間');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','2');track.append(fill);
   windowPanel.append(heading,track);document.getElementById('battleCenter').append(windowPanel);
  }
 }
 function sync(m,now){
  const enabled=advanced(m)&&!!m.state,screen=document.getElementById('battleScreen');
  screen?.classList.toggle('advancedMode',enabled);
  if(!enabled){current=null;if(dock)dock.hidden=true;if(windowPanel)windowPanel.hidden=true;if(!advanced(m)&&selection){selection.hidden=true;document.getElementById('techScreen')?.classList.remove('advancedSelection');}return;}
  current=m;ensureBattle();dock.hidden=false;
  const you=m.you,skill=window.AdvancedRules.byId[m.advanced?.selected?.[you]],other=window.AdvancedRules.byId[m.advanced?.selected?.[3-you]],used=m.advanced?.current?.[you]?.used||0;
  const open=!m.closed&&!rankedAnimating&&now>=m.opensAt-2000&&now<m.opensAt;
  if(open)PlayerIntro.cancel();windowPanel.hidden=!open;
  if(open){const left=Math.max(0,Math.min(2,(m.opensAt-now)/1000));windowPanel.querySelector('.advancedSkillSeconds').textContent=left.toFixed(1)+'秒';windowPanel.querySelector('.advancedSkillFill').style.transform='scaleX('+(left/2)+')';windowPanel.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',left.toFixed(2));}
  const button=dock.querySelector('button');button.disabled=!open||sending||!skill||used>=skill.limit||!!window.AdvancedRules.forTurn(m.advanced,m.state.turn)[you];
  button.querySelector('.advancedSkillName').textContent=skill?.name||'スキル未選択';
  button.querySelector('.advancedSkillUses').textContent=skill?Math.max(0,skill.limit-used)+'/'+skill.limit+'回':'';
  button.querySelector('.advancedSkillDescription').textContent=sending?'発動中…':skill?.description||'';
  dock.querySelector('#advancedOpponentSkill').textContent=other?'相手：'+other.name+' · '+Math.max(0,other.limit-(m.advanced?.current?.[3-you]?.used||0))+'/'+other.limit+'回':'';
 }
 async function activate(){
  const m=current;if(!m||sending||!advanced(m)||document.getElementById('advancedSkillButton').disabled)return;
  const generation=epoch;sending=true;sync(m,rankedClockServer+performance.now()-rankedClockAt);
  try{const r=await rankedCommandRpc({op:'advancedSkill',matchId:m.id,turn:m.state.turn});if(generation===epoch&&rankedActive&&rankedMatch?.id===m.id){sending=false;rankedApply(r.match);}}
  catch(error){if(generation===epoch){sending=false;rankedMessage('スキルを発動できませんでした：'+error.message);}}
  finally{if(generation===epoch&&rankedMatch)sync(rankedMatch,rankedClockServer+performance.now()-rankedClockAt);}
 }
 function reset(){epoch++;sending=false;current=null;choices.clear();if(selection)selection.hidden=true;if(dock)dock.hidden=true;if(windowPanel)windowPanel.hidden=true;document.getElementById('battleScreen')?.classList.remove('advancedMode');document.getElementById('techScreen')?.classList.remove('advancedSelection');}
 window.AdvancedSkills={select,ready,loadout,sync,reset};
})();
