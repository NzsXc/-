// Advanced-only skill definitions and effects; temporary power bonuses never enter persisted state.
(()=>{
 const SKILLS=Object.freeze([
  {id:'boost',name:'ゲージ補給',limit:3,description:'ゲージ＋2'},
  {id:'heal',name:'応急回復',limit:2,description:'HPを1回復'},
  {id:'chain',name:'連続使用解除',limit:7,description:'このターンのみ、ブロック・カウンターなどの連続使用禁止を解除。アンチガードの封印は解除しない'},
  {id:'cleanse',name:'リフレッシュ',limit:1,description:'ゲージ＋4、ルインとアンチガードを解除'},
  {id:'invincible',name:'無敵',limit:3,description:'このターンの相手からのHPダメージとルインを無効化。自傷ダメージは受ける'},
  {id:'stance',name:'攻撃態勢',limit:3,description:'このターンのみ、攻撃力＋1（エンハンスと重複可能）'}
 ].map(Object.freeze));
 const byId=Object.fromEntries(SKILLS.map(s=>[s.id,s]));
 const isAdvanced=rules=>rules?.mode==='advanced';
 const hasSkills=rules=>isAdvanced(rules)&&rules.skills!==false;
 const exhausted=(advanced,rules)=>isAdvanced(rules)&&!hasSkills(rules)||[1,2].every(p=>{const skill=byId[advanced?.selected?.[p]];return !!skill&&(advanced?.current?.[p]?.used||0)>=skill.limit;});
 const windowMs=state=>state?.skillsExhausted===true?0:3000;
 const active=(selected,turn,p,id)=>selected?.[p]===id&&turn?.[p]?.id===id;
 function forTurn(advanced,turn){
  if(!Number.isInteger(turn)||turn<1)return {};
  const out={};for(const p of [1,2]){
   const latest=advanced?.current?.[p];
   if(latest?.turn===turn)out[p]=latest;
   else for(const receipt of Object.values(advanced?.uses?.[p]||{}))if(receipt?.turn===turn)out[p]=receipt;
  }return out;
 }
 function preview(state,selected,turn,rules={}){
  if(!state)return state;const s={...state};
  if(isAdvanced(rules)&&!hasSkills(rules))return s;
  for(const p of [1,2]){
   if(active(selected,turn,p,'boost'))s['gauge'+p]=Math.min(rules.maxGauge??10,s['gauge'+p]+2);
   if(active(selected,turn,p,'heal'))s['hp'+p]=Math.min(rules.hp??10,s['hp'+p]+1);
   if(active(selected,turn,p,'chain'))s['last'+p]='';
   if(active(selected,turn,p,'cleanse')){s['gauge'+p]=Math.min(rules.maxGauge??10,s['gauge'+p]+4);s['seal'+p]=false;s['ruin'+p]=0;if('specialSeal'+p in s){s['specialSeal'+p]=0;s['specialRuin'+p]=0;}}
  }
  return s;
 }
 function resolve(state,moves,selected,turn,calculate,rules={}){
  if(isAdvanced(rules)&&!hasSkills(rules))return calculate(state,moves,state.specialSeal1!=null?3:2,rules);
  const s=preview(state,selected,turn,rules),powerBonus={1:active(selected,turn,1,'stance')?1:0,2:active(selected,turn,2,'stance')?1:0};
  const out=calculate(s,moves,s.specialSeal1!=null?3:2,rules,powerBonus);
  for(const p of [1,2])if(active(selected,turn,p,'invincible')){
   out['damage'+p]=out['skill'+p]==='tech7'?2:0;
   out['hp'+p]=out['misses'+p]>=2?0:Math.max(0,out['healed'+p]-out['damage'+p]);
  }
  return out;
 }
 const CUTIN_MS=1900,EFFECT_MS=1200;
 const presentationMs=(advanced,turn)=>Object.keys(forTurn(advanced,turn)).length?CUTIN_MS+EFFECT_MS:0;
 // Counts are reserved immediately, but their public display waits for the reveal.
 function presentationComplete(m,now){
  if(m.closed)return true;
  if(!m.skillWindow)return false;
  const start=m.skillWindow.confirmAt??m.skillWindow.endAt;
  return m.serverNow>=start&&now>=start+presentationMs(m.advanced,m.state?.turn);
 }
 function visibleUses(m,player,now){
  const count=Number(m.advanced?.current?.[player]?.used||0);
  return Math.max(0,count-(!presentationComplete(m,now)&&forTurn(m.advanced,m.state?.turn)[player]?1:0));
 }
 function skillWindowForState(s){
  const startAt=Number.isFinite(s.previousDeadline)?Math.max(s.startedAt,Math.min(s.startedAt+3000,s.previousDeadline))+3100:s.startedAt+(s.turn>1?7500:5600);
  const duration=windowMs(s),endAt=startAt+duration;
  return {startAt,endAt,confirmAt:endAt+(duration?500:0)};
 }
 const api={SKILLS,byId,isAdvanced,hasSkills,active,forTurn,preview,resolve,presentationMs,presentationComplete,visibleUses,skillWindowForState,exhausted,windowMs,WINDOW_MS:3000,GRACE_MS:500,CUTIN_MS,EFFECT_MS};
 if(typeof window!=='undefined')window.AdvancedRules=api;
 if(typeof module!=='undefined')module.exports=api;
})();


