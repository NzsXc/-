// Versioned independently so old, display-only matches keep their original replay.
(()=>{
 const MAX=30,VERSION=1;
 const initial=()=>({max:MAX,version:VERSION,gauge:{1:0,2:0}});
 function advance(special,result){
  if(special?.version!==VERSION)return special;
  const gauge={};
  for(const p of [1,2])gauge[p]=Math.min(MAX,special.gauge[p]+1+result['damage'+p]+(result['type'+p]==='charge'?1:0));
  return {...special,gauge};
 }
 const api={MAX,VERSION,initial,advance};
 if(typeof window!=='undefined')window.SpecialRules=api;
 if(typeof module!=='undefined')module.exports=api;
})();
