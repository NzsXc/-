/* Read only the equipped techniques, never the opponent's selected action. */
(()=>{
 let state=null,open=false,key='',area=null;
 const screen=document.getElementById('battleScreen');if(!screen)return;
 const button=document.createElement('button');button.id='battleInspectorToggle';button.type='button';button.hidden=true;
 button.className='battle-inspector-toggle';button.setAttribute('aria-label','両者の3技の効果を確認');
 button.setAttribute('aria-controls','battleInspectorPanel');button.setAttribute('aria-expanded','false');
 const lens=document.createElement('span');lens.className='battle-inspector-lens';lens.setAttribute('aria-hidden','true');button.append(lens);
 const panel=document.createElement('section');panel.id='battleInspectorPanel';panel.hidden=true;
 panel.className='battle-inspector-panel';panel.setAttribute('aria-label','両者の装備技と効果');panel.setAttribute('role','region');
 screen.append(panel,button);
 function place(){
  if(!area||button.hidden)return;
  const r=area.getBoundingClientRect(),s=screen.getBoundingClientRect();
  button.style.left=(r.right-s.left-44)+'px';button.style.top=(r.top-s.top-49)+'px';
 }
 const resize=new ResizeObserver(place);resize.observe(screen);
 window.addEventListener('resize',place);window.addEventListener('scroll',place,{passive:true});
 function node(tag,cls,text){const n=document.createElement(tag);n.className=cls;if(text!=null)n.textContent=text;return n;}
 function close(){open=false;panel.hidden=true;button.setAttribute('aria-expanded','false');}
 function render(){
  const heading=node('div','battle-inspector-heading');heading.append(node('h2','','両者の3技'));
  const dismiss=node('button','battle-inspector-close','閉じる');dismiss.type='button';dismiss.onclick=()=>{close();button.focus();};heading.append(dismiss);
  const columns=node('div','battle-inspector-columns');
  for(const side of [state.side,3-state.side]){
   const section=node('section','battle-inspector-player');
   section.append(node('h3','',(side===state.side?'自分':'相手')+'：'+(state.names?.[side]||side+'P')));
   const list=node('ol','battle-inspector-techniques');
   for(const tech of state.loadouts[side].slice(0,3)){
    const item=node('li','');item.append(node('strong','',tech.name),node('p','',tech.description));list.append(item);
   }
   section.append(list);columns.append(section);
  }
  panel.replaceChildren(heading,columns);
 }
 button.onclick=()=>{if(!state?.enabled)return;if(open){close();return;}render();open=true;panel.hidden=false;button.setAttribute('aria-expanded','true');};
 document.addEventListener('keydown',e=>{if(open&&e.key==='Escape'){e.preventDefault();close();button.focus();}});
 function update(next){
  const enabled=!!next.enabled&&[1,2].includes(next.side)&&[1,2].every(p=>next.loadouts?.[p]?.length===3);
  state={...next,enabled};
  const nextArea=enabled?document.getElementById('player'+next.side+'Area'):null;
  if(nextArea!==area){if(area){area.classList.remove('has-battle-inspector');resize.unobserve(area);}area=nextArea;if(area)resize.observe(area);}
  button.hidden=!enabled;
  if(!enabled){close();return;}
  area.classList.add('has-battle-inspector');
  button.dataset.player=String(next.side);place();
  const nextKey=JSON.stringify([next.side,next.loadouts,next.names]);if(open&&nextKey!==key)render();key=nextKey;
 }
 window.BattleInspector={update,close,isOpen:()=>open};
})();
