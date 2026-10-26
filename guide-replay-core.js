/* Replay outcomes use the production resolver; no HP, gauge or effects are invented. */
(()=>{
 'use strict';
 const V=typeof BattleV4!=='undefined'?BattleV4:require('./combat-v4.js');
 const S=typeof SpecialRules!=='undefined'?SpecialRules:require('./advanced/special-rules.js');
 const A=typeof AdvancedRules!=='undefined'?AdvancedRules:require('./advanced/rules.js');
 const initial=patch=>({turn:1,startedAt:0,hp1:8,hp2:8,gauge1:8,gauge2:8,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0,...V.extraState(),...V.extraSpecialState(),...S.extraState(),...patch});
 function build(item,catalog,scene){
  const rules={mode:'advanced',skills:true,special:true,hp:12,maxGauge:10,specialVersion:S.MOVE_VERSION};
  const byId=Object.fromEntries(catalog.filter(Boolean).map(a=>[a.id,a.actionId]));
  let state=initial(scene.initial),special={...S.initial(S.MOVE_VERSION),gauge:{1:30,2:30}};
  const turns=[];
  for(const [index,step]of scene.steps.entries()){
   if(state.hp1<=0||state.hp2<=0)break;
   const skill=index===0&&item.category==='skills'?item.id:null;
   const selected=skill?{1:skill}:{},use=skill?{1:{id:skill,turn:state.turn}}:{};
   const preview=skill?A.preview(state,selected,use,rules):{...state};
   const moves={1:byId[step.own],2:byId[step.enemy]};
   for(const p of [1,2]){
    if(preview['frozen'+p]>0){moves[p]=-1;continue;}
    const action=catalog[moves[p]];
    if(!action)throw Error('未定義の行動: '+[step.own,step.enemy][p-1]);
    if(action.cost>preview['gauge'+p])throw Error('実演のゲージが不足しています: '+action.name);
    if(action.special&&action.specialCost>special.gauge[p])throw Error('実演のSゲージが不足しています');
    if(preview['seal'+p]&&['block','reflect'].includes(action.type))throw Error('封印中の行動です: '+action.name);
    if(preview['specialSeal'+p]>0&&(action.skill||action.type==='block'))throw Error('S封印中の行動です: '+action.name);
    if(['block','reflect'].includes(action.type)&&preview['last'+p]===action.type)throw Error('連続使用できない行動です: '+action.name);
   }
   const calculate=(s,m,v,r,b)=>V.calculate(s,m,4,r,b,true);
   const outcome=A.resolve(state,moves,selected,use,calculate,rules);
   const nextSpecial=S.advance(special,outcome);
   const actions=[1,2].map(p=>moves[p]===-1?{name:'凍結中',type:'',power:0,cost:0,skill:''}:catalog[moves[p]]);
   turns.push({before:state,preview,after:outcome,actions,moves,skill,specialBefore:special,specialAfter:nextSpecial,rules});
   state=outcome;special=nextSpecial;
  }
  return {initial:initial(scene.initial),turns,final:state,rules};
 }
 const api={initial,build};if(typeof window!=='undefined')window.GuideReplayCore=api;if(typeof module!=='undefined')module.exports=api;
})();
