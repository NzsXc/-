/* Shared label fitting uses layout coordinates, including while cards scale in. */
(()=>{
 const selector='.badge-item[data-title-id]',badges=new Set(),pending=new Set();let frame=0;
 function fit(badge){
  const label=badge.querySelector(':scope>.title-badge'),width=badge.clientWidth,height=badge.clientHeight;
  if(!label||!width||!height)return;
  const gap=Math.min(4,width*.025);let start=Math.min(14,width*.12),end=width-start;
  for(const ornament of badge.querySelectorAll(':scope>.prestige-medallion,:scope>.crown-medal,:scope>.s2-crown-medal,:scope>.s2-left')){
   const style=getComputedStyle(ornament);if(style.display==='none'||style.visibility==='hidden')continue;
   start=Math.max(start,ornament.offsetLeft+ornament.offsetWidth+gap);
  }
  for(const ornament of badge.querySelectorAll(':scope>.prestige-gems,:scope>.crown-right-gem,:scope>.s2-right')){
   const style=getComputedStyle(ornament);if(style.display==='none'||style.visibility==='hidden')continue;
   end=Math.min(end,ornament.offsetLeft-gap);
  }
  const available=Math.max(1,end-start-2),maxHeight=height*.64;
  label.style.setProperty('--title-label-center',((start+end)/2)+'px');
  label.style.removeProperty('--title-fitted-size');
  const preferred=parseFloat(getComputedStyle(label).fontSize),ratio=Math.min(1,available/Math.max(1,label.scrollWidth),maxHeight/Math.max(1,label.scrollHeight));
  if(ratio<1)label.style.setProperty('--title-fitted-size',(Math.floor(preferred*ratio*100)/100)+'px');
  for(let attempt=0;attempt<4&&(label.scrollWidth>available||label.scrollHeight>maxHeight+1);attempt++){
   const size=parseFloat(getComputedStyle(label).fontSize),scale=Math.min((available-1)/Math.max(1,label.scrollWidth),maxHeight/Math.max(1,label.scrollHeight));
   label.style.setProperty('--title-fitted-size',(Math.floor(size*Math.max(.1,scale)*100)/100)+'px');
  }
  window.TitlePrestigeEffects?.getController(badge)?.refresh?.();
 }
 function queue(badge){pending.add(badge);if(!frame)frame=requestAnimationFrame(flush);}
 function flush(){frame=0;for(const badge of pending)if(badge.isConnected)fit(badge);pending.clear();}
 const resize=new ResizeObserver(records=>{for(const record of records)queue(record.target);});
 function attach(badge){if(badges.has(badge))return;badges.add(badge);resize.observe(badge);queue(badge);}
 function scan(node){if(node.nodeType!==1)return;if(node.matches(selector))attach(node);node.querySelectorAll(selector).forEach(attach);}
 function refresh(){for(const badge of badges)queue(badge);}
 const mutations=new MutationObserver(records=>{
  for(const badge of badges)if(!badge.isConnected){resize.unobserve(badge);badges.delete(badge);pending.delete(badge);}
  for(const record of records)if(record.type==='childList')record.addedNodes.forEach(scan);
  if(records.some(record=>record.type==='attributes'))refresh();
 });
 mutations.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
 document.querySelectorAll(selector).forEach(attach);
 document.fonts?.ready.then(refresh);document.fonts?.addEventListener('loadingdone',refresh);
 window.addEventListener('resize',refresh);window.addEventListener('pageshow',refresh);
 window.TitlePlateLayout={fit,refresh};
})();
