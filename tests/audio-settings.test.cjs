const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const script = fs.readFileSync('audio-settings.js', 'utf8');
function fixture(stored = {}) {
 const controls = {}, storage = new Map(Object.entries(stored));
 for (const id of ['seVolume','musicVolume','seVolumeValue','musicVolumeValue']) controls[id] = {listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}};
 const context = vm.createContext({Map,Number,Math,window:{},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},document:{getElementById:id=>controls[id]}});
 vm.runInContext(script,context);
 return {audio:context.window.GameAudio,storage,controls,set(kind,value,event='input'){const input=controls[kind+'Volume'];input.value=String(value);input.listeners[event]();}};
}
const normal=fixture({'psy-volume-se':'25','psy-volume-music':'50'});
const effect={gain:{}},music={};normal.audio.track(effect,.75);normal.audio.element(music,.208,'music');
assert.equal(effect.gain.value,.1875);assert(Math.abs(music.volume-.104)<.000001);
normal.set('se',0);assert.equal(effect.gain.value,0);assert(Math.abs(music.volume-.104)<.000001,'SE slider leaves BGM unchanged');
normal.set('music',0,'change');assert.equal(music.volume,0);assert.equal(music.muted,true);
normal.set('music',40);assert.equal(music.muted,false);assert(Math.abs(music.volume-.0832)<.000001);
assert.equal(normal.storage.get('psy-volume-music'),'40');assert.equal(normal.controls.musicVolumeValue.textContent,'40%');
normal.audio.untrack(effect);normal.set('se',100);assert.equal(effect.gain.value,0,'completed effects are released');
assert.equal(fixture(Object.fromEntries(normal.storage)).controls.musicVolume.value,40,'settings survive reload');
const ios=fixture(),nodes=[],sources=[];
const context={state:'suspended',destination:{},addEventListener(type,fn){this.changed=fn;},createGain(){const g={gain:{},connect(){}};nodes.push(g);return g;},createMediaElementSource(el){const s={el,connect(g){this.gain=g;}};sources.push(s);return s;}};
const locked=()=>Object.defineProperty({},'volume',{get:()=>1,set:()=>{}}),bgm=locked(),se=locked();
ios.audio.useContext(context);ios.audio.element(bgm,.208,'music');assert.equal(sources.length,0,'do not reroute into a suspended context');
context.state='running';context.changed();assert.equal(sources.length,1);assert(Math.abs(nodes[0].gain.value-.208)<.000001);
ios.audio.element(bgm,.208,'music');assert.equal(sources.length,1,'reuse media sources');
ios.audio.element(se,.75);ios.set('se',20);assert(Math.abs(nodes[1].gain.value-.15)<.000001);assert(Math.abs(nodes[0].gain.value-.208)<.000001);
ios.set('music',25);assert(Math.abs(nodes[0].gain.value-.052)<.000001);ios.set('music',0);assert.equal(bgm.muted,true);assert.equal(nodes[0].gain.value,0);
console.log('PASS volume: live SE/BGM independence, input/change, persistence, mute, released effects, ignored media volume and context recovery');
