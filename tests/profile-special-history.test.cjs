const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {test}=require('node:test');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const plain=source=>source.replace(/^import[^\n]*\n/gm,'').replace(/export /g,'');
function fixture(){
 const data={};
 const context=vm.createContext({console,window:{},setTimeout,clearTimeout,
  ref:(_db,p)=>p,orderByValue:()=>({}),limitToLast:n=>({limit:n}),endBefore:(value,key)=>({before:[value,key]}),
  query:(p,...constraints)=>({p,...Object.assign({},...constraints)}),
  get:async target=>{
   let value=data[typeof target==='string'?target:target.p]??null;
   if(typeof target!=='string'&&value){
    let entries=Object.entries(value).sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]));
    if(target.before)entries=entries.filter(([key,at])=>at<target.before[0]||at===target.before[0]&&key<target.before[1]);
    value=Object.fromEntries(entries.slice(-(target.limit||entries.length)));
   }
   return {val:()=>value};
  }
 });
 for(const file of ['battle-history-core.js','player-profile.js','battle-history.js'])vm.runInContext(plain(read(file)),context);
 return {data,summarize:vm.runInContext('summarizePlayerHistories',context),api:vm.runInContext('createBattleHistory({}, {currentUser:{uid:"p1"}})',context)};
}
function history(id,action,side=1,rulesVersion=3){return {id,version:1,rulesVersion,turnCount:1,players:{1:{uid:side===1?'p1':'other'},2:{uid:side===2?'p1':'other'}},settled:{['before'+side]:1100,['after'+side]:1150},moves:{1:{[side]:action,[3-side]:0}}};}
test('every S move is valid in both player perspectives and contributes to its base-technique usage',()=>{
 const f=fixture();for(const side of [1,2])for(let action=15;action<=26;action++){
  const result=f.summarize([history('s',action,side)],'p1',1000);
  assert.equal(result.peakRating,1150);assert.equal(result.matches,1);assert.equal(result.techniques.length,1);assert.equal(result.techniques[0].action,action-12);assert.equal(result.techniques[0].count,1);
 }
});
test('normal usage, duplicate histories and legacy validation retain their behavior',()=>{
 const f=fixture(),normal=history('normal',3,1,2),other=history('other',4,2,2);
 const result=f.summarize([normal,normal,other,history('s',26)],'p1',1200);
 assert.equal(result.matches,3);assert.equal(result.peakRating,1200);
 assert.deepEqual(Array.from(result.techniques,t=>[t.action,t.count]),[[3,1],[4,1],[14,1]]);
 for(const action of [-1,27,3.5,null])assert.throws(()=>f.summarize([history('bad',action)],'p1',1000),/使用回数を集計できない/);
 for(const version of [undefined,2])assert.throws(()=>f.summarize([history('legacy',15,1,version??1)],'p1',1000),/使用回数を集計できない/);
});
test('profileStats accepts an S move older than the latest ten matches and keeps persistent usage authoritative',async()=>{
 const f=fixture();f.data['titleProgress/p1/uses']={1:{count:7}};f.data['playerHistory/p1']={};
 for(let i=0;i<12;i++){
  const id='game'+String(i).padStart(2,'0');f.data['playerHistory/p1'][id]=i+1;
  const h=history(id,i===0?15:3);if(i===0)h.settled.after1=1250;f.data['battleHistory/'+id]=h;
 }
 const result=await f.api.profileStats('p1',1000);
 assert.equal(result.matches,12);assert.equal(result.peakRating,1250);
 assert.deepEqual(Array.from(result.techniques,t=>[t.action,t.count]),[[3,7]]);
});
