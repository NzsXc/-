// Friend rooms keep Standard's original format; only Custom stores overrides.
(()=>{
 const STANDARD=Object.freeze({mode:'standard',hp:10,initialGauge:8,maxGauge:10});
 function normalize(value){
  if(value==null||value.mode==='standard')return {...STANDARD};
  if(value.mode!=='custom')throw Error('Advancedは準備中です。StandardかCustomを選んでください。');
  const {hp,initialGauge,maxGauge}=value;
  if(!Number.isSafeInteger(hp)||hp<1||hp>100)throw Error('HPは1〜100の整数で設定してください。');
  if(!Number.isSafeInteger(maxGauge)||maxGauge<1||maxGauge>100)throw Error('最大ゲージは1〜100の整数で設定してください。');
  if(!Number.isSafeInteger(initialGauge)||initialGauge<0||initialGauge>maxGauge)throw Error('初期ゲージは0〜最大ゲージの整数で設定してください。');
  return {mode:'custom',hp,initialGauge,maxGauge};
 }
 const label=value=>normalize(value).mode==='custom'?'Custom':'Standard';
 function summary(value){const r=normalize(value);return `HP ${r.hp} / 初期ゲージ ${r.initialGauge} / 最大ゲージ ${r.maxGauge}`;}
 const api={STANDARD,normalize,label,summary};
 if(typeof window!=='undefined')window.RoomRules=api;
 if(typeof module!=='undefined')module.exports=api;
})();
