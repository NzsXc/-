(()=>{
 const skills=[
  ['ブリーチ','blue'],['カウンター','cyan'],['パニッシュ','orange'],['ヒール','lime'],
  ['フォーサイト','cyan'],['モーメンタム','orange'],['ランページ','red'],['アンチガード','purple'],
  ['エンハンス','red'],['サイフォン','navy'],['ルイン','purple'],['ミラー','cyan']
 ];
 const items=skills.flatMap(([name,color],i)=>[1,30].map(n=>({id:'tech'+(i+1)+'_'+n,name:name+(n===1?'使い':'マスター'),color,kind:'tech',skill:i+1,threshold:n,description:'ランダム・ルーム対戦で'+name+'を'+n+'回使う'})));
 items.push({id:'strategist',name:'Strategist',color:'bronze',kind:'rating',threshold:1050,description:'レート1050に到達'},{id:'astute',name:'Astute',color:'silver',kind:'rating',threshold:1100,description:'レート1100に到達'});
 for(const [id,name,color] of [['s1_champion','Season 1｜CHAMPION','rainbow'],['s1_second','Season 1｜2ND PLACE','rainbow'],['s1_third','Season 1｜3RD PLACE','rainbow'],['s1_challenger','Season1 | CHALLENGER','gold']])items.push({id,name,color,kind:'tournament',description:id==='s1_challenger'?'Season 1 大会参加':'Season 1 大会入賞'});
 const byId=Object.fromEntries(items.map(t=>[t.id,t]));
 function unlocked(t,data){return t.kind==='tech'?Number(data?.uses?.[t.skill]?.count||0)>=t.threshold:t.kind==='rating'?data?.milestones?.[t.threshold]===true:data?.grants?.[t.id]===true;}
 function badge(id){const t=byId[id];const e=document.createElement('span');e.className='title-badge'+(t?' title-'+t.color:'');e.textContent=t?t.name:'-';if(t)e.title=t.description;return e;}
 function fillCard(card,ids){const values=card.querySelectorAll('.intro-title-value');values.forEach((el,i)=>{el.replaceChildren(badge(ids?.[i]));});}
 window.TitleCatalog={items,byId,unlocked,badge,fillCard};
})();
