// Separate resource reserved for future special moves. No accumulation or spending yet.
(()=>{
 const MAX=30,panels=new Map();
 const node=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!=null)el.textContent=text;return el;};
 function ensure(side){
  if(panels.has(side))return panels.get(side);
  const area=document.getElementById('player'+side+'Area');if(!area)return null;
  const panel=node('section','specialGaugePanel'),title=node('div','specialGaugeTitle','スペシャル'),row=node('div','specialGaugeRow'),track=node('div','specialGaugeTrack'),fill=node('div','specialGaugeFill'),value=node('span','specialGaugeValue','0/'+MAX);
  panel.id='specialGauge'+side;panel.setAttribute('aria-label',side+'Pのスペシャルゲージ');
  track.setAttribute('role','progressbar');track.setAttribute('aria-label','スペシャルゲージ');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(MAX));
  track.append(fill);row.append(track,value);panel.append(title,row);
  area.insertBefore(panel,document.getElementById('actions'+side));panels.set(side,panel);return panel;
 }
 function reset(){for(const panel of panels.values())panel.hidden=true;document.getElementById('battleScreen')?.classList.remove('specialMode');}
 function sync(match){
  if(!window.RoomRules.hasSpecial(match?.roomRules)){reset();return;}
  document.getElementById('battleScreen')?.classList.add('specialMode');
  for(const side of [1,2]){
   const panel=ensure(side);if(!panel)continue;panel.hidden=false;
   const raw=Number(match.special?.gauge?.[side]??0),amount=Number.isFinite(raw)?Math.max(0,Math.min(MAX,Math.floor(raw))):0;
   panel.querySelector('.specialGaugeValue').textContent=amount+'/'+MAX;
   panel.querySelector('.specialGaugeFill').style.width=(amount/MAX*100)+'%';
   const track=panel.querySelector('[role="progressbar"]');track.setAttribute('aria-valuenow',String(amount));track.setAttribute('aria-valuetext',amount+' / '+MAX);
  }
 }
 window.SpecialGauge={MAX,sync,reset};
})();
