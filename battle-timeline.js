// Presentation clocks and resource views. Never mutates match state or applies game rules.
(()=>{
 'use strict';
 const copy=(value={})=>({1:Number(value[1]||0),2:Number(value[2]||0)});
 let active=null;
 function begin({before,after,outcome={},actions,rawActions=actions,damage=[0,0],impacts=[],maxGauge=10}){
  const view={hp:copy(before.hp),gauge:copy(before.gauge),special:before.special?copy(before.special):null};
  const jobs=[],flags={charged:false,foresight:false,rampage:false,stolen:{1:0,2:0},punished:{1:false,2:false},extra:{1:0,2:0}};
  const finite=(key,fallback)=>Number.isFinite(outcome[key])?outcome[key]:fallback;
  const paid={},charged={},foresight={},rampage={};
  const clamp=n=>Math.max(0,Math.min(maxGauge,n));
  for(const p of [1,2]){
   const a=actions[p-1],raw=rawActions[p-1];
   paid[p]=finite('paid'+p,clamp(before.gauge[p]-Number(raw.cost||0)));
   charged[p]=finite('charged'+p,paid[p]);foresight[p]=finite('foresight'+p,charged[p]);rampage[p]=finite('rampage'+p,foresight[p]);
   view.gauge[p]=paid[p];
   if(view.special)view.special[p]=Math.max(0,view.special[p]-Number(raw.special?raw.specialCost||0:0));
   const healed=finite('healed'+p,before.hp[p]);
   if(healed!==before.hp[p])jobs.push({at:140,run:()=>{view.hp[p]=healed;}});
   const hit=impacts.find(e=>e.side===p);
   if(damage[p-1]>0)jobs.push({at:hit?.at??440,run:()=>{view.hp[p]=Math.max(0,view.hp[p]-damage[p-1]);if(view.special)view.special[p]=Math.min(30,view.special[p]+damage[p-1]);}});
   if(view.special&&a.type==='charge')jobs.push({at:300,run:()=>{view.special[p]=Math.min(30,view.special[p]+1);}});
   if(view.special&&outcome['specialGain'+p])jobs.push({at:420,run:()=>{view.special[p]=Math.min(30,view.special[p]+outcome['specialGain'+p]);}});
   const stolen=finite('stolen'+p,0);
   for(let i=0;i<stolen;i++)jobs.push({at:650+i*90,run:()=>{flags.stolen[p]++;}});
   if(actions[2-p]?.skill==='tech3')jobs.push({at:impacts.find(e=>e.side===p)?.at??370,run:()=>{flags.punished[p]=true;}});
  }
  for(const p of [1,2]){
   const a=actions[p-1],other=actions[2-p],kind=a.kind,complete=Math.max(0,clamp(rampage[p]+finite('stolen'+p,0)-finite('stolen'+(3-p),0))-(other?.skill==='tech3'?1:0)),delta=after.gauge[p]-complete;
   const impact=impacts.find(e=>e.side===(kind==='refund'||kind==='drain'?3-p:p))?.at??440;
   const collection=kind==='focus'||kind==='convert',drained=other?.kind==='drain'&&delta<0;
   const flight=collection?600:550,start=impact+20,stagger=kind==='focus'?50:kind==='convert'?25:90;
   if((collection||kind==='refund'||kind==='drain'||drained)&&delta){
    const count=Math.abs(delta),at=collection||kind==='refund'||kind==='drain'?start+flight:(impacts.find(e=>e.side===p)?.at??440)+570;
    for(let i=0;i<count;i++)jobs.push({at:at+i*stagger,run:()=>{flags.extra[p]+=Math.sign(delta);}});
   }else jobs.push({at:850,run:()=>{flags.extra[p]=delta;}});
  }
  for(const [name,at]of [['charged',300],['foresight',360],['rampage',420]])jobs.push({at,run:()=>{flags[name]=true;}});
  jobs.sort((a,b)=>a.at-b.at);
  const record={view,index:0};active=record;
  function tick(ms){
   if(active!==record)return;
   while(record.index<jobs.length&&jobs[record.index].at<=ms)jobs[record.index++].run();
   for(const p of [1,2]){
    const base=flags.rampage?rampage[p]:flags.foresight?foresight[p]:flags.charged?charged[p]:paid[p];
    const stolen=flags.stolen[p]-flags.stolen[3-p];
    let amount=Math.max(0,clamp(base+stolen)-(flags.punished[p]?1:0));
    // Modern Mirror/S Ruin and other remainders use only confirmed amounts.
    view.gauge[p]=clamp(amount+flags.extra[p]);
   }
   return view;
  }
  return {tick,current:()=>active===record?view:null,finish(){if(active!==record)return;view.hp=copy(after.hp);view.gauge=copy(after.gauge);if(after.special)view.special=copy(after.special);active=null;},cancel(){if(active===record)active=null;}};
 }
 window.BattleResources={begin,current:()=>active?.view||null,cancel(){active=null;}};

 const observed=new Map();let running=null;
 function observe(key,digit,now=performance.now()){
  if(!Number.isInteger(digit)||digit<1||digit>3)return;
  let record=observed.get(key);if(!record){record=new Map();observed.set(key,record);if(observed.size>64)observed.delete(observed.keys().next().value);}
  if(!record.has(digit))record.set(digit,now);
 }
 function cancel(){if(running){clearTimeout(running.timer);running=null;}}
 function start(key,{show,onComplete}){
  cancel();const record={key,timer:0},seen=observed.get(key)||new Map();running=record;
  let digit=3;
  while(digit>0&&seen.has(digit)&&performance.now()-seen.get(digit)>=1000)digit--;
  function step(){
   if(running!==record)return;
   if(digit===0){running=null;onComplete();return;}
   const at=performance.now(),held=seen.has(digit)?Math.max(0,1000-(at-seen.get(digit))):1000;
   if(!held){digit--;step();return;}
   show(digit);observe(key,digit,at);
   record.timer=setTimeout(()=>{digit--;step();},held);
  }
  step();
 }
 window.BattleCountdown={observe,start,cancel,running:key=>running?.key===key};
})();
