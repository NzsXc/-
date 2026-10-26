// Add version-4 S effects without changing validation for saved S versions 1-3.
const fs=require('node:fs'),assert=require('node:assert/strict');
const G="root.child('freeGames/'+$game)",S=G+".child('state')",SV=G+".child('special/version').val()>=4";
const t=k=>`newData.child('${k}').val()`,sv=k=>`${S}.child('${k}').val()`;
const special=x=>`(${x}>=15&&${x}<=26||${x}>=34)`;
function formulaRange(rule,key){
 const marker=t(key)+'===(',at=rule.indexOf(marker);assert(at>=0,'Missing '+key);
 const start=at+marker.length;let depth=1,quote='',escaped=false;
 for(let i=start;i<rule.length;i++){
  const c=rule[i];if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote='';continue;}
  if(c==="'"||c==='"'){quote=c;continue;}if(c==='(')depth++;else if(c===')'&&--depth===0)return [start,i];
 }
 throw Error('Unbalanced '+key);
}
function upgradeSpecialExpansion(input){
 const doc=structuredClone(input),r=doc.rules,g=r.freeGames.$game,h=r.battleHistory.$game;
 assert(!g.advanced.specialMovesV3,'Apply the S expansion once');
 let rule=g.transition['.validate'];
 const get=key=>{const[a,b]=formulaRange(rule,key);return rule.slice(a,b);};
 const put=(key,value)=>{const[a,b]=formulaRange(rule,key);rule=rule.slice(0,a)+value+rule.slice(b);};
 const four=G+".child('rulesVersion').val()===4",extra=[];
 for(const p of [1,2]){
  const q=3-p,A=t('action'+p),E=t('effectBase'+p),F=t('effectBase'+q);
  const costs={17:10,20:10,36:10,37:16,38:4,39:12,40:8};
  let sc=get('specialCost'+p);
  for(const[id,cost]of Object.entries(costs).reverse())sc=`(${SV}&&${A}===${id}?${cost}:${sc})`;
  put('specialCost'+p,sc);
  put('basePower'+p,get('basePower'+p).replace(`${E}===29?3:`,`${E}===29?(${SV}&&${special(t('effective'+p))}?4:3):`));
  // Every catalogued attack starts at >=1; subtracting one therefore floors at zero.
  put('power'+p,`(${get('power'+p)})-(${SV}&&${sv('weaken'+p)}>0&&${t('attack'+p)}===true?1:0)`);
  put('hit'+p,get('hit'+p).replace(t('attack'+p)+'===true&&',t('attack'+p)+'===true&&'+t('power'+p)+'>0&&'));
  put('inputFrozen'+p,`${sv('frozen'+p)}>0?${sv('frozen'+p)}:0`);
  put('frozen'+p,`${F}===30?(${SV}&&${special(t('effective'+q))}?2:1):(${t('inputFrozen'+p)}>0?${t('inputFrozen'+p)}-1:0)`);
  const old=t('normalGauge'+p)+'+'+t('gain'+p)+'+'+t('drained'+p)+'-'+t('drained'+q);
  const next=old+`+(${SV}?${t('specialRefund')}-${t('specialDrain'+q)}:0)`;
  const gauge=get('gauge'+p);assert(gauge.includes(old));put('gauge'+p,gauge.replaceAll(old,next));
  for(const[k,v]of Object.entries({['inputWeaken'+p]:`${sv('weaken'+p)}>0?${sv('weaken'+p)}:0`,['weaken'+p]:`${F}===32?(${special(t('effective'+q))}?2:0):(${t('inputWeaken'+p)}>0?${t('inputWeaken'+p)}-1:0)`,['specialDrain'+p]:`${E}===33&&${special(t('effective'+p))}?2:0`})){
   extra.push(k);rule+=`&&(!(${SV})||${t(k)}===(${v}))`;g.transition[k]={'.validate':SV};
  }
  const N='newData.val()',costNode=g.moves.$turn[p];
  for(const id of [17,20]){const old=`${N}===${id}?8:`;assert(costNode['.validate'].includes(old));costNode['.validate']=costNode['.validate'].replaceAll(old,`${N}===${id}?(${SV}?10:8):`);}
  const oldTail=`${N}===26?6:0`,newCosts=`${N}===36?10:${N}===37?16:${N}===38?4:${N}===39?12:${N}===40?8:0`;
  assert(costNode['.validate'].includes(oldTail));costNode['.validate']=costNode['.validate'].replaceAll(oldTail,`${N}===26?6:(${SV}?(${newCosts}):0)`);
  const key='weaken'+p;
  g.state[key]={'.validate':`${SV}&&newData.isNumber()&&newData.val()%1===0&&newData.val()>=0&&newData.val()<=2&&(!data.parent().exists()?newData.val()===0:newData.val()===newData.parent().parent().child('transition/${key}').val())`};
  h.finalState[key]={'.validate':`newData.val()===${S}.child('${key}').val()`};
  h.finalState['.validate']+=`&&(newData.child('${key}').exists()===${S}.child('${key}').exists())`;
 }
 extra.push('specialRefund');
 rule+=`&&(!(${SV})||${t('specialRefund')}===((${t('effectBase1')}===31&&${special(t('effective1'))}?3:0)+(${t('effectBase2')}===31&&${special(t('effective2'))}?3:0)))&&(!(${SV})||newData.hasChildren(${JSON.stringify(extra)}))`;
 g.transition.specialRefund={'.validate':SV};
 // data.parent() is the same existing game as root.freeGames[$game].
 // This equivalent shortening keeps the full rules below RTDB's 256 KiB limit.
 g.transition['.validate']=rule.replaceAll(G,'data.parent()');
 g.state['.validate']+=`&&(!(${SV})||newData.hasChildren(['weaken1','weaken2']))`;
 for(const n of [g.special,h.special])n.version['.validate']=n.version['.validate'].replaceAll('newData.val()===3','(newData.val()===3||newData.val()===4)');
 g.special['.write']=g.special['.write'].replaceAll("data.child('version').val()===3","(data.child('version').val()===3||data.child('version').val()===4)");
 g.special['.validate']+="&&(newData.child('version').val()<4||newData.parent().child('rulesVersion').val()===4)";
 g.advanced.specialMovesV3={'.read':'auth!=null','.validate':false};
 assert(Buffer.byteLength(JSON.stringify(doc)+'\n')<256*1024,'Full RTDB rules exceed 256 KiB');
 return doc;
}
module.exports={upgradeSpecialExpansion,formulaRange};
if(require.main===module){const p=process.argv[2]||'firebase-database.rules.json';fs.writeFileSync(p,JSON.stringify(upgradeSpecialExpansion(JSON.parse(fs.readFileSync(p,'utf8'))))+'\n');console.log('Updated S rules:',fs.statSync(p).size,'bytes');}
