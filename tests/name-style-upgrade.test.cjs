const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {harness}=require('./rules-harness.cjs');
const h=harness();h.put('users/p1',{name:'P1'});
const seed=()=>({balance:300,claimDay:-1,claimFrom:'',colorUnlocked:false,glossUnlocked:false,color:'white',gloss:false});
h.put('coinWallets/p1',seed());
const ctx=vm.createContext({Event:class{},window:{dispatchEvent(){}},Date:{now:()=>h.now()},Promise,console,ref:(db,p='')=>({uid:db.uid,p}),get:async r=>({val:()=>h.get(r.p)}),onValue(){},update:async(r,v)=>h.commit(v,r.uid),serverTimestamp:()=>({'.sv':'timestamp'})});
vm.runInContext(fs.readFileSync('economy-service.js','utf8').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),ctx);
const service=vm.runInContext("createEconomyService({uid:'p1'},{currentUser:{uid:'p1',isAnonymous:false}})",ctx);
function element(tag='div'){return {tagName:tag,children:[],style:{setProperty(){}},append(...v){this.children.push(...v)},replaceChildren(...v){this.children=v},setAttribute(){},hidden:false};}
const panel=element(),ui=vm.createContext({titleWallet:null,titleSaving:false,window:{NameStyles:{colors:{white:'#fff',red:'#f00'}}},document:{createTextNode:s=>({textContent:s})},$:()=>panel,node:(tag,cls,text)=>Object.assign(element(tag),{className:cls,textContent:text}),saveNameColor(){},purchaseNameStyle(){}});
const source=fs.readFileSync('titles-client.js','utf8'),start=source.indexOf(" const panel=$('nameColorPanel')"),end=source.indexOf('\n}\nasync function updateNameStyle',start);assert(start>0&&end>start);vm.runInContext('function renderNamePanel(){'+source.slice(start,end)+'\n}',ui);
function render(wallet){ui.titleWallet=wallet;vm.runInContext('renderNamePanel()',ui);return panel.children.find(n=>n.className==='nameUnlocks');}
(async()=>{
 const before=render(seed());assert.equal(before.children.length,1,'gloss purchase is hidden before color purchase');
 await assert.rejects(()=>service.unlock('gloss'),/先に/);assert.equal(h.get('coinWallets/p1/balance'),300);
 assert.throws(()=>h.commit({'coinWallets/p1':{...seed(),balance:0,colorUnlocked:true,glossUnlocked:true}},'p1'),/permission_denied/,'both rights cannot be forged in one payment');
 await service.unlock('color');let wallet=h.get('coinWallets/p1');assert.equal(wallet.balance,200);
 const after=render(wallet);assert.equal(after.children.length,2);assert.equal(after.children[1].textContent,'200コイン払って光沢色を解放');assert.equal(after.children[1].disabled,false);
 h.put('coinWallets/p1/balance',199);await assert.rejects(()=>service.unlock('gloss'),/200/);assert.equal(render(h.get('coinWallets/p1')).children[1].disabled,true);
 h.put('coinWallets/p1/balance',200);await service.unlock('gloss');assert.equal(h.get('coinWallets/p1/balance'),0);assert.equal(h.get('coinWallets/p1/glossUnlocked'),true);
 await service.saveStyle('red',true);await service.unlock('gloss');assert.equal(h.get('coinWallets/p1/balance'),0,'owned gloss is never charged again');
 wallet=h.get('coinWallets/p1');assert.equal(render(wallet).children[1].textContent,'光沢色：解放済み');assert.equal(panel.children.find(n=>n.className==='glossChoice').children[0].disabled,false);
 console.log('PASS real shop rendering + payment rules: hidden until color purchased, 100+200 total, 199/200 boundary, forged combined purchase, preserved ownership and gloss selection');
})().catch(e=>{console.error(e);process.exitCode=1;});
