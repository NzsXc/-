const fs=require('fs'),path=require('path');const {upgradeSpecialMoves}=require('./upgrade-special-moves-rules.cjs'),{addEconomy}=require('./economy-rules.cjs');
const original=JSON.parse(require('child_process').execFileSync('git',['show','0490af42c561c47ad85cdfa8fbd3e188f368293c:firebase-database.rules.json'],{encoding:'utf8',cwd:path.resolve(__dirname,'..')}));
function upgrade(doc){const r=doc.rules,g=r.freeGames.$game,h=r.battleHistory.$game,form=upgradeSpecialMoves(doc,{formulasOnly:true});
 const G="root.child('freeGames/'+$game)",S=G+".child('state')",V=G+".child('rulesVersion').val()",four=`${V}===4`,modern=`${V}>=3`,t=k=>`newData.child('${k}').val()`,sv=k=>`${S}.child('${k}').val()`,maxG=`(${G}.child('roomRules/maxGauge').exists()?${G}.child('roomRules/maxGauge').val():10)`,maxH=`(${G}.child('roomRules/hp').exists()?${G}.child('roomRules/hp').val():10)`;
 const cap=(v,max)=>`((${v})>${max}?${max}:(${v}))`,floor=v=>`((${v})<0?0:(${v}))`,clamp=(v,max)=>cap(floor(v),max),eqs=(x,ids)=>'('+ids.map(id=>`${x}===${id}`).join('||')+')',lookup=(x,values,fallback='0')=>Object.entries(values).reverse().reduce((s,[k,v])=>`(${x}===${k}?${v}:${s})`,fallback);
 const active=(p,id)=>`(${G}.child('roomRules/skills').val()!==false&&${G}.child('advanced/current/${p}/id').val()==='${id}'&&${G}.child('advanced/current/${p}/turn').val()===${sv('turn')})`;
 const base=x=>`(${x}>=34?${x}-7:${x}>=27?${x}:${x}>=15?${x}-12:${x})`,special=x=>`(${x}>=15&&${x}<=26||${x}>=34)`;
 const costs={1:1,3:4,4:2,5:5,6:2,7:1,8:2,11:2,12:3,13:1,14:2,28:1,29:6,30:2,31:3,32:5,33:2};
 const types={0:"'charge'",1:"'attack'",2:"'block'",3:"'attack'",4:"'reflect'",5:"'attack'",6:"'heal'",7:"'block'",8:"'attack'",9:"'special'",10:"'seal'",11:"'enhance'",12:"'siphon'",13:"'ruin'",14:"'mirror'",27:"'focus'",28:"'convert'",29:"'attack'",30:"'freeze'",31:"'attack'",32:"'venom'",33:"'attack'"};
 for(const k of Object.keys(form)){form[k]=form[k].replaceAll('>10?10:',`>${maxG}?${maxG}:`).replaceAll('>=10?',`>=${maxG}?`).replaceAll(G+".child('roomRules/hp').val()",maxH);}
 for(const p of [1,2]){
  const q=3-p,A=t('action'+p),E=t('effectBase'+p),F=t('effectBase'+q),X=special(t('effective'+p)),Y=special(t('effective'+q));
  for(const key of ['SpecialSeal','SpecialRuin'])form['input'+key+p]=`${modern}?(${form['input'+key+p]}):0`;
  form['action'+p]=`${four}&&${sv('frozen'+p)}>0?-1:(${form['action'+p]})`;
  form['specialCost'+p]=`${A}===15?(${G}.child('special/version').val()===2?8:12):(${form['specialCost'+p]})`;
  form['baseAction'+p]=base(A);form['effectBase'+p]=base(t('effective'+p));form['cost'+p]=lookup(t('baseAction'+p),costs);form['type'+p]=lookup(E,types,"''");form['skill'+p]=`${E}>=27?'tech'+(${E}-14):${E}>=3?'tech'+(${E}-2):''`;
  form['basePower'+p]=`${E}===29?3:${eqs(E,[3,5])}?2:${eqs(E,[1,8,31,33])}?1:0`;
  form['power'+p]=form['power'+p].replaceAll(sv('specialMomentum'+p),`(${modern}?${sv('specialMomentum'+p)}:0)`);
  form['pierce'+p]=`${E}===3||${E}===31`;
  const shield=`(${G}.child('foresightShield').val()===true&&${E}===7)`,pierce=`${t('pierce'+q)}===true&&!${shield}`;
  const winP=`(${X}&&${E}===3)`,winQ=`(${Y}&&${F}===3)`;
  const cancel=`(${winP}&&!${winQ}?0:${winQ}&&!${winP}?${t('power'+q)}:${floor(t('power'+q)+'-'+t('power'+p))})`;
  const nerf=`(${four}&&${F}===3&&!${Y}&&${t('blocking'+p)}===true?1:0)`;
  const hit=`(${t('attack'+q)}===true&&${t('reflect'+p)}!==true&&(${t('blocking'+p)}!==true||${pierce})?${t('power'+q)}-${nerf}:0)`;
  const damage=`(${t('inputRuin'+p)}>0&&${t('type'+p)}==='charge'?1:0)+(${t('reflect'+q)}===true&&${t('attack'+p)}===true?(${Y}?2:1):0)+(${t('attack'+p)}===true&&${t('attack'+q)}===true?${cancel}:${hit})+(${F}===5&&!${Y}&&${t('type'+p)}==='charge'&&${t('blocking'+p)}!==true&&${t('reflect'+p)}!==true?(${V}>=2?1:2):0)+(${E}===9?2:0)+(${four}&&${sv('poison'+p)}>0?1:0)`;
  form['damage'+p]=`${active(p,'invincible')}?(${E}===9?2:0):(${damage})`;
  const rawGauge=clamp(`${t('rampage'+p)}+${t('stolen'+p)}-${t('stolen'+q)}`,maxG);
  form['normalGauge'+p]=floor(`(${A}===26&&${t('action'+q)}>=0&&${t('action'+q)}<=2?${cap(floor(rawGauge+`-(${V}>=2&&${F}===5?1:0)`)+'+2',maxG)}:${floor(rawGauge+`-(${V}>=2&&${F}===5?1:0)`)})-(${t('inputSpecialRuin'+p)}>0&&${t('type'+p)}==='charge'?1:0)`);
  const finalGauge=form['normalGauge'+p];form['normalGauge'+p]=`${four}?(${finalGauge}):${floor(rawGauge+`-(${V}>=2&&${F}===5?1:0)`)}`;
  form['gauge'+p]=`${four}?${clamp(`${t('normalGauge'+p)}+${t('gain'+p)}+${t('drained'+p)}-${t('drained'+q)}`,maxG)}:${floor(`(${A}===26&&${t('action'+q)}>=0&&${t('action'+q)}<=2?${cap(t('normalGauge'+p)+'+2',maxG)}:${t('normalGauge'+p)})-(${t('inputSpecialRuin'+p)}>0&&${t('type'+p)}==='charge'?1:0)`)}`;
  form['specialSeal'+p]=`${modern}?(${form['specialSeal'+p]}):0`;form['specialRuin'+p]=`${modern}?(${form['specialRuin'+p]}):0`;form['specialMomentum'+p]=`${modern}?(${form['specialMomentum'+p]}):0`;
  form['inputFrozen'+p]=`${sv('frozen'+p)}>`+`0?1:0`;form['inputPoison'+p]=`${sv('poison'+p)}>0?${sv('poison'+p)}:0`;
  form['hit'+p]=`${t('attack'+p)}===true&&${t('reflect'+q)}!==true&&!${active(q,'invincible')}&&(${t('attack'+q)}===true?(${X}&&${E}===3&&!(${Y}&&${F}===3))||(!(${Y}&&${F}===3)||(${X}&&${E}===3))&&${t('power'+p)}>${t('power'+q)}:(${t('blocking'+q)}!==true||${t('pierce'+p)}===true&&!(${G}.child('foresightShield').val()===true&&${F}===7)))`;
  form['gain'+p]=`${E}===27&&${t('hit'+q)}!==true?3:${E}===28&&${t('hit'+q)}===true?5:${E}===31&&${t('hit'+p)}===true?3:0`;
  form['drained'+p]=`${E}===33&&${t('hit'+p)}===true?(${t('normalGauge'+q)}<1?${t('normalGauge'+q)}:1):0`;
  form['frozen'+p]=`${F}===30?1:0`;form['poison'+p]=`${F}===32?2:${floor(t('inputPoison'+p)+'-1')}`;
  // All special checks must distinguish new normal actions from S actions.
  for(const k of Object.keys(form))form[k]=form[k].replaceAll(t('effective'+p)+'>=15',special(t('effective'+p)));
 }
 const added=new Set(['inputFrozen1','inputFrozen2','inputPoison1','inputPoison2','hit1','hit2','gain1','gain2','drained1','drained2','frozen1','frozen2','poison1','poison2']);
 const required=Object.keys(form).filter(k=>!added.has(k));
 g.transition['.validate']=`newData.hasChildren(${JSON.stringify(required)})&&newData.parent().child('state/turn').val()===${t('turn')}&&(!(${four})||newData.hasChildren(${JSON.stringify([...added])}))&&`+Object.entries(form).map(([k,v])=>added.has(k)?`(!(${four})||${t(k)}===(${v}))`:`${t(k)}===(${v})`).join('&&');
 for(const k of Object.keys(form))g.transition[k]={'.validate':true};
 // Existing timing, participants, and ready checks remain in place.
 g.rulesVersion['.validate']=`(${g.rulesVersion['.validate']})||(newData.val()===4&&newData.parent().child('createdAt').val()===now)`;
 g.advanced.sevenTechniquesV1={'.read':'auth!=null','.validate':false};
 for(const p of [1,2]){
  const node=g.moves.$turn[p],N='newData.val()',B=base(N),gauge=`(${active(p,'boost')}?${cap(sv('gauge'+p)+'+2',maxG)}:${active(p,'cleanse')}?${cap(sv('gauge'+p)+'+4',maxG)}:${sv('gauge'+p)})`,seal=`(!${active(p,'cleanse')}&&${sv('seal'+p)}===true)`,last=`(${active(p,'chain')}?'':${sv('last'+p)})`,sc=lookup(N,{15:`(${G}.child('special/version').val()===2?8:12)`,16:8,17:8,18:12,19:12,20:8,21:12,22:12,23:16,24:8,25:6,26:6});
  const equip=[0,1,2].map(i=>`(${N}===(${G}.child('loadouts/${p}/${i}').val()<12?${G}.child('loadouts/${p}/${i}').val()+3:${G}.child('loadouts/${p}/${i}').val()+15)||${N}===(${G}.child('loadouts/${p}/${i}').val()<12?${G}.child('loadouts/${p}/${i}').val()+15:${G}.child('loadouts/${p}/${i}').val()+22))`).join('||');
  const valid=`newData.isNumber()&&${N}%1===0&&(${sv('frozen'+p)}>0?${N}===-1:${N}>=0&&${N}<=40&&(${N}<3||${equip})&&${lookup(B,costs)}<=${gauge}&&(!${special(N)}||${G}.child('roomRules/special').val()===true&&${sc}<=${G}.child('special/gauge/${p}').val())&&!(${seal}&&${eqs(B,[2,4,7])})&&!(!${active(p,'cleanse')}&&${sv('specialSeal'+p)}>0&&${N}!==0&&${N}!==1)&&!(${eqs(B,[2,7])}&&${last}==='block')&&!(${B}===4&&${last}==='reflect')&&!(${N}===0&&${gauge}>=${maxG})&&!(${B}===10&&${sv('gauge'+(3-p))}>=7&&!${special(N)}))`;
  // Old action validation still protects live v1-v3 games.
  node['.validate']=valid.replace(`${N}<=40`,`${N}<=(${four}?40:${modern}?26:14)`);
  node['.write']=`(${node['.write']})||(${four}&&auth!=null&&(auth.uid===${G}.child('players/1').val()||auth.uid===${G}.child('players/2').val())&&${sv('frozen'+p)}>0&&!data.exists()&&newData.val()===-1&&$turn===''+${sv('turn')}&&!${G}.child('settled').exists())`;
  const load=g.loadouts[p];function expand(n){for(const[k,v]of Object.entries(n))if(typeof v==='string')n[k]=v.replace(/newData\.val\(\)<=11/g,`newData.val()<=(${four}?18:11)`).replace(/newData\.val\(\)<12/g,`newData.val()<(${four}?19:12)`);else if(v&&typeof v==='object')expand(v);}expand(load);
 }
 // Version 4 uses the established modern extra-state protocol in every mode.
 function version(n){for(const[k,v]of Object.entries(n))if(typeof v==='string')n[k]=v.replace(/((?:root|data|newData)(?:\.parent\(\)|\.child\([^)]*\))+\.val\(\))===3/g,'$1>=3');else if(v&&typeof v==='object')version(v);}version(g.state);version(g.special);version(g.roomRules);
 for(const k of require('../combat-v4.js').fields){g.state[k]={'.validate':`${four}&&newData.isNumber()&&newData.val()%1===0&&newData.val()>=0&&newData.val()<=2&&(!data.parent().exists()?newData.val()===0:newData.val()===newData.parent().parent().child('transition/${k}').val())`};h.finalState[k]={'.validate':`newData.val()===${S}.child('${k}').val()`};h.finalState['.validate']+=`&&(newData.child('${k}').exists()===${S}.child('${k}').exists())`;}
 g.state['.validate']=g.state['.validate'].replace("data.parent().child('rulesVersion').val()>=3?","data.parent().child('rulesVersion').val()>=3&&data.parent().child('special').exists()?");
 g.state['.validate']+=`&&(!(${four})||newData.hasChildren(['frozen1','frozen2','poison1','poison2']))`;
 h.rulesVersion['.validate']=h.rulesVersion['.validate'].replace('newData.val()===3','newData.val()>=3&&newData.val()<=4');
 function history(n){for(const[k,v]of Object.entries(n))if(typeof v==='string')n[k]=v.replace(/newData\.val\(\)<=\(([^?]+)\?26:14\)/g,`newData.val()<=(${V}===4?40:($1?26:14))`).replace(/newData\.val\(\)>=0/g,`newData.val()>=(${four}?-1:0)`);else if(v&&typeof v==='object')history(v);}history(h.moves);
 function extendHistory(n){for(const[k,v]of Object.entries(n))if(typeof v==='string')n[k]=v.replace(/newData\.val\(\)<12/g,`newData.val()<(${four}?19:12)`).replace(/newData\.val\(\)<=11/g,`newData.val()<=(${four}?18:11)`);else if(v&&typeof v==='object')extendHistory(v);}extendHistory(h.players);
 // The already-validated winner is shared by the rating arithmetic.
 const settled=g.settled['.validate'],prefix="newData.child('winner').val()===",start=settled.indexOf(prefix)+prefix.length;let depth=0,end=start;for(;end<settled.length;end++){const c=settled[end];if(c==='(')depth++;if(c===')')depth--;if(depth===0&&settled.slice(end+1,end+3)==='&&'){end++;break;}}
 const expression=settled.slice(start,end);if(expression.length>200){const first=settled.slice(0,end),tail=settled.slice(end).replaceAll(expression,"newData.child('winner').val()");g.settled['.validate']=first+tail;}
 // Remove the retired one-use titles and extend verified counters to 19 skills.
 r.titleLoadouts.$uid.$slot['.validate']=r.titleLoadouts.$uid.$slot['.validate'].replace(/newData\.val\(\)==='tech\d+_(?:1|30)'&&root\.child\('titleProgress'\)\.child\(\$uid\)\.child\('uses\/\d+\/count'\)\.val\(\)>=\d+\|\|/g,'');
 const slot=r.titleLoadouts.$uid.$slot;slot['.validate']=slot['.validate'].slice(0,-1)+'||'+Array.from({length:7},(_,i)=>[30,50].map(n=>`newData.val()==='skill_${n===30?'name':'prestige'}_${i+13}'&&root.child('titleProgress').child($uid).child('uses/${i+13}/count').val()>=${n}`).join('||')).join('||')+')';
 function titles(n){for(const[k,v]of Object.entries(n))if(typeof v==='string')n[k]=v.replaceAll('newData.val()<=12','newData.val()<=19').replaceAll('newData.val()+2',"(newData.val()<=12?newData.val()+2:newData.val()+14)").replace("/^([1-9]|1[0-2])$/","/^([1-9]|1[0-9])$/");else if(v&&typeof v==='object')titles(v);}titles(r.titleReceipts);titles(r.titleProgress);
 for(const category of ['techniques','specialTechniques']){const votes=r.communityRatings[category].$uid;for(let i=13;i<=19;i++)votes[(category==='techniques'?'tech':'s-tech')+i]={'.validate':'newData.isNumber()&&newData.val()%1===0&&newData.val()>=1&&newData.val()<=10'};}
 upgrade.formulas=form;addEconomy(doc);return doc;
}
const out=upgrade(original);fs.writeFileSync(path.join(__dirname,'..','firebase-database.rules.json'),JSON.stringify(out)+'\n');console.log('Rules:',Buffer.byteLength(JSON.stringify(out)),'bytes');
module.exports={upgrade};
