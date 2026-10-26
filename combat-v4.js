/* Version 4: seven techniques; old calculators remain available for saved battles. */
(()=>{
// Ranked battle calculator for techniques 1-12. Keep database validation in sync.
const ACTIONS=[
 {cost:0,type:'charge',skill:'',power:0,pierce:false},
 {cost:1,type:'attack',skill:'',power:1,pierce:false},
 {cost:0,type:'block',skill:'',power:0,pierce:false},
 {cost:4,type:'attack',skill:'tech1',power:2,pierce:true},
 {cost:2,type:'reflect',skill:'tech2',power:0,pierce:false},
 {cost:5,type:'attack',skill:'tech3',power:2,pierce:false},
 {cost:2,type:'heal',skill:'tech4',power:0,pierce:false},
 {cost:1,type:'block',skill:'tech5',power:0,pierce:false},
 {cost:2,type:'attack',skill:'tech6',power:1,pierce:false},
 {cost:0,type:'special',skill:'tech7',power:0,pierce:false},
 {cost:0,type:'seal',skill:'tech8',power:0,pierce:false},
 {cost:2,type:'enhance',skill:'tech9',power:0,pierce:false},
 {cost:3,type:'siphon',skill:'tech10',power:0,pierce:false},
 {cost:1,type:'ruin',skill:'tech11',power:0,pierce:false},
 {cost:2,type:'mirror',skill:'tech12',power:0,pierce:false}
];
const S_COSTS=[12,8,8,12,12,8,12,12,16,8,6,6];
ACTIONS.push(...ACTIONS.slice(3).map((a,i)=>({...a,special:true,specialCost:S_COSTS[i]})));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const chosen=(s,moves,p,maxGauge)=>Number.isInteger(moves?.[p])?moves[p]:(s['gauge'+p]>=maxGauge?1:0);
function core(s,moves,rulesVersion=2,roomRules={},powerBonus={},foresightShield=false,actionCatalog=ACTIONS){
 const maxHp=roomRules.hp??10,maxGauge=roomRules.maxGauge??10;
 const out={},modern=rulesVersion===3;
 out.action1=chosen(s,moves,1,maxGauge);out.misses1=Number.isInteger(moves?.[1])?0:s.misses1+1;
 out.action2=chosen(s,moves,2,maxGauge);out.misses2=Number.isInteger(moves?.[2])?0:s.misses2+1;
 const raw1=actionCatalog[out.action1]||actionCatalog[0],raw2=actionCatalog[out.action2]||actionCatalog[0];
 const none={cost:0,type:'',skill:'',power:0,pierce:false};
 const e1=raw1.skill==='tech12'?(raw2.skill==='tech12'?none:raw2):raw1;
 const e2=raw2.skill==='tech12'?(raw1.skill==='tech12'?none:raw1):raw2;
 if(modern)for(const p of [1,2]){const raw=p===1?raw1:raw2,e=p===1?e1:e2,other=p===1?raw2:raw1;
  for(const k of ['gauge','hp','seal','ruin','last','specialSeal','specialRuin'])out['input'+k[0].toUpperCase()+k.slice(1)+p]=s[k+p];
  out['stance'+p]=powerBonus[p]===1?1:0;out['effective'+p]=raw.skill==='tech12'?(other.skill==='tech12'?-1:out['action'+(3-p)]):out['action'+p];
  out['baseAction'+p]=out['action'+p]>=15?out['action'+p]-12:out['action'+p];out['effectBase'+p]=out['effective'+p]>=15?out['effective'+p]-12:out['effective'+p];
  out['specialCost'+p]=raw.special?raw.specialCost:0;out['specialGain'+p]=e.special&&e.skill==='tech7'?15:0;
 }
 out.cost1=raw1.cost;out.cost2=raw2.cost;out.type1=e1.type;out.type2=e2.type;out.skill1=e1.skill;out.skill2=e2.skill;
 out.attack1=e1.type==='attack';out.attack2=e2.type==='attack';out.reflect1=e1.type==='reflect';out.reflect2=e2.type==='reflect';
 out.paid1=clamp(s.gauge1-raw1.cost,0,maxGauge);out.paid2=clamp(s.gauge2-raw2.cost,0,maxGauge);
 out.sealed1=s.seal1===true||(e2.skill==='tech8'&&s.gauge1<7);out.sealed2=s.seal2===true||(e1.skill==='tech8'&&s.gauge2<7);
 out.reflect1=out.reflect1&&!out.sealed1;out.reflect2=out.reflect2&&!out.sealed2;
 out.blocking1=e1.type==='block'&&!out.sealed1;out.blocking2=e2.type==='block'&&!out.sealed2;
 out.charged1=e1.type==='charge'?clamp(out.paid1+2,0,maxGauge):out.paid1;out.charged2=e2.type==='charge'?clamp(out.paid2+2,0,maxGauge):out.paid2;
 out.foresight1=e1.skill==='tech5'&&e2.type==='charge'?clamp(out.charged1+3,0,maxGauge):out.charged1;
 if(modern&&e1.special&&e1.skill==='tech5')out.foresight1=clamp(out.foresight1+3,0,maxGauge);
 out.foresight2=e2.skill==='tech5'&&e1.type==='charge'?clamp(out.charged2+3,0,maxGauge):out.charged2;
 if(modern&&e2.special&&e2.skill==='tech5')out.foresight2=clamp(out.foresight2+3,0,maxGauge);
 out.healed1=e1.skill==='tech4'?clamp(s.hp1+(modern&&e1.special?2:1),0,maxHp):s.hp1;out.healed2=e2.skill==='tech4'?clamp(s.hp2+(modern&&e2.special?2:1),0,maxHp):s.hp2;
 out.basePower1=e1.power;out.basePower2=e2.power;
 out.power1=out.attack1?Math.max(0,(e1.skill==='tech6'?(s.momentum1?2:1)+(modern?(s.specialMomentum1||0):0):(modern&&e1.special&&e1.skill==='tech3'?3:e1.power))+(s.enhance1>0?1:0)+(powerBonus[1]===1?1:0)-(roomRules.specialVersion>=4&&s.weaken1>0?1:0)):0;
 out.power2=out.attack2?Math.max(0,(e2.skill==='tech6'?(s.momentum2?2:1)+(modern?(s.specialMomentum2||0):0):(modern&&e2.special&&e2.skill==='tech3'?3:e2.power))+(s.enhance2>0?1:0)+(powerBonus[2]===1?1:0)-(roomRules.specialVersion>=4&&s.weaken2>0?1:0)):0;
 out.pierce1=!!e1.pierce;out.pierce2=!!e2.pierce;
 let d1=(s.ruin1>0&&e1.type==='charge'?1:0),d2=(s.ruin2>0&&e2.type==='charge'?1:0);
 if(out.reflect1&&out.attack2)d2+=modern&&e1.special?2:1;if(out.reflect2&&out.attack1)d1+=modern&&e2.special?2:1;
 if(out.attack1&&out.attack2){
  const win1=modern&&e1.special&&e1.skill==='tech1',win2=modern&&e2.special&&e2.skill==='tech1';
  d1+=win1&&!win2?0:win2&&!win1?out.power2:Math.max(0,out.power2-out.power1);d2+=win2&&!win1?0:win1&&!win2?out.power1:Math.max(0,out.power1-out.power2);
 }
 else{if(out.attack2&&!out.reflect1&&(!out.blocking1||(out.pierce2&&!(foresightShield&&e1.skill==='tech5'))))d1+=out.power2;if(out.attack1&&!out.reflect2&&(!out.blocking2||(out.pierce1&&!(foresightShield&&e2.skill==='tech5'))))d2+=out.power1;}
 if(e2.skill==='tech3'&&!(modern&&e2.special)&&e1.type==='charge'&&!out.blocking1&&!out.reflect1)d1+=rulesVersion>=2?1:2;
 if(e1.skill==='tech3'&&!(modern&&e1.special)&&e2.type==='charge'&&!out.blocking2&&!out.reflect2)d2+=rulesVersion>=2?1:2;
 if(e1.skill==='tech7')d1+=2;if(e2.skill==='tech7')d2+=2;
 out.damage1=d1;out.damage2=d2;
 out.rampage1=e1.skill==='tech7'?clamp(out.foresight1+8,0,maxGauge):out.foresight1;
 out.rampage2=e2.skill==='tech7'?clamp(out.foresight2+8,0,maxGauge):out.foresight2;
 out.stolen1=e1.skill==='tech10'?Math.min(modern&&e1.special?3:2,out.rampage2):0;out.stolen2=e2.skill==='tech10'?Math.min(modern&&e2.special?3:2,out.rampage1):0;
 out.gauge1=clamp(out.rampage1+out.stolen1-out.stolen2,0,maxGauge);out.gauge2=clamp(out.rampage2+out.stolen2-out.stolen1,0,maxGauge);
 if(rulesVersion>=2){out.gauge1=Math.max(0,out.gauge1-(e2.skill==='tech3'?1:0));out.gauge2=Math.max(0,out.gauge2-(e1.skill==='tech3'?1:0));}
 if(modern){out.normalGauge1=out.gauge1;out.normalGauge2=out.gauge2;}
 if(modern)for(const p of [1,2]){const raw=p===1?raw1:raw2,e=p===1?e1:e2,enemy=p===1?e2:e1,other=p===1?raw2:raw1;
  if(raw.special&&raw.skill==='tech12'&&['charge','attack','block'].includes(other.type)&&!other.skill)out['gauge'+p]=clamp(out['gauge'+p]+2,0,maxGauge);
  if(s['specialRuin'+p]>0&&e.type==='charge')out['gauge'+p]=Math.max(0,out['gauge'+p]-1);
  out['specialSeal'+p]=enemy.special&&enemy.skill==='tech8'?2:Math.max(0,s['specialSeal'+p]-1);
  out['specialRuin'+p]=enemy.skill==='tech11'?(enemy.special?3:0):Math.max(0,s['specialRuin'+p]-1);
  out['specialMomentum'+p]=e.skill==='tech6'?(e.special?1:0):s['specialMomentum'+p];
 }
 out.hp1=out.misses1>=2?0:clamp(out.healed1-d1,0,maxHp);out.hp2=out.misses2>=2?0:clamp(out.healed2-d2,0,maxHp);
 out.seal1=out.sealed1&&out.gauge1<7;out.seal2=out.sealed2&&out.gauge2<7;
 out.enhance1=e1.skill==='tech9'?(modern&&e1.special?4:2):Math.max(0,s.enhance1-1);out.enhance2=e2.skill==='tech9'?(modern&&e2.special?4:2):Math.max(0,s.enhance2-1);
 out.momentum1=e1.skill==='tech6'?!s.momentum1:false;out.momentum2=e2.skill==='tech6'?!s.momentum2:false;
 out.ruin1=e2.skill==='tech11'?3:Math.max(0,Number(s.ruin1||0)-1);out.ruin2=e1.skill==='tech11'?3:Math.max(0,Number(s.ruin2||0)-1);
 out.last1=e1.type;out.last2=e2.type;out.turn=s.turn+1;
 return out;
}

const additions=[
 ['フォーカス',0,0,'focus','攻撃ダメージを受けなければゲージ＋3'],['コンバート',1,0,'convert','攻撃ダメージを受けるとゲージ＋5'],['ブラスト',6,3,'blast','3ダメージ'],['フリーズ',2,0,'freeze','次のターン、相手は行動不能'],['リファンド',3,1,'refund','ブロック貫通の1ダメージ。命中するとゲージ＋3'],['ヴェノム',5,0,'venom','次の2ターン、ターンごとに相手に毒の1ダメージ'],['ドレイン',2,1,'drain','1ダメージ。命中すると相手のゲージを最大1奪う']
].map(([name,cost,power,kind,description],i)=>({name,cost,power,kind,description:'ゲージ'+cost+'消費 / '+description,skill:'tech'+(i+13),type:power?'attack':kind,pierce:kind==='refund'}));
const normalId=i=>i<12?i+3:i+15,specialId=i=>i<12?i+15:i+22,indexOf=id=>id>=34?id-22:id>=27?id-15:id>=15?id-15:id-3;
const fields=['frozen1','frozen2','poison1','poison2'];
const specialFields=['weaken1','weaken2'];
ACTIONS.push(...additions,...additions.map(a=>({...a,special:true,specialCost:0})));
ACTIONS[-1]={cost:0,power:0,type:'',skill:'',pierce:false};
const expansionCosts={17:10,20:10,36:10,37:16,38:4,39:12,40:8};
const expandedActions=ACTIONS.map((a,id)=>({...a,...(expansionCosts[id]!=null?{specialCost:expansionCosts[id]}:{}),...(id===36?{power:4}:{})}));
expandedActions[-1]=ACTIONS[-1];
function calculate(state,moves,rulesVersion=4,rules={},bonus={},shield=true,catalog=null){
 const expanded=rules.specialVersion>=4;
 catalog||=expanded?expandedActions:ACTIONS;
 const picked={...moves};for(const p of [1,2])if(state['frozen'+p]>0)picked[p]=-1;
 const out=core(state,picked,3,rules,bonus,shield,catalog),raw={},eff={};
 for(const p of [1,2])raw[p]=catalog[out['action'+p]]||ACTIONS[-1];
 for(const p of [1,2])eff[p]=raw[p].skill==='tech12'?(raw[3-p].skill==='tech12'?ACTIONS[-1]:raw[3-p]):raw[p];
 for(const p of [1,2]){
  const q=3-p,e=eff[p];out['baseAction'+p]=out['action'+p]>=34?out['action'+p]-7:out['action'+p]>=27?out['action'+p]:out['action'+p]>=15?out['action'+p]-12:out['action'+p];
  out['effectBase'+p]=out['effective'+p]>=34?out['effective'+p]-7:out['effective'+p]>=27?out['effective'+p]:out['effective'+p]>=15?out['effective'+p]-12:out['effective'+p];
  out['inputFrozen'+p]=state['frozen'+p]||0;out['inputPoison'+p]=state['poison'+p]||0;
  if(expanded)out['inputWeaken'+p]=state['weaken'+p]||0;
  if(eff[q].skill==='tech1'&&!eff[q].special&&out['blocking'+p]&&!(shield&&e.skill==='tech5'))out['damage'+p]=Math.max(0,out['damage'+p]-1);
  out['hit'+p]=!!(out['attack'+p]&&out['power'+p]>0&&!out['reflect'+q]&&(out['attack'+q]?eff[p].special&&eff[p].skill==='tech1'&&!(eff[q].special&&eff[q].skill==='tech1')||(!(eff[q].special&&eff[q].skill==='tech1')||eff[p].special&&eff[p].skill==='tech1')&&out['power'+p]>out['power'+q]:!out['blocking'+q]||out['pierce'+p]&&!(shield&&eff[q].skill==='tech5')));
 }
 for(const p of [1,2])if(bonus['invincible'+(3-p)])out['hit'+p]=false;
 for(const p of [1,2]){
  const q=3-p,e=eff[p],enemy=eff[q];
  if(state['poison'+p]>0)out['damage'+p]++;
  if(bonus['invincible'+p])out['damage'+p]=e.skill==='tech7'?2:0;
  out['poison'+p]=enemy.kind==='venom'?2:Math.max(0,(state['poison'+p]||0)-1);
  out['frozen'+p]=enemy.kind==='freeze'?(expanded&&enemy.special?2:1):Math.max(0,(state['frozen'+p]||0)-1);
  if(expanded){out['weaken'+p]=enemy.kind==='venom'?(enemy.special?2:0):Math.max(0,(state['weaken'+p]||0)-1);out['specialDrain'+p]=e.special&&e.kind==='drain'?2:0;}
  out['gain'+p]=e.kind==='focus'&&!out['hit'+q]?3:e.kind==='convert'&&out['hit'+q]?5:e.kind==='refund'&&out['hit'+p]?3:0;
  out['drained'+p]=e.kind==='drain'&&out['hit'+p]?Math.min(1,out['gauge'+q]):0;
 }
 const gauges={1:out.gauge1,2:out.gauge2};
 if(expanded)out.specialRefund=[1,2].reduce((sum,p)=>sum+(eff[p].special&&eff[p].kind==='refund'?3:0),0);
 for(const p of [1,2]){out['normalGauge'+p]=gauges[p];out['gauge'+p]=clamp(gauges[p]+out['gain'+p]+out['drained'+p]-out['drained'+(3-p)]+(expanded?out.specialRefund-out['specialDrain'+(3-p)]:0),0,rules.maxGauge??10);out['hp'+p]=out['misses'+p]>=2?0:clamp(out['healed'+p]-out['damage'+p],0,rules.hp??10);out['seal'+p]=out['sealed'+p]&&out['gauge'+p]<7;}
 return out;
}
const api={additions,normalId,specialId,indexOf,fields,specialFields,extraState:()=>Object.fromEntries(fields.map(k=>[k,0])),extraSpecialState:()=>Object.fromEntries(specialFields.map(k=>[k,0])),calculate};
if(typeof window!=='undefined')window.BattleV4=api;if(typeof module!=='undefined')module.exports=api;else globalThis.BattleV4=api;

})();
