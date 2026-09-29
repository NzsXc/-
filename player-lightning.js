/* Visual-only upgrade. Card speed and the shared turn timeline are untouched. */
(()=>{
 function paths(seed){
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const points=[],phase=random()*Math.PI*2;
  let wobble=0;
  for(let i=0;i<=150;i++){
   const t=i/150;wobble=wobble*.58+(random()-.5)*11;
   points.push([225+550*t+18*Math.sin(t*19+phase)+9*Math.sin(t*57)+wobble,-30+660*t]);
  }
  const line=p=>p.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)).join(' ');
  let branches='',filaments='';
  for(const start of [17,38,63,88,113,134]){
   const [x,y]=points[start],sign=random()<.5?-1:1,branch=[[x,y]];
   let bx=x,by=y;
   for(let j=0;j<18;j++){bx+=sign*(2+random()*4)+(random()-.5)*8;by+=2+random()*4;branch.push([bx,by]);}
   branches+=line(branch)+' ';
  }
  for(const start of [24,72,111]){
   const loop=points.slice(start,start+23).map(([x,y],i)=>[x-18*Math.sin(i/22*Math.PI)+(random()-.5)*4,y]);
   filaments+=line(loop)+' ';
  }
  return {main:line(points),branches,filaments};
 }
 function upgrade(){
  const energy=document.querySelector('#playerIntroLayer .intro-energy');
  if(!energy||energy.dataset.lightning==='v2')return;
  energy.dataset.lightning='v2';
  let markup='<svg viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">';
  for(let i=0;i<3;i++){
   const p=paths(7127+i*913);
   markup+='<g class="intro-bolt-frame intro-bolt-frame-'+i+'">'+
    '<path class="intro-bolt-aura" d="'+p.main+'"/>'+
    '<path class="intro-bolt-glow" d="'+p.main+'"/>'+
    '<path class="intro-bolt-branches" d="'+p.branches+'"/>'+
    '<path class="intro-bolt-filaments" d="'+p.filaments+'"/>'+
    '<path class="intro-bolt-core" d="'+p.main+'"/></g>';
  }
  energy.innerHTML=markup+'</svg>';
 }
 new MutationObserver(upgrade).observe(document.body,{childList:true,subtree:true});
 upgrade();
})();
