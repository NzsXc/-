// Version 1 keeps old accumulating-only games and their replays unchanged.
(()=>{
 const MAX=30,VERSION=1,MOVE_VERSION=2;
 const definitions=[
  [8,'攻撃同士の相殺では相手の攻撃を無効化し、自分の攻撃力を全量与える（Sブリーチ同士は通常の相殺）'],
  [8,'反射ダメージ＋1'],[8,'相手がチャージ以外でも基本攻撃力3（チャージ時も3）'],
  [12,'回復量＋1'],[12,'通常ゲージを追加で＋3'],[8,'次に使用する通常／Sモーメンタムの攻撃力＋1（使用まで保持）'],
  [12,'Sゲージ＋15'],[12,'次の2ターン、相手の装備技3つとブロックをゲージに関係なく封印'],
  [16,'攻撃力＋1の持続を次の4ターンにする'],[8,'奪う通常ゲージを最大3にする（奪った分だけ自分に加える）'],
  [6,'次の3ターン、チャージした相手の通常ゲージを追加で−1（Sルイン）'],
  [6,'チャージ・アタック・ブロックをまねた場合、通常ゲージを追加で＋2']
 ].map((d,i)=>d?Object.freeze({id:'s-tech'+(i+1),index:i,action:i+15,cost:d[0],description:d[1]}):null);
 const fields=['specialSeal1','specialSeal2','specialRuin1','specialRuin2','specialMomentum1','specialMomentum2'];
 const initial=(version=VERSION)=>({max:MAX,version,gauge:{1:0,2:0}});
 const extraState=()=>Object.fromEntries(fields.map(k=>[k,0]));
 const definition=id=>definitions[id-15]||null;
 function actionData(id,pool,basic){
  if(id<15)return id<3?basic?.[['charge','attack','block'][id]]:pool?.[id-3];
  const d=definition(id),base=pool?.[id-15];
  return d&&base?{...base,name:'S'+base.name,special:true,specialCost:d.cost,description:base.description+' / S追加：'+d.description}:null;
 }
 function advance(special,result){
  if(![VERSION,MOVE_VERSION].includes(special?.version))return special;
  const gauge={};
  for(const p of [1,2])gauge[p]=Math.min(MAX,special.gauge[p]-(special.version===MOVE_VERSION?(result['specialCost'+p]||0):0)+1+result['damage'+p]+(result['type'+p]==='charge'?1:0)+(special.version===MOVE_VERSION?(result['specialGain'+p]||0):0));
  return {...special,gauge};
 }
 const api={MAX,VERSION,MOVE_VERSION,definitions,fields,definition,extraState,actionData,initial,advance};
 if(typeof window!=='undefined')window.SpecialRules=api;
 if(typeof module!=='undefined')module.exports=api;
})();
