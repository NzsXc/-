// Extend optional skill/S-move protocols to Custom without changing saved matches.
const fs=require('node:fs'),assert=require('node:assert/strict');
function upgradeCustomOptions(input,compact=x=>x){
 const out=structuredClone(input),r=out.rules,g=r.freeGames.$game;
 assert(!g.advanced.customOptionsV1,'Apply once');
 const mode=/((?:root|newData|data)(?:\.parent\(\)|\.child\([^)]*\))+)\.val\(\)(===|!==)'advanced'/g;
 function expand(node,path=''){
  for(const [key,value]of Object.entries(node)){
   const p=path+'/'+key;
   if(typeof value==='string')node[key]=value.replace(mode,(match,base,op)=>{
    // Shape validations keep distinct Standard/Advanced/Custom numeric branches.
    if(p.includes('/roomRules/'))return match;
    const ruleBase=base.replace(/\/mode'\)$/,"')");
    if(ruleBase===base)return match;
    const field=k=>ruleBase.replace(/'\)$/,"/"+k+"')")+'.val()';
    const enhanced="("+match+"||"+field('skills')+"===true||"+field('special')+"===true)";
    assert.equal(op,'===');return enhanced;
   });
   else if(value&&typeof value==='object')expand(value,p);
  }
 }expand(r);
 for(const node of [r.friendRooms.$room.roomRules,g.roomRules,r.battleHistory.$game.roomRules])for(const key of ['skills','special'])node[key]['.validate']="newData.isBoolean()&&(newData.parent().child('mode').val()==='advanced'||newData.parent().child('mode').val()==='custom')";
 g.roomRules['.validate']=g.roomRules['.validate'].replace("newData.child('mode').val()==='advanced'&&newData.child('special').val()===true","(newData.child('mode').val()==='advanced'||newData.child('mode').val()==='custom')&&newData.child('special').val()===true");
 const tr=g.transition['.validate'],limit="data.parent().child('roomRules/maxGauge').val()";
 g.transition['.validate']=tr.replaceAll('>10?10:',`>${limit}?${limit}:`).replace(/newData\.child\('inputGauge([12])'\)\.val\(\)>=10/g,`newData.child('inputGauge$1').val()>=${limit}`);
 for(const p of [1,2]){
  const limit="root.child('freeGames/'+$game+'/roomRules/maxGauge').val()";
  g.moves.$turn[p]['.validate']=g.moves.$turn[p]['.validate'].replaceAll('>10?10:',`>${limit}?${limit}:`).replaceAll('>=10)',`>=${limit})`);
 }
 g.advanced.customOptionsV1={'.read':'auth!=null','.validate':false};
 // Refer to the same existing game through data's parents where shorter.
 function localize(n,depth=0){for(const [k,v]of Object.entries(n)){
  if(typeof v==='string'&&['.write','.validate'].includes(k)){
   const base='data'+'.parent()'.repeat(depth);
   n[k]=v.replace(/root\.child\('freeGames\/'\+\$game(?:\+'([^']*)')?\)/g,(match,suffix)=>{const local=base+(suffix?'.child(\''+suffix.replace(/^\//,'')+'\')':'');return local.length<match.length?local:match;});
  }else if(v&&typeof v==='object')localize(v,depth+1);
 }}localize(g);
 // Regenerate expression formatting, checking that its AST is identical.
 g.transition['.validate']=compact(g.transition['.validate'],true);
 function minimize(n){for(const [k,v]of Object.entries(n))if(typeof v==='string'&&['.read','.write','.validate'].includes(k))n[k]=compact(v);else if(v&&typeof v==='object')minimize(v);}minimize(r);
 assert(Buffer.byteLength(JSON.stringify(out)+'\n')<256*1024,'Firebase rule file exceeds 256 KiB: '+Buffer.byteLength(JSON.stringify(out)+'\n'));
 return out;
}
if(require.main===module){
 const acorn=require(process.env.ACORN_MODULE||'acorn'),astring=require(process.env.ASTRING_MODULE||'astring');
 const clean=node=>JSON.parse(JSON.stringify(node,(k,v)=>['start','end','loc','raw'].includes(k)?undefined:v));
 function compact(expr,factor=false){
  let tree=acorn.parseExpressionAt(expr,0,{ecmaVersion:2020});
  if(factor){
   assert.equal(tree.type,'ConditionalExpression');
   const flatten=n=>n.type==='LogicalExpression'&&n.operator==='&&'?[...flatten(n.left),...flatten(n.right)]:[n];
   const yes=flatten(tree.consequent),no=flatten(tree.alternate),key=n=>JSON.stringify(clean(n)),common=yes.filter(n=>no.some(m=>key(m)===key(n))),keys=new Set(common.map(key));
   const join=ns=>ns.reduce((left,right)=>({type:'LogicalExpression',operator:'&&',left,right}));
   // Firebase expressions only read snapshots. Distribute common pure conjuncts.
   tree=join([...common,{...tree,consequent:join(yes.filter(n=>!keys.has(key(n)))),alternate:join(no.filter(n=>!keys.has(key(n))))}]);
   console.log('Shared transition checks:',common.length);
  }
  const generated=astring.generate(tree);
  let result='',last='';for(const token of acorn.tokenizer(generated,{ecmaVersion:2020})){const text=generated.slice(token.start,token.end);if(/[\w$]$/.test(last)&&/^[\w$]/.test(text))result+=' ';result+=text;last=text;}
  assert.deepEqual(clean(acorn.parseExpressionAt(result,0,{ecmaVersion:2020})),clean(tree),'Formula AST changed');return result;
 }
 const p=process.argv[2]||'firebase-database.rules.json',out=upgradeCustomOptions(JSON.parse(fs.readFileSync(p,'utf8')),compact);fs.writeFileSync(p,JSON.stringify(out)+'\n');console.log('Rule bytes:',fs.statSync(p).size);
}
module.exports={upgradeCustomOptions};
