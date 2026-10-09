(()=>{
 const skills=[
  ['ブリーチ','Bleach','blue'],['カウンター','Counter','cyan'],['パニッシュ','Punish','orange'],['ヒール','Heal','lime'],
  ['フォーサイト','Foresight','cyan'],['モーメンタム','Momentum','orange'],['ランページ','Rampage','red'],['アンチガード','Anti-Guard','purple'],
  ['エンハンス','Enhance','red'],['サイフォン','Siphon','navy'],['ルイン','Ruin','purple'],['ミラー','Mirror','cyan']
 ];
 const items=skills.flatMap(([name,english,color],i)=>[
  ...[1,15].map(n=>({id:'tech'+(i+1)+'_'+(n===1?1:30),name:name+(n===1?'使い':'マスター'),color,kind:'tech',skill:i+1,threshold:n,description:'ランダム・ルーム対戦で'+name+'を'+n+'回使う'})),
  {id:'skill_name_'+(i+1),name:english,color,kind:'skill-name',skill:i+1,threshold:30,description:name+'を30回使う'}
 ]);
 items.push(
  {id:'strategist',name:'Strategist',color:'gold',finish:'bronze',kind:'rating',threshold:1050,description:'レート1050に到達'},
  {id:'astute',name:'Astute',color:'gold',finish:'silver',kind:'rating',threshold:1100,description:'レート1100に到達'},
  {id:'mastermind',name:'Mastermind',color:'gold',kind:'rating',threshold:1150,description:'レート1150に到達'}
 );
 for(const [id,name,color] of [['s1_champion','Season 1｜CHAMPION','rainbow'],['s1_second','Season 1｜2ND PLACE','rainbow'],['s1_third','Season 1｜3RD PLACE','rainbow'],['s1_challenger','Season1 | CHALLENGER','gold']])items.push({id,name,color,kind:'tournament',finish:id==='s1_challenger'?'platinum':undefined,frame:id==='s1_second'||id==='s1_third'?'none':undefined,description:id==='s1_challenger'?'Season 1 大会参加':'Season 1 大会入賞'});
 const byId=Object.fromEntries(items.map(t=>[t.id,t]));
 function unlocked(t,data){return t.kind==='tech'||t.kind==='skill-name'?Number(data?.uses?.[t.skill]?.count||0)>=t.threshold:t.kind==='rating'?data?.milestones?.[t.threshold]===true:data?.grants?.[t.id]===true;}
 function decoration(className){const e=document.createElement('span');e.className=className;e.setAttribute('aria-hidden','true');return e;}
 function badge(id){
  const t=byId[id];if(!t){const empty=document.createElement('span');empty.className='title-badge title-empty';empty.textContent='-';return empty;}
  const tier=t.kind==='tech'?(t.threshold===1?' tier-use':' tier-master'):'';
  const skillClass=t.skill?' skill-'+t.skill:'';
  const wrap=document.createElement('span');wrap.className='badge-item badge-'+t.color+' kind-'+t.kind+tier+skillClass+(t.finish?' finish-'+t.finish:'')+(t.frame==='none'?' frame-none':'')+(t.id==='s1_champion'?' badge-champion':'');
  const text=document.createElement('span');text.className='title-badge title-'+t.color;text.dataset.text=t.name;text.textContent=t.name;text.title=t.description;
  if(t.kind==='tournament'||t.kind==='rating'){
   const glass=decoration('crystal-overlay'),glass2=decoration('crystal-overlay-more');
   wrap.append(glass,glass2,text);
   if(t.id==='s1_champion')wrap.append(decoration('champion-ornament left'),decoration('champion-ornament right'));
  }else if(t.kind==='tech'&&t.threshold===15){wrap.append(decoration('skill-motif master-motif'),text);}
  else if(t.kind==='skill-name'){wrap.append(decoration('skill-motif english-motif'),text);}
  else wrap.append(text);
  return wrap;
 }
 function fillCard(card,ids){const values=card.querySelectorAll('.intro-title-value');values.forEach((el,i)=>{el.replaceChildren(badge(ids?.[i]));});}
 window.TitleCatalog={items,byId,unlocked,badge,fillCard};
})();
