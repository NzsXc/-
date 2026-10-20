// Versioned S move controls and public battle statuses.
(()=>{
 const MAX=30,panels=new Map(),preview=[false,false,false];
 let selectionMatch=null,battleKey='',specialView=false,dock=null;
 const node=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!=null)el.textContent=text;return el;};
 const enabled=m=>window.RoomRules.hasSpecial(m?.roomRules);
 const explanations=['相殺に勝つ。\nS同士は通常相殺。','反射ダメージが2に。','常に基本攻撃力3。','HPを2回復。','通常ゲージを\n追加で＋3。','次のモーメンタム＋1。\n通常・S共通。','Sゲージ＋15。','2ターン、装備技と\nブロックを封印。','攻撃力＋1が\n次の4ターン続く。','通常ゲージを\n最大3奪う。','3ターン、チャージ時\n通常ゲージ－1。','基礎技をまねると\n通常ゲージ＋2。'];
 function ensure(side){
  if(panels.has(side))return panels.get(side);
  const area=document.getElementById('player'+side+'Area');if(!area)return null;
  const panel=node('section','specialGaugePanel'),title=node('div','specialGaugeTitle','スペシャル'),row=node('div','specialGaugeRow'),track=node('div','specialGaugeTrack'),fill=node('div','specialGaugeFill'),value=node('span','specialGaugeValue','0/'+MAX);
  title.append(node('small','specialGaugeHint','（チャージ、ターン終了、被弾ごとに+1）'));
  panel.id='specialGauge'+side;panel.setAttribute('aria-label',side+'Pのスペシャルゲージ');
  track.setAttribute('role','progressbar');track.setAttribute('aria-label','スペシャルゲージ');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(MAX));
  track.append(fill);row.append(track,value);panel.append(title,row);
  area.insertBefore(panel,document.getElementById('actions'+side));panels.set(side,panel);return panel;
 }
 function select(match){
  const active=enabled(match)&&match.phase==='select';
  if(selectionMatch?.id!==match?.id)preview.fill(false);
  selectionMatch=active?match:null;
  const note=document.getElementById('specialSelectionNote');if(note)note.hidden=!active;
  paintSelection();
 }
 function stableText(target,normal,special,show){
  const text=node('span','specialPreviewText',show?special:normal),reserve=node('span','specialPreviewReserve',show?normal:special);
  reserve.setAttribute('aria-hidden','true');target.replaceChildren(text,reserve);
 }
 function paintSelection(){
  if(typeof techniquePool==='undefined'||typeof selectedTechniques==='undefined')return;
  for(let slot=0;slot<3;slot++){
   const name=document.getElementById('techIcon'+slot),description=document.getElementById('techCardDescription'+slot);if(!name||!description)continue;
   const body=name.parentElement;body.classList.toggle('specialSelectionBody',!!selectionMatch);let button=body.querySelector('.specialPreviewToggle');
   if(selectionMatch&&!button){button=node('button','specialPreviewToggle','⇋');button.type='button';button.onclick=()=>{preview[slot]=!preview[slot];paintSelection();};body.append(button);}
   if(button){button.hidden=!selectionMatch;button.setAttribute('aria-label','通常技とスペシャル技の説明を切り替え');button.setAttribute('aria-pressed',String(!!selectionMatch&&preview[slot]));}
   const tech=techniquePool[selectedTechniques[selectingPlayer][slot]],show=!!selectionMatch&&preview[slot];if(!tech)continue;
   if(selectionMatch){stableText(name,tech.name,'S'+tech.name,show);stableText(description,tech.description,'Sゲージ追加消費+'+window.SpecialRules.definitions[selectedTechniques[selectingPlayer][slot]].cost+' / '+window.SpecialRules.definitions[selectedTechniques[selectingPlayer][slot]].description,show);}
   else{name.textContent=tech.name;description.textContent=tech.description;}
   name.classList.toggle('specialTechniqueName',show);body.classList.toggle('specialTechniquePreview',show);
  }
 }
 function restoreButtons(){
  for(const button of document.querySelectorAll('.specialExplanation')){button.classList.remove('specialExplanation');button.disabled=false;button.removeAttribute('aria-label');button.removeAttribute('aria-disabled');}
  for(const button of document.querySelectorAll('.specialTechniqueAction')){
   button.classList.remove('specialTechniqueAction');button.disabled=false;
   const name=button.querySelector('.actionName');if(name&&button.dataset.normalName)name.textContent=button.dataset.normalName;
   const cost=button.querySelector('.specialMoveCost');if(cost)cost.hidden=true;button.removeAttribute('title');
  }
 }
 function reset(){
  for(const panel of panels.values())panel.hidden=true;
  select(null);battleKey='';specialView=false;if(dock)dock.hidden=true;restoreButtons();
  document.getElementById('battleScreen')?.classList.remove('specialMode');
 }
 function sync(match){
  if(!enabled(match)){reset();return;}
  const screen=document.getElementById('battleScreen');screen?.classList.add('specialMode');
  screen?.style.setProperty('--special-hp-max',String(match.roomRules.hp??12));
  for(const side of [1,2]){
   const panel=ensure(side);if(!panel)continue;panel.hidden=false;
   const raw=Number(match.special?.gauge?.[side]??0),amount=Number.isFinite(raw)?Math.max(0,Math.min(MAX,Math.floor(raw))):0;
   panel.querySelector('.specialGaugeValue').textContent=amount+'/'+MAX;panel.querySelector('.specialGaugeFill').style.width=(amount/MAX*100)+'%';
   const track=panel.querySelector('[role="progressbar"]');track.setAttribute('aria-valuenow',String(amount));track.setAttribute('aria-valuetext',amount+' / '+MAX);
  }
 }
 function isSpecialView(m){return enabled(m)&&battleKey===m.id&&specialView;}
 function paintBattle(m){
  const active=enabled(m)&&!!m.state&&!m.spectator;
  if(!active){if(dock)dock.hidden=true;restoreButtons();return;}
  if(battleKey!==m.id){battleKey=m.id;specialView=false;restoreButtons();}
  if(!dock){
   dock=node('section','specialSwitchDock');dock.id='specialSwitchDock';
   const button=node('button','specialBattleToggle','⇋');button.type='button';button.append(node('small','','S技'));
   dock.append(button);document.getElementById('battleScreen').append(dock);
  }
  dock.hidden=m.closed;const toggle=dock.querySelector('button');
  toggle.onclick=()=>{specialView=!specialView;if(typeof updateDisabledActions==='function')updateDisabledActions();else paintBattle(m);};
  toggle.setAttribute('aria-label',specialView?'通常技に戻す':'スペシャル技を表示');toggle.setAttribute('aria-pressed',String(specialView));
  for(const [slot,action]of ['charge','attack','block'].entries()){
   const button=document.querySelector('#player'+m.you+'Area [data-action="'+action+'"]');if(!button)continue;
   button.classList.toggle('specialExplanation',specialView);button.disabled=specialView;
   if(specialView){
    const index=m.loadouts?.[m.you]?.[slot],tech=techniquePool[index],definition=window.SpecialRules.definitions[index];if(!tech||!definition)continue;
    let box=button.querySelector('.specialMoveExplanation');if(!box){box=node('span','specialMoveExplanation');box.append(node('strong',''),node('span',''));button.append(box);}
    box.querySelector('strong').textContent='S'+tech.name;box.querySelector('span').textContent=explanations[index];
    button.setAttribute('aria-label','S'+tech.name+'：Sゲージ追加消費'+definition.cost+'。'+definition.description);button.setAttribute('aria-disabled','true');
   }else{button.removeAttribute('aria-label');button.removeAttribute('aria-disabled');}
  }
  for(let slot=0;slot<3;slot++){
   const button=document.getElementById('p'+m.you+'tech'+slot),tech=typeof techniquePool==='undefined'?null:techniquePool[m.loadouts?.[m.you]?.[slot]];if(!button||!tech)continue;
   button.dataset.normalName=tech.name;button.classList.toggle('specialTechniqueAction',specialView);
   const usable=typeof isBattleActionAvailable==='function'?isBattleActionAvailable(m.you,'tech'+slot):false,ready=m.special?.version===2;
   button.disabled=specialView&&!ready;button.classList.toggle('disabled',!usable||button.disabled);
   button.querySelector('.actionName').textContent=(specialView?'S':'')+tech.name;
   if(specialView){const d=window.SpecialRules.definitions[m.loadouts[m.you][slot]];button.title=ready?'Sゲージ追加消費+'+d.cost+' / '+d.description:'この対戦は旧スペシャル仕様です。新しく部屋を作るとS技を使えます。';
    let cost=button.querySelector('.specialMoveCost');if(!cost){cost=node('small','specialMoveCost');button.append(cost);}cost.textContent='S '+d.cost;
   }else button.removeAttribute('title');
   const cost=button.querySelector('.specialMoveCost');if(cost)cost.hidden=!specialView;
   button.setAttribute('aria-disabled',String(button.disabled||button.classList.contains('disabled')));
  }
  place(m);
 }
 function battleData(m,player,action,base){
  if(!isSpecialView(m)||!action.startsWith('tech'))return base;
  const index=m.loadouts?.[player]?.[Number(action.slice(4))];return window.SpecialRules.actionData(index+15,techniquePool);
 }
 function paintStatuses(m){
  for(const side of [1,2])for(const [key,title,description]of [['specialSeal','Sアンチガード','装備技3つとブロックを封印'],['specialMomentum','次のモーメンタム+1','次のモーメンタムの攻撃力+1']]){
   const name=document.getElementById('player'+side+'Statuses')||document.querySelector('#player'+side+'Area .playerName');let el=document.getElementById('p'+side+key);
   if(!el&&name){el=node('span','enhanceIndicator blockSealIndicator');el.id='p'+side+key;name.append(el);}if(!el)continue;
   const value=Number(m?.state?.[key]?.[side]||0);el.hidden=value<=0;el.textContent=title+(key==='specialSeal'?' '+value+'T':'');el.title=description;el.setAttribute('role','status');
  }
 }
 function place(m){
  if(!dock||dock.hidden||!enabled(m))return;
  const screen=document.getElementById('battleScreen'),area=document.getElementById('player'+m.you+'Area');if(!area)return;
  const s=screen.getBoundingClientRect(),r=area.getBoundingClientRect(),skill=document.getElementById('advancedSkillDock');
  const offset=window.RoomRules.hasSkills(m.roomRules)?(skill?.offsetWidth||56)+8:0;
  dock.style.left=Math.max(0,r.right-s.left-dock.offsetWidth-offset)+'px';dock.style.top=Math.max(0,r.top-s.top-dock.offsetHeight-5)+'px';
 }
 window.SpecialGauge={MAX,sync,reset,select,paintSelection,paintBattle,place,isSpecialView,battleData,paintStatuses};
})();
