/* Shared, presentation-only artwork for the home, loadout and profile screens. */
(function(root){
 'use strict';
 const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mod=(v,n)=>(v%n+n)%n;
 const rgba=(hex,a)=>{const n=parseInt(hex.replace('#',''),16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+clamp(a,0,1)+')';};
 function line(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function glow(c,x,y,r,color,a){if(r<=0)return;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(color,a));g.addColorStop(1,rgba(color,0));c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
 function diamond(c,x,y,r,angle,fill,stroke){c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(0,-r);c.lineTo(r*.55,0);c.lineTo(0,r);c.lineTo(-r*.55,0);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.7;c.stroke();line(c,[[0,-r],[0,r]],stroke,.5);}c.restore();}
 function wave(c,w,h,t,color,a,offset=0){c.beginPath();c.moveTo(-30,h);for(let x=-30;x<w+30;x+=12)c.lineTo(x,h*(.46+offset)+Math.sin(x/w*5.2+t*.35+offset*10)*h*.17+Math.cos(x/w*3-t*.2)*h*.07);c.lineTo(w+30,h);c.closePath();const g=c.createLinearGradient(0,h*.25,0,h);g.addColorStop(0,rgba(color,a));g.addColorStop(1,rgba(color,0));c.fillStyle=g;c.fill();}
 const BASE_HOME_TRAILS=65,HOME_TRAILS=Math.round(BASE_HOME_TRAILS*1.5);
 function home(c,w,h,t){
  glow(c,w*.45,h*.36,w*.8,'685eaa',.15);
  for(let i=0;i<HOME_TRAILS;i++){
   const p=mod(t*(.018+i%5*.004)+i*.137,1),a=i*2.399,r=.04+p*p*.9;
   const x=w*.5+Math.cos(a)*r*w,y=h*.43+Math.sin(a)*r*h,previous=r-.01-p*.018;
   line(c,[[w*.5+Math.cos(a)*previous*w,h*.43+Math.sin(a)*previous*h],[x,y]],rgba(i%3?'e2f2ff':'eae6ff',(.08+p*.3)*1.5),.5+p);
  }
 }
 function water(c,w,h,t,mono=false){
  const a=mono?'c4c4c4':'62dbc9',b=mono?'969696':'78b8ef';
  for(let i=0;i<5;i++)wave(c,w,h,t+i*.8,i%2?b:a,.1955,-.23+i*.1);
  for(let i=0;i<10;i++){const x=mod(i*.137*w+t*(6+i%3),w),y=h*(.12+i*.087)+Math.sin(t*.4+i)*15;glow(c,x,y,12,a,.1);}
 }
 function card(c,w,h,t,style){
  if(style==='abyss'){water(c,w,h,t);return;}
  if(style!=='obsidian')return;
  const a='a5c8e0',b='b5a8d2';
  for(let i=0;i<6;i++){
   const x=w*(.08+i*.18)+Math.sin(t*.22+i)*30,y=h*(.18+(i%3)*.3)+Math.cos(t*.17+i)*23;
   c.save();c.translate(x,y);c.rotate(-.45+i*.3+Math.sin(t*.17+i)*.12);
   c.beginPath();c.moveTo(-w*.23,-h*.18);c.lineTo(w*.16,-h*.12);c.lineTo(w*.30,h*.14);c.lineTo(-w*.1,h*.26);c.closePath();
   const g=c.createLinearGradient(-w*.2,-h*.2,w*.2,h*.2);g.addColorStop(0,rgba(a,.04));g.addColorStop(.48,rgba(i%2?b:a,.161));g.addColorStop(1,rgba(a,.015));c.fillStyle=g;c.fill();c.strokeStyle=rgba(a,.13);c.lineWidth=.6;c.stroke();c.restore();
  }
  const scan=mod(t*.055,1);c.save();c.translate(w*(scan*1.6-.3),0);c.transform(1,0,-.55,1,0,0);
  const g=c.createLinearGradient(-50,0,80,0);g.addColorStop(0,rgba(a,0));g.addColorStop(.5,rgba(a,.14));g.addColorStop(1,rgba(a,0));c.fillStyle=g;c.fillRect(-50,0,130,h);c.restore();
 }
 function crystal(c,w,h,t,loss=false){
  const cx=w/2,cy=h/2,r=Math.min(w*.355,h*.34,156),a=loss?'b5a5de':'96e9ef',b=loss?'cf9baf':'ebcd91';
  glow(c,cx,cy,r*1.9,a,loss?.115:.161);c.save();c.translate(cx,cy);
  for(let j=0;j<2;j++){c.save();c.rotate((loss?-.05:.06)*t+j*Math.PI/4);c.strokeStyle=rgba(a,j?.1955:.483);c.lineWidth=j?.7:1;c.strokeRect(-r*.7,-r*.7,r*1.4,r*1.4);c.restore();}
  for(let i=0;i<14;i++){const p=i/14*TAU+t*(loss?-.05:.10),rr=r*(1+.07*Math.sin(t*.65+i))+(loss?mod(t*7+i*9,24):0);diamond(c,Math.cos(p)*rr,Math.sin(p)*rr*.82,(i%3===0?17:10)*(1+.15*Math.sin(t+i)),p+t*.18,rgba(i%3?a:b,loss?.184:.3105),rgba(a,.6325));}
  for(let i=0;i<18;i++){const p=i*.838+t*(loss?-.055:.095),rr=r*(1.16+.14*Math.sin(t*.4+i)),x=Math.cos(p)*rr,y=Math.sin(p)*rr*.88;glow(c,x,y,4,i%4?a:b,.3);c.fillStyle=rgba(i%4?a:b,.65);c.fillRect(x-.7,y-.7,1.4,1.4);}c.restore();
 }
 const api=Object.freeze({home,water,card,crystal,BASE_HOME_TRAILS,HOME_TRAILS});
 if(typeof module==='object'&&module.exports)module.exports=api;root.GameMotionArt=api;
})(typeof window!=='undefined'?window:globalThis);
