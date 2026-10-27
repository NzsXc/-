/* Public Custom mode definitions and deterministic snake-draft state. */
(()=>{
 'use strict';
 const CLASSIC=Object.freeze([
  Object.freeze({name:'cブリーチ',cost:4,power:2,type:'attack',skill:'tech1',pierce:true,description:'ゲージ4消費 / 2ダメージ / ブロック貫通'}),
  Object.freeze({name:'cカウンター',cost:2,power:0,type:'reflect',skill:'tech2',pierce:false,repeatable:true,description:'ゲージ2消費 / 攻撃を防ぎ1ダメージを反射 / 連続使用可能'}),
  Object.freeze({name:'cパニッシュ',cost:5,power:2,type:'attack',skill:'tech3',pierce:false,description:'ゲージ5消費 / 2ダメージ / 相手がチャージなら追加2ダメージ'})
 ]);
 const ordered=d=>Object.entries(d?.picks||{}).sort(([a],[b])=>Number(a)-Number(b)).map(([,v])=>v);
 const order=first=>[first,3-first,3-first,first,first,3-first];
 function view(d,now=Date.now()){
  const picks=ordered(d),count=picks.length,first=d?.first===2?2:1,sequence=order(first),deadline=(picks.at(-1)?.at??d?.startedAt??now)+15000;
  return {picks,count,first,sequence,complete:count===6,player:sequence[count]||0,deadline,remaining:Math.max(0,Math.ceil((deadline-now)/1000)),taken:picks.map(p=>p.tech),loadouts:{1:picks.filter((_,i)=>sequence[i]===1).map(p=>p.tech),2:picks.filter((_,i)=>sequence[i]===2).map(p=>p.tech)}};
 }
 const action=(rules,index,pool)=>rules?.classic?CLASSIC[index]:pool[index];
 const api={CLASSIC,order,view,action};if(typeof window!=='undefined')window.MatchModes=api;if(typeof module!=='undefined')module.exports=api;
})();
