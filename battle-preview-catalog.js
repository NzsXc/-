/* The seven new S entries are visual previews; their balance is not assigned. */
(()=>{
 const basics=BattleAI.ACTIONS.slice(0,3).map((a,i)=>({skill:'',pierce:false,...a,name:['チャージ','アタック','ブロック'][i]}));
 const added=[
  ['フォーカス',0,0,'focus','攻撃を受けなければゲージ＋3'],
  ['コンバート',1,0,'convert','攻撃を受けるとゲージ＋5'],
  ['ブラスト',6,3,'blast','3ダメージ'],
  ['フリーズ',2,0,'freeze','次のターン、相手を行動不能にする'],
  ['リファンド',3,1,'refund','ブロック貫通の1ダメージ。命中するとゲージ＋3'],
  ['ヴェノム',5,0,'venom','次の2ターン、相手に毒（ターン開始時に1ダメージ）'],
  ['ドレイン',2,1,'drain','1ダメージ。命中すると相手のゲージを1奪う']
 ].map(([name,cost,power,kind,description],i)=>({name,cost,power,kind,description,skill:'tech'+(i+13),type:power?'attack':kind,pierce:kind==='refund'}));
 const techniques=[...BattleAI.techniques,...added].map((a,i)=>({...a,index:i,normalId:i<12?i+3:i+15,specialId:i<12?i+15:i+22}));
 const actions=[...basics,...BattleAI.techniques,...BattleAI.techniques.map((a,i)=>SpecialRules.actionData(i+15,BattleAI.techniques,basics)),...added,...added.map(a=>({...a,name:'S'+a.name,special:true,specialCost:0,visualOnly:true}))];
 const action=id=>actions[id];
 function resolve(calculate,state,moves,rules){
  const result=calculate(state,moves,3,rules,{},true,actions);
  const raw=[actions[moves[1]],actions[moves[2]]],effective=raw.map((a,i)=>a.skill==='tech12'?raw[1-i].skill==='tech12'?{}:raw[1-i]:a);
  const gain=[0,0],steal=[0,0];
  for(let i=0;i<2;i++){
   const side=i+1,other=2-i,a=effective[i],hit=a.type==='attack'&&result['damage'+other]>0&&!result['reflect'+other];
   if(a.kind==='focus'&&result['damage'+side]===0)gain[i]=3;
   if(a.kind==='convert'&&result['damage'+side]>0)gain[i]=5;
   if(a.kind==='refund'&&hit)gain[i]=3;
   if(a.kind==='drain'&&hit)steal[i]=Math.min(1,result['gauge'+other]);
   if(a.kind==='freeze')result['frozen'+other]=1;
   if(a.kind==='venom')result['poison'+other]=2;
  }
  for(let i=0;i<2;i++)result['gauge'+(i+1)]=Math.max(0,Math.min(10,result['gauge'+(i+1)]+gain[i]+steal[i]-steal[1-i]));
  return result;
 }
 window.BattlePreviewCatalog=Object.freeze({techniques,actions,action,resolve});
})();
