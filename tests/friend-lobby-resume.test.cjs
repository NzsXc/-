const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{harness}=require('./rules-harness.cjs');
async function run(kind){
 const h=harness(),entered=[],awards=[],lists=[],nodes=new Map();for(const p of [1,2])h.put('freeAccounts/p'+p,{name:'P'+p,rating:1000,guest:false,games:0,lastSettled:'',active:'match'});
 if(kind==='expired'){h.setClock(50000);h.put('freeGames/match/moves/1',{1:1});}
 if(kind==='settled')h.put('freeGames/match/settled',{winner:1,at:h.now(),before1:1000,before2:1000,after1:1030,after2:1000,delta1:30,delta2:0});
 if(kind==='fresh')h.put('freeAccounts/p1/active','');
 const element=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:false,disabled:false});return nodes.get(id);};
 const ctx=vm.createContext({window:{RoomRules:require('../room-rules.js'),MatchRewards:{finished:m=>awards.push(m.id)},protectedRooms:{resume:()=>h.transports[0]({op:'resume'}),now:h.now,watchList:()=>{lists.push(true);return()=>{};}}},console,document:{getElementById:element},stopBot(){},resetOnlineMatchState(){},showScreen(){},setInterval:()=>1,clearInterval(){},rankedApply:m=>entered.push(m),rankedPoll(){},rankedEpoch:0});
 vm.runInContext(fs.readFileSync('lobby-client.js','utf8'),ctx);await ctx.openFriendLobby();
 if(kind==='active'){assert.equal(entered.length,1);assert.equal(entered[0].closed,false);assert.equal(lists.length,0);}
 else{assert.equal(entered.length,0,'an ended previous match must never open a victory screen on entering the lobby');assert.equal(lists.length,1,element('friendLobbyStatus').textContent);}
 if(['expired','settled'].includes(kind)){assert.deepEqual(awards,['match']);assert.match(element('friendLobbyStatus').textContent,/前の対戦は終了/);assert.equal(h.get('freeAccounts/p1/active'),'');}
 console.log('PASS actual transport → friend lobby: '+kind);
}
async function autoResume(closed){
 const source=fs.readFileSync('ranked-client.js','utf8'),start=source.indexOf('async function startRanked('),end=source.indexOf('async function rankedPoll(',start),applied=[],awards=[];let stopped=0;
 const match=closed?{id:'old',closed:true,state:{turn:2},phase:'finished'}:{id:'active',closed:false,state:{turn:1},phase:'turn'};
 const ctx=vm.createContext({window:{loggedInPlayerData:{uid:'p1'},MatchRewards:{finished:m=>awards.push(m.id)}},rankedActive:false,rankedMatch:null,rankedEpoch:0,rankedCancelled:false,rankedSeenReveal:0,document:{getElementById:()=>({textContent:''})},stopBot(){},resetOnlineMatchState(){},rankedButtons(){},rankedMessage(){},rankedRpc:async()=>({match}),rankedStop:()=>{stopped++;},rankedApply:m=>applied.push(m.id),rankedPoll(){},console});
 vm.runInContext(source.slice(start,end),ctx);await ctx.startRanked(true);assert.deepEqual(applied,closed?[]:['active']);assert.deepEqual(awards,closed?['old']:[]);assert.equal(stopped,closed?1:0);console.log('PASS login auto-resume '+(closed?'ignores ended match':'restores active match'));
}
(async()=>{await autoResume(true);await autoResume(false);for(const kind of ['expired','settled','fresh','active'])await run(kind);const h=harness();for(const p of [1,2])h.put('freeAccounts/p'+p,{name:'P'+p,rating:1000,guest:false,games:0,lastSettled:'',active:''});h.setClock(600000);h.put('friendRooms/waited',{host:'p2',name:'P2',createdAt:0,heartbeat:h.now(),game:''});let m=(await h.transports[0]({op:'friendJoin',roomId:'waited'})).match;assert.equal(m.closed,false);assert.equal(m.deadline,h.now()+60000);const id=m.id;h.setClock(h.now()+89000);await h.transports[0]({op:'loadout',matchId:id,loadout:[0,1,2]});m=(await h.transports[1]({op:'loadout',matchId:id,loadout:[0,1,2]})).match;assert.equal(m.closed,false);assert.equal(m.state.turn,1);assert.equal(m.state.hp[1],10);assert.equal(m.state.hp[2],10);assert.equal(h.get('freeGames/'+id+'/state/startedAt'),h.now());console.log('PASS long host wait and late selection still start a fresh turn with full HP and fresh deadlines');})().catch(e=>{console.error(e);process.exitCode=1;});
