/* Approved Season 2 artwork. No DOM measurements or account writes here. */
(()=>{
 const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
 const mod=(a,b)=>(a%b+b)%b;
 const hsl=(h,l,a,s=100)=>'hsla('+mod(h,360)+','+s+'%,'+l+'%,'+Math.max(0,Math.min(1,a))+')';
 const palettes={
  gold:{background:['#fff4c820','#e6bd6260','#a7823540'],halo:['#fffce8b8','#ffdc7c54','#ffe08a00']},
  rainbow:{background:['#ffebfc20','#c5e7ff4b','#cda5e340'],halo:['#fff5fbb8','#d9e1ff54','#e1bfff00']},
  ice:{background:['#e1faff26','#79c7eb5c','#265f9e40'],halo:['#f1fcffc2','#8bdcfa5c','#5bd5ff00'],hues:[183,204,222]}
 };
 function line(c,points,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();}
 function draw(c,w,h,t,design){
  if(!w||!h)return;c.globalAlpha=1;c.shadowBlur=0;c.globalCompositeOperation='source-over';c.clearRect(0,0,w,h);
  if(design==='spacetime'){
   const base=c.createLinearGradient(0,0,0,h);['#142b57','#315c88','#182946'].forEach((v,i)=>base.addColorStop(i/2,v));c.fillStyle=base;c.fillRect(0,0,w,h);
   for(let k=0;k<3;k++){c.fillStyle=['#9fd8ff24','#79aaff2c','#a0a8ff19'][k];c.beginPath();c.moveTo(0,h);for(let x=0;x<=w+4;x+=4)c.lineTo(x,h*(.55+k*.13)+Math.sin(x/w*7+k+t*.4)*h*.08);c.lineTo(w,h);c.closePath();c.fill();}
   for(let i=0;i<7;i++){const q=mod(t*.12+i/7,1),r=.05+q*.57;c.strokeStyle='rgba(176,219,255,'+Math.sin(q*Math.PI)*.28+')';c.lineWidth=.6;c.beginPath();c.ellipse(w*.5,h*.5,w*r,h*r*.95,.12*Math.sin(t*.3),0,Math.PI*2);c.stroke();}
   for(let i=0;i<120;i++){const x=mod(rnd(i+2)*w+t*(65+85*rnd(i+6)),w+24)-12,y=mod(rnd(i+35)*h+Math.sin(t*.8+i)*4,h),len=2+rnd(i+45)*9;line(c,[[x,y],[x-len,y+1.2]],'rgba(190,228,255,'+(.12+rnd(i+25)*.42)+')',.5+rnd(i+9));}
   return;
  }
  const p=palettes[design]||palettes.gold,isRainbow=design==='rainbow',isIce=design==='ice',rainbow=.95,scale=h/58;
  const base=c.createLinearGradient(0,0,0,h);p.background.forEach((v,i)=>base.addColorStop(i/2,v));c.fillStyle=base;c.fillRect(0,0,w,h);
  const halo=c.createRadialGradient(w*.5,h*.05,0,w*.5,h*.05,w*.52);p.halo.forEach((v,i)=>halo.addColorStop([0,.45,1][i],v));c.fillStyle=halo;c.fillRect(0,0,w,h);
  for(let i=0;i<16;i++){
   const x=w*(-.06+i*.074)+Math.sin(t*.35+i)*w*.02,spectral=isRainbow||i%2===1;
   const hue=isRainbow?mod(i*360/16+t*7,360):isIce?p.hues[i%3]+Math.sin(t*.25+i)*9:mod(i*53+t*7,360),a=Math.min(.92,.52+.16*Math.sin(t*.6+i));
   const g=c.createLinearGradient(x,0,x+w*.08,h);
   g.addColorStop(0,spectral?hsl(hue,72,a*rainbow):isIce?hsl(200,87,a,80):'rgba(255,246,213,'+a+')');
   g.addColorStop(.55,spectral?hsl(isIce?p.hues[(i+1)%3]:hue+70,65,a*rainbow*.8):isIce?hsl(185,77,a*.65):'rgba(255,220,146,'+a*.65+')');
   g.addColorStop(1,'#fff7d500');c.fillStyle=g;c.beginPath();c.moveTo(x-4,0);c.lineTo(x+11,0);c.lineTo(x+w*.2,h);c.lineTo(x+w*.04,h);c.closePath();c.fill();
  }
  for(let i=0;i<156;i++){
   const x=mod(rnd(i+211)*w+t*(4+rnd(i+8)*8)+Math.sin(t*.4+i)*7,w),y=mod(rnd(i+197)*h-t*(1.5+rnd(i+11)*3.5),h),pulse=Math.pow((1+Math.sin(t*(.7+rnd(i+31))+i))/2,3),a=Math.min(1,.3+.7*pulse);
   const spectral=isRainbow?i%6!==0:i%3!==0,hue=isIce&&i%6!==0?p.hues[i%3]+Math.sin(t*.4+i)*8:mod(i*41+t*12,360);
   const color=spectral?hsl(hue,70,a*rainbow):isIce?hsl(200,92,a,65):'rgba(255,'+(isRainbow?'244,253,':'249,213,')+a+')';
   c.fillStyle=color;c.beginPath();c.arc(x,y,(1.05+rnd(i+18)*1.75)*Math.max(.68,scale),0,Math.PI*2);c.fill();
   if(i%4===0){const r=(4+rnd(i+52)*4.5)*Math.max(.68,scale)*(.7+pulse);line(c,[[x-r,y],[x+r,y]],color,1.15);line(c,[[x,y-r],[x,y+r]],color,1.15);}
  }
  for(let i=0;i<26;i++){
   const x=mod(rnd(i+402)*w+t*(5+rnd(i+388)*9),w+28)-14,y=mod(rnd(i+437)*h-t*(1+rnd(i+419)*2.6),h+18)-9,r=(5+rnd(i+466)*7)*Math.max(.62,scale),angle=t*(.35+rnd(i+478)*.5)+i;
   const hue=isIce&&i%5!==0?p.hues[i%3]:mod(i*67+t*17,360),a=Math.min(.85,(.42+.18*Math.sin(t*.9+i))*rainbow);
   c.save();c.translate(x,y);c.rotate(angle);c.scale(.5+.5*Math.abs(Math.cos(t*.8+i)),1);
   const glass=c.createLinearGradient(-r,-r,r,r);glass.addColorStop(0,hsl(hue,62,a));glass.addColorStop(.45,hsl(isIce&&i%5!==0?p.hues[(i+1)%3]:hue+105,73,a));glass.addColorStop(.55,'rgba(255,255,255,'+a*.85+')');glass.addColorStop(1,hsl(isIce&&i%5!==0?p.hues[(i+2)%3]:hue+220,64,a));
   c.beginPath();c.moveTo(-r*.65,-r);c.lineTo(r*.85,-r*.35);c.lineTo(r*.38,r);c.lineTo(-r*.85,r*.25);c.closePath();c.fillStyle=glass;c.fill();c.strokeStyle=isIce?hsl(200,94,a*.85,65):'rgba(255,250,233,'+a*.85+')';c.lineWidth=.8;c.stroke();line(c,[[-r*.65,-r],[r*.38,r]],isIce?hsl(200,99,a*.7,25):'rgba(255,255,255,'+a*.7+')',.7);c.restore();
  }
  for(let i=0;i<5;i++){
   const x=w*(.1+i*.2)+Math.sin(t*.3+i)*w*.025,g=c.createRadialGradient(x,h*.12,0,x,h*.12,h*.7),a=Math.min(.7,.25+.13*Math.sin(t*.6+i));
   g.addColorStop(0,isRainbow?hsl(i*72+t*8,87,a,90):isIce?hsl(200,94,a,70):'rgba(255,251,228,'+a+')');g.addColorStop(1,'#fff9d600');c.fillStyle=g;c.fillRect(0,0,w,h);
  }
 }
 window.Season2TitleArt={draw};
})();
