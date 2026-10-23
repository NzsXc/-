const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {test}=require('node:test'),actions=require('../bot-engine.js').ACTIONS;
function fixture(){
 const colors=[],frames=new Map(),shakes=[],blades=[];let next=0,canvas,translation=[0,0];
 const gradient=()=>({addColorStop:(_stop,color)=>colors.push(color)});
 const ctx=new Proxy({translate:(x,y)=>{translation=[x,y];},createLinearGradient:(...args)=>{blades.push({center:translation.slice(),args});return gradient();},createRadialGradient:gradient},{get:(obj,key)=>key==='canvas'?canvas:key in obj?obj[key]:()=>{},set:(obj,key,value)=>{if(['strokeStyle','fillStyle','shadowColor'].includes(key))colors.push(value);obj[key]=value;return true;}});
 const rect=(x,y,width=280,height=180)=>({left:x,top:y,width,height});
 const areas=[{getBoundingClientRect:()=>rect(30,470)},{getBoundingClientRect:()=>rect(590,30)}],layer={getBoundingClientRect:()=>rect(0,0,900,700),replaceChildren(){}};
 const context=vm.createContext({console,window:{devicePixelRatio:1,matchMedia:()=>({matches:false})},performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},
  requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id),
  document:{createElement:()=>canvas={width:0,height:0,setAttribute(){},getContext:()=>ctx,getBoundingClientRect:()=>rect(0,0,900,700),remove(){},animate(){shakes.push('canvas');return {cancel(){}};}},getElementById:id=>id==='player1Area'?areas[0]:id==='player2Area'?areas[1]:id==='battleScreen'?{animate(){shakes.push('screen');return {cancel(){}};}}:null,querySelector:()=>({getBoundingClientRect:()=>rect(80,550,220,12)})}
 });
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','battle-effects.js'),'utf8'),context);
 return {api:context.window.BattleEffects,colors,shakes,blades,play(a,b,ms=570,damage=[0,0]){context.window.BattleEffects.play({layer,actions:[a,b],rawActions:[a,b],damage});const [id,fn]=frames.entries().next().value;frames.delete(id);fn(ms);}};
}
test('all twelve S moves paint violet while normal Breach retains red',()=>{
 for(let i=0;i<12;i++){
  const f=fixture();f.play({...actions[i+3],special:true},actions[0]);
  assert(f.colors.includes('#bd75ff'),'S move '+(i+1)+' violet palette');assert(!f.colors.includes('#ff5266'),'S move '+(i+1)+' does not retain attack red');
  f.api.cancel();
 }
 const normal=fixture();normal.play(actions[3],actions[0]);assert(normal.colors.includes('#ff5266'));assert(!normal.colors.includes('#bd75ff'));
});
test('mixed clashes and copied S moves retain the correct per-player palette',()=>{
 const mixed=fixture();mixed.play({...actions[3],special:true},actions[1],250);assert(mixed.colors.includes('#bd75ff'));assert(mixed.colors.includes('#69aaff'),'normal opponent keeps blue');
 const f=fixture(),mirror=f.api.createPlan([actions[14],{...actions[3],special:true}]);assert(mirror.players[0].special);assert(mirror.players[1].special);
 const ordinary=f.api.createPlan([actions[14],actions[3]]);assert(!ordinary.players[0].special);assert(!ordinary.players[1].special);
});
test('damage moves only the effect canvas, preserving the battle controls and HP geometry',()=>{
 const f=fixture();f.play(actions[1],actions[0],500,[0,1]);assert.deepEqual(f.shakes,['canvas']);f.api.cancel();
});

test('S Momentum only slashes the target after a confirmed successful hit',()=>{
 const momentum={...actions[8],special:true};
 for(const [enemy,damage]of [[actions[8],[0,0]],[actions[3],[1,0]],[actions[2],[0,0]],[actions[4],[1,0]]]){
  const f=fixture();f.play(momentum,enemy,900,damage);
  assert.equal(f.blades.filter(b=>b.args[2]-b.args[0]===330).length,0,'no S impact blade after tie, loss, block or reflection');f.api.cancel();
 }
 for(const [enemy,damage]of [[actions[0],[0,1]],[actions[1],[0,1]]]){
  const f=fixture();f.play(momentum,enemy,900,damage);
  assert(f.blades.some(b=>b.args[2]-b.args[0]===330),'successful S hit retains its impact slash');f.api.cancel();
 }
});

test('S Anti Guard uses a padlock while S Ruin uses a dark eclipse',()=>{
 const seal=fixture();seal.play({...actions[10],special:true},actions[0],650);assert(seal.colors.includes('#251333'));assert(!seal.colors.includes('#100819'));seal.api.cancel();
 const ruin=fixture();ruin.play({...actions[13],special:true},actions[0],650);assert(ruin.colors.includes('#100819'));assert(!ruin.colors.includes('#251333'));ruin.api.cancel();
});
