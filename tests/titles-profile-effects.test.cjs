const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','titles-prestige-effects.js'),'utf8');

function measure(scaleX,scaleY,{width=270,height=32,border=1}={}){
 const textBox={left:43,top:9,width:width-86,height:15};
 const rect=({left,top,width,height})=>({left:100+left*scaleX,top:80+top*scaleY,width:width*scaleX,height:height*scaleY,right:100+(left+width)*scaleX,bottom:80+(top+height)*scaleY});
 const text={dataset:{text:'BLEACH'},getBoundingClientRect:()=>rect(textBox)};
 const badge={isConnected:true,offsetWidth:width,offsetHeight:height,clientWidth:width-2*border,clientHeight:height-2*border,clientLeft:border,clientTop:border,getBoundingClientRect:()=>rect({left:0,top:0,width,height}),querySelector:()=>text,append(){},classList:{add(){}},style:{setProperty(){}}};
 const canvases=[],context2d=new Proxy({},{get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});
 const document={documentElement:{},querySelectorAll:()=>[badge],createElement:()=>{const canvas={setAttribute(){},getContext:()=>context2d};canvases.push(canvas);return canvas;}};
 const context=vm.createContext({document,window:{},matchMedia:()=>({matches:true,addEventListener(){}}),getComputedStyle:()=>({getPropertyValue:()=>'',fontWeight:'900',fontSize:'15px',fontFamily:'Arial',letterSpacing:'0px'}),performance:{now:()=>0},ResizeObserver:class{observe(){}},IntersectionObserver:class{observe(){}},MutationObserver:class{observe(){}},requestAnimationFrame:()=>1});
 vm.runInContext(source,context);
 const controller=context.window.TitlePrestigeEffects.getController(badge);
 return {geometry:JSON.parse(JSON.stringify(controller.getEmissionGeometry())),canvasWidth:canvases[0].width,canvasHeight:canvases[0].height,bolts:JSON.parse(JSON.stringify(controller.getBoltGeometry(1000)))};
}

for(const dimensions of [{width:270,height:32,border:1},{width:94,height:27,border:1},{width:310,height:44,border:0}]){
 const normal=measure(1,1,dimensions);
 for(const [scaleX,scaleY] of [[.14,.14],[.31,.31],[.48,.48],[.65,.65],[.82,.82],[1.5,.8]]){
  const scaled=measure(scaleX,scaleY,dimensions);
  assert.equal(scaled.canvasWidth,normal.canvasWidth,'opening animation must not lower canvas resolution');
  assert.equal(scaled.canvasHeight,normal.canvasHeight);
  for(const key of Object.keys(normal.geometry)){
   if(typeof normal.geometry[key]==='number')assert(Math.abs(scaled.geometry[key]-normal.geometry[key])<1e-8,`${key} changed at scale ${scaleX}/${scaleY}`);
   else assert.equal(scaled.geometry[key],normal.geometry[key]);
  }
  for(let i=0;i<normal.bolts.length;i++)for(const key of ['centerX','centerY','y30','y70'])assert(Math.abs(scaled.bolts[i][key]-normal.bolts[i][key])<1e-8,`bolt ${i} ${key} moved`);
 }
 assert.equal(normal.canvasWidth,(dimensions.width-2*dimensions.border)*2);
 assert.equal(normal.canvasHeight,(dimensions.height-2*dimensions.border)*2);
 assert.equal(normal.geometry.textLeft,43-dimensions.border);
 assert.equal(normal.geometry.textHeight,15);
}
console.log('PASS: profile opening scales preserve glow/bolt geometry and canvas resolution');
