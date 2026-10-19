const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
class Snapshot{
 constructor(tree,p=''){this.tree=tree;this.path=p;}
 val(){return this.path.split('/').filter(Boolean).reduce((v,k)=>v?.[k],this.tree)??null;}
 exists(){return this.val()!=null;}
 child(p){return new Snapshot(this.tree,[this.path,p].filter(Boolean).join('/'));}
 parent(){return new Snapshot(this.tree,this.path.split('/').slice(0,-1).join('/'));}
 hasChildren(names){return names.every(n=>this.child(n).exists());}
 isNumber(){return typeof this.val()==='number';}
 isString(){return typeof this.val()==='string';}
 isBoolean(){return typeof this.val()==='boolean';}
}
function write(tree,p,value){const keys=p.split('/').filter(Boolean),last=keys.pop();let n=tree;for(const key of keys)n=n[key]??={};n[last]=structuredClone(value);}
function evaluate(rule,before,after,p,uid,now,vars={}){
 if(typeof rule==='boolean')return rule;
 return vm.runInNewContext(rule,{auth:{uid,token:{firebase:{sign_in_provider:'password'}}},root:new Snapshot(before),data:new Snapshot(before,p),newData:new Snapshot(after,p),now,...vars},{timeout:500});
}
function harness(rules=JSON.parse(fs.readFileSync(path.join(root,'firebase-database.rules.json'),'utf8')).rules){
 let clock=5600,storage={freeAccounts:{p1:{name:'A',rating:1000,active:'match'},p2:{name:'B',rating:1000,active:'match'}},freeGames:{match:{players:{1:'p1',2:'p2'},createdAt:0,ready:{1:true,2:true},loadouts:{1:[0,1,2],2:[0,1,2]},kind:'random',profiles:{1:{name:'A',rating:1000,titles:{0:'',1:'',2:''}},2:{name:'B',rating:1000,titles:{0:'',1:'',2:''}}}}}};
 const updates=[],claims=[],denials=[];
 const get=p=>new Snapshot(storage,p).val();
 function chain(p){
  let rule=rules,walk='',vars={},result=[{rule,p:walk,vars:{}}];
  for(const key of p.split('/').filter(Boolean)){
   if(rule[key])rule=rule[key];
   else{const wildcard=Object.keys(rule).find(k=>k.startsWith('$')&&k!=='$other');if(wildcard){vars={...vars,[wildcard]:key};rule=rule[wildcard];}else rule=rule.$other||{};}
   walk=[walk,key].filter(Boolean).join('/');result.push({rule,p:walk,vars});
  }
  return result;
 }
 function allowed(kind,p,uid,after=storage){return chain(p).some(item=>item.rule[kind]!==undefined&&evaluate(item.rule[kind],storage,after,item.p,uid,clock,item.vars));}
 function validate(p,uid,after){
  for(const item of chain(p))if(new Snapshot(after,item.p).exists()&&item.rule['.validate']!==undefined&&!evaluate(item.rule['.validate'],storage,after,item.p,uid,clock,item.vars))return false;
  const value=new Snapshot(after,p).val();
  return !value||typeof value!=='object'||Object.keys(value).every(k=>validate(p+'/'+k,uid,after));
 }
 function commit(paths,uid){
  const after=structuredClone(storage);for(const [p,v]of Object.entries(paths))write(after,p,v);
  const failed=Object.keys(paths).find(p=>!allowed('.write',p,uid,after)||!validate(p,uid,after));
  if(failed){denials.push(failed);throw Object.assign(Error('permission_denied: '+failed),{code:'PERMISSION_DENIED'});}
  storage=after;
 }
 const ctx=vm.createContext({window:{RoomRules:require('../room-rules.js'),AdvancedRules:require('../advanced/rules.js'),SpecialRules:require('../advanced/special-rules.js')},console,Date:{now:()=>clock},setTimeout,clearTimeout,Promise,
  ref:(db,p='')=>({uid:db.uid,p}),get:async r=>{if(!allowed('.read',r.p,r.uid))throw Object.assign(Error('permission_denied'),{code:'PERMISSION_DENIED'});return{val:()=>structuredClone(get(r.p))};},
  set:async(r,v)=>commit({[r.p]:v},r.uid),update:async(r,v)=>{commit(Object.fromEntries(Object.entries(v).map(([k,value])=>[[r.p,k].filter(Boolean).join('/'),value])),r.uid);if(v.state)updates.push({turn:v.state.turn,uid:r.uid});},
  serverTimestamp:()=>clock,onValue:()=>()=>{},push:()=>({key:'unused'}),historyMatch:()=>null,
  runTransaction:async(r,fn)=>{
   // Real RTDB retries the callback against the latest value on conflict.
   // Each fake commit is atomic and sees the latest tree, including claims.
   if(!allowed('.read',r.p,r.uid))throw Object.assign(Error('permission_denied'),{code:'PERMISSION_DENIED'});
   const v=fn(structuredClone(get(r.p)));if(v===undefined)return{committed:false,snapshot:{val:()=>get(r.p)}};
   commit({[r.p]:v},r.uid);if(r.p.includes('/advance/'))claims.push({p:r.p,uid:r.uid});
   return{committed:true,snapshot:{val:()=>get(r.p)}};
  }
 });
 vm.runInContext(fs.readFileSync(path.join(root,'advanced/protocol.js'),'utf8').replace('export function','function'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'free-calculator.js'),'utf8').replaceAll('export ',''),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'free-transport.js'),'utf8').replace(/^import[^\n]*\n/gm,'').replace('export function','function'),ctx);
 write(storage,'freeGames/match/state',Object.fromEntries(vm.runInContext('stateFields',ctx).map(k=>[k,k==='turn'?1:k==='startedAt'?0:k.startsWith('hp')?10:k.startsWith('gauge')?8:k.startsWith('seal')||k.startsWith('momentum')?false:k.startsWith('last')?'':0])));
 const transports=[1,2].map(side=>vm.runInContext(`createFreeTransport({uid:'p${side}'}, {currentUser:{uid:'p${side}'}})`,ctx));
 return {transports,ctx,updates,claims,denials,get,put:(p,v)=>write(storage,p,v),commit,allowed,now:()=>clock,setClock:n=>{clock=n;},copy:()=>structuredClone(storage),evaluate:(expr,before,after,p,uid,vars)=>evaluate(expr,before,after,p,uid,clock,vars)};
}
module.exports={harness,Snapshot,evaluate,write};
