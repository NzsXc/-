/* Add Custom Classic/Draft and receipt-backed 10-coin match rewards. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const acorn=require(process.env.ACORN_MODULE||'acorn'),astring=require(process.env.ASTRING_MODULE||'astring');
const parse=s=>acorn.parseExpressionAt(s,0,{ecmaVersion:2020}),print=n=>astring.generate(n);
function walk(node,fn){if(!node||typeof node!=='object')return node;for(const k of Object.keys(node)){const v=node[k];if(Array.isArray(v))node[k]=v.map(x=>walk(x,fn));else if(v&&typeof v==='object')node[k]=walk(v,fn);}return fn(node)||node;}
function compact(s){const generated=print(parse(s));let result='',last='';for(const token of acorn.tokenizer(generated,{ecmaVersion:2020})){const text=generated.slice(token.start,token.end);if(/[\w$]$/.test(last)&&/^[\w$]/.test(text))result+=' ';result+=text;last=text;}return result;}
function upgrade(input){
 const doc=structuredClone(input),r=doc.rules,g=r.freeGames.$game,G="root.child('freeGames/'+$game)",C=G+".child('roomRules/classic').val()===true";assert(!g.customModesV1,'Apply this upgrade once');
 for(const [kind,n]of [['room',r.friendRooms.$room.roomRules],['game',g.roomRules],['history',r.battleHistory.$game.roomRules]]){
  for(const key of ['classic','draft'])n[key]={'.validate':"newData.isBoolean()&&newData.parent().child('mode').val()==='custom'"};
  n['.validate']+="&&!(newData.child('classic').val()===true&&(newData.child('skills').val()===true||newData.child('special').val()===true||newData.child('draft').val()===true))";
  for(const key of ['classic','draft'])n['.validate']+=kind==='room'?`&&(!data.exists()||newData.child('${key}').val()===data.child('${key}').val())`:kind==='game'?`&&newData.child('${key}').val()===root.child('friendRooms').child(newData.parent().child('room').val()).child('roomRules/${key}').val()`:`&&newData.child('${key}').val()===root.child('freeGames').child($game).child('roomRules/${key}').val()`;
 }
 g.roomRules['.validate']+="&&(newData.parent().child('draft').exists()===(newData.child('draft').val()===true))";
 const D=G+".child('draft')",picked=i=>`${D}.child('picks/${i}')`,at=i=>`${picked(i)}.child('at').val()`;
 const participant=`auth!=null&&(auth.uid===${G}.child('players/1').val()||auth.uid===${G}.child('players/2').val())`;
 const indexTests=Array.from({length:6},(_,i)=>`$step==='${i}'&&${i?picked(i-1)+'.exists()':'true'}`).join('||');
 const currentFirst="($step==='0'||$step==='3'||$step==='4')",owner=`(${currentFirst}?${D}.child('first').val():3-${D}.child('first').val())`;
 const previousAt=`($step==='0'?${D}.child('startedAt').val():$step==='1'?${at(0)}:$step==='2'?${at(1)}:$step==='3'?${at(2)}:$step==='4'?${at(3)}:${at(4)})`;
 g.draft={'.read':'auth!=null','.write':`auth!=null&&!data.exists()&&!data.parent().exists()&&newData.parent().child('players/1').val()===auth.uid&&newData.parent().child('roomRules/draft').val()===true`,'.validate':"newData.hasChildren(['first','startedAt'])&&(!data.exists()?!newData.child('picks').exists()&&newData.child('startedAt').val()===now:newData.child('first').val()===data.child('first').val()&&newData.child('startedAt').val()===data.child('startedAt').val())",first:{'.validate':'newData.val()===1||newData.val()===2'},startedAt:{'.validate':'newData.isNumber()'},picks:{'$step':{'.write':`${participant}&&${G}.child('roomRules/draft').val()===true&&!${G}.child('state').exists()&&!${G}.child('settled').exists()&&!${G}.child('resigned').exists()&&!data.exists()&&newData.exists()&&(${indexTests})&&((newData.child('automatic').val()===true&&now>=${previousAt}+15000)||(newData.child('automatic').val()===false&&now<${previousAt}+15000&&auth.uid===${G}.child('players').child(''+${owner}).val()))`,'.validate':`newData.hasChildren(['tech','at','automatic'])&&newData.child('tech').isNumber()&&newData.child('tech').val()%1===0&&newData.child('tech').val()>=0&&newData.child('tech').val()<19&&newData.child('at').val()===now&&newData.child('automatic').isBoolean()&&${Array.from({length:6},(_,i)=>`newData.child('tech').val()!==${picked(i)}.child('tech').val()`).join('&&')}`,tech:{'.validate':true},at:{'.validate':true},automatic:{'.validate':true},'$other':{'.validate':false}}},'$other':{'.validate':false}};
 for(const p of [1,2]){
  const load=g.loadouts[p],base="newData.parent().parent()";
  load['.validate']+=`&&(!(${C})||(newData.child('0').val()===0&&newData.child('1').val()===1&&newData.child('2').val()===2))&&(${base}.child('roomRules/draft').val()!==true||(${base}.child('draft/picks/5').exists()&&`+[0,1,2].map((slot)=>{const first=[0,3,4][slot],other=[1,2,5][slot];return `newData.child('${slot}').val()===(${base}.child('draft/first').val()===${p}?${base}.child('draft/picks/${first}/tech').val():${base}.child('draft/picks/${other}/tech').val())`;}).join('&&')+'))';
  // Only Classic may repeat Counter. All other legality checks remain in force.
  const ast=parse(g.moves.$turn[p]['.validate']);walk(ast,n=>n.type==='BinaryExpression'&&n.operator==='==='&&n.right?.value==='reflect'?parse(`!(${C})&&(${print(n)})`):null);g.moves.$turn[p]['.validate']=print(ast);
 }
 // Classic keeps action IDs 3/4/5; the surrounding verified diagnostics remain unchanged.
 let transition=parse(g.transition['.validate']);const T=k=>`newData.child('${k}').val()`,classic="data.parent().child('roomRules/classic').val()===true";
 const updates={};for(const p of [1,2]){const q=3-p;
  updates['damage'+p]=`(${T('reflect'+p)}===true&&${T('attack'+q)}===true?0:${T('attack'+q)}===true?(${T('attack'+p)}===true?(${T('power'+q)}>${T('power'+p)}?${T('power'+q)}-${T('power'+p)}:0):(${T('blocking'+p)}!==true||${T('pierce'+q)}===true?${T('power'+q)}:0)):0)+(${T('reflect'+q)}===true&&${T('attack'+p)}===true===true?1:0)+(${T('effectBase'+q)}===5&&${T('type'+p)}==='charge'?2:0)`;
  // A composition of clamp/shift operations is itself an affine clamp.
  // Keep its lower and upper saturation values instead of repeating nested clamps.
  const max="(data.parent().child('roomRules/maxGauge').exists()?data.parent().child('roomRules/maxGauge').val():10)",four="data.parent().child('rulesVersion').val()===4";
  const mirror=`(${four}&&${T('action'+p)}===26&&${T('action'+q)}>=0&&${T('action'+q)}<=2)`,penalty=`(!(${classic})&&data.parent().child('rulesVersion').val()>=2&&${T('effectBase'+q)}===5?1:0)`,curse=`(${four}&&${T('inputSpecialRuin'+p)}>0&&${T('type'+p)}==='charge'?1:0)`;
  const value=`(${T('rampage'+p)}+${T('stolen'+p)}-${T('stolen'+q)}-${penalty}+(${mirror}?2:0)-${curse})`,low=`(${mirror}?((${max}<2?${max}:2)-${curse}):0)`,high=`(${mirror}?${max}-${curse}:(${max}-${penalty}-${curse}<0?0:${max}-${penalty}-${curse}))`;
  updates['normalGauge'+p]=`${value}<${low}?${low}:${value}>${high}?${high}:${value}`;
 }
 const changed=new Set();walk(transition,n=>{if(n.type!=='BinaryExpression'||n.operator!=='===')return;const left=compact(print(n.left));for(const [key,value]of Object.entries(updates))if(left===T(key)){n.right=key.startsWith('normalGauge')?parse(value):parse(`(${classic})?(${value}):(${print(n.right)})`);changed.add(key);break;}});assert.equal(changed.size,4);g.transition['.validate']=print(transition);
 g.customModesV1={'.read':'auth!=null','.validate':false};
 // Six picks may use 90 seconds. Reserve another 60 seconds for skill/loadout
 // confirmation, followed by the existing 30-second reconnect grace period.
 function extend(n){for(const[k,v]of Object.entries(n))if(typeof v==='string'&&['.read','.write','.validate'].includes(k)){
  const tree=parse(v);walk(tree,node=>{
   if(node.type!=='BinaryExpression'||node.operator!=='+'||![60000,90000].includes(node.right?.value))return;
   let base=print(node.left).trim().replace(/;$/,'');
   if(!base.endsWith(".child('createdAt').val()")&&!base.endsWith('.child("createdAt").val()'))return;
   base=base.replace(/\.child\(['"]createdAt['"]\)\.val\(\)$/,'');
   node.right=parse(`(${base}.child('roomRules/draft').val()===true?180000:${node.right.value})`);return node;
  });n[k]=print(tree);
 }else if(v&&typeof v==='object')extend(v);}extend(r);
 for(const p of [1,2]){
  const node=g.moves.$turn[p],tree=parse(node['.write']);
  const flatten=n=>n.type==='LogicalExpression'&&n.operator==='&&'?[...flatten(n.left),...flatten(n.right)]:[n];
  const join=xs=>xs.reduce((left,right)=>({type:'LogicalExpression',operator:'&&',left,right}));
  const normal=tree.type==='LogicalExpression'&&tree.operator==='||'?tree.left:tree;
  const terms=flatten(normal),terminal=terms.findIndex(n=>n.type==='UnaryExpression'&&n.operator==='!'&&print(n).length>1000);
  assert(terminal>=0,'Missing redundant action terminal condition');terms.splice(terminal,1);
  terms.push(parse(`${G}.child('state/hp1').val()>0&&${G}.child('state/hp2').val()>0&&${G}.child('state/turn').val()<=300&&!${G}.child('resigned').exists()`));
  if(tree.type==='LogicalExpression'&&tree.operator==='||')tree.left=join(terms);else throw Error('Expected normal/frozen action branches');node['.write']=print(tree);
 }
 addBattleCoins(r);
 // Merge equivalent fixed snapshot paths and prefer shorter relative paths.
 function shorten(n,path=[]){for(const[k,v]of Object.entries(n))if(typeof v==='string'&&['.read','.write','.validate'].includes(k)){
  let expr=v;for(let i=0;i<8;i++)expr=expr.replace(/\.child\('([^']+)'\)\.child\('([^']+)'\)/g,".child('$1/$2')");
  if(path[0]==='freeGames'&&path[1]==='$game'){
   const local='data'+'.parent()'.repeat(path.length-2);
   expr=expr.replace(/root\.child\('freeGames\/'\+\$game(?:\+'([^']*)')?\)/g,(m,suffix)=>{const shorter=local+(suffix?`.child('${suffix.replace(/^\//,'')}')`:'' );return shorter.length<m.length?shorter:m;});
   expr=expr.replaceAll(G,local.length<G.length?local:G);
  }
  const ast=parse(expr);
  const key=n=>compact(print(n));
  const terms=n=>n.type==='LogicalExpression'&&n.operator==='&&'?[...terms(n.left),...terms(n.right)]:[n];
  const join=ns=>ns.reduce((left,right)=>({type:'LogicalExpression',operator:'&&',left,right}));
  walk(ast,node=>{
   const conditional=node.type==='ConditionalExpression',either=node.type==='LogicalExpression'&&node.operator==='||';if(!conditional&&!either)return;
   const left=conditional?node.consequent:node.left,right=conditional?node.alternate:node.right;
   if(key(left)===key(right))return left;
   const a=terms(left),b=terms(right),common=[];while(a.length>1&&b.length>1&&key(a[0])===key(b[0])){common.push(a.shift());b.shift();}
   if(!common.length)return;
   const rest=conditional?{...node,consequent:join(a),alternate:join(b)}:{...node,left:join(a),right:join(b)};return join([...common,rest]);
  });n[k]=compact(print(ast));
 }else if(v&&typeof v==='object')shorten(v,[...path,k]);}shorten(r);
 // RTDB rejects numeric comparisons with null. A missing special meter is
 // valid in Standard/Classic/Draft. Version-4+ live states already prove their
 // protocol through the validated weaken fields; version 5 is exact equality.
 function guardMissingSpecial(n,path=[]){for(const[k,v]of Object.entries(n))if(typeof v==='string'&&['.read','.write','.validate'].includes(k)){
  const ast=parse(v);walk(ast,node=>{
   if(node.type!=='BinaryExpression'||node.operator!=='>='||![4,5].includes(node.right?.value))return;
   const left=compact(print(node.left));if(!left.includes('special/version'))return;
   if(node.right.value===5){node.operator='===';return node;}
   if(path.includes('transition')||path.includes('moves')||path[0]==='battleHistory'){
    const snapshot=left.replace(/\.child\(['"]special\/version['"]\)\.val\(\)$/,".child('state/weaken1').exists()");if(snapshot!==left)return parse(snapshot);
   }
   return parse(`(${left}===4||${left}===5)`);
  });n[k]=compact(print(ast));
 }else if(v&&typeof v==='object')guardMissingSpecial(v,[...path,k]);}guardMissingSpecial(r);
 return doc;
}
function addBattleCoins(r){
 const A="auth!=null&&auth.uid===$uid&&auth.token.firebase.sign_in_provider!=='anonymous'&&root.child('users').child($uid).exists()",W="root.child('coinWallets').child($uid)",n=k=>`newData.child('${k}').val()`,old=k=>`(data.child('${k}').exists()?data.child('${k}').val():${({balance:0,claimDay:-1,claimFrom:"''",colorUnlocked:false,glossUnlocked:false,color:"'white'",gloss:false})[k]})`;
 const stable=['colorUnlocked','glossUnlocked','color','gloss'].map(k=>`${n(k)}===${old(k)}`).join('&&'),id=n('claimFrom'),live=`root.child('freeGames').child(${id})`,archive=`root.child('battleHistory').child(${id})`,account=p=>`root.child('freeAccounts').child(${p})`,user=p=>`root.child('users').child(${p}).exists()`;
 const registered=base=>[1,2].map(p=>{const who=base===live?`${base}.child('players/${p}').val()`:`${base}.child('players/${p}/uid').val()`;return `${account(who)}.child('guest').val()!==true&&${user(who)}`;}).join('&&');
 const member=base=>[1,2].map(p=>`${base}.child('${base===live?'players/'+p:'players/'+p+'/uid'}').val()===$uid`).join('||');
 const receipt="newData.parent().parent().child('coinBattleClaims').child($uid).child("+id+")";
 const proof=`((${live}.child('settled').exists()&&${live}.child('state').exists()&&(${member(live)})&&${registered(live)})||(${archive}.child('settled').exists()&&${archive}.child('finalState').exists()&&(${member(archive)})&&${registered(archive)}))`;
 const claim=`newData.hasChildren(['balance','claimDay','claimFrom','colorUnlocked','glossUnlocked','color','gloss'])&&${n('balance')}===${old('balance')}+10&&${n('claimDay')}===-1&&${stable}&&!root.child('coinBattleClaims').child($uid).child(${id}).exists()&&${receipt}.val()===true&&${proof}`;
 r.coinWallets.$uid['.validate']=`(${r.coinWallets.$uid['.validate']})||(${claim})`;
 const nw="newData.parent().parent().parent().child('coinWallets').child($uid)";
 r.coinBattleClaims={'$uid':{'.read':A,'$game':{'.write':`${A}&&!data.exists()&&newData.val()===true&&${nw}.child('claimFrom').val()===$game&&${nw}.child('claimDay').val()===-1&&${nw}.child('balance').val()===(${W}.child('balance').exists()?${W}.child('balance').val():0)+10`}}};
 r.coinBattleAcknowledgements={'$uid':{'.read':A,'$game':{'.write':`${A}&&(!data.exists()||data.val()===true)&&newData.val()===true&&root.child('coinBattleClaims').child($uid).child($game).val()===true`}}};
}
module.exports={upgrade,compact};
if(require.main===module){const p=process.argv[2]||'firebase-database.rules.json',out=upgrade(JSON.parse(fs.readFileSync(p,'utf8')));fs.writeFileSync(p,JSON.stringify(out)+'\n');console.log('Updated rules:',fs.statSync(p).size,'bytes');}
