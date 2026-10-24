// Version 1 keeps old accumulating-only games and their replays unchanged.
(()=>{
 const MAX=30,VERSION=1,MOVE_VERSION=3;
 const definitions=[
  [12,'攻撃同士の相殺に、一方的に打ち勝つ'],
  [8,'反射ダメージ＋1'],[8,'相手がチャージ以外でも基本攻撃力3（チャージ時も3）'],
  [12,'回復量＋1'],[12,'通常ゲージを追加で＋3'],[8,'次に使用する通常／Sモーメンタムの攻撃力＋1（使用まで保持）'],
  [12,'Sゲージ＋15'],[12,'次の2ターン、相手の装備技3つとブロックをゲージに関係なく封印'],
  [16,'攻撃力＋1の持続を次の4ターンにする'],[8,'奪うゲージの量+1'],
  [6,'次の3ターン、チャージした相手の通常ゲージを追加で−1（Sルイン）'],
  [6,'チャージ・アタック・ブロックをまねた場合、通常ゲージを追加で＋2']
 ,...[0,0,0,0,0,0,0].map(()=>[0,'追加効果なし（通常技と同じ効果）'])].map((d,i)=>d?Object.freeze({id:'s-tech'+(i+1),index:i,action:i<12?i+15:i+22,cost:d[0],description:d[1]}):null);
 const fields=['specialSeal1','specialSeal2','specialRuin1','specialRuin2','specialMomentum1','specialMomentum2'];
 const initial=(version=VERSION)=>({max:MAX,version,gauge:{1:0,2:0}});
 const extraState=()=>Object.fromEntries(fields.map(k=>[k,0]));
 const definition=(id,version=MOVE_VERSION)=>{const d=definitions[id>=34?id-22:id-15];return d?(version===2&&id===15?{...d,cost:8}:d):null;};
 function actionData(id,pool,basic,version=MOVE_VERSION){
  if(id<15||id>=27&&id<=33)return id<3?basic?.[['charge','attack','block'][id]]:pool?.[id>=27?id-15:id-3];
  const d=definition(id,version),base=pool?.[id>=34?id-22:id-15];
  return d&&base?{...base,name:'S'+base.name,special:true,specialCost:d.cost,description:d.description}:null;
 }
 function advance(special,result){
  if(![VERSION,2,MOVE_VERSION].includes(special?.version))return special;
  const gauge={};
  for(const p of [1,2])gauge[p]=Math.min(MAX,special.gauge[p]-(special.version>=2?(result['specialCost'+p]||0):0)+1+result['damage'+p]+(result['type'+p]==='charge'?1:0)+(special.version>=2?(result['specialGain'+p]||0):0));
  return {...special,gauge};
 }
 function adjustCosts(special,result){if(special?.version===2)for(const p of [1,2])if(result['action'+p]===15)result['specialCost'+p]=8;return result;}
 const api={adjustCosts,MAX,VERSION,MOVE_VERSION,definitions,fields,definition,extraState,actionData,initial,advance};
 if(typeof window!=='undefined')window.SpecialRules=api;
 if(typeof module!=='undefined')module.exports=api;
})();

