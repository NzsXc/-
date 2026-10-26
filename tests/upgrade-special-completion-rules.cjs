// Complete the seven new S techniques, preserving earlier S versions and owned cosmetics.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {formulaRange}=require('./upgrade-special-expansion-rules.cjs');
function upgradeSpecialCompletion(input){
 const doc=structuredClone(input),r=doc.rules,g=r.freeGames.$game,h=r.battleHistory.$game;
 assert(!g.advanced.specialMovesV4,'Apply S completion once');
 const G="root.child('freeGames/'+$game)",V=G+".child('special/version').val()>=5",P="data.parent().child('special/version').val()>=5",t=k=>`newData.child('${k}').val()`,special=x=>`(${x}>=15&&${x}<=26||${x}>=34)`;
 let rule=g.transition['.validate'];
 const get=key=>{const[a,b]=formulaRange(rule,key);return rule.slice(a,b);};
 const put=(key,value)=>{const[a,b]=formulaRange(rule,key);rule=rule.slice(0,a)+value+rule.slice(b);};
 for(const p of [1,2]){
  const q=3-p,A=t('action'+p),E=t('effectBase'+p);
  put('specialCost'+p,`${P}&&${A}===34?6:${P}&&${A}===35?8:(${get('specialCost'+p)})`);
  const old=`${E}===27&&${t('hit'+q)}!==true?3:`,gain=get('gain'+p);assert(gain.includes(old));
  put('gain'+p,gain.replace(old,`${E}===27&&${t('hit'+q)}!==true?(${P}&&${special(t('effective'+p))}?5:3):`));
  const damage=t('healed'+p)+'-'+t('damage'+p),hp=get('hp'+p);assert(hp.includes(damage));
  put('hp'+p,hp.replaceAll(damage,damage+`+(${P}?${t('recoveredAttack'+p)}:0)`));
  const k='recoveredAttack'+p;
  rule+=`&&(!(${P})||${t(k)}===(${E}===28&&${special(t('effective'+p))}&&${t('hit'+q)}===true?${t('power'+q)}:0))`;
  g.transition[k]={'.validate':V};
  const n=g.moves.$turn[p],needle='newData.val()===36?10:';
  assert(n['.validate'].includes(needle));n['.validate']=n['.validate'].replaceAll(needle,`newData.val()===34?(${V}?6:0):newData.val()===35?(${V}?8:0):${needle}`);
 }
 g.transition['.validate']=rule+`&&(!(${P})||newData.hasChildren(['recoveredAttack1','recoveredAttack2']))`;
 for(const n of [g.special,h.special])n.version['.validate']=n.version['.validate'].replaceAll('newData.val()===4','(newData.val()===4||newData.val()===5)');
 g.special['.write']=g.special['.write'].replaceAll("data.child('version').val()===4","(data.child('version').val()===4||data.child('version').val()===5)");
 g.advanced.specialMovesV4={'.read':'auth!=null','.validate':false};
 const wallet=r.coinWallets.$uid;assert(wallet['.validate'].includes('-300'));wallet['.validate']=wallet['.validate'].replaceAll('-300','-200');
 assert(Buffer.byteLength(JSON.stringify(doc)+'\n')<256*1024,'RTDB rules exceed 256 KiB');
 return doc;
}
module.exports={upgradeSpecialCompletion};
if(require.main===module){const p=process.argv[2]||'firebase-database.rules.json';fs.writeFileSync(p,JSON.stringify(upgradeSpecialCompletion(JSON.parse(fs.readFileSync(p,'utf8'))))+'\n');console.log('S completion rules:',fs.statSync(p).size,'bytes');}
