// Gauge display and preview controls. S move effects are not defined yet.
(()=>{
 const MAX=30,panels=new Map(),preview=[false,false,false];
 let selectionMatch=null,battleKey='',specialView=false,dock=null;
 const node=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!=null)el.textContent=text;return el;};
 const enabled=m=>window.RoomRules.hasSpecial(m?.roomRules);
 function ensure(side){
  if(panels.has(side))return panels.get(side);
  const area=document.getElementById('player'+side+'Area');if(!area)return null;
  const panel=node('section','specialGaugePanel'),title=node('div','specialGaugeTitle','スペシャル'),row=node('div','specialGaugeRow'),track=node('div','specialGaugeTrack'),fill=node('div','specialGaugeFill'),value=node('span','specialGaugeValue','0/'+MAX);
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
   if(selectionMatch){stableText(name,tech.name,'S'+tech.name,show);stableText(description,tech.description,'スペシャル消費量・効果は準備中',show);}
   else{name.textContent=tech.name;description.textContent=tech.description;}
   name.classList.toggle('specialTechniqueName',show);body.classList.toggle('specialTechniquePreview',show);
  }
 }
 function restoreButtons(){
  for(const button of document.querySelectorAll('.specialTechniqueAction')){
   button.classList.remove('specialTechniqueAction');button.disabled=false;
   const name=button.querySelector('.actionName');if(name&&button.dataset.normalName)name.textContent=button.dataset.normalName;
   button.removeAttribute('title');
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
  screen?.style.setProperty('--special-hp-max',String(match.roomRules.hp??15));
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
  toggle.onclick=()=>{specialView=!specialView;paintBattle(m);};
  toggle.setAttribute('aria-label',specialView?'通常技に戻す':'スペシャル技を表示');toggle.setAttribute('aria-pressed',String(specialView));
  for(let slot=0;slot<3;slot++){
   const button=document.getElementById('p'+m.you+'tech'+slot),tech=typeof techniquePool==='undefined'?null:techniquePool[m.loadouts?.[m.you]?.[slot]];if(!button||!tech)continue;
   button.dataset.normalName=tech.name;button.classList.toggle('specialTechniqueAction',specialView);button.disabled=specialView;
   button.querySelector('.actionName').textContent=(specialView?'S':'')+tech.name;
   if(specialView)button.title='スペシャル消費量・効果は準備中';else button.removeAttribute('title');
   button.setAttribute('aria-disabled',String(specialView||button.classList.contains('disabled')));
  }
  place(m);
 }
 function place(m){
  if(!dock||dock.hidden||!enabled(m))return;
  const screen=document.getElementById('battleScreen'),area=document.getElementById('player'+m.you+'Area');if(!area)return;
  const s=screen.getBoundingClientRect(),r=area.getBoundingClientRect(),skill=document.getElementById('advancedSkillDock');
  const offset=window.RoomRules.hasSkills(m.roomRules)?(skill?.offsetWidth||56)+8:0;
  dock.style.left=Math.max(0,r.right-s.left-dock.offsetWidth-offset)+'px';dock.style.top=Math.max(0,r.top-s.top-dock.offsetHeight-5)+'px';
 }
 window.SpecialGauge={MAX,sync,reset,select,paintSelection,paintBattle,place,isSpecialView};
})();
