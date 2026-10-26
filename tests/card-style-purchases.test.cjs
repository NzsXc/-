const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {harness}=require('./rules-harness.cjs');
const h=harness();h.put('users',{p1:{name:'A'},p2:{name:'B'}});h.put('playerCardStyles',{});
const wallet=balance=>({balance,claimDay:-1,claimFrom:'',colorUnlocked:false,glossUnlocked:false,color:'white',gloss:false});
const source=fs.readFileSync(path.join(__dirname,'..','economy-service.js'),'utf8').replace(/^import[^\n]*\n/gm,'').replaceAll('export ','');
function service(uid='p1',anonymous=false){
 const auth={currentUser:{uid,isAnonymous:anonymous}};
 return new Function('ref','get','update','onValue','serverTimestamp','window','Event','db','auth',source+';return createEconomyService(db,auth);')(
  (_db,p='')=>({p}),async r=>{assert(h.allowed('.read',r.p,uid),'read '+r.p);return {val:()=>structuredClone(h.get(r.p))};},
  async(_r,patch)=>h.commit(patch,uid),()=>{},()=>Date.now(),{dispatchEvent(){}},class{}, {},auth);
}
function seed(balance,styles={selected:''}){h.put('coinWallets/p1',wallet(balance));h.put('playerCardStyles/p1',styles);}
(async()=>{
 seed(99);await assert.rejects(()=>service().buyCardStyle('obsidian'),/100/);assert.equal(h.get('coinWallets/p1/balance'),99);
 seed(100);let result=await service().buyCardStyle('obsidian');assert.equal(result.wallet.balance,0);assert.equal(h.get('playerCardStyles/p1/selected'),'obsidian');
 await service().buyCardStyle('obsidian');assert.equal(h.get('coinWallets/p1/balance'),0,'owned skins are never charged twice');
 await service().saveCardStyle('');assert.equal(h.get('playerCardStyles/p1/selected'),'');await assert.rejects(()=>service().saveCardStyle('abyss'),/購入/);
 await service().saveCardStyle('obsidian');assert.equal((await service().readOwnCardStyles()).selected,'obsidian','persisted selection survives a new service');
 for(const patch of [{'playerCardStyles/p1/owned/abyss':true},{'playerCardStyles/p1/owned/obsidian':null},{'playerCardStyles/p1':null},{'playerCardStyles/p1/selected':'abyss'},{'playerCardStyles/p1/owned/unknown':true}])assert.throws(()=>h.commit(patch,'p1'),/permission_denied/);
 assert.throws(()=>h.commit({'playerCardStyles/p1/selected':'obsidian'},'p2'),/permission_denied/);
 await assert.rejects(()=>service('p1',true).buyCardStyle('abyss'),/ログイン/);
 for(const id of ['unknown',null,{},'__proto__'])await assert.rejects(()=>service().buyCardStyle(id),/不明/);
 seed(300);assert.throws(()=>h.commit({'coinWallets/p1':wallet(200),'playerCardStyles/p1':{owned:{obsidian:true,abyss:true},selected:'abyss'}},'p1'),/permission_denied/,'one payment cannot buy both skins');
 assert.throws(()=>h.commit({'coinWallets/p1':{...wallet(200),colorUnlocked:true},'playerCardStyles/p1':{owned:{obsidian:true},selected:'obsidian'}},'p1'),/permission_denied/,'a name-color payment cannot also grant a card skin');
 await Promise.all([service().buyCardStyle('obsidian'),service().buyCardStyle('abyss')]);assert.equal(h.get('coinWallets/p1/balance'),100);assert.equal(h.get('playerCardStyles/p1/owned/obsidian'),true);assert.equal(h.get('playerCardStyles/p1/owned/abyss'),true);
 seed(300);await Promise.all([service().buyCardStyle('obsidian'),service().buyCardStyle('obsidian')]);assert.equal(h.get('coinWallets/p1/balance'),200,'concurrent same purchase is charged once');
 await service().saveCardStyle('');await service().saveCardStyle('obsidian');assert.equal(h.get('coinWallets/p1/balance'),200,'switching is free');
 const legacy=wallet(300);legacy.colorUnlocked=true;legacy.glossUnlocked=true;legacy.color='gold';legacy.gloss=true;h.put('coinWallets/p1',legacy);h.put('playerCardStyles/p1',{selected:''});
 await service().buyCardStyle('abyss');const after=h.get('coinWallets/p1');assert.deepEqual(after,{...legacy,balance:200},'existing name purchases, reward metadata and wallet shape survive');
 console.log('PASS exact 100-coin purchases, ownership, persistence, no double charging, concurrent tabs, default selection and forged combined purchases');
})().catch(error=>{console.error(error);process.exitCode=1;});
