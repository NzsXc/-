// Friend rooms keep Standard's original format; only Custom stores overrides.
(()=>{
 const STANDARD=Object.freeze({mode:'standard',hp:10,initialGauge:8,maxGauge:10});
 function normalize(value){
  if(value==null||value.mode==='standard')return {...STANDARD};
  if(value.mode==='advanced'){
   for(const key of ['skills','special'])if(value[key]!=null&&typeof value[key]!=='boolean')throw Error('Advancedのチェック項目を確認してください。');
   const skills=value.skills!==false,special=value.special===true;
   // Keep saved HP12/HP15 rooms and histories; new special rooms use HP10.
   return {...STANDARD,mode:'advanced',hp:special?([12,15].includes(value.hp)?value.hp:10):10,...(!skills||special?{skills,special}:{})};
  }
  if(value.mode!=='custom')throw Error('対戦ルールを選択してください。');
  const {hp,initialGauge,maxGauge}=value;
  if(!Number.isSafeInteger(hp)||hp<1||hp>100)throw Error('HPは1〜100の整数で設定してください。');
  if(!Number.isSafeInteger(maxGauge)||maxGauge<1||maxGauge>100)throw Error('最大ゲージは1〜100の整数で設定してください。');
  if(!Number.isSafeInteger(initialGauge)||initialGauge<0||initialGauge>maxGauge)throw Error('初期ゲージは0〜最大ゲージの整数で設定してください。');
  for(const key of ['skills','special'])if(value[key]!=null&&typeof value[key]!=='boolean')throw Error('Customのチェック項目を確認してください。');
  const skills=value.skills===true,special=value.special===true;
  return {mode:'custom',hp,initialGauge,maxGauge,...(skills||special?{skills,special}:{})};
 }
 const hasSkills=value=>value?.mode==='advanced'&&value.skills!==false||value?.mode==='custom'&&value.skills===true;
 const hasSpecial=value=>['advanced','custom'].includes(value?.mode)&&value.special===true;
 const needsAdvancedOptions=value=>value?.mode==='advanced'&&(value.skills===false||value.special===true);
 function label(value){const r=normalize(value);if(r.mode==='custom'&&(hasSkills(r)||hasSpecial(r)))return 'Custom（'+[hasSkills(r)?'スキル':'',hasSpecial(r)?'スペシャル':''].filter(Boolean).join('＋')+'）';return r.mode==='advanced'&&needsAdvancedOptions(r)?'Advanced（'+[hasSkills(r)?'スキル':'',hasSpecial(r)?'スペシャル':''].filter(Boolean).join('＋')+(hasSkills(r)||hasSpecial(r)?'':'追加なし')+'）':({standard:'Standard',custom:'Custom',advanced:'Advanced'})[r.mode];}
 function summary(value){const r=normalize(value);return `HP ${r.hp} / 初期ゲージ ${r.initialGauge} / 最大ゲージ ${r.maxGauge}`+(hasSpecial(r)?' / スペシャル 0〜30':'');}
 const api={STANDARD,normalize,label,summary,hasSkills,hasSpecial,needsAdvancedOptions,SPECIAL_MAX:30};
 if(typeof window!=='undefined')window.RoomRules=api;
 if(typeof module!=='undefined')module.exports=api;
})();


