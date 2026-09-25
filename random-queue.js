// Pure queue transition, shared by Firebase transactions and local regression tests.
(function(root){
 function transition(raw,id,name,now,cancel=false){
  const q=JSON.parse(JSON.stringify(raw||{}));
  for(const [key,e] of Object.entries(q)){
   if(e.expiresAt<=now)delete q[key];
  }
  let me=q[id];
  if(me && me.status!=='waiting')return q;
  if(cancel){if(me)delete q[id];return q;}
  if(!me)me=q[id]={status:'waiting',name,joinedAt:now,expiresAt:now+15000};
  me.expiresAt=now+15000;
  const opponent=Object.entries(q).filter(([key,e])=>key!==id&&e.status==='waiting'&&e.expiresAt>now)
   .sort((a,b)=>a[1].joinedAt-b[1].joinedAt||a[0].localeCompare(b[0]))[0];
  if(opponent){
   const [otherId,other]=opponent;
   const match={room:'random-'+otherId,players:{1:{name:other.name,joined:true,online:true,lastSeen:now},2:{name:me.name,joined:true,online:true,lastSeen:now}}};
   q[otherId]={status:'matched',side:1,match,expiresAt:now+120000};
   q[id]={status:'matched',side:2,match,expiresAt:now+120000};
  }else if(now-me.joinedAt>=10000){q[id]={status:'bot',expiresAt:now+120000};}
  return q;
 }
 if(typeof module!=='undefined')module.exports=transition;else root.randomQueueTransition=transition;
})(globalThis);
