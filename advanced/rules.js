// Advanced-only skill definitions and effects. The existing calculator is injected unchanged.
(()=>{
 const SKILLS=Object.freeze([
  {id:'boost',name:'ゲージ補給',limit:3,description:'ゲージ＋2'},
  {id:'heal',name:'応急回復',limit:2,description:'HPを1回復'},
  {id:'chain',name:'連続使用解除',limit:5,description:'このターンのみ、ブロック・カウンターなどの連続使用禁止を解除。アンチガードの封印は解除しない'},
  {id:'cleanse',name:'リフレッシュ',limit:1,description:'ゲージ＋4、ルインとアンチガードを解除'},
  {id:'invincible',name:'無敵',limit:2,description:'このターンの相手からのHPダメージとルインを無効化。自傷ダメージは受ける'}
 ].map(Object.freeze));
 const byId=Object.fromEntries(SKILLS.map(s=>[s.id,s]));
 const isAdvanced=rules=>rules?.mode==='advanced';
 const active=(selected,turn,p,id)=>selected?.[p]===id&&turn?.[p]?.id===id;
 function forTurn(advanced,turn){
  const out={};for(const p of [1,2]){
   const latest=advanced?.current?.[p];
   if(latest?.turn===turn)out[p]=latest;
   else for(const receipt of Object.values(advanced?.uses?.[p]||{}))if(receipt.turn===turn)out[p]=receipt;
  }return out;
 }
 function preview(state,selected,turn,rules={}){
  if(!state)return state;const s={...state};
  for(const p of [1,2]){
   if(active(selected,turn,p,'boost'))s['gauge'+p]=Math.min(rules.maxGauge??10,s['gauge'+p]+2);
   if(active(selected,turn,p,'heal'))s['hp'+p]=Math.min(rules.hp??10,s['hp'+p]+1);
   if(active(selected,turn,p,'chain'))s['last'+p]='';
   if(active(selected,turn,p,'cleanse')){s['gauge'+p]=Math.min(rules.maxGauge??10,s['gauge'+p]+4);s['seal'+p]=false;s['ruin'+p]=0;}
  }
  return s;
 }
 function resolve(state,moves,selected,turn,calculate,rules={}){
  const s=preview(state,selected,turn,rules),out=calculate(s,moves,2,rules);
  for(const p of [1,2])if(active(selected,turn,p,'invincible')){
   out['damage'+p]=out['skill'+p]==='tech7'?2:0;
   out['hp'+p]=out['misses'+p]>=2?0:Math.max(0,out['healed'+p]-out['damage'+p]);
  }
  return out;
 }
 const api={SKILLS,byId,isAdvanced,active,forTurn,preview,resolve,WINDOW_MS:2000};
 if(typeof window!=='undefined')window.AdvancedRules=api;
 if(typeof module!=='undefined')module.exports=api;
})();
