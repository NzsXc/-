const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let drawCount=0,rafCallback=null,cancelled=0;const resizeObservers=[],intersectionObservers=[],mutationObservers=[],events={};
const canvas={clientWidth:269,clientHeight:32,getContext:()=>({setTransform(){}})};
const label={style:{removeProperty(name){if(name==='font-size')delete this.fontSize;}},get scrollWidth(){return Math.ceil(18*parseFloat(this.style.fontSize||18));},get scrollHeight(){return Math.ceil(1.1*parseFloat(this.style.fontSize||18));}};
const crown={get offsetLeft(){return Math.round((canvas.clientWidth+1)*.025);},get offsetWidth(){return Math.round(Math.min(27,(canvas.clientWidth+1)*.12));}};
const right={get offsetLeft(){return Math.round((canvas.clientWidth+1)*.97)-12;}};
const badge={dataset:{season2Design:'rainbow'},isConnected:true,get clientWidth(){return canvas.clientWidth?canvas.clientWidth+1:0;},get clientHeight(){return canvas.clientHeight;},getBoundingClientRect(){throw Error('Transformed dimensions must not be measured');},querySelector:selector=>({'.s2-canvas':canvas,'.title-badge':label,'.s2-crown-medal':crown,'.s2-right':right})[selector],closest:()=>null,matches:()=>true,querySelectorAll:()=>[]};
const reduced={matches:false,addEventListener:(name,cb)=>{events.motion=cb;}};
const document={hidden:false,documentElement:{},fonts:{ready:Promise.resolve(),addEventListener:(name,cb)=>{events.fonts=cb;}},querySelectorAll:()=>[badge],addEventListener:(name,cb)=>{events[name]=cb;}};
class ResizeObserver{constructor(cb){this.cb=cb;resizeObservers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
class IntersectionObserver{constructor(cb){this.cb=cb;intersectionObservers.push(this);}observe(){}unobserve(target){this.unobserved=target;}}
class MutationObserver{constructor(cb){this.cb=cb;mutationObservers.push(this);}observe(){}}
const window={devicePixelRatio:2,Season2TitleArt:{draw(ctx,w,h,time,design){drawCount++;assert.equal(design,'rainbow');assert.equal(w,canvas.clientWidth);assert.equal(h,canvas.clientHeight);}},addEventListener:(name,cb)=>{events[name]=cb;}};
const context=vm.createContext({window,document,getComputedStyle:()=>({fontSize:(label.style.fontSize||18)+'px'}),matchMedia:()=>reduced,ResizeObserver,IntersectionObserver,MutationObserver,requestAnimationFrame:cb=>(rafCallback=cb,1),cancelAnimationFrame:()=>{cancelled++;rafCallback=null;}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','titles-season2-effects.js'),'utf8'),context);
assert.equal(canvas.width,538);assert.equal(canvas.height,64);assert.equal(rafCallback,null);
assert(parseFloat(label.style.fontSize)<18);assert(label.scrollWidth<=parseFloat(label.style.maxWidth)+1);
const initialSize=label.style.fontSize;
intersectionObservers[0].cb([{target:badge,isIntersecting:true}]);assert(rafCallback);rafCallback(100);rafCallback(133);
const activeCount=drawCount;document.hidden=true;events.visibilitychange();assert.equal(rafCallback,null);assert(cancelled);
document.hidden=false;events.visibilitychange();assert(rafCallback);
reduced.matches=true;events.motion();assert.equal(rafCallback,null);
canvas.clientWidth=0;canvas.clientHeight=0;resizeObservers[0].cb();assert.equal(canvas.width,538);assert.equal(canvas.height,64);
canvas.clientWidth=94;canvas.clientHeight=26;resizeObservers[0].cb();assert.equal(canvas.width,188);assert.equal(canvas.height,52);
assert(parseFloat(label.style.fontSize)<parseFloat(initialSize));assert(label.scrollWidth<=parseFloat(label.style.maxWidth)+1);
canvas.clientWidth=519;canvas.clientHeight=58;resizeObservers[0].cb();assert.equal(label.style.fontSize,undefined,'wide ribbons recover the original CSS size');
label.style.fontSize='9px';events.fonts();assert.equal(label.style.fontSize,undefined,'font loading remeasures even when canvas size is unchanged');
const staticCount=drawCount;assert(staticCount>=activeCount);
badge.isConnected=false;mutationObservers[0].cb([{type:'childList',addedNodes:[]}]);assert(resizeObservers[0].disconnected);assert.equal(intersectionObservers[0].unobserved,badge);assert.equal(rafCallback,null);assert.equal(drawCount,staticCount);
console.log('PASS: layout dimensions, scaled-profile safety, conditional label shrink, growth, font loading, visibility, reduced motion, removal cleanup');
