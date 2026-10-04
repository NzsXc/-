(()=>{
 const skills=[
  ['ブリーチ','Bleach','blue'],['カウンター','Counter','cyan'],['パニッシュ','Punish','orange'],['ヒール','Heal','lime'],
  ['フォーサイト','Foresight','cyan'],['モーメンタム','Momentum','orange'],['ランページ','Rampage','red'],['アンチガード','Anti-Guard','purple'],
  ['エンハンス','Enhance','red'],['サイフォン','Siphon','navy'],['ルイン','Ruin','purple'],['ミラー','Mirror','cyan']
 ];
 const items=skills.flatMap(([name,english,color],i)=>[
  ...[1,30].map(n=>({id:'tech'+(i+1)+'_'+n,name:name+(n===1?'使い':'マスター'),color,kind:'tech',skill:i+1,threshold:n,description:'ランダム・ルーム対戦で'+name+'を'+n+'回使う'})),
  {id:'skill_name_'+(i+1),name:english,color,kind:'skill-name',skill:i+1,threshold:30,description:name+'を30回使う'}
 ]);
 items.push(
  {id:'strategist',name:'Strategist',color:'bronze',kind:'rating',threshold:1050,description:'レート1050に到達'},
  {id:'astute',name:'Astute',color:'silver',kind:'rating',threshold:1100,description:'レート1100に到達'},
  {id:'mastermind',name:'Mastermind',color:'rating-gold',kind:'rating',threshold:1150,description:'レート1150に到達'}
 );
 for(const [id,name,color] of [['s1_champion','Season 1｜CHAMPION','rainbow'],['s1_second','Season 1｜2ND PLACE','rainbow'],['s1_third','Season 1｜3RD PLACE','rainbow'],['s1_challenger','Season1 | CHALLENGER','gold']])items.push({id,name,color,kind:'tournament',description:id==='s1_challenger'?'Season 1 大会参加':'Season 1 大会入賞'});
 const byId=Object.fromEntries(items.map(t=>[t.id,t]));
 const wingSvg='<svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg"><path d="M97 113C105 100 102 80 94 64 86 49 73 39 59 29 43 18 29 4 19 2 11 0 7 5 8 14 10 28 21 41 36 49 24 44 11 42 6 48 1 55 12 69 30 78 36 81 42 82 47 82 39 86 32 92 35 98 39 106 54 106 68 108 81 110 88 116 91 117 93 118 95 116 97 113Z" fill="#fbfdff" stroke="#aebdca" stroke-width="2.4" stroke-linejoin="round"/><path d="M92 108C82 90 68 72 48 54M88 104C69 87 48 76 25 68M83 106C66 99 51 97 39 97" fill="none" stroke="#c2ced8" stroke-width="2.1" stroke-linecap="round" opacity=".58"/><path d="M88 94C77 72 62 53 43 37" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".88"/></svg>';
 function unlocked(t,data){return t.kind==='tech'||t.kind==='skill-name'?Number(data?.uses?.[t.skill]?.count||0)>=t.threshold:t.kind==='rating'?data?.milestones?.[t.threshold]===true:data?.grants?.[t.id]===true;}
 function decoration(className){const e=document.createElement('span');e.className=className;e.setAttribute('aria-hidden','true');return e;}
 function badge(id){
  const t=byId[id];if(!t){const empty=document.createElement('span');empty.className='title-badge title-empty';empty.textContent='-';return empty;}
  const tier=t.kind==='tech'?(t.threshold===1?' tier-use':' tier-master'):'';
  const skillClass=t.skill?' skill-'+t.skill:'';
  const wrap=document.createElement('span');wrap.className='badge-item badge-'+t.color+' kind-'+t.kind+tier+skillClass;
  const text=document.createElement('span');text.className='title-badge title-'+t.color;text.dataset.text=t.name;text.textContent=t.name;text.title=t.description;
  if(t.kind==='tournament'){
   const left=decoration('title-wing left');left.innerHTML=wingSvg;
   const glass=decoration('crystal-overlay'),glass2=decoration('crystal-overlay-more');
   const right=decoration('title-wing right');right.innerHTML=wingSvg;
   wrap.append(left,glass,glass2,text,right);
  }else if(t.kind==='tech'&&t.threshold===30){wrap.append(decoration('skill-motif master-motif'),text);}
  else if(t.kind==='skill-name'){wrap.append(decoration('skill-motif english-motif'),text);}
  else wrap.append(text);
  return wrap;
 }
 function fillCard(card,ids){const values=card.querySelectorAll('.intro-title-value');values.forEach((el,i)=>{el.replaceChildren(badge(ids?.[i]));});}
 window.TitleCatalog={items,byId,unlocked,badge,fillCard};
})();
