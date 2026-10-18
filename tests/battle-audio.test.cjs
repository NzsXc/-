const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const audioCode=html.slice(html.indexOf('let battleSEUnlocked='),html.indexOf('function playUISound('));
const countdownCode=html.slice(html.indexOf('function startTurnCountdownSE('),html.indexOf('/* =========================',html.indexOf('function stopTurnCountdownSE(')));
const flush=async()=>{for(let n=0;n<30;n++)await Promise.resolve();};
function fixture(options={}){
 let time=0,id=0;const timers=new Map(),sounds=[],sources=[],listeners={};
 const element=k=>sounds.find(e=>e.id===k),make=id=>({id,paused:true,muted:true,volume:0,currentTime:0,getAttribute:()=>id+'.mp3',querySelector(){},play(){this.plays=(this.plays||0)+1;if(options.mediaFails)return Promise.reject(Error('blocked media'));this.paused=false;return Promise.resolve();},pause(){this.paused=true;}});
 sounds.push(make('turnCountdownSE'),make('seDataAnalysis'));
 class AudioContext{
  constructor(){this.state=options.state||'running';this.destination={};this.sampleRate=48000;this.resumes=0;this.decoded=0;AudioContext.current=this;}
  addEventListener(type,fn){this.changed=fn;}
  resume(){this.resumes++;if(options.resumeHangs)return new Promise(()=>{});if(options.resumeFails)return Promise.reject(Error('resume failed'));this.state='running';this.changed?.();return Promise.resolve();}
  createBuffer(){return {};}
  decodeAudioData(){this.decoded++;if(options.decodeFails)return Promise.reject(Error('bad decode'));if(options.decodeHangs)return new Promise(resolve=>this.decodeResolve=resolve);return Promise.resolve({});}
  createGain(){return {gain:{},connect(){},disconnect(){}};}
  createBufferSource(){const source={connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;this.onended?.();}};sources.push(source);return source;}
 }
 const ctx=vm.createContext({console:{warn(){}},URL,Promise,Map,performance:{now:()=>time},setTimeout:(fn,ms)=>{timers.set(++id,{at:time+ms,fn});return id;},clearTimeout:n=>timers.delete(n),window:{AudioContext:options.noContext?undefined:AudioContext,addEventListener:(t,fn)=>listeners[t]=fn},document:{baseURI:'https://game.test/',visibilityState:'visible',hidden:false,getElementById:element,querySelectorAll:()=>sounds,addEventListener:(t,fn)=>listeners[t]=fn},fetch:async()=>{if(options.fetchFails)throw Error('network');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}});
 vm.runInContext(audioCode+'\n'+countdownCode,ctx);
 return {ctx,sounds,sources,listeners,context:()=>AudioContext.current,call:code=>vm.runInContext(code,ctx),async advance(ms){time+=ms;for(const [key,job]of timers)if(job.at<=time){timers.delete(key);job.fn();}await flush();}};
}
(async()=>{
 const good=fixture();good.call('unlockBattleSE();startTurnCountdownSE();startTurnCountdownSE();');await flush();assert.equal(good.sources.filter(s=>s.loop&&s.started).length,1);good.call('stopTurnCountdownSE()');assert(good.sources.find(s=>s.loop).stopped);good.call('playBattleSE("seDataAnalysis")');await flush();assert.equal(good.sounds[1].plays,undefined,'healthy Web Audio must not also play HTML audio');
 for(const options of [{decodeFails:true},{fetchFails:true},{state:'interrupted',resumeFails:true},{state:'suspended',resumeHangs:true}]){
  const f=fixture(options);f.call('unlockBattleSE();playBattleSE("seDataAnalysis");startTurnCountdownSE()');await flush();await f.advance(1000);
  assert.equal(f.sounds[1].plays,1,'one-shot fallback: '+JSON.stringify(options));assert.equal(f.sounds[0].plays,1,'countdown fallback: '+JSON.stringify(options));
  for(let i=0;i<60;i++)f.call('startTurnCountdownSE()');await flush();assert.equal(f.sounds[0].plays,1,'one loop only');f.call('stopTurnCountdownSE()');assert(f.sounds[0].paused);
 }
 const pending=fixture({decodeHangs:true});pending.call('unlockBattleSE();startTurnCountdownSE();stopTurnCountdownSE()');await flush();pending.context().decodeResolve({});await flush();assert.equal(pending.sources.filter(s=>s.loop&&s.started).length,0,'cancel pending decode');assert.equal(pending.sounds[0].plays,undefined);
 const recover=fixture();recover.call('unlockBattleSE()');recover.context().state='interrupted';recover.listeners.visibilitychange?.();await flush();assert.equal(recover.context().state,'running','resume after returning to the page');
 const retry=fixture({decodeFails:true,mediaFails:true});retry.call('unlockBattleSE();startTurnCountdownSE()');await flush();for(let i=0;i<60;i++)retry.call('startTurnCountdownSE()');await flush();assert.equal(retry.sounds[0].plays,1,'a failed fallback must not retry on every animation frame');await retry.advance(1500);retry.call('startTurnCountdownSE()');await flush();assert.equal(retry.sounds[0].plays,2);
 const legacy=fixture({noContext:true});legacy.call('startTurnCountdownSE();playBattleSE("seDataAnalysis")');await flush();assert.equal(legacy.sounds[0].plays,1);assert.equal(legacy.sounds[1].plays,1);assert.equal(legacy.sounds[0].muted,false);
 console.log('PASS: Web Audio, blocked/hanging resume, decode/network fallback, one countdown loop, cancellation, focus recovery and bounded retries');
})().catch(error=>{console.error(error);process.exitCode=1;});
