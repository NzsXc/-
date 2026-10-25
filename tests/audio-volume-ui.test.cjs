/* Render the game's volume gains with the browser's real Web Audio engine.
   Offline rendering also works on test hosts without an audio output device. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const settings=fs.readFileSync('audio-settings.js','utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{for(const ignored of [false,true])for(const value of [100,75,50,25,1,0]){
  const page=await browser.newPage();
  await page.setContent(`<input id="seVolume" type="range" min="0" max="100"><output id="seVolumeValue"></output><input id="musicVolume" type="range" min="0" max="100"><output id="musicVolumeValue"></output><audio id="probe"></audio><script>${ignored?"Object.defineProperty(HTMLMediaElement.prototype,'volume',{get(){return this.reportedVolume??1},set(v){this.reportedVolume=v;}});":''}${settings}</script>`);
  const output=await page.evaluate(async value=>{
   const offline=new OfflineAudioContext(1,128,48000),buffer=offline.createBuffer(1,128,48000);buffer.getChannelData(0).fill(.5);
   const source=offline.createBufferSource();source.buffer=buffer;source.start();
   // Supply a deterministic media signal while retaining real GainNodes and
   // connections. The graph must scale even when volume readback is misleading.
   const context={state:'running',destination:offline.destination,addEventListener(){},createGain:()=>offline.createGain(),createMediaElementSource:()=>source};
   GameAudio.useContext(context);GameAudio.element(probe,1,'music');
   musicVolume.value=String(value);musicVolume.dispatchEvent(new Event('input'));
   return Array.from((await offline.startRendering()).getChannelData(0));
  },value);
  assert(output.every(sample=>Math.abs(sample-.5*value/100)<.000001),JSON.stringify({ignored,value,first:output[0]}));await page.close();
 }
 console.log('PASS real Web Audio rendering at 0/1/25/50/75/100%, including ignored HTML volume with misleading readback');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
