/* Confirmed canvas effects. The battle calculator owns HP, gauge and damage. */
(function () {
  'use strict';
  const duration = 1200, settings = {glow:.9, breachSize:1.8};
  const red = '#ff5266', blue = '#69aaff';
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = v => 1 - Math.pow(1 - clamp(v), 3);
  const rgba = (hex, a) => {const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${clamp(a)})`;};
  const random = i => {const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v);};
  const skillKinds = ['breach','counter','punish','heal','foresight','momentum','rampage','seal','enhance','siphon','ruin','mirror'];
  const colors = {orb:red,breach:red,punish:'#ffc65b',momentum:'#e5edff',counter:'#dce5ff',heal:'#65efac',foresight:'#69bfff',rampage:'#ff254b',seal:'#bc83ff',enhance:'#ff6179',siphon:'#54caff',ruin:'#ce3258',mirror:'#c0a9ff',charge:'#79cfff',block:blue};
  const noEffect = {type:'',skill:'',power:0};
  let active = null;
    // Irregular Voronoi fragments keep the original hexagonal outline only before breaking.
  const seeds=Array.from({length:38},(_,i)=>{const a=random(i+1)*Math.PI*2,r=Math.sqrt(random(i+52))*90;return{x:Math.cos(a)*r,y:Math.sin(a)*r};});
  const glass=seeds.map((seed,i)=>{
    let poly=Array.from({length:6},(_,k)=>({x:Math.cos(k*Math.PI/3)*91,y:Math.sin(k*Math.PI/3)*91}));
    seeds.forEach((other,j)=>{if(i===j)return;const nx=other.x-seed.x,ny=other.y-seed.y,c=(other.x*other.x+other.y*other.y-seed.x*seed.x-seed.y*seed.y)/2,next=[];
      poly.forEach((a,k)=>{const b=poly[(k+1)%poly.length],fa=a.x*nx+a.y*ny-c,fb=b.x*nx+b.y*ny-c;if(fa<=0)next.push(a);if((fa<=0)!==(fb<=0)){const t=fa/(fa-fb);next.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}});poly=next;});
    return{poly,seed,spin:(random(i+101)-.5)*7,speed:60+random(i+151)*170};
  }).filter(s=>s.poly.length>=3);


  function kindOf(action) {
    return action.skill ? skillKinds[Number(action.skill.slice(4)) - 1] || '' : {attack:'orb',charge:'charge',block:'block'}[action.type] || '';
  }

  function createPlan(actions, options = {}) {
    const raw = options.rawActions || actions;
    const resolved = actions.map((action, i) => raw[i]?.skill === 'tech12' ? raw[1-i]?.skill === 'tech12' ? noEffect : raw[1-i] : action);
    const damage = [Math.max(0, Number(options.damage?.[0]) || 0), Math.max(0, Number(options.damage?.[1]) || 0)];
    const players = resolved.map((action, i) => {
      action = action || noEffect;
      const kind = kindOf(action), sealed = !!options.sealed?.[i];
      return {side:i + 1, action, kind, attack:action.type === 'attack', impact:kind === 'punish' ? 370 : 440,
        boost:kind === 'momentum' && !!options.momentum?.[i],
        disabled:sealed && ['block','foresight','counter'].includes(kind),
        mirror:raw[i]?.skill === 'tech12', damage:damage[i], power:1};
    });
    const duel = players.every(p => p.attack);
    const clashAt = Math.min(players[0].impact, players[1].impact);
    const winner = duel ? damage[1] > damage[0] ? 0 : damage[0] > damage[1] ? 1 : null : null;
    if (winner !== null) players[winner].power += Math.abs(damage[0] - damage[1]);
    for (let i = 0; i < 2; i++) {
      const p = players[i], other = players[1-i];
      p.counter = p.kind === 'counter' && other.attack && !p.disabled && damage[1-i] > 0;
      p.counterStart = other.impact + 100;
      p.counterHit = p.counterStart + 280;
      p.guard = !p.disabled && (p.action.type === 'block' || p.counter);
      p.breakAt = p.action.type === 'block' && other.attack && other.action.pierce ? other.impact : Infinity;
    }
    const events = players.filter(p => p.damage > 0).map(p => {
      const other = players[2-p.side];
      const hit = other.counter || other.attack;
      return {side:p.side, damage:p.damage, shake:!!hit,
        at:other.counter ? other.counterHit : duel ? clashAt + 330 : other.attack ? other.impact : 440};
    });
    return {players, damage, duel, clashAt, winner, events};
  }

  function painter(ctx, ms, color, white) {
          function line(points,c,width=2,alpha=1,glow=0,fill=false){
        ctx.save();ctx.globalAlpha=clamp(alpha);ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=c;ctx.shadowBlur=glow*settings.glow;
        ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));if(fill){ctx.closePath();ctx.fill();}else ctx.stroke();ctx.restore();
      }
      function circle(x,y,r,c,width=2,alpha=1,glow=0,fill=false,sx=1){
        if(r<=0)return;ctx.save();ctx.translate(x,y);ctx.scale(sx,1);ctx.globalAlpha=clamp(alpha);ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=width;ctx.shadowColor=c;ctx.shadowBlur=glow*settings.glow;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);fill?ctx.fill():ctx.stroke();ctx.restore();
      }
      function haze(x,y,r,c,alpha){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(c,alpha));g.addColorStop(.4,rgba(c,alpha*.22));g.addColorStop(1,rgba(c,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
      function blade(x,y,a,length,width,alpha=1,c=color){
        ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.shadowColor=c;ctx.shadowBlur=24*settings.glow;ctx.globalAlpha=clamp(alpha);
        const g=ctx.createLinearGradient(-length/2,0,length/2,0);g.addColorStop(0,rgba(c,0));g.addColorStop(.25,c);g.addColorStop(.6,white);g.addColorStop(1,rgba(c,0));ctx.fillStyle=g;
        ctx.beginPath();ctx.moveTo(-length/2,0);ctx.quadraticCurveTo(0,-width,length/2,0);ctx.quadraticCurveTo(0,width*.45,-length/2,0);ctx.fill();
        ctx.strokeStyle=white;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-length*.31,0);ctx.quadraticCurveTo(0,-width*.3,length*.36,0);ctx.stroke();ctx.restore();
      }
      const hex=(x,y,r)=>Array.from({length:7},(_,i)=>[x+Math.cos(i*Math.PI/3)*r,y+Math.sin(i*Math.PI/3)*r]);
      function lightning(x,y,r,c,alpha,seed=1){
        const calm=seed===31,frame=calm?0:Math.floor(ms/42),count=calm?4:12;
        for(let i=0;i<count;i++){
          const a=i*Math.PI*2/count+random(i+seed)*.3,points=[[x,y]];
          for(let j=1;j<=6;j++){const d=j/6*r*(.7+random(i+seed+43)*.4),jitter=(random(frame*23+i*13+j+seed)-.5)*(calm?12:22);points.push([x+Math.cos(a)*d-Math.sin(a)*jitter,y+Math.sin(a)*d+Math.cos(a)*jitter]);}
          line(points,c,2.5,alpha,24);line(points,white,1,alpha*.7,8);
          if(!calm&&i%2===0){const p=points[3],b=a+.6;line([p,[p[0]+Math.cos(b)*18,p[1]+Math.sin(b)*18],[p[0]+Math.cos(b)*36+7,p[1]+Math.sin(b)*36-7]],c,1.4,alpha*.65,10);}
        }
      }
      function barrier(x,y,c=blue,alpha=1,r=91){
        const size=r*ease(ms/160);line(hex(x,y,size),c,1,.08*alpha,0,true);line(hex(x,y,size),c,2.5,alpha,15);line(hex(x,y,size*.9),c,1,.45*alpha);
        for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++){const px=x+col*28,py=y+row*32+(Math.abs(col)%2)*16;if(Math.hypot(px-x,py-y)>size-12)continue;line(hex(px,py,18),c,1,.23*alpha,4);}
      }
      function weapon(type,x,y,a,c,size=1,strong=false){
        ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.scale(size,size);
        if(type==='orb'){
          for(let i=7;i>=1;i--)circle(-i*14,0,Math.max(1,13-i*1.4),c,1,.5-i*.05,8,true);
          haze(0,0,50,c,.3);circle(0,0,14,c,1,1,22,true);circle(0,0,7,white,1,1,10,true);
        }
        if(type==='breach')for(let i=2;i>=0;i--)blade(-i*26,0,-.2,180*settings.breachSize,21*settings.breachSize,1-i*.3,c);
        if(type==='punish')blade(0,0,0,235,31,.95,c);
        if(type==='momentum'){
          for(let i=2;i>=0;i--)blade(-i*28,0,0,strong?185:134,strong?22:15,1-i*.28,c);
          line([[-40,-19],[-114,-19]],c,1.5,.4,8);
        }
        ctx.restore();
      }

    return {line,circle,haze,blade,hex,lightning,barrier,weapon};
  }

  function pointFor(element, layerBounds, zoom, fallback) {
    if (!element) return fallback;
    const r = element.getBoundingClientRect();
    return {x:(r.left + r.width/2 - layerBounds.left)/zoom,y:(r.top + r.height/2 - layerBounds.top)/zoom};
  }

  function geometry(layer, canvas, ctx) {
    const bounds = layer.getBoundingClientRect(), w = Math.max(1,bounds.width), h = Math.max(1,bounds.height);
    const dpr = Math.min(window.devicePixelRatio || 1,2), zoom = Math.max(.3,Math.min(1,w/900,h/500));
    if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) {canvas.width = Math.round(w*dpr);canvas.height = Math.round(h*dpr);}
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(dpr*zoom,0,0,dpr*zoom,0,0);
    const areas = [1,2].map(side => document.getElementById('player'+side+'Area'));
    const points = areas.map((el,i) => pointFor(el,bounds,zoom,{x:w/zoom*(i?.8:.2),y:h/zoom*(i?.25:.75)}));
    const boards = areas.map((el,i) => {const r = el?.getBoundingClientRect();return r ? {x:(r.left-bounds.left)/zoom,y:(r.top-bounds.top)/zoom,width:r.width/zoom,height:r.height/zoom} : {x:points[i].x-70,y:points[i].y-40,width:140,height:80};});
    const gauges = [1,2].map(side => document.querySelector('#player'+side+'Area .gaugeBar'));
    return {bounds,dpr,zoom,points,boards,gauges};
  }

  function drawCracks(ctx, ms, board, color) {
    const alpha = 1-ease((ms-500)/700), progress = ease(ms/360);
    const cracks = [[[.02,.78],[.22,.6],[.35,.45],[.49,.53],[.61,.32],[.75,.24],[.92,.02]],[[.35,.45],[.28,.26],[.34,.07]],[[.49,.53],[.55,.72],[.7,.91]],[[.61,.32],[.82,.44],[.98,.36]],[[.22,.6],[.2,.84],[.1,.98]],[[.75,.24],[.72,.09],[.65,0]]];
    ctx.save();ctx.beginPath();ctx.rect(board.x,board.y,board.width,board.height);ctx.clip();
    ctx.translate(board.x,board.y);ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.shadowColor=color;ctx.shadowBlur=5*settings.glow;
    for (const points of cracks) {ctx.beginPath();points.slice(0,Math.ceil(clamp(progress*points.length,1,points.length))).forEach((p,i)=>i?ctx.lineTo(p[0]*board.width,p[1]*board.height):ctx.moveTo(p[0]*board.width,p[1]*board.height));ctx.stroke();}
    ctx.restore();
  }

  function drawSide(ctx, ms, player, opponent, layout) {
    const kind = player.kind, spec = {role:!player.attack};
    if (!kind || player.disabled) return;
    const origin = layout.points[player.side-1], target = layout.points[opponent.side-1];
    const direction = Math.atan2(target.y-origin.y,target.x-origin.x), toward = {x:Math.cos(direction),y:Math.sin(direction)};
    const guarded = opponent.action.type === 'block' && !opponent.disabled, reflected = opponent.counter;
    const blocked = guarded && !player.action.pierce || reflected;
    const contact = guarded || reflected ? {x:target.x-toward.x*74,y:target.y-toward.y*74} : target;
    const bonus = kind === 'punish' && opponent.action.type === 'charge', boost = player.boost;
    const color = bonus ? '#ff2949' : colors[kind], white = bonus ? '#ffb5c3' : '#fff6f0';
    const impact = player.attack ? player.impact : opponent.attack ? opponent.impact : 440;
    const hit = clamp((ms-impact)/480), fly = clamp((ms-120)/(impact-120)), fade = 1-ease((ms-850)/350);
    const angle = Math.atan2(contact.y-origin.y,contact.x-origin.x), ax = Math.cos(angle), ay = Math.sin(angle);
    const targetSelect = {value:opponent.attack?'attack':opponent.action.type};
    const ownGauge = layout.gauges[player.side-1], canvas = ctx.canvas;
    const dpr = layout.dpr, scale = dpr*layout.zoom, offsetX = 0, offsetY = 0;
    const counterStart = player.counterStart, counterHit = player.counterHit;
    const {line,circle,haze,blade,hex,lightning,barrier,weapon} = painter(ctx,ms,color,white);
          if(spec.role){
        const t=clamp(ms/900),alive=fade,burst=1-hit,ox=origin.x,oy=origin.y,tx=target.x,ty=target.y;
        const incoming=opponent.attack;
        if(['counter','foresight','block'].includes(kind)){
          if(ms<player.breakAt)barrier(ox,oy,kind==='counter'?color:blue,alive);
          if(kind==='counter')circle(ox,oy,68,color,1.5,.5*alive,8);
          if(kind==='foresight'){
            const scan=clamp(ms/1200)*Math.PI*2;
            line([[ox,oy],[ox+Math.cos(scan)*82,oy+Math.sin(scan)*82]],color,2,.5*alive,10);
            if(targetSelect.value==='charge')for(let i=0;i<3;i++)circle(tx+Math.cos(i*2.1)*58,ty+Math.sin(i*2.1)*58,4,color,1,.7*alive,12,true);
          }
          if(incoming&&ms>=impact){haze(ox+toward.x*74,oy+toward.y*74,63,color,.55*burst*alive);circle(ox+toward.x*74,oy+toward.y*74,8+hit*65,color,2,burst*alive,12);}
          if(kind==='counter'&&player.counter){
            if(ms>=counterStart&&ms<counterHit){const p=ease((ms-counterStart)/280);weapon('orb',ox+(tx-ox)*p,oy+(ty-oy)*p,angle,red);}
            if(ms>=counterHit){const p=clamp((ms-counterHit)/380),a=(1-p)*alive;haze(tx,ty,105,red,.4*a);circle(tx,ty,17+p*78,red,3,a,20);circle(tx,ty,8+p*54,white,1.5,.8*a,10);}
          }
        }
        if(kind==='heal'){
          for(let i=0;i<2;i++){const q=clamp((ms-i*130)/900);if(ms<i*130)continue;const r=8+ease(q)*127,a=(1-q)*alive;circle(ox,oy,r,color,2.5,a,13);circle(ox,oy,r,color,1,a*.035,0,true);}
          const a=(1-clamp(ms/550))*alive;line([[ox-14,oy],[ox+14,oy]],white,5,a,12);line([[ox,oy-14],[ox,oy+14]],white,5,a,12);
        }
        if(kind==='rampage'){
          const charge=clamp(ms/280),chargeFade=1-clamp((ms-280)/250);haze(ox,oy,125,color,.45*charge*chargeFade);
          if(ms<530)for(let i=0;i<16;i++){const a=i*Math.PI/8,r=8+90*ease(charge);circle(ox+Math.cos(a)*r,oy+Math.sin(a)*r,2+random(i)*2,color,1,chargeFade,12,true);}
          let gx=105,gy=466;
          if(typeof ownGauge.getBoundingClientRect==='function'&&typeof canvas.getBoundingClientRect==='function'){
            const gr=ownGauge.getBoundingClientRect(),cr=canvas.getBoundingClientRect();if(cr.width>0){gx=((gr.left+gr.width/2-cr.left)*dpr-offsetX)/scale;gy=((gr.top+gr.height/2-cr.top)*dpr-offsetY)/scale;}
          }
          for(let i=0;i<8;i++){
            const begin=300+i*42,p=clamp((ms-begin)/350),a=i*Math.PI/4,sx=ox+Math.cos(a)*68,sy=oy+Math.sin(a)*58;
            if(ms<begin)continue;
            const x=sx+(gx-sx)*ease(p),y=sy+(gy-sy)*ease(p)-Math.sin(p*Math.PI)*25;
            if(p<1){haze(x,y,28,color,.25);circle(x,y,7.5,color,1,alive,16,true);circle(x,y,3.7,'#ffe2e8',1,alive,8,true);line([[x+10,y-13],[x,y]],color,2,.35*alive,8);}
            else{const a=1-clamp((ms-begin-350)/140);circle(gx,gy,3+(ms-begin-350)/12,color,1.5,a,10);}
          }
        }
        if(kind==='seal'){
          barrier(tx,ty,blue,.35*alive);haze(tx,ty,123,color,.22*alive);
          const locked=ease((ms-180)/250);blade(tx,ty,.8,140*locked,15,alive,color);blade(tx,ty,-.8,140*locked,15,alive,color);
        }
        if(kind==='enhance'){
          haze(ox,oy+36,100,color,.18*alive);
          for(let i=0;i<9;i++){
            const p=clamp(ms/860),x=ox+(i-4)*15,y=oy+68-p*173,len=80;
            ctx.save();ctx.globalAlpha=alive*.44*(1-p*.5);ctx.shadowColor=color;ctx.shadowBlur=14*settings.glow;
            const g=ctx.createLinearGradient(x,y,x,y-len);g.addColorStop(0,rgba(color,0));g.addColorStop(.5,color);g.addColorStop(1,rgba(color,0));ctx.fillStyle=g;
            ctx.beginPath();ctx.moveTo(x-7,y);ctx.quadraticCurveTo(x-14,y-len*.5,x,y-len);ctx.quadraticCurveTo(x+14,y-len*.5,x+7,y);ctx.closePath();ctx.fill();ctx.restore();
          }
        }
        if(kind==='siphon'){
          circle(tx,ty,49,color,1.5,.3*alive,9);circle(ox,oy,64,color,2,.4*alive,10);
          for(let i=0;i<2;i++){const p=clamp((ms-100-i*90)/550),x=tx+(ox-tx)*ease(p),y=ty+(oy-ty)*ease(p)+Math.sin(p*Math.PI)*(i===0?44:-44);if(p<1&&ms>=100+i*90){haze(x,y,37,color,.3);circle(x,y,9,white,1,1,20,true);circle(x,y,14,color,2,1,16);line([[x+25,y-8],[x,y]],color,2,.45,12);}if(p>=1)circle(ox,oy,24+(ms-650-i*90)/5,color,2,(1-clamp((ms-650-i*90)/350))*alive,15);}
          if(ms>650)haze(ox,oy,80,color,.3*alive);
        }
        if(kind==='ruin')drawCracks(ctx,ms,layout.boards[opponent.side-1],color);
        if(kind==='mirror'){
          const mx=423,my=267;line([[mx-36,my-86],[mx+39,my-69],[mx+39,my+86],[mx-36,my+69],[mx-36,my-86]],color,2,alive,14);line([[mx-25,my+49],[mx+27,my-49]],white,1.5,.5*alive,8);haze(mx,my,105,color,.2*alive);
          if(incoming){const p=clamp((ms-120)/320),x=tx+(mx-tx)*p,y=ty+(my-ty)*p;const cx=ox+(mx-ox)*p,cy=oy+(my-oy)*p;if(ms<440){circle(x,y,12,red,1,1,15,true);circle(cx,cy,12,color,1,1,15,true);}else{circle(mx,my,10+hit*130,color,3,burst*alive,16);circle(mx,my,8+hit*96,white,1.5,burst*.6*alive,8);}}
          if(targetSelect.value==='block'){barrier(ox,oy,color,.75*alive,73);barrier(tx,ty,blue,.65*alive,73);}
          if(targetSelect.value==='charge'){for(const p of [origin,target]){circle(p.x,p.y,35+ease(t)*40,color,2,.65*alive,12);for(let i=0;i<5;i++){const a=i*1.26+ms/450,r=60*(1-t)+10;circle(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,3,color,1,alive,10,true);}}}
        }
        if(kind==='charge'){
          haze(ox,oy,120,color,.22*alive);circle(ox,oy,25+Math.sin(ms/170)*8,color,2,.7*alive,20);
          for(let i=0;i<20;i++){const p=(ms/750+i/20)%1,a=i*2.4+ms/700,r=105*(1-p);circle(ox+Math.cos(a)*r,oy+Math.sin(a)*r,1.7+random(i)*2.3,color,1,(.25+p*.65)*alive,12,true);}
        }
        return;
      }

          if(ms<230){const q=clamp(ms/120),a=1-clamp((ms-120)/110);haze(origin.x,origin.y,55,color,.35*q*a);circle(origin.x,origin.y,25*(1-q)+5,color,2,a*q,12);}
      if(targetSelect.value==='charge'&&ms<impact){
        for(let i=0;i<5;i++){const a=i*Math.PI*2/5+ms/500,r=33+Math.sin(ms/140+i)*9;circle(target.x+Math.cos(a)*r,target.y+Math.sin(a)*r,2.5,blue,1,.6,8,true);}
        circle(target.x,target.y,42,blue,1,.18,7);
      }
      if(guarded){
        const broken=kind==='breach'&&ms>=impact,r=91*ease(ms/160),alpha=broken?(1-hit)*fade:fade;
        if(broken){
          glass.forEach((shard,i)=>{
            const a=Math.atan2(shard.seed.y-24,shard.seed.x+74),d=ease(hit)*shard.speed,x=target.x+shard.seed.x+Math.cos(a)*d+hit*24,y=target.y+shard.seed.y+Math.sin(a)*d+hit*hit*58;
            ctx.save();ctx.translate(x,y);ctx.rotate(shard.spin*hit);ctx.scale(1-hit*.3,1-hit*.3);
            const points=shard.poly.map(p=>[p.x-shard.seed.x,p.y-shard.seed.y]);points.push(points[0]);
            line(points,i%4===0?white:blue,1.2,.18*alpha,0,true);line(points,i%4===0?white:blue,1.2,alpha*.85,6);ctx.restore();
          });
          for(let i=0;i<24;i++){const a=random(i+210)*Math.PI*2,d=hit*(100+random(i+250)*190),x=contact.x+Math.cos(a)*d,y=contact.y+Math.sin(a)*d+hit*hit*65,size=2+random(i+280)*5;line([[x-size,y],[x+size*.5,y-size],[x+size,y+size],[x-size,y]],blue,1,.65*alpha,7,true);}
        }
      }
      if(ms>=120&&ms<impact){
        const t=fly*fly,x=origin.x+(contact.x-origin.x)*t,y=origin.y+(contact.y-origin.y)*t;
        if(kind==='breach'){
          const size=settings.breachSize;
          for(let i=2;i>=0;i--)blade(x-ax*i*30,y-ay*i*30,angle-.22,180*size,21*size,1-i*.3);
          line([[origin.x,origin.y],[x-ax*60,y-ay*60]],red,2,.2,8);
        }
        if(kind==='orb'){
          for(let i=8;i>=1;i--)circle(x-ax*i*15,y-ay*i*15,Math.max(1,14-i*1.4),color,1,.5-i*.045,9,true);
          haze(x,y,58,color,.45);circle(x,y,14,color,2,1,26,true);circle(x,y,8,white,1,1,12,true);circle(x,y,20,color,1.5,.8,10);
        }
        if(kind==='momentum'){
          const length=boost?185:134;
          for(let i=3;i>=0;i--)blade(x-ax*i*(boost?35:23),y-ay*i*(boost?35:23),angle,length,boost?22:15,1-i*.25,color);
          for(let i=0;i<(boost?3:1);i++)line([[x-ax*(65+i*24)-ay*15,y-ay*(65+i*24)+ax*15],[x-ax*(115+i*24)-ay*15,y-ay*(115+i*24)+ax*15]],color,1.5,.45-i*.1,10);
          haze(x,y,boost?53:36,color,.2);
        }
        if(kind==='punish'){
          const telegraph=clamp((ms-100)/140),r=(bonus?99:76)*telegraph;
          if(bonus){haze(target.x,target.y,145,'#160008',telegraph*.82);haze(target.x,target.y,105,color,telegraph*.24);}
          circle(target.x,target.y,r,color,1.5,.25,8,false,.6);
          if(ms>260){const fall=clamp((ms-260)/(impact-260));blade(contact.x,contact.y-190*(1-fall),Math.PI/2,bonus?320:270,bonus?47:36,fall,color);}
          for(let i=0;i<5;i++){const xx=target.x+(i-2)*22;line([[xx,target.y-135],[xx,target.y-75]],color,1,.12*telegraph);}
        }
      }
      if(ms>=impact){
        const burst=1-hit,c=blocked?blue:color,center=guarded||reflected?contact:target;
        haze(center.x,center.y,kind==='punish'&&bonus?145:100,c,.5*burst*fade);
        if(kind==='breach'&&!blocked){
          const length=(185+hit*30)*settings.breachSize;
          blade(target.x,target.y,-.8,length,24*burst+4,burst*fade);blade(target.x,target.y,.8,length,24*burst+4,burst*fade);
          circle(target.x,target.y,20+hit*115,red,2,.5*burst*fade,12,false,.8);
          if(guarded)line([[contact.x,contact.y],[target.x+70,target.y-23]],white,3,burst*.55,20);
        }
        if(kind==='punish'&&!blocked){
          const power=bonus?1.7:1.4;
          if(bonus){haze(target.x,target.y,205,'#160008',.96*burst*fade);haze(target.x,target.y,150,'#700018',.58*burst*fade);circle(target.x,target.y,36+hit*125,'#3f0010',12,.75*burst*fade,8,false,.76);}
          blade(target.x,target.y,Math.PI/2,(225+hit*30)*power,(29*burst+3)*power,burst*fade,color);
          circle(target.x,target.y,22+hit*125*power,color,3,burst*fade,18,false,.76);
          circle(target.x,target.y,10+hit*95*power,white,1.5,burst*.6*fade,9,false,.76);
          const cracks=[[-115,32],[-64,5],[-30,14],[0,0],[38,23],[80,6],[125,29]].map(p=>[target.x+p[0]*power,target.y+p[1]*power]);line(cracks,color,2.5,burst*.7*fade,10);
          if(bonus)for(let i=0;i<4;i++){const a=i*Math.PI/2+.3;blade(target.x+Math.cos(a)*hit*105,target.y+Math.sin(a)*hit*80,a,43,7,burst*.65*fade,color);}
          lightning(target.x,target.y,bonus?124:103,color,(1-clamp((ms-impact)/360))*.7*fade,31);
          if(bonus){
            line([[target.x-19,target.y-119],[target.x-7,target.y-38],[target.x-16,target.y+8],[target.x+7,target.y+96],[target.x+3,target.y+20],[target.x+15,target.y-24],[target.x-2,target.y-74],[target.x-19,target.y-119]],'#130006',1,.85*burst*fade,0,true);
            line([[target.x-18,target.y-120],[target.x-5,target.y-36],[target.x-13,target.y+8],[target.x+7,target.y+96]],color,1.5,.8*burst*fade,8);
          }
        }
        if(kind==='momentum'&&!blocked){
          blade(target.x,target.y,angle,boost?220:156,boost?29:18,burst*fade,color);
          circle(target.x,target.y,10+hit*(boost?130:96),color,boost?3:2,burst*fade,16,false,.65);
          if(boost)circle(target.x,target.y,14+hit*142,'#ffbcc6',1.5,burst*.55*fade,10,false,.65);
        }
        if(kind==='orb'&&!blocked){circle(target.x,target.y,12+hit*97,color,3,burst*fade,16);circle(target.x,target.y,5+hit*73,white,1.5,burst*.65*fade,8);}
        if(blocked){
          circle(contact.x,contact.y,6+hit*72,white,2.3,burst*fade,14);circle(contact.x,contact.y,11+hit*104,blue,1.5,burst*.6*fade,10);
          if(kind==='momentum')blade(contact.x,contact.y,angle,90,13,burst*fade,color);
          if(kind==='punish')blade(contact.x,contact.y,Math.PI/2,130,18,burst*fade,color);
          if(kind==='orb')circle(contact.x,contact.y,12+hit*16,color,3,burst*.7,18);
        }
        const count=kind==='punish'?4:12;
        for(let i=0;i<count;i++){
          const a=i/count*Math.PI*2+.3,d=15+hit*(65+(i%4)*17)*(bonus?1.2:1),len=6+burst*15;
          const x=center.x+Math.cos(a)*d,y=center.y+Math.sin(a)*d;line([[x,y],[x+Math.cos(a)*len,y+Math.sin(a)*len]],i%3?c:white,1.8,burst*fade,10);
        }
      }

  }

  function drawClash(ctx, ms, plan, layout) {
    const kind = plan.players[0].kind, color = colors[kind], white = '#fff6f0';
    const origin = layout.points[0], target = layout.points[1];
    const angle = Math.atan2(target.y-origin.y,target.x-origin.x), impact = plan.clashAt;
    const fly = clamp((ms-120)/(impact-120)), arrival = impact+330;
    const boost = plan.players[0].boost, ownPower = plan.players[0].power;
    const enemy = {kind:plan.players[1].kind,power:plan.players[1].power};
    const duel = true;
    const {line,circle,haze,blade,lightning,weapon} = painter(ctx,ms,color,white);
          if(duel){
        const mx=(origin.x+target.x)/2,my=(origin.y+target.y)/2;
        if(ms>=120&&ms<impact){
          const p=fly*fly;weapon(kind,origin.x+(mx-origin.x)*p,origin.y+(my-origin.y)*p,angle,color,1,boost);
          weapon(enemy.kind,target.x+(mx-target.x)*p,target.y+(my-target.y)*p,angle+Math.PI,blue,1,plan.players[1].boost);
        }
        if(ms>=impact){
          const q=clamp((ms-impact)/380),a=1-q;
          circle(mx,my,8+ease(q)*133,white,2.5,a,14);circle(mx,my,4+ease(q)*94,blue,1.5,a*.65,10);haze(mx,my,45+q*65,white,.2*a);
          if(ownPower!==enemy.power){
            const wins=ownPower>enemy.power,dest=wins?target:origin,c=wins?color:blue,type=wins?kind:enemy.kind,difference=Math.abs(ownPower-enemy.power),p=clamp((ms-impact-70)/260);
            if(ms<arrival){const x=mx+(dest.x-mx)*ease(p),y=my+(dest.y-my)*ease(p);weapon(type,x,y,wins?angle:angle+Math.PI,c,.7+.3*difference/Math.max(ownPower,enemy.power),wins&&boost);}
            else{
              const h=clamp((ms-arrival)/300),f=1-h;haze(dest.x,dest.y,95,c,.35*f);circle(dest.x,dest.y,12+ease(h)*86,c,2.3,f,14);
              if(type==='breach'){blade(dest.x,dest.y,-.8,250,21,f,c);blade(dest.x,dest.y,.8,250,21,f,c);}
              if(type==='punish'){blade(dest.x,dest.y,Math.PI/2,285,34,f,c);lightning(dest.x,dest.y,99,c,.55*f,31);}
              if(type==='momentum')blade(dest.x,dest.y,angle,185,21,f,c);
            }
          }
        }
        return;
      }

  }

  function render(ctx, ms, plan, layout) {
    for (const p of plan.players) if (p.mirror) {
      const self = layout.points[p.side-1], other = layout.points[2-p.side];
      const x = (self.x+other.x)/2, y = (self.y+other.y)/2;
      const {line,haze} = painter(ctx,ms,colors.mirror,'#fff6f0'), alpha = 1-ease((ms-850)/350);
      line([[x-36,y-86],[x+39,y-69],[x+39,y+86],[x-36,y+69],[x-36,y-86]],colors.mirror,2,alpha,14);
      line([[x-25,y+49],[x+27,y-49]],'#fff6f0',1.5,.5*alpha,8);haze(x,y,105,colors.mirror,.2*alpha);
    }
    if (plan.duel) drawClash(ctx,ms,plan,layout);
    else for (let i=0;i<2;i++) drawSide(ctx,ms,plan.players[i],plan.players[1-i],layout);
  }

  function cancel() {
    if (!active) return;
    cancelAnimationFrame(active.raf);clearTimeout(active.timer);active.canvas.remove();
    for (const animation of active.shakes) animation.cancel();
    active=null;
  }

  function play(options) {
    cancel();
    const canvas=document.createElement('canvas');canvas.className='confirmedEffectCanvas';canvas.setAttribute('aria-hidden','true');
    const ctx=canvas.getContext('2d');if(!ctx)return false;
    options.layer.replaceChildren(canvas);
    const plan=createPlan(options.actions,options), reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const record={canvas,raf:0,timer:0,shakes:[],seen:new Set()};active=record;
    const began=performance.now();
    function dispatch(ms) {
      for (const event of plan.events) if (ms>=event.at&&!record.seen.has(event.side)) {
        record.seen.add(event.side);options.onImpact?.(event.side,event.damage);
        const screen=document.getElementById('battleScreen');
        if (event.shake&&!reduced&&screen?.animate) record.shakes.push(screen.animate([
          {transform:'translate(0,0)'},{transform:'translate(-3px,1px)'},{transform:'translate(2px,-1px)'},{transform:'translate(-1px,0)'},{transform:'translate(0,0)'}
        ],{duration:180,easing:'linear'}));
      }
    }
    function finish() {
      if(active!==record)return;
      dispatch(duration);cancel();options.onComplete?.();
    }
    function frame(now) {
      if(active!==record)return;
      const ms=Math.min(duration,now-began);
      render(ctx,ms,plan,geometry(options.layer,canvas,ctx));dispatch(ms);
      if(ms<duration)record.raf=requestAnimationFrame(frame);
      else finish();
    }
    if(reduced)render(ctx,570,plan,geometry(options.layer,canvas,ctx));
    else record.raf=requestAnimationFrame(frame);
    // Background tabs throttle RAF; complete the turn even when no frame is delivered.
    record.timer=setTimeout(finish,duration+60);
    return true;
  }
  window.BattleEffects=Object.freeze({createPlan,play,cancel,kindOf,duration});
})();
