/* Seven technique animations adapted from the supplied mind-battle-effects-code.txt.
   This renderer draws only; confirmed rules own HP, gauges and statuses. */
(()=>{
 'use strict';
 const tau=Math.PI*2;
 const definitions={focus:{color:'#f5d77c',duration:2600,hit:850},convert:{color:'#ffa766',duration:3600,hit:980},blast:{color:'#7acfff',duration:2200,hit:590},freeze:{color:'#93dfff',duration:2900,hit:530},refund:{color:'#7acfff',duration:2700,hit:620},venom:{color:'#c38bfa',duration:4300,hit:540},drain:{color:'#bd75ff',duration:2400,hit:530}};
 const supports=kind=>Object.hasOwn(definitions,kind);
     const originalRandom=i=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v)};
    const glassSeeds=Array.from({length:38},(_,i)=>{const angle=originalRandom(i+1)*tau,r=Math.sqrt(originalRandom(i+52))*90;return{x:Math.cos(angle)*r,y:Math.sin(angle)*r}});
    const breachGlass=glassSeeds.map((seed,i)=>{
      let poly=Array.from({length:6},(_,k)=>({x:Math.cos(k*Math.PI/3)*91,y:Math.sin(k*Math.PI/3)*91}));
      glassSeeds.forEach((other,j)=>{if(i===j)return;const nx=other.x-seed.x,ny=other.y-seed.y,c=(other.x*other.x+other.y*other.y-seed.x*seed.x-seed.y*seed.y)/2,next=[];
        poly.forEach((a,k)=>{const b=poly[(k+1)%poly.length],fa=a.x*nx+a.y*ny-c,fb=b.x*nx+b.y*ny-c;if(fa<=0)next.push(a);if((fa<=0)!==(fb<=0)){const t=fa/(fa-fb);next.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})}});poly=next});
      return{poly,seed,spin:(originalRandom(i+101)-.5)*7,speed:60+originalRandom(i+151)*170};
    }).filter(s=>s.poly.length>=3);

 function draw(ctx,ms,p,other,layout,plan){
  const def=definitions[p.kind];if(!def||p.disabled)return;
  const reduced=plan.reducedMotion;
  const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>1-Math.pow(1-clamp(x),3),tau=Math.PI*2;
  const rand=i=>{const n=Math.sin(i*127.1+47.7)*43758.5453;return n-Math.floor(n)};
  const alpha=(c,a)=>{const n=parseInt(c.slice(1),16);return 'rgba('+(n>>16)+','+(n>>8&255)+','+(n&255)+','+clamp(a)+')'};
  const C={white:'#f0f6ff',enemy:'#ff647f',self:'#77b1ff'};
  const origin=layout.points[p.side-1],target=layout.points[other.side-1],board=layout.boards[other.side-1],ownBoard=layout.boards[p.side-1];
  const a={...origin,width:ownBoard.width,height:ownBoard.height},b={...target,width:board.width,height:board.height};
  const gaugePoint=i=>{const el=layout.gauges[i];if(!el)return layout.points[i];const g=el.getBoundingClientRect();return {x:(g.left+g.width/2-layout.bounds.left)/layout.zoom,y:(g.top+g.height/2-layout.bounds.top)/layout.zoom}};
  const gaugeTarget=gaugePoint(p.side-1),enemyGaugeTarget=gaugePoint(other.side-1),w=layout.bounds.width/layout.zoom,h=layout.bounds.height/layout.zoom;
  const self={},enemy={},label=()=>{},meter=()=>{};
  const sceneMs=ms;
  const impact=plan.duel?plan.clashAt+330:p.attack?p.impact:other.attack?other.impact:440;
  const beamDuel=plan.duel&&['blast','refund'].includes(p.kind);
  if(plan.duel&&!beamDuel&&ms<impact)return;
  if(plan.duel&&!beamDuel&&plan.winner!==p.side-1)return;
  const time=p.kind==='venom'?(reduced?1100:ms):reduced?def.hit+220:ms<impact?ms/impact*def.hit:def.hit+(ms-impact)/(1200-impact)*(def.duration-def.hit);
  const c=p.special?'#bd75ff':def.color,ok=p.attack?other.damage>0&&!other.counter:p.kind==='focus'?p.damage===0:p.kind==='convert'?p.damage>0:true;
    function line(pts,c,width=2,op=1,glow=10){ctx.save();ctx.globalAlpha=clamp(op);ctx.strokeStyle=c;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=c;ctx.shadowBlur=glow;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.restore()}
    function circle(x,y,r,c,op=1,width=2,fill=false){if(r<=0)return;ctx.save();ctx.globalAlpha=clamp(op);ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=width;ctx.shadowColor=c;ctx.shadowBlur=14;ctx.beginPath();ctx.arc(x,y,r,0,tau);fill?ctx.fill():ctx.stroke();ctx.restore()}
    function haze(x,y,r,c,op){if(r<=0)return;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,alpha(c,op));g.addColorStop(.4,alpha(c,op*.25));g.addColorStop(1,alpha(c,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
    function polygon(pts,c,op=1,fill=.1){ctx.save();ctx.fillStyle=alpha(c,fill*op);ctx.strokeStyle=alpha(c,op);ctx.lineWidth=1.5;ctx.shadowColor=c;ctx.shadowBlur=12;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
    function burst(p,t,c,power=1){if(t<0||t>620)return;const v=clamp(t/620),op=1-v;haze(p.x,p.y,95*power,c,.37*op);circle(p.x,p.y,6+ease(v)*62*power,c,op,2.5);circle(p.x,p.y,3+ease(v)*35*power,C.white,op*.6,1);for(let i=0;i<17*power;i++){const an=rand(i+6)*tau,r=12+ease(v)*(30+rand(i)*45)*power;line([{x:p.x+Math.cos(an)*r*.65,y:p.y+Math.sin(an)*r*.65},{x:p.x+Math.cos(an)*r,y:p.y+Math.sin(an)*r}],c,1.5,op)}}
    function number(){}
    function orb(from,to,t,c,r=7){if(t<0||t>1)return;const v=ease(t),x=from.x+(to.x-from.x)*v,y=from.y+(to.y-from.y)*v;for(let j=1;j<7;j++){const q=Math.max(0,v-j*.03);circle(from.x+(to.x-from.x)*q,from.y+(to.y-from.y)*q,r*(1-j/7),c,(1-j/7)*.5,1,true)}haze(x,y,r*4,c,.4);circle(x,y,r,c,1,1,true);circle(x,y,r*.4,C.white,1,1,true)}
    function returning(from,to,ms,count,c){for(let i=0;i<count;i++){const t=(ms-i*95)/630;if(t<0||t>1.2)continue;const v=ease(t),bend=(i%2?-1:1)*(35+i*7),x=from.x+(to.x-from.x)*v,y=from.y+(to.y-from.y)*v-Math.sin(v*Math.PI)*bend;if(t<1){const pts=[];for(let j=0;j<9;j++){const q=Math.max(0,t-j*.025),e=ease(q);pts.push({x:from.x+(to.x-from.x)*e,y:from.y+(to.y-from.y)*e-Math.sin(e*Math.PI)*bend})}line(pts,c,2,.45);circle(x,y,5,c,1,1,true);circle(x,y,2,C.white,1,1,true)}else circle(to.x,to.y,8+(t-1)*80,c,1-(t-1)*5,1.5)}}
    function shield(p,c,op=1){const r=42,pts=Array.from({length:7},(_,i)=>({x:p.x+Math.cos(i*tau/6)*r,y:p.y+Math.sin(i*tau/6)*r}));polygon(pts,c,op,.13)}
    function shake(){}
    function siphonMote(x,y,op=1){
      const c='#54caff';haze(x,y,37,c,.3*op);circle(x,y,6,'#fff6f0',op,1,true);circle(x,y,9,c,op,1.5);line([{x:x+25,y:y-8},{x,y}],c,2,.45*op,12);
    }
    function curveMote(path,t,c,r=5){
      if(t<0||t>1)return;
      const p=path(clamp(t)),trail=[];
      for(let j=9;j>=0;j--)trail.push(path(Math.max(0,t-j*.025)));
      line(trail,'#54caff',2,.45,12);siphonMote(p.x,p.y);
    }
    function gaugeFlash(at,ms,c){if(ms<0||ms>250)return;const op=1-ms/250;line([{x:at.x-22,y:at.y},{x:at.x+22,y:at.y}],c,7,op,20)}
    function drain(ms,ok,c){
      const angle=Math.atan2(b.y-a.y,b.x-a.x),target=ok?b:{x:b.x-Math.cos(angle)*74,y:b.y-Math.sin(angle)*74},cyan='#54caff';
      orb(a,target,(ms-100)/430,c,8);
      if(!ok)shield(target,C.self,1-clamp((ms-760)/350));
      burst(target,ms-530,c,.65);
      if(ms>530){
        if(ok){
          number(b,'−1',C.enemy,ms-530);
          number(gaugeTarget,'+1',cyan,ms-1340);number(enemyGaugeTarget,'−1',cyan,ms-790);
        }
        shake(enemy,ok?ms-530:-1);label(ok?'命中 → 水色のゲージを吸収':'ブロック → 吸収なし');
      }else label('ドレイン');
    }
    function ice(ms,c){
      const hit=530,forming=ease((ms-hit)/440),end=1-clamp((ms-2330)/420);
      orb(a,b,(ms-80)/450,c,6);
      if(ms>=hit){
        const x=b.x-b.width/2,y=b.y-b.height/2,width=b.width,height=b.height,op=forming*end;
        ctx.save();ctx.beginPath();ctx.roundRect(x,y,width,height,13);ctx.clip();
        const frost=ctx.createLinearGradient(x,y,x+width,y+height);frost.addColorStop(0,alpha('#ddf7ff',.65*op));frost.addColorStop(.38,alpha(c,.22*op));frost.addColorStop(.72,alpha('#dbf6ff',.39*op));frost.addColorStop(1,alpha(c,.58*op));ctx.fillStyle=frost;ctx.fillRect(x,y,width,height);
        for(let i=0;i<48;i++){const px=x+rand(i+91)*width,py=y+rand(i+181)*height;circle(px,py,.7+rand(i+4)*1.7,'#e7faff',op*.7,1,true)}
        const cracks=[[[0,.23],[.18,.31],[.29,.22],[.41,.39],[.55,.32]],[[.29,.22],[.31,.06],[.27,0]],[[1,.72],[.81,.61],[.7,.72],[.59,.59]],[[.81,.61],[.86,.42],[1,.39]],[[.14,1],[.21,.82],[.4,.77],[.49,.61]],[[.21,.82],[.08,.7],[0,.72]]];
        for(const crack of cracks)line(crack.map(p=>({x:x+p[0]*width,y:y+p[1]*height})),'#e4f8ff',1,op*.65,3);
        ctx.restore();ctx.save();ctx.strokeStyle=alpha(c,op*.9);ctx.lineWidth=3;ctx.shadowColor=c;ctx.shadowBlur=13;ctx.beginPath();ctx.roundRect(x+1,y+1,width-2,height-2,13);ctx.stroke();ctx.restore();
        label(ms<1100?'バトルカード全体が凍結':ms<2450?'次のターン：凍結で行動不能':'凍結が解除される',ms<2450?'凍結':'');
      }else label('フリーズ');
    }
    function focus(ms,ok,c){
      const t=clamp(ms/950),fade=1-clamp((ms-1100)/500);
      if(ms<850){
        haze(a.x,a.y,90,c,.14*fade);
        for(let k=0;k<3;k++)circle(a.x,a.y,24+(1-ease(t))*(53+k*17),c,.5*fade,1.5);
        for(let i=0;i<18;i++){const ang=i*tau/18+ms*.0006,r=24+(1-ease(t))*(45+rand(i)*48);circle(a.x+Math.cos(ang)*r,a.y+Math.sin(ang)*r,1.6,c,fade,1,true)}
      }
      if(!ok){burst(a,ms-750,C.enemy,.7);shake(self,ms-750);label(ms>750?'被弾 → ゲージ獲得なし':'集中中');if(ms>750){const op=1-clamp((ms-750)/450);line([{x:a.x-22,y:a.y-22},{x:a.x+22,y:a.y+22}],C.enemy,2,op);line([{x:a.x+22,y:a.y-22},{x:a.x-22,y:a.y+22}],C.enemy,2,op)}}
      else{
        for(let i=0;i<3;i++){
          const from={x:gaugeTarget.x+(i%2?-1:1)*Math.min(70,a.width*.3),y:gaugeTarget.y-100};
          if(sceneMs>=impact)window.BattleEffects.drawGaugeTransfer(ctx,sceneMs,from,gaugeTarget,1,{start:impact+20+i*90,halos:false});
        }
      }
    }
    function convert(ms,ok,c){
      const hit=620,pentagon=Array.from({length:5},(_,i)=>({x:a.x+Math.cos(-Math.PI/2+i*tau/5)*57,y:a.y+Math.sin(-Math.PI/2+i*tau/5)*57}));
      if(ok){
        burst(a,ms-hit,C.enemy,.7);shake(self,ms-hit);
        if(sceneMs>=impact){
          for(let i=0;i<5;i++){
            const begin=impact+20+i*90,from=pentagon[i];
            if(sceneMs<begin)siphonMote(from.x,from.y,clamp((sceneMs-impact)/80));
            window.BattleEffects.drawGaugeTransfer(ctx,sceneMs,from,gaugeTarget,1,{start:begin,halos:false});
          }
        }
      }else label(ms<1250?'コンバート':'ゲージ獲得なし');
    }
    function venom(ms,c){
      orb(a,b,(ms-120)/680,c,7);if(ms<800)return;
      const end=1-clamp((ms-2100)/300);haze(b.x,b.y+25,110,c,.22*end);
      for(let i=0;i<17;i++){
        const v=((ms-800)/3800+rand(i))%1,x=b.x+(rand(i+22)-.5)*b.width*.9+Math.sin(ms/1900+i)*8,y=b.y+55-v*125;
        circle(x,y,2+Math.sin(v*Math.PI)*6,c,Math.sin(v*Math.PI)*.48*end,1,true);
      }
    }
    function drawBeam(ms,c,variant,impact=590,opacity=1){
      const direction=Math.atan2(b.y-a.y,b.x-a.x),distance=Math.hypot(b.x-a.x,b.y-a.y);ctx.save();ctx.translate(a.x,a.y);ctx.rotate(direction);
      const from={x:22,y:0},fire=impact-230,grow=clamp((ms-fire)/230),fade=(1-clamp((ms-impact-590)/420))*opacity,charge=clamp(ms/fire);
      if(ms<fire){
        for(let i=0;i<8;i++){const off=(i-3.5)*9*(1-charge);line([{x:from.x-35*(1-charge),y:from.y+off},{x:from.x,y:from.y+off*.3}],c,1.5,charge*.8,15)}
        line([{x:from.x,y:from.y-27*charge},{x:from.x,y:from.y+27*charge}],c,4,charge,22);
      }else if(fade>0){
        const end={x:from.x+(distance+22-from.x)*grow,y:0},pulse=1+Math.sin(ms*.055)*.08;
        if(variant==='focused'){
          line([from,end],c,(p.special?32:23)*pulse,fade*.25,28);
          line([from,end],c,(p.special?18:12)*pulse,fade*.8,18);
          line([from,end],'#d8f3ff',6*pulse,fade,12);
          line([from,end],C.white,2.8*pulse,fade,7);
          for(let i=0;i<8;i++){const q=(ms/200+i/8)%1,x=from.x+(end.x-from.x)*q;line([{x:x-24,y:from.y+(i%2?11:-11)},{x:x+8,y:from.y+(i%2?11:-11)}],c,1,fade*.6,8)}
        }else if(variant==='spread'){
          const half=39*grow*pulse;
          ctx.save();const g=ctx.createLinearGradient(from.x,0,end.x,0);g.addColorStop(0,alpha(c,.25*fade));g.addColorStop(.7,alpha(c,.48*fade));g.addColorStop(1,alpha('#e5f8ff',.75*fade));ctx.fillStyle=g;ctx.shadowColor=c;ctx.shadowBlur=24;
          ctx.beginPath();ctx.moveTo(from.x,from.y-3);ctx.lineTo(end.x,end.y-half);ctx.lineTo(end.x,end.y+half);ctx.lineTo(from.x,from.y+3);ctx.closePath();ctx.fill();ctx.restore();
          for(let i=-3;i<=3;i++){const offset=i*half/3;line([{x:from.x,y:from.y+i},{x:end.x,y:end.y+offset}],i===0?C.white:'#b7e4ff',i===0?4:1.2,fade*(i===0?1:.65),12)}
          for(let i=0;i<9;i++){const q=(ms/360+i/9)%1,x=from.x+(end.x-from.x)*q,reach=half*q;line([{x:x-14,y:from.y-reach},{x:x+14,y:from.y+reach}],c,1,fade*.27,7)}
        }else{
          line([from,end],c,15,fade*.35,24);line([from,end],'#e9f8ff',4,fade*.85,14);line([from,end],C.white,1.5,fade,7);
          for(let strand=0;strand<(p.special?3:2);strand++){
            const pts=[],phase=strand*Math.PI;
            for(let i=0;i<=75;i++){const q=i/75,envelope=Math.sin(q*Math.PI)*18+4;pts.push({x:from.x+(end.x-from.x)*q,y:from.y+Math.sin(q*Math.PI*7-ms*.016+phase)*envelope})}
            line(pts,strand===0?c:'#c6edff',3,fade*.9,15);
            const q=(ms/480+strand*.5)%1,envelope=Math.sin(q*Math.PI)*18+4;
            circle(from.x+(end.x-from.x)*q,from.y+Math.sin(q*Math.PI*7-ms*.016+phase)*envelope,3.5,C.white,fade,1,true);
          }
        }
        haze(distance,0,85,c,.35*grow*fade);
      }
      ctx.restore();
    }
    function blast(ms,c){
      drawBeam(ms,c,'spiral');burst(b,ms-590,c,1.1);number(b,'−3',C.enemy,ms-590);shake(enemy,ms-590);
      label(ms<360?'螺旋ビーム：エネルギーを圧縮':ms<590?'螺旋ビーム':'螺旋ビーム直撃 → 3ダメージ');
    }
    // The same Voronoi partition and shard motion as the existing Breach effect.
    function breachBarrier(p,ms,scale,c){
      const r=91*ease(ms/160),hex=(x,y,r)=>Array.from({length:6},(_,i)=>({x:x+Math.cos(i*Math.PI/3)*r,y:y+Math.sin(i*Math.PI/3)*r}));
      ctx.save();ctx.translate(p.x,p.y);ctx.scale(scale,scale);polygon(hex(0,0,r),c,1,.08);line([...hex(0,0,r*.9),hex(0,0,r*.9)[0]],c,1,.45,0);
      for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++){const x=col*28,y=row*32+(Math.abs(col)%2)*16;if(Math.hypot(x,y)>r-12)continue;const pts=hex(x,y,18);line([...pts,pts[0]],c,1,.23,4)}ctx.restore();
    }
    function breachShatter(p,contact,ms,scale,c){
      if(ms<0||ms>650)return;const hit=clamp(ms/480),fade=1-clamp((ms-410)/350),opacity=(1-hit)*fade;
      ctx.save();ctx.translate(p.x,p.y);ctx.scale(scale,scale);
      breachGlass.forEach((shard,i)=>{
        const angle=Math.atan2(shard.seed.y-24,shard.seed.x+74),d=ease(hit)*shard.speed,x=shard.seed.x+Math.cos(angle)*d+hit*24,y=shard.seed.y+Math.sin(angle)*d+hit*hit*58;
        ctx.save();ctx.translate(x,y);ctx.rotate(shard.spin*hit);ctx.scale(1-hit*.3,1-hit*.3);
        polygon(shard.poly.map(v=>({x:v.x-shard.seed.x,y:v.y-shard.seed.y})),i%4===0?'#fff6f0':c,opacity*.85,.18/.85);ctx.restore();
      });
      for(let i=0;i<24;i++){const angle=originalRandom(i+210)*tau,d=hit*(100+originalRandom(i+250)*190),x=(contact.x-p.x)/scale+Math.cos(angle)*d,y=(contact.y-p.y)/scale+Math.sin(angle)*d+hit*hit*65,size=2+originalRandom(i+280)*5;polygon([{x:x-size,y},{x:x+size*.5,y:y-size},{x:x+size,y:y+size}],c,.65*opacity,1)}ctx.restore();
    }
    function breachBlade(x,y,angle,length,width,opacity,c){
      ctx.save();ctx.translate(x,y);ctx.scale(1,-1);ctx.rotate(angle);ctx.shadowColor=c;ctx.shadowBlur=24*.9;ctx.globalAlpha=clamp(opacity);
      const g=ctx.createLinearGradient(-length/2,0,length/2,0);g.addColorStop(0,alpha(c,0));g.addColorStop(.25,c);g.addColorStop(.6,'#fff6f0');g.addColorStop(1,alpha(c,0));ctx.fillStyle=g;
      ctx.beginPath();ctx.moveTo(-length/2,0);ctx.quadraticCurveTo(0,-width,length/2,0);ctx.quadraticCurveTo(0,width*.45,-length/2,0);ctx.fill();
      ctx.strokeStyle='#fff6f0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-length*.31,0);ctx.quadraticCurveTo(0,-width*.3,length*.36,0);ctx.stroke();ctx.restore();
    }
    function siphonRecover(ms,count,from,to,c,bend=0){
      const alive=1-clamp((ms-1050)/450);circle(from.x,from.y,49*.65,c,.3*alive,1);circle(to.x,to.y,64*.65,c,.4*alive,1.3);
      let collected=0;
      for(let i=0;i<count;i++){
        const begin=100+i*140,p=clamp((ms-begin)/550),dx=to.x-from.x,dy=to.y-from.y,distance=Math.max(1,Math.hypot(dx,dy));
        const path=q=>{const e=ease(q),arc=Math.sin(e*Math.PI)*bend;return{x:from.x+dx*e-dy/distance*arc,y:from.y+dy*e+dx/distance*arc+(bend?0:Math.sin(q*Math.PI)*(i%2===0?44:-44))}};
        const position=path(p);
        if(p<1&&ms>=begin){if(bend)curveMote(path,p,c);else siphonMote(position.x,position.y)}
        if(ms>=begin+550){collected++;circle(to.x,to.y,15+(ms-begin-550)/7,c,(1-clamp((ms-begin-550)/350))*alive,1.5);gaugeFlash(to,ms-begin-550,c)}
      }
      return collected;
    }
    function refund(ms,c){
      const direction=Math.atan2(b.y-a.y,b.x-a.x),ax=Math.cos(direction),ay=Math.sin(direction);
      const impact=620,scale=Math.max(.4,Math.min(1,w/900,h/500)),contact={x:b.x-ax*74*scale,y:b.y-ay*74*scale};
      drawBeam(ms,c,'focused',impact);
      if(other.guard&&ms<impact)breachBarrier(b,ms,scale,'#69aaff');
      if(ms>=impact){
        if(other.guard)breachShatter(b,contact,ms-impact,scale,'#69aaff');
        burst(b,ms-impact,c,1.1);
        number(b,'−1',C.enemy,ms-impact);shake(enemy,ms-impact);
      }
      label(ms<impact?'収束ビームでブロックを貫通':'シールド破壊 → 3つのゲージを回収');
    }

  if(beamDuel){
   const original={x:b.x,y:b.y},mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},won=plan.winner===p.side-1;
   const advance=ease((ms-plan.clashAt-70)/260),alpha=ms<plan.clashAt?1:won?1-clamp((ms-impact-90)/300):1-clamp((ms-plan.clashAt-40)/330);
   if(ms<plan.clashAt){b.x=mid.x;b.y=mid.y;drawBeam(ms/plan.clashAt*def.hit,c,p.kind==='blast'?'spiral':'focused',def.hit);}
   else{
    const endpoint=won?original:plan.winner===null?mid:a;
    b.x=mid.x+(endpoint.x-mid.x)*advance;b.y=mid.y+(endpoint.y-mid.y)*advance;
    drawBeam(def.hit+Math.max(0,ms-plan.clashAt),c,p.kind==='blast'?'spiral':'focused',def.hit,alpha);
    if(won&&ms>=impact){burst(original,ms-impact,c,1.1);if(p.kind==='refund')window.BattleEffects.drawGaugeTransfer(ctx,ms,original,gaugeTarget,3,{start:impact+20});}
   }
   return;
  }
  if(p.attack&&!ok&&p.kind!=='drain'){
   const angle=Math.atan2(b.y-a.y,b.x-a.x);b.x-=Math.cos(angle)*74;b.y-=Math.sin(angle)*74;
   if(p.kind==='blast'||p.kind==='refund')drawBeam(time,c,p.kind==='blast'?'spiral':'focused',def.hit);
   shield(b,'#87cfff',1-clamp((ms-850)/350));
  }else ({drain:()=>drain(time,ok,c),freeze:()=>ice(time,c),focus:()=>focus(time,ok,c),convert:()=>convert(time,ok,c),venom:()=>venom(time,c),blast:()=>blast(time,c),refund:()=>refund(time,c)})[p.kind]();
  if(ok&&['drain','refund'].includes(p.kind)&&ms>=impact)window.BattleEffects.drawGaugeTransfer(ctx,ms,target,gaugeTarget,p.kind==='refund'?3:1,{start:impact+20});
  if(p.special){
   const t=p.kind==='venom'?clamp((ms-650)/1700):clamp((ms-320)/650),fade=Math.sin(t*Math.PI),center=['freeze','venom','blast','refund','drain'].includes(p.kind)?b:a;
   if(p.attack&&!ok)return;
   haze(center.x,center.y,155,c,.2*fade);
   if(p.kind==='freeze'){
    for(let i=0;i<8;i++){const x=board.x+board.width*i/7,y=board.y+board.height;polygon([{x:x-12,y},{x,y:y-45-30*rand(i)},{x:x+16,y}],i%2?'#dff9ff':c,fade,.22);}
    for(let i=0;i<6;i++){const angle=i*tau/6+ms/900;line([{x:b.x+Math.cos(angle)*35,y:b.y+Math.sin(angle)*35},{x:b.x+Math.cos(angle)*105,y:b.y+Math.sin(angle)*105}],C.white,2,fade);}
   }else if(p.kind==='focus'||p.kind==='convert'){
    const n=p.kind==='focus'?3:5;
    for(let j=0;j<2;j++){const points=Array.from({length:n+1},(_,i)=>{const angle=i*tau/n+ms/750*(j?-1:1);return{x:a.x+Math.cos(angle)*(60+j*22),y:a.y+Math.sin(angle)*(60+j*22)*.6}});line(points,j?C.white:c,2,fade*.8,20);}
   }else if(p.kind==='venom'){
    for(let i=0;i<3;i++){const angle=ms/1800+i*tau/3;circle(b.x+Math.cos(angle)*62,b.y+Math.sin(angle)*40,12,c,fade*.7,2);circle(b.x+Math.cos(angle)*62-3,b.y+Math.sin(angle)*40-3,3,C.white,fade*.7,1,true);}
    const sigil=Array.from({length:6},(_,i)=>({x:b.x+Math.cos(i*tau/5)*83,y:b.y+Math.sin(i*tau/5)*53}));line(sigil,c,2,fade,22);
   }else{
    const angle=Math.atan2(b.y-a.y,b.x-a.x),dist=Math.hypot(b.x-a.x,b.y-a.y);
    ctx.save();ctx.translate(a.x,a.y);ctx.rotate(angle);
    for(let strand=0;strand<3;strand++){const points=Array.from({length:44},(_,i)=>{const q=i/43;return{x:q*dist,y:Math.sin(q*Math.PI*9-ms/45+strand*tau/3)*Math.sin(q*Math.PI)*23}});line(points,strand===1?C.white:c,strand===1?1.4:2.5,fade*.8,18);}
    ctx.restore();circle(b.x,b.y,30+ease(t)*85,c,fade,2.5);circle(b.x,b.y,20+ease(t)*65,C.white,fade*.65,1);
   }
  }
 }
 window.NewTechniqueEffects=Object.freeze({supports,draw});
})();
