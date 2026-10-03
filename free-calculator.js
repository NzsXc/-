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
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const chosen=(s,moves,p)=>Number.isInteger(moves?.[p])?moves[p]:(s['gauge'+p]>=10?1:0);
export function calculate(s,moves){
 const out={};
 out.action1=chosen(s,moves,1);out.misses1=Number.isInteger(moves?.[1])?0:s.misses1+1;
 out.action2=chosen(s,moves,2);out.misses2=Number.isInteger(moves?.[2])?0:s.misses2+1;
 const raw1=ACTIONS[out.action1]||ACTIONS[0],raw2=ACTIONS[out.action2]||ACTIONS[0];
 const none={cost:0,type:'none',skill:'mirror-none',power:0,pierce:false};
 const e1=raw1.skill==='tech12'?(raw2.skill==='tech12'?none:raw2):raw1;
 const e2=raw2.skill==='tech12'?(raw1.skill==='tech12'?none:raw1):raw2;
 out.cost1=raw1.cost;out.cost2=raw2.cost;out.type1=e1.type;out.type2=e2.type;out.skill1=e1.skill;out.skill2=e2.skill;
 out.attack1=e1.type==='attack';out.attack2=e2.type==='attack';out.reflect1=e1.type==='reflect';out.reflect2=e2.type==='reflect';
 out.paid1=clamp(s.gauge1-raw1.cost,0,10);out.paid2=clamp(s.gauge2-raw2.cost,0,10);
 out.sealed1=s.seal1===true||(e2.skill==='tech8'&&s.gauge1<7);out.sealed2=s.seal2===true||(e1.skill==='tech8'&&s.gauge2<7);
 out.reflect1=out.reflect1&&!out.sealed1;out.reflect2=out.reflect2&&!out.sealed2;
 out.blocking1=e1.type==='block'&&!out.sealed1;out.blocking2=e2.type==='block'&&!out.sealed2;
 out.charged1=e1.type==='charge'?clamp(out.paid1+2,0,10):out.paid1;out.charged2=e2.type==='charge'?clamp(out.paid2+2,0,10):out.paid2;
 out.foresight1=e1.skill==='tech5'&&e2.type==='charge'?clamp(out.charged1+3,0,10):out.charged1;
 out.foresight2=e2.skill==='tech5'&&e1.type==='charge'?clamp(out.charged2+3,0,10):out.charged2;
 out.healed1=e1.skill==='tech4'?clamp(s.hp1+1,0,10):s.hp1;out.healed2=e2.skill==='tech4'?clamp(s.hp2+1,0,10):s.hp2;
 out.basePower1=e1.power;out.basePower2=e2.power;
 out.power1=out.attack1?((e1.skill==='tech6'?(s.momentum1?2:1):e1.power)+(s.enhance1>0?1:0)):0;
 out.power2=out.attack2?((e2.skill==='tech6'?(s.momentum2?2:1):e2.power)+(s.enhance2>0?1:0)):0;
 out.pierce1=!!e1.pierce;out.pierce2=!!e2.pierce;
 let d1=(s.ruin1>0&&e1.type==='charge'?1:0),d2=(s.ruin2>0&&e2.type==='charge'?1:0);
 if(out.reflect1&&out.attack2)d2++;if(out.reflect2&&out.attack1)d1++;
 if(out.attack1&&out.attack2){d1+=Math.max(0,out.power2-out.power1);d2+=Math.max(0,out.power1-out.power2);}
 else{if(out.attack2&&!out.reflect1&&(!out.blocking1||out.pierce2))d1+=out.power2;if(out.attack1&&!out.reflect2&&(!out.blocking2||out.pierce1))d2+=out.power1;}
 if(e2.skill==='tech3'&&e1.type==='charge'&&!out.blocking1&&!out.reflect1)d1+=2;
 if(e1.skill==='tech3'&&e2.type==='charge'&&!out.blocking2&&!out.reflect2)d2+=2;
 if(e1.skill==='tech7')d1+=2;if(e2.skill==='tech7')d2+=2;
 out.damage1=d1;out.damage2=d2;
 out.rampage1=e1.skill==='tech7'?clamp(out.foresight1+8,0,10):out.foresight1;
 out.rampage2=e2.skill==='tech7'?clamp(out.foresight2+8,0,10):out.foresight2;
 out.stolen1=e1.skill==='tech10'?Math.min(2,out.rampage2):0;out.stolen2=e2.skill==='tech10'?Math.min(2,out.rampage1):0;
 out.gauge1=clamp(out.rampage1+out.stolen1-out.stolen2,0,10);out.gauge2=clamp(out.rampage2+out.stolen2-out.stolen1,0,10);
 out.hp1=out.misses1>=2?0:clamp(out.healed1-d1,0,10);out.hp2=out.misses2>=2?0:clamp(out.healed2-d2,0,10);
 out.seal1=out.sealed1&&out.gauge1<7;out.seal2=out.sealed2&&out.gauge2<7;
 out.enhance1=e1.skill==='tech9'?2:Math.max(0,s.enhance1-1);out.enhance2=e2.skill==='tech9'?2:Math.max(0,s.enhance2-1);
 out.momentum1=e1.skill==='tech6'?!s.momentum1:false;out.momentum2=e2.skill==='tech6'?!s.momentum2:false;
 out.ruin1=e2.skill==='tech11'?3:Math.max(0,Number(s.ruin1||0)-1);out.ruin2=e1.skill==='tech11'?3:Math.max(0,Number(s.ruin2||0)-1);
 out.last1=e1.type;out.last2=e2.type;out.turn=s.turn+1;
 return out;
}
export const stateFields=['turn','startedAt','hp1','hp2','gauge1','gauge2','seal1','seal2','enhance1','enhance2','momentum1','momentum2','ruin1','ruin2','last1','last2','misses1','misses2'];


