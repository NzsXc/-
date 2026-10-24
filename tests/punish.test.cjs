const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {Snapshot,evaluate,harness}=require('./rules-harness.cjs');
const root=path.resolve(__dirname,'..'),source=p=>fs.readFileSync(path.join(root,p),'utf8');
const ai=require('../bot-engine.js'),rules=JSON.parse(source('firebase-database.rules.json')).rules;
function calculator(p){return vm.runInNewContext(source(p).replaceAll('export ', '')+'\ncalculate');}
const current=calculator('free-calculator.js'),legacy=calculator('history-calculator-v1.js');
const initial={turn:1,startedAt:0,hp1:10,hp2:10,gauge1:8,gauge2:8,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0};
const plain=v=>JSON.parse(JSON.stringify(v));
function arrayState(s){return{hp:[0,s.hp1,s.hp2],gauge:[0,s.gauge1,s.gauge2],seal:[false,s.seal1,s.seal2],enhance:[0,s.enhance1,s.enhance2],momentum:[false,s.momentum1,s.momentum2],ruin:[0,s.ruin1,s.ruin2],last:['',s.last1,s.last2],loadouts:[null,[2,9,11],[2,9,11]],turn:s.turn};}
const offlineSource=source('index.html'),offlineStart=offlineSource.indexOf('function resolveBattle(){'),offlineEnd=offlineSource.indexOf('  // 技公開：オフライン/オンライン共通。',offlineStart);
assert(offlineStart>=0&&offlineEnd>offlineStart);
const offline=vm.createContext({window:{BattleV4:require('../combat-v4.js')},BattleV4:require('../combat-v4.js')});
vm.runInContext(offlineSource.slice(offlineStart,offlineEnd)+'return {hp1:Math.max(0,hp[1]-damageTo1),hp2:Math.max(0,hp[2]-damageTo2),gauge1:gauge[1],gauge2:gauge[2]};}',offline);
let cases=0;
const states=[initial,{...initial,gauge1:5,gauge2:0},{...initial,gauge1:10,gauge2:9,hp1:4,hp2:6,enhance1:2,ruin2:2},{...initial,seal1:true,seal2:true,momentum1:true,enhance2:1}];
for(const s of states)for(let a=0;a<=14;a++)for(let b=0;b<=14;b++){
 const moves={1:a,2:b},result=current(s,moves,2,{}, {},true),old=current(s,moves,1);
 assert.deepEqual(Object.fromEntries(Object.keys(legacy(s,moves)).map(k=>[k,old[k]])),plain(legacy(s,moves)),'legacy '+a+','+b);const now=require('../combat-v4.js').calculate({...s,...require('../advanced/special-rules.js').extraState(),...require('../combat-v4.js').extraState()},moves,4,{}, {},true);
 const bot=ai.resolve(arrayState(s),ai.ACTIONS[a],ai.ACTIONS[b]);
 for(const [field,arr]of [['hp','hp'],['gauge','gauge'],['seal','seal'],['enhance','enhance'],['momentum','momentum'],['ruin','ruin'],['last','last']])for(const p of [1,2])assert.equal(bot[arr][p],now[field+p],`bot ${a},${b}: ${field}${p}`);
 const arrays=arrayState(s);offline.window.localExtraState={frozen1:0,frozen2:0,poison1:0,poison2:0};Object.assign(offline,{lastAction:{1:{data:{type:s.last1}},2:{data:{type:s.last2}}}});Object.assign(offline,{selectedAction:{1:{data:ai.ACTIONS[a]},2:{data:ai.ACTIONS[b]}},hp:arrays.hp,gauge:arrays.gauge,blockSeal:arrays.seal,enhanceTurns:arrays.enhance,momentumBonus:arrays.momentum,ruinTurns:arrays.ruin});
 const actual=vm.runInContext('resolveBattle()',offline);for(const field of ['hp1','hp2','gauge1','gauge2'])assert.equal(actual[field],now[field],'offline '+a+','+b+': '+field);
 // Evaluate the exact deterministic rule clause, including mirror and effects.
 const before={freeGames:{match:{foresightShield:true,rulesVersion:2,state:s,moves:{1:moves}}}},after=structuredClone(before);
 after.freeGames.match.transition=plain(result);after.freeGames.match.state={...s,...plain(result)};
 assert(evaluate(rules.freeGames.$game.transition['.validate'],before,after,'freeGames/match/transition','p1',9000,{$game:'match'}),'rules '+a+','+b);
 cases++;
}
for(const side of [1,2]){
 const moves=side===1?{1:5,2:0}:{1:0,2:5},r=current(initial,moves),victim=3-side;
 assert.equal(r['damage'+victim],3);assert.equal(r['gauge'+victim],9);assert.equal(r['gauge'+side],3);
 for(const opponent of [1,2,4,5,6,9,12,14]){
  const m=side===1?{1:5,2:opponent}:{1:opponent,2:5};
  const r=current(initial,m),old=legacy(initial,m);
  assert.equal(r['gauge'+victim],Math.max(0,old['gauge'+victim]-1));
 }
}
// The drain still applies with no HP damage (block/counter/mirror), and floors at 0.
assert.equal(current({...initial,gauge2:0},{1:5,2:2}).gauge2,0);
assert.equal(current(initial,{1:5,2:4}).damage2,0);assert.equal(current(initial,{1:5,2:4}).gauge2,5);
assert.equal(current(initial,{1:5,2:14}).gauge1,2);assert.equal(current(initial,{1:5,2:14}).gauge2,5);
assert.match(ai.techniques[2].description,/2ダメージ、相手のゲージ-1/);assert.match(ai.techniques[2].description,/追加1ダメージ/);
assert(offlineSource.includes(ai.techniques[2].description));
// History format is unchanged; only new games carry a calculator version.
const historyContext=vm.createContext({window:{AdvancedRules:require('../advanced/rules.js')},calculateV1:legacy,calculateV2:current,stateFields:Object.keys(initial)});
vm.runInContext(source('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),historyContext);
const replay=vm.runInContext('replayHistory',historyContext),build=vm.runInContext('buildHistory',historyContext);
for(const version of [1,2]){
 const calc=version===2?current:legacy,final=calc(initial,{1:5,2:0});
 const game={rulesVersion:version===2?2:undefined,createdAt:0,kind:'friend',players:{1:'p1',2:'p2'},state:{...final,startedAt:9000},moves:{1:{1:5,2:0}},settled:{at:12000,winner:1,before1:1000,before2:1000}};
 const h=build('match',game,{1:{name:'A'},2:{name:'B'}});
 assert.equal(h.rulesVersion,version===2?2:undefined);const turns=replay(h);assert.equal(turns[0].damage[2],version===2?3:4);assert.equal(turns[0].after.gauge[2],version===2?9:10);
}
(async()=>{
 const modern=harness();modern.put('freeGames/match/rulesVersion',2);modern.put('freeGames/match/moves/1',{1:5,2:0});modern.setClock(9000);
 await Promise.all(modern.transports.map(t=>t({op:'status',matchId:'match'})));
 assert.equal(modern.get('freeGames/match/state/hp2'),7);assert.equal(modern.get('freeGames/match/state/gauge2'),9);assert.equal(modern.updates.length,1);assert.equal(modern.denials.length,0);
 const old=harness();old.put('freeGames/match/moves/1',{1:5,2:0});old.setClock(9000);await old.transports[0]({op:'status',matchId:'match'});
 assert.equal(old.get('freeGames/match/state/hp2'),6);assert.equal(old.get('freeGames/match/state/gauge2'),10);
 assert.throws(()=>modern.commit({'freeGames/match/rulesVersion':2},'p1'),/permission_denied/);
 // Actual matchmaking creation, loadout submission and turn start save v2.
 const joined=harness();
 for(const p of [1,2]){joined.put('freeAccounts/p'+p,{name:p===1?'A':'B',rating:1000,active:'',guest:false,games:0,lastSettled:''});joined.put('freeQueue/p'+p,{joinedAt:joined.now(),heartbeat:joined.now()});}
 const match=(await joined.transports[0]({op:'join'})).match;
 assert.equal(joined.get('freeGames/'+match.id+'/rulesVersion'),4);
 await joined.transports[0]({op:'loadout',matchId:match.id,loadout:[2,9,11]});
 const started=(await joined.transports[1]({op:'loadout',matchId:match.id,loadout:[2,9,11]})).match;
 joined.setClock(started.opensAt);
 await joined.transports[0]({op:'action',matchId:match.id,turn:1,action:5});
 await joined.transports[1]({op:'action',matchId:match.id,turn:1,action:0});
 assert.equal(joined.get('freeGames/'+match.id+'/state/hp2'),7);assert.equal(joined.get('freeGames/'+match.id+'/state/gauge2'),9);assert.equal(joined.denials.length,0);
 console.log(`PASS: ${cases} action/state combinations agree across online, offline, AI and rules; legacy parity, zero floor, block/counter/mirror, descriptions, old/new replay and live transport`);
})().catch(e=>{console.error(e);process.exitCode=1;});
