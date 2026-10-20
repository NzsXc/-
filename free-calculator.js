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
export function calculate(s,moves,rulesVersion=2,roomRules={},powerBonus={}){
 const maxHp=roomRules.hp??10,maxGauge=roomRules.maxGauge??10;
 const out={},modern=rulesVersion===3;
 out.action1=chosen(s,moves,1,maxGauge);out.misses1=Number.isInteger(moves?.[1])?0:s.misses1+1;
 out.action2=chosen(s,moves,2,maxGauge);out.misses2=Number.isInteger(moves?.[2])?0:s.misses2+1;
 const raw1=ACTIONS[out.action1]||ACTIONS[0],raw2=ACTIONS[out.action2]||ACTIONS[0];
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
 out.power1=out.attack1?((e1.skill==='tech6'?(s.momentum1?2:1)+(modern?(s.specialMomentum1||0):0):(modern&&e1.special&&e1.skill==='tech3'?3:e1.power))+(s.enhance1>0?1:0)+(powerBonus[1]===1?1:0)):0;
 out.power2=out.attack2?((e2.skill==='tech6'?(s.momentum2?2:1)+(modern?(s.specialMomentum2||0):0):(modern&&e2.special&&e2.skill==='tech3'?3:e2.power))+(s.enhance2>0?1:0)+(powerBonus[2]===1?1:0)):0;
 out.pierce1=!!e1.pierce;out.pierce2=!!e2.pierce;
 let d1=(s.ruin1>0&&e1.type==='charge'?1:0),d2=(s.ruin2>0&&e2.type==='charge'?1:0);
 if(out.reflect1&&out.attack2)d2+=modern&&e1.special?2:1;if(out.reflect2&&out.attack1)d1+=modern&&e2.special?2:1;
 if(out.attack1&&out.attack2){
  const win1=modern&&e1.special&&e1.skill==='tech1',win2=modern&&e2.special&&e2.skill==='tech1';
  d1+=win1&&!win2?0:win2&&!win1?out.power2:Math.max(0,out.power2-out.power1);d2+=win2&&!win1?0:win1&&!win2?out.power1:Math.max(0,out.power1-out.power2);
 }
 else{if(out.attack2&&!out.reflect1&&(!out.blocking1||out.pierce2))d1+=out.power2;if(out.attack1&&!out.reflect2&&(!out.blocking2||out.pierce1))d2+=out.power1;}
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
export const stateFields=['turn','startedAt','hp1','hp2','gauge1','gauge2','seal1','seal2','enhance1','enhance2','momentum1','momentum2','ruin1','ruin2','last1','last2','misses1','misses2'];




