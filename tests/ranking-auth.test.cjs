const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=html.slice(html.indexOf('  window.openRateRanking=async function(){'),html.indexOf('  window.openRankingPlayerCard='));
const rules=JSON.parse(fs.readFileSync(path.join(root,'firebase-database.rules.json'),'utf8')).rules;
function node(){return {children:[],className:'',dataset:{},innerHTML:'',setAttribute(){},addEventListener(){},append(...children){this.children.push(...children);},replaceChildren(...children){this.innerHTML='';this.children=children;}};}
function setup({user=null,restoring=false,restoreUser=null,signInError=null,denyAccounts=false,legacy=false}={}){
 const list=node(),reads=[],errors=[],warnings=[],events=[];let finishRestore,signIns=0;
 const restored=restoring?new Promise(resolve=>{finishRestore=()=>{auth.currentUser=restoreUser;resolve();};}):Promise.resolve();
 const auth={currentUser:user,authStateReady:()=>{events.push('authReady');return restored;}};
 const records={alice:{name:'Alice',rating:1200},bob:{name:'Bob',rating:1400},guest:{name:'Guest',rating:1600,guest:true}};
 const context=vm.createContext({window:{},console:{error:(...args)=>errors.push(args),warn:(...args)=>warnings.push(args)},auth,db:{},
  showScreen:id=>events.push(id),document:{getElementById:()=>list,createElement:node},ref:(_db,p)=>p,
  signInAnonymously:async actual=>{assert.equal(actual,auth);signIns++;if(signInError)throw signInError;auth.currentUser={uid:'viewer',isAnonymous:true};},
  get:async p=>{
   reads.push(p);events.push('read:'+p);
   const allowed=p==='freeAccounts'?!denyAccounts&&vm.runInNewContext(rules.freeAccounts['.read'],{auth:auth.currentUser}):legacy&&!!auth.currentUser;
   if(!allowed)throw Error('Permission denied');return {val:()=>records};
  }
 });
 vm.runInContext(source,context);
 return {open:()=>context.window.openRateRanking(),auth,list,reads,errors,warnings,events,finishRestore,signIns:()=>signIns};
}
(async()=>{
 // Fresh desktop/private session: authenticate before the rules-protected read.
 const fresh=setup();await fresh.open();
 assert.deepEqual(fresh.errors,[],'a signed-out ranking must not report Permission denied');
 assert.equal(fresh.signIns(),1);assert.deepEqual(fresh.reads,['freeAccounts']);
 assert.deepEqual(fresh.warnings,[]);assert.equal(fresh.list.children.length,2,'guest accounts are excluded');
 assert.equal(fresh.list.children[0].children[2].textContent,'1400','ratings remain sorted');
 // A saved registered login can restore after the ranking button was clicked.
 const saved={uid:'alice',isAnonymous:false},restoring=setup({restoring:true,restoreUser:saved});
 const pending=restoring.open();await new Promise(setImmediate);
 assert.deepEqual(restoring.reads,[],'do not read while Firebase is restoring the saved login');
 assert.equal(restoring.signIns(),0);restoring.finishRestore();await pending;
 assert.equal(restoring.auth.currentUser,saved);assert.equal(restoring.signIns(),0);assert.deepEqual(restoring.errors,[]);
 assert.match(restoring.list.children.find(row=>row.className.includes(' me')).className,/ me/);
 for(const user of [saved,{uid:'viewer',isAnonymous:true}]){
  const existing=setup({user});await existing.open();assert.equal(existing.signIns(),0);assert.deepEqual(existing.errors,[]);assert.equal(existing.auth.currentUser,user);
 }
 // A failed guest sign-in must not cascade into unauthenticated database reads.
 const failed=setup({signInError:Error('auth/network-request-failed')});await failed.open();
 assert.deepEqual(failed.reads,[]);assert.equal(failed.errors.length,1);assert.match(failed.list.innerHTML,/ランキングを取得できませんでした/);
 // Preserve the legacy fallback, and surface an actual authenticated permission denial.
 const legacy=setup({user:saved,denyAccounts:true,legacy:true});await legacy.open();
 assert.deepEqual(legacy.reads,['freeAccounts','users']);assert.deepEqual(legacy.errors,[]);assert.equal(legacy.list.children.length,2);
 const denied=setup({user:saved,denyAccounts:true});await denied.open();assert.equal(denied.errors.length,1);assert.match(denied.list.innerHTML,/ランキングを取得できませんでした/);
 console.log('PASS: fresh guest authentication, delayed registered-login restoration, existing sessions, auth failure isolation, authenticated ranking rules, ordering/filtering and legacy fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
