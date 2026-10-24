// Preserve legacy formulas; independently validate every new S move and its state.
const fs=require('node:fs'),assert=require('node:assert/strict');
const SPECIAL=require('../advanced/special-rules.js');
function upgradeSpecialMoves(input,{formulasOnly=false}={}){
 const out=structuredClone(input),r=out.rules,g=r.freeGames.$game,h=r.battleHistory.$game;
 if(!formulasOnly)assert(!g.advanced.specialMovesV1,'Apply once');
 const G="root.child('freeGames/'+$game)",S=G+".child('state')",V=G+".child('rulesVersion').val()===3";
 const sv=(k,p)=>`${S}.child('${k}${p}').val()`,t=k=>`newData.child('${k}').val()`;
 const active=(p,id)=>`(${G}.child('roomRules/skills').val()!==false&&${G}.child('advanced/current/${p}/id').val()==='${id}'&&${G}.child('advanced/current/${p}/turn').val()===${sv('turn','')})`;
 const cap=(x,n)=>`((${x})>${n}?${n}:(${x}))`,floor=x=>`((${x})<0?0:(${x}))`,clamp=(x,n)=>cap(floor(x),n);
 const eqs=(x,ids)=>'('+ids.map(id=>`${x}===${id}`).join('||')+')';
 const lookup=(x,values,fallback)=>Object.entries(values).reverse().reduce((rest,[k,v])=>`(${x}===${k}?${v}:${rest})`,fallback);
 const cost=x=>lookup(x,{1:1,3:4,4:2,5:5,6:2,7:1,8:2,11:2,12:3,13:1,14:2},'0');
 const type=x=>lookup(x,{0:"'charge'",1:"'attack'",2:"'block'",3:"'attack'",4:"'reflect'",5:"'attack'",6:"'heal'",7:"'block'",8:"'attack'",9:"'special'",10:"'seal'",11:"'enhance'",12:"'siphon'",13:"'ruin'",14:"'mirror'"},"''");
 const formulas={},put=(k,v)=>{formulas[k]=v;};
 for(const p of [1,2]){
  const q=3-p,A=t('action'+p),B=t('baseAction'+p),E=t('effectBase'+p),F=t('effectBase'+q),X=t('effective'+p)+'>=15',Y=t('effective'+q)+'>=15';
  const move=`${G}.child('moves').child(''+${sv('turn','')}).child('${p}')`;
  put('inputGauge'+p,`${active(p,'boost')}?${cap(sv('gauge',p)+'+2',10)}:${active(p,'cleanse')}?${cap(sv('gauge',p)+'+4',10)}:${sv('gauge',p)}`);
  put('inputHp'+p,`${active(p,'heal')}?${cap(sv('hp',p)+'+1',G+".child('roomRules/hp').val()")}:${sv('hp',p)}`);
  for(const k of ['seal','ruin','specialSeal','specialRuin'])put('input'+k[0].toUpperCase()+k.slice(1)+p,`${active(p,'cleanse')}?${k==='seal'?'false':0}:${sv(k,p)}`);
  put('inputLast'+p,`${active(p,'chain')}?'':${sv('last',p)}`);put('stance'+p,`${active(p,'stance')}?1:0`);
  put('action'+p,`${move}.exists()?${move}.val():(${t('inputGauge'+p)}>=10?1:0)`);
  put('misses'+p,`${move}.exists()?0:${sv('misses',p)}+1`);
  put('baseAction'+p,`${A}>=15?${A}-12:${A}`);
  put('effective'+p,`${B}===14?(${t('baseAction'+q)}===14?-1:${t('action'+q)}):${A}`);
  put('effectBase'+p,`${t('effective'+p)}>=15?${t('effective'+p)}-12:${t('effective'+p)}`);
  put('specialCost'+p,lookup(A,Object.fromEntries(SPECIAL.definitions.filter(Boolean).map(d=>[d.action,d.cost])),'0'));
  put('specialGain'+p,`(${X}&&${E}===9)?15:0`);
  put('cost'+p,cost(B));put('type'+p,type(E));put('skill'+p,`${E}>=3?'tech'+(${E}-2):''`);
  put('attack'+p,`${t('type'+p)}==='attack'`);
  put('sealed'+p,`${t('inputSeal'+p)}===true||(${F}===10&&${t('inputGauge'+p)}<7)`);
  put('reflect'+p,`${t('type'+p)}==='reflect'&&!${t('sealed'+p)}`);
  put('blocking'+p,`${t('type'+p)}==='block'&&!${t('sealed'+p)}`);
  put('paid'+p,clamp(`${t('inputGauge'+p)}-${t('cost'+p)}`,10));
  put('charged'+p,`${t('type'+p)}==='charge'?${cap(t('paid'+p)+'+2',10)}:${t('paid'+p)}`);
  const foresight=`(${E}===7&&${t('type'+q)}==='charge'?${cap(t('charged'+p)+'+3',10)}:${t('charged'+p)})`;
  put('foresight'+p,`(${X}&&${E}===7)?${cap(foresight+'+3',10)}:${foresight}`);
  put('healed'+p,`${E}===6?${cap(t('inputHp'+p)+`+(${X}?2:1)`,G+".child('roomRules/hp').val()")}:${t('inputHp'+p)}`);
  put('basePower'+p,`${eqs(E,[3,5])}?2:${eqs(E,[1,8])}?1:0`);
  put('power'+p,`${t('attack'+p)}?((${E}===8?(${sv('momentum',p)}===true?2:1)+${sv('specialMomentum',p)}:(${X}&&${E}===5?3:${t('basePower'+p)}))+(${sv('enhance',p)}>0?1:0)+${t('stance'+p)}):0`);
  put('pierce'+p,`${E}===3`);
  const winP=`(${X}&&${E}===3)`,winQ=`(${Y}&&${F}===3)`;
  const cancel=`(${winP}&&!${winQ}?0:${winQ}&&!${winP}?${t('power'+q)}:${floor(t('power'+q)+'-'+t('power'+p))})`;
  const hit=`(${t('attack'+q)}&&!${t('reflect'+p)}&&(!${t('blocking'+p)}||${t('pierce'+q)}))?${t('power'+q)}:0`;
  const d=`(${t('inputRuin'+p)}>0&&${t('type'+p)}==='charge'?1:0)+(${t('reflect'+q)}&&${t('attack'+p)}?(${Y}?2:1):0)+(${t('attack'+p)}&&${t('attack'+q)}?${cancel}:(${hit}))+(${F}===5&&!(${Y})&&${t('type'+p)}==='charge'&&!${t('blocking'+p)}&&!${t('reflect'+p)}?1:0)+(${E}===9?2:0)`;
  put('damage'+p,`${active(p,'invincible')}?(${E}===9?2:0):(${d})`);
  put('rampage'+p,`${E}===9?${cap(t('foresight'+p)+'+8',10)}:${t('foresight'+p)}`);
  put('stolen'+p,`${E}===12?(${t('rampage'+q)}<(${X}?3:2)?${t('rampage'+q)}:(${X}?3:2)):0`);
  put('normalGauge'+p,floor(clamp(`${t('rampage'+p)}+${t('stolen'+p)}-${t('stolen'+q)}`,10)+`-(${F}===5?1:0)`));
  const mirror=`(${A}===26&&${t('action'+q)}>=0&&${t('action'+q)}<=2?${cap(t('normalGauge'+p)+'+2',10)}:${t('normalGauge'+p)})`;
  put('gauge'+p,floor(mirror+`-(${t('inputSpecialRuin'+p)}>0&&${t('type'+p)}==='charge'?1:0)`));
  put('hp'+p,`${t('misses'+p)}>=2?0:${floor(t('healed'+p)+'-'+t('damage'+p))}`);
  put('seal'+p,`${t('sealed'+p)}&&${t('gauge'+p)}<7`);
  put('enhance'+p,`${E}===11?(${X}?4:2):${floor(sv('enhance',p)+'-1')}`);
  put('momentum'+p,`${E}===8?${sv('momentum',p)}!==true:false`);
  put('ruin'+p,`${F}===13?3:${floor(t('inputRuin'+p)+'-1')}`);put('last'+p,t('type'+p));
  put('specialSeal'+p,`(${Y}&&${F}===10)?2:${floor(t('inputSpecialSeal'+p)+'-1')}`);
  put('specialRuin'+p,`${F}===13?(${Y}?3:0):${floor(t('inputSpecialRuin'+p)+'-1')}`);
  put('specialMomentum'+p,`${E}===8?(${X}?1:0):${sv('specialMomentum',p)}`);
 }
 for(const k of Object.keys(formulas))for(const p of [1,2])for(const b of ['attack','sealed','reflect','blocking','pierce'])formulas[k]=formulas[k].replaceAll(t(b+p),'('+t(b+p)+'===true)');
 put('turn',sv('turn','')+'+1');
 if(formulasOnly)return formulas;
 // Express legacy calculations using their existing intermediates rather than
 // duplicating complete Standard and Advanced expression trees.
 const legacy=structuredClone(formulas),oldKeys=Object.keys(g.transition).filter(k=>!k.startsWith('.')&&!k.startsWith('$'));
 const maxG=`(${G}.child('roomRules').exists()?${G}.child('roomRules/maxGauge').val():10)`,maxH=`(${G}.child('roomRules').exists()?${G}.child('roomRules/hp').val():10)`;
 for(const p of [1,2]){
  const q=3-p,E=t('effectBase'+p),F=t('effectBase'+q);
  legacy['baseAction'+p]=t('action'+p);legacy['effectBase'+p]=t('effective'+p);
  legacy['inputGauge'+p]=`${active(p,'boost')}?${cap(sv('gauge',p)+'+2',maxG)}:${active(p,'cleanse')}?${cap(sv('gauge',p)+'+4',maxG)}:${sv('gauge',p)}`;
  legacy['inputHp'+p]=`${active(p,'heal')}?${cap(sv('hp',p)+'+1',maxH)}:${sv('hp',p)}`;
  legacy['action'+p]=legacy['action'+p].replace('>=10',`>=${maxG}`);
  legacy['paid'+p]=clamp(`${t('inputGauge'+p)}-${t('cost'+p)}`,maxG);
  legacy['charged'+p]=`${t('type'+p)}==='charge'?${cap(t('paid'+p)+'+2',maxG)}:${t('paid'+p)}`;
  legacy['foresight'+p]=`${E}===7&&${t('type'+q)}==='charge'?${cap(t('charged'+p)+'+3',maxG)}:${t('charged'+p)}`;
  legacy['healed'+p]=`${E}===6?${cap(t('inputHp'+p)+'+1',maxH)}:${t('inputHp'+p)}`;
  legacy['rampage'+p]=`${E}===9?${cap(t('foresight'+p)+'+8',maxG)}:${t('foresight'+p)}`;
  legacy['stolen'+p]=`${E}===12?(${t('rampage'+q)}<2?${t('rampage'+q)}:2):0`;
  legacy['gauge'+p]=floor(clamp(`${t('rampage'+p)}+${t('stolen'+p)}-${t('stolen'+q)}`,maxG)+`-(${G}.child('rulesVersion').val()===2&&${F}===5?1:0)`);
  legacy['damage'+p]=legacy['damage'+p].replace(`?1:0)+(${E}===9?2:0)`,`?(${G}.child('rulesVersion').val()===2?1:2):0)+(${E}===9?2:0)`);
 }
 const oldSet=new Set(oldKeys);
 function expand(value,depth=0){
  assert(depth<20,'Unexpected cyclic intermediate');
  for(const p of [1,2])value=value.replaceAll(t('effective'+p)+'>=15','false').replaceAll(sv('specialMomentum',p),'0');
  return value.replace(/newData\.child\('([^']+)'\)\.val\(\)/g,(match,k)=>oldSet.has(k)?match:legacy[k]!=null?'('+expand(legacy[k],depth+1)+')':match);
 }
 for(const[k,v]of Object.entries(formulas))try{new (require('vm').Script)('('+v+')')}catch(e){throw Error('modern '+k+' '+v)};
 for(const k of oldKeys)try{new (require('vm').Script)('('+expand(legacy[k])+')')}catch(e){throw Error('legacy '+k+' '+expand(legacy[k]))};
 const legacyValidation=`newData.hasChildren(${JSON.stringify(oldKeys)})&&newData.parent().child('state/turn').val()===${t('turn')}&&`+oldKeys.map(k=>`${t(k)}===(${expand(legacy[k])})`).join('&&');
 const validation=`newData.hasChildren(${JSON.stringify(Object.keys(formulas))})&&newData.parent().child('state/turn').val()===${t('turn')}&&`+Object.entries(formulas).map(([k,v])=>`${t(k)}===(${v})`).join('&&');
 g.transition['.validate']=`(${V}?(${validation}):(${legacyValidation}))`.replaceAll(G,'data.parent()');
 for(const k of Object.keys(formulas))if(!g.transition[k])g.transition[k]={'.validate':V};
 for(const p of [1,2]){
  const N='newData.val()',B=`(${N}>=15?${N}-12:${N})`;
  const gauge=`(${active(p,'boost')}?${cap(sv('gauge',p)+'+2',10)}:${active(p,'cleanse')}?${cap(sv('gauge',p)+'+4',10)}:${sv('gauge',p)})`;
  const enemyGauge=`(${active(3-p,'boost')}?${cap(sv('gauge',3-p)+'+2',10)}:${active(3-p,'cleanse')}?${cap(sv('gauge',3-p)+'+4',10)}:${sv('gauge',3-p)})`;
  const seal=`(!${active(p,'cleanse')}&&${sv('seal',p)}===true)`,specialSeal=`(!${active(p,'cleanse')}&&${sv('specialSeal',p)}>0)`;
  const last=`(${active(p,'chain')}?'':${sv('last',p)})`;
  const equipped=[0,1,2].map(slot=>`${B}===${G}.child('loadouts/${p}/${slot}').val()+3`).join('||');
  const specialCost=lookup(N,Object.fromEntries(SPECIAL.definitions.filter(Boolean).map(d=>[d.action,d.cost])),'31');
  const valid=`newData.isNumber()&&${N}%1===0&&${N}>=0&&${N}<=26&&(${N}<3||${equipped})&&${cost(B)}<=${gauge}&&(${N}<15||${specialCost}<=${G}.child('special/gauge/${p}').val())&&!(${seal}&&${eqs(B,[2,4,7])})&&!(${specialSeal}&&(${N}>=3||${N}===2))&&!(${eqs(B,[2,7])}&&${last}==='block')&&!(${B}===4&&${last}==='reflect')&&!(${N}===0&&${gauge}>=10)&&!(${N}===10&&${enemyGauge}>=7)`;
  g.moves.$turn[p]['.validate']=`(${V}?(${valid}):(${g.moves.$turn[p]['.validate']}))`;
 }
 // Versioned extra states are mandatory in modern games and copied atomically.
 for(const k of SPECIAL.fields){
  g.state[k]={'.validate':`${V}&&newData.isNumber()&&newData.val()>=0&&newData.val()<=3&&newData.val()%1===0&&(!data.parent().exists()?newData.val()===0:newData.val()===newData.parent().parent().child('transition/${k}').val())`};
  h.finalState[k]={'.validate':`newData.val()===${S}.child('${k}').val()`};
  h.finalState['.validate']+=`&&(newData.child('${k}').exists()===${S}.child('${k}').exists())`;
 }
 g.state['.validate']+=`&&(!(${V})||newData.hasChildren(${JSON.stringify(SPECIAL.fields)}))`;
 // Replace the gauge invariant with payment-before-gain for version 2 only.
 const before=g.state['.validate'];const at=before.indexOf("&&(!data.exists()||"+G+".child('special/version').val()!==1");assert(at>=0);
 const tail=before.slice(at),suffix=`&&(!(${V})||newData.hasChildren(${JSON.stringify(SPECIAL.fields)}))`;assert(tail.endsWith(suffix));
 const sums=[1,2].map(p=>{const old=`${G}.child('special/gauge/${p}').val()`,tr=k=>`newData.parent().child('transition/${k}${p}').val()`;
  const sum=`${old}-${tr('specialCost')}+1+${tr('damage')}+(${tr('type')}==='charge'?1:0)+${tr('specialGain')}`;
  return `newData.parent().child('special/gauge/${p}').val()===${cap(sum,30)}`;
 }).join('&&');
 const oldGauge=tail.slice(2,-suffix.length);
 g.state['.validate']=before.slice(0,at)+`&&(${V}?(!data.exists()||(${sums})):(${oldGauge}))`+suffix;
 g.rulesVersion['.validate']=g.rulesVersion['.validate'].replace("newData.val()===2", "(newData.val()===2||(newData.val()===3&&newData.parent().child('roomRules/special').val()===true&&newData.parent().child('special/version').val()===2))");
 g.roomRules['.validate']=g.roomRules['.validate'].replace("newData.parent().child('rulesVersion').val()===2","(newData.parent().child('rulesVersion').val()===2||newData.parent().child('rulesVersion').val()===3)");
 h.rulesVersion['.validate']=h.rulesVersion['.validate'].replace('newData.val()===2','(newData.val()===2||newData.val()===3)');
 for(const n of [g.special,h.special])n.version['.validate']=n.version['.validate'].replace('newData.val()===1','(newData.val()===1||newData.val()===2)');
 g.special['.write']=g.special['.write'].replace("data.child('version').val()===1","(data.child('version').val()===1||data.child('version').val()===2)");
 g.special['.validate']+=`&&(newData.child('version').val()!==2||newData.parent().child('rulesVersion').val()===3)`;
 const votes=structuredClone(r.communityRatings.techniques);votes.$uid=Object.fromEntries(Object.entries(votes.$uid).map(([k,v])=>[k.startsWith('tech')?'s-'+k:k,typeof v==='string'?v.replace(/'tech/g,"'s-tech"):v]));r.communityRatings.specialTechniques=votes;
 g.advanced.specialMovesV1={'.read':'auth!=null','.validate':false};
 // Compact equivalent literal paths; leave expressions and legacy branches intact.
 function compact(n){for(const [k,v]of Object.entries(n))if(typeof v==='string'){
  let x=v,prev;do{prev=x;x=x.replace(/\.child\('([^']+)'\)\.child\('([^']+)'\)/g,(_,a,b)=>`.child('${a}/${b}')`).replace(/root\.child\('freeGames\/'\+\$game(?:\+'([^']*)')?\)\.child\('([^']+)'\)/g,(_,a,b)=>`root.child('freeGames/'+$game+'${a||''}/${b}')`);}while(x!==prev);n[k]=x;
 }else if(v&&typeof v==='object')compact(v);}

 compact(r);return out;
}
if(require.main===module){const p=process.argv[2]||'firebase-database.rules.json';const result=JSON.stringify(upgradeSpecialMoves(JSON.parse(fs.readFileSync(p,'utf8'))));fs.writeFileSync(p,result+'\n');console.log('Rule bytes',Buffer.byteLength(result+'\n'));}
module.exports={upgradeSpecialMoves};
