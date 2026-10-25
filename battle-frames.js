/* Approved battle-card frames. Appearance never changes battle rules or input. */
(()=>{
 'use strict';
 const items=[
  {id:'',name:'標準',description:'最初から使用できます'},
  {id:'silver',name:'白銀',design:'silver',threshold:30,description:'5種類の技をそれぞれ30回使用'},
  {id:'blue-flame',name:'青紅蓮',design:'flame',threshold:50,description:'5種類の技をそれぞれ50回使用'},
  {id:'gold',name:'金',design:'imperial',wins:100,description:'総勝利100回（ランダム＋ルーム対戦）'},
  {id:'diamond',name:'ダイヤ',design:'gold',total:777,description:'技の総使用回数777回'}
 ];
 const byId=Object.fromEntries(items.map(item=>[item.id,item]));
 const count=value=>Number.isSafeInteger(value)&&value>=0?value:0;
 function progress(data={}){
  const counts=Array.from({length:19},(_,i)=>count(data.uses?.[i+1]?.count));
  return {at30:counts.filter(n=>n>=30).length,at50:counts.filter(n=>n>=50).length,total:counts.reduce((sum,n)=>Math.min(Number.MAX_SAFE_INTEGER,sum+n),0),wins:Math.min(Number.MAX_SAFE_INTEGER,count(data.onlineWins)+count(data.friendWins))};
 }
 function unlocked(id,data){const item=byId[id];if(!item)return false;if(!id)return true;const p=progress(data);return item.threshold?(item.threshold===30?p.at30:p.at50)>=5:item.wins?p.wins>=item.wins:p.total>=item.total;}
 const normalize=id=>typeof id==='string'&&Object.hasOwn(byId,id)?id:'';
 function detail(id,data){const item=byId[id],p=progress(data);return !id?'いつでも選択可能':item.threshold?Math.min(5,item.threshold===30?p.at30:p.at50)+' / 5 種類':item.wins?Math.min(item.wins,p.wins)+' / '+item.wins+' 勝':Math.min(item.total,p.total)+' / '+item.total+' 回';}
 function part(className){const el=document.createElement('span');el.className=className;el.setAttribute('aria-hidden','true');return el;}
 function apply(surface,id){
  if(!surface)return;id=normalize(id);
  if(surface.dataset.frameId===id)return;
  surface.querySelectorAll(':scope > .bf-decor,:scope > .bf-frame-emission,:scope > .bf-frame-reflection,:scope > .bf-sparkle').forEach(el=>el.remove());
  surface.dataset.frameId=id;surface.classList.toggle('bf-surface',!!id);
  if(!id){delete surface.dataset.battleFrame;return;}
  surface.dataset.battleFrame=byId[id].design;
  const decor=part('bf-decor');
  for(const name of ['pattern','rail','rail right','topline','bottomline','corner','corner tr','corner bl','corner br','emblem','rivet','rivet right']){
   const el=part('bf-'+name);if(name==='emblem')el.append(part('bf-emblem-gem'));decor.append(el);
  }
  surface.append(decor,part('bf-frame-emission'),part('bf-frame-reflection'));
  if(id==='diamond')for(const [x,y,size,delay]of [['12px','12px',44,0],['calc(100% - 12px)','12px',38,-1.2],['12px','calc(100% - 12px)',40,-2.4],['calc(100% - 12px)','calc(100% - 12px)',46,-3.6],['30%','7px',20,-1.8],['67%','calc(100% - 7px)',22,-.6],['7px','44%',18,-3],['calc(100% - 7px)','62%',20,-4.2],['calc(100% - 42px)','24px',29,-2.8]]){
   const el=part('bf-sparkle');for(const [key,value]of Object.entries({'--spark-x':x,'--spark-y':y,'--spark-size':size+'px','--spark-delay':delay+'s'}))el.style.setProperty(key,value);surface.append(el);
  }
 }
 function preview(id){const el=document.createElement('span');el.className='battleFramePreview';apply(el,id);const label=document.createElement('span');label.className='battleFramePreviewLabel';label.textContent=byId[id]?.name||'標準';el.append(label);return el;}
 let latest={},matchKey='',epoch=0;const requested=new Map();
 function syncPlayers(players={},key=''){
  latest=players||{};if(key!==matchKey){matchKey=key;requested.clear();epoch++;}
  for(const side of [1,2]){
   const uid=latest[side]?.uid||'',surface=document.getElementById('player'+side+'Area'),requestKey=uid+':'+epoch;
   if(requested.get(side)===requestKey)continue;requested.set(side,requestKey);apply(surface,'');
   if(!uid||!window.battleFrameService)continue;
   Promise.resolve(window.battleFrameService.forPlayer(uid)).then(id=>{if(requested.get(side)===requestKey)apply(surface,id);}).catch(error=>console.warn('フレームを取得できませんでした',error));
  }
 }
 function refresh(){requested.clear();epoch++;syncPlayers(latest,matchKey);}
 window.addEventListener('battle-frame-changed',refresh);
 window.BattleFrameCatalog={items,byId,progress,unlocked,normalize,detail};
 window.BattleFrames={apply,preview,syncPlayers,refresh};
})();
