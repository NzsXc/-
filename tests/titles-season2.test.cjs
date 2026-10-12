const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const {harness}=require('./rules-harness.cjs');
function element(tag){return {tag,className:'',dataset:{},children:[],setAttribute(){},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;}};}
const context=vm.createContext({window:{},document:{createElement:element},console});
vm.runInContext(fs.readFileSync(path.join(root,'titles-catalog.js'),'utf8'),context);
const catalog=context.window.TitleCatalog,ids=['s2_champion','s2_second','s2_third','s2_fourth','s2_qualifier'];
const expected=[['CHAMPION','rainbow'],['2ND PLACE','gold'],['3RD PLACE','ice'],['4TH PLACE','ice'],['QUALIFIER','spacetime']];
for(const [index,id]of ids.entries()){
 const award=catalog.byId[id],badge=catalog.badge(id);
 assert.equal(award.name,'Season 2｜'+expected[index][0]);assert.equal(award.design,expected[index][1]);
 assert.equal(badge.dataset.season2Design,award.design);
 const surface=badge.children.find(n=>n.className==='s2-surface');assert(surface);assert.equal(surface.children[0].tag,'canvas');
 assert.equal(badge.children.some(n=>n.className==='s2-crown-medal'),index===0);
 for(const grant of [undefined,false,'true',1])assert.equal(catalog.unlocked(award,{grants:{[id]:grant}}),false);
 assert(catalog.unlocked(award,{grants:{[id]:true}}));
 assert.equal(catalog.unlocked(award,{grants:{[ids[(index+1)%5]]:true}}),false);
 assert.equal(catalog.normalizeLoadout([id])[0],id);
 const h=harness();
 const save=(uid='p1')=>h.commit({'titleLoadouts/p1':{0:id,1:'',2:''}},uid);
 assert.throws(()=>save(),/permission_denied/);
 h.put('tournamentGrants/p2/'+id,true);assert.throws(()=>save(),/permission_denied/);
 h.put('tournamentGrants/p1/'+id,'true');assert.throws(()=>save(),/permission_denied/);
 h.put('tournamentGrants/p1/'+id,true);save();assert.equal(h.get('titleLoadouts/p1/0'),id);
 assert.throws(()=>save('p2'),/permission_denied/);
 assert.throws(()=>h.commit({'titleLoadouts/p1':{0:id,1:id,2:''}},'p1'),/permission_denied/);
 assert.throws(()=>h.commit({['tournamentGrants/p1/'+id]:true},'p1'),/permission_denied/);
}
assert.equal(catalog.badge('s1_champion').children.some(n=>n.className==='s2-surface'),false);
assert(catalog.badge('s1_champion').children.some(n=>n.className==='crown-medal'));
assert.equal(catalog.items.filter(t=>t.season===2).length,5);
// Exercise all approved artwork at collection/profile/small intro sizes.
vm.runInContext(fs.readFileSync(path.join(root,'titles-season2-art.js'),'utf8'),context);
let primitives=0;
const gradient={addColorStop(stop,color){assert(stop>=0&&stop<=1);assert(!color.includes('NaN'));}};
const canvas=new Proxy({createLinearGradient(){return gradient;},createRadialGradient(){return gradient;}},{get:(object,key)=>key in object?object[key]:(...values)=>{primitives++;for(const value of values)if(typeof value==='number')assert(Number.isFinite(value));},set:(object,key,value)=>(object[key]=value,true)});
for(const design of ['rainbow','gold','ice','spacetime'])for(const [width,height]of [[519,58],[269,32],[94,26]])for(const time of [0,.7,3,20])context.window.Season2TitleArt.draw(canvas,width,height,time,design);
assert(primitives>1000);
console.log('PASS: Season 2 catalog, exact grants, ownership, duplicates, Season 1 preservation, artwork sizes');
