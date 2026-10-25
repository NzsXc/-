const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const context=vm.createContext({window:{},console});vm.runInContext(read('battle-effects.js'),context);
const api=context.window.BattleEffects;
const foresight={type:'block',skill:'tech5'},block={type:'block'},mirror={type:'mirror',skill:'tech12'};
for(const skill of [1,15,17])for(const side of [0,1])for(const special of [false,true]){
 const attack={type:'attack',skill:'tech'+skill,pierce:true,special},actions=side?[attack,foresight]:[foresight,attack];
 const plan=api.createPlan(actions,{damage:[0,0]});assert(plan.players[side].guard);assert(plan.players[side].pierceGuard);assert.equal(plan.players[side].breakAt,Infinity);
 const poisoned=api.createPlan(actions,{damage:side?[0,1]:[1,0],foresightShield:true});assert.equal(poisoned.players[side].breakAt,Infinity,'poison damage never breaks the new shield');
 assert.equal(api.createPlan(actions,{foresightShield:false}).players[side].breakAt,440,'explicit legacy flag retains old behaviour');
 const damage=side?[0,2]:[2,0],old=api.createPlan(actions,{damage});assert.equal(old.players[side].breakAt,440,'legacy pierced shield still breaks');
 const sealed=side?[false,true]:[true,false];assert(!api.createPlan(actions,{sealed}).players[side].guard);
 const normal=side?[attack,block]:[block,attack];assert.equal(api.createPlan(normal).players[side].breakAt,440);
}
assert(api.createPlan([mirror,foresight]).players[0].pierceGuard,'copied shield retains protection');
function rotationsDuringImpact(defender,side){
 let canvas,frame,rotations=0;
 const gradient=()=>({addColorStop(){}}),ctx=new Proxy({rotate(){rotations++;},createLinearGradient:gradient,createRadialGradient:gradient},{get:(obj,key)=>key==='canvas'?canvas:obj[key]||(()=>{}),set:(obj,key,value)=>(obj[key]=value,true)});
 const rect=(x,y)=>({left:x,top:y,width:280,height:180}),areas=[{getBoundingClientRect:()=>rect(30,470)},{getBoundingClientRect:()=>rect(590,30)}];
 const c=vm.createContext({window:{devicePixelRatio:1,matchMedia:()=>({matches:false})},performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:fn=>(frame=fn,1),cancelAnimationFrame(){},document:{createElement:()=>canvas={setAttribute(){},getContext:()=>ctx,remove(){},animate:()=>({cancel(){}})},getElementById:id=>id==='player1Area'?areas[0]:id==='player2Area'?areas[1]:null,querySelector:()=>null}});
 vm.runInContext(read('battle-effects.js'),c);
 const attack={type:'attack',skill:'tech1',pierce:true};
 c.window.BattleEffects.play({layer:{getBoundingClientRect:()=>({left:0,top:0,width:900,height:700}),replaceChildren(){}},actions:side?[attack,defender]:[defender,attack],damage:[0,0]});frame(650);c.window.BattleEffects.cancel();return rotations;
}
for(const side of [0,1])assert(rotationsDuringImpact(block,side)>rotationsDuringImpact(foresight,side)+30,'rendered Foresight never emits the broken glass fragments');
const html=read('index.html'),start=html.indexOf('function playBattleSituationSE('),end=html.indexOf('function playBattleEffect(',start);
const sounds=[],audio=vm.createContext({playBattleSE:id=>sounds.push(id),blockSeal:{1:false,2:false}});vm.runInContext(html.slice(start,end),audio);
const play=vm.runInContext('playBattleSituationSE',audio),breach={type:'attack',skill:'tech1',pierce:true};
for(const side of [0,1])for(const defender of [foresight,block])for(const damage of [0,2]){
 sounds.length=0;play(...(side?[breach,defender]:[defender,breach]),...(side?[0,damage]:[damage,0]));
 assert.equal(sounds.includes('seShieldBreak'),defender===block||damage>0);
}
sounds.length=0;play(breach,foresight,0,1,true);assert(!sounds.includes('seShieldBreak'),'no break sound with poison damage');
// The DOM fallback must also keep the shield intact when canvas is unavailable.
const effectEnd=html.indexOf('\nfunction ',end+1),effectSource=html.slice(end,effectEnd);
for(const defender of [foresight,block])for(const flag of [true,false]){
 const breaks=[],timers=[],impacts=[],layer={innerHTML:''};
 const c=vm.createContext({window:{},document:{getElementById:()=>layer},blockSeal:{1:false,2:false},setTimeout:(fn,ms)=>(timers.push({fn,ms}),1),createShield:()=>({classList:{add:name=>breaks.push(name)}}),createShieldShards:()=>breaks.push('shards'),createSlashAt(){},createShockwave(){},showImpact:(_l,text)=>impacts.push(text)});
 vm.runInContext(effectSource,c);vm.runInContext('playBattleEffect',c)(breach,defender,()=>{},0,1,false,{foresightShield:flag});
 timers.filter(t=>t.ms===260).forEach(t=>t.fn());assert.equal(breaks.includes('shards'),defender===block||!flag);
 if(defender===foresight&&flag)assert(impacts.includes('BLOCK!'));
}
console.log('PASS: Foresight pierce protection visual plans and shield-break sound, both sides, S attacks, sealed, Mirror and legacy damage');
