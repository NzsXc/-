importScripts('bot-engine.js');
self.onmessage=({data})=>{
 try{
  const {state,model,difficulty='normal'}=data;
  const legal=BattleAI.legal(state,2);
  if(!legal.length)throw Error('選べる行動がありません');
  let action;
  if(difficulty==='easy')action=legal[Math.floor(Math.random()*legal.length)];
  else{
   const hard=difficulty==='hard';
   const result=BattleAI.analyze(state,{depth:hard?2:1,iterations:hard?160:80,maxNodes:hard?100000:5000,model:BattleAI.validModel(model)?model:null});
   action=BattleAI.sample(result.actions2,result.q);
  }
  self.postMessage({ok:true,action});
 }catch(error){self.postMessage({ok:false,error:error.message});}
};
