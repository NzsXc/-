importScripts('bot-engine.js');
onmessage=({data})=>{
 try{
  const B=BattleAI;
  if(!B.validModel(data.model))throw Error('知識モデルが不正です');
  const result=B.analyze(data.state,{depth:2,iterations:80,maxNodes:30000,model:data.model});
  const action=B.sample(result.actions2,result.q);
  if(!B.legal(data.state,2).includes(action))throw Error('Botが不正な行動を選びました');
  postMessage({ok:true,action,depth:result.depth});
 }catch(error){postMessage({ok:false,error:error.message});}
};
