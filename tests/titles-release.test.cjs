const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function node(){return {className:'',dataset:{},children:[],setAttribute(){},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;}};}
const context=vm.createContext({window:{},document:{createElement:node},console});
vm.runInContext(fs.readFileSync(path.join(root,'titles-catalog.js'),'utf8'),context);
const catalog=context.window.TitleCatalog;
assert.equal(catalog.items.filter(t=>t.kind==='skill-prestige').length,12);
assert.equal(catalog.items.filter(t=>t.kind==='tech').length,12);
assert.equal(catalog.items.filter(t=>t.kind==='skill-name').length,12);
assert.equal(catalog.items.some(t=>t.threshold===15),false);
for(let skill=1;skill<=12;skill++){
 const t=catalog.byId['skill_prestige_'+skill];
 assert.equal(t.threshold,50);
 for(const count of [0,1,15,29,30,49,50,51,100])assert.equal(catalog.unlocked(t,{uses:{[skill]:{count}}}),count>=50);
 assert.equal(catalog.unlocked(t,{uses:{[skill===12?1:skill+1]:{count:100}}}),false);
 assert.equal(catalog.byId['tech'+skill+'_30'],undefined);
 assert.equal(catalog.unlocked(catalog.byId['tech'+skill+'_1'],{uses:{[skill]:{count:1}}}),true);
 assert.equal(catalog.unlocked(catalog.byId['skill_name_'+skill],{uses:{[skill]:{count:30}}}),true);
 const badge=catalog.badge(t.id);assert.match(badge.className,/tier-prestige compact-prestige/);
 assert.equal(badge.children.find(n=>n.className.includes('title-badge')).textContent,t.name);
}
const crown=catalog.badge('s1_champion');
assert(crown.children.some(n=>n.className==='crown-medal'));
assert(!crown.children.some(n=>n.className.includes('champion-ornament')));
assert.equal(catalog.byId.s1_champion.name,'Season 1｜CHAMPION');
assert(catalog.unlocked(catalog.byId.s1_champion,{grants:{s1_champion:true}}));
assert.equal(catalog.byId.strategist.finish,'bronze');assert.equal(catalog.byId.astute.finish,'silver');
assert.equal(catalog.byId.s1_second.color,'rainbow');assert.equal(catalog.byId.s1_third.color,'rainbow');
assert.equal(catalog.byId.s1_challenger.finish,'diamond');
assert.deepEqual(Array.from(catalog.normalizeLoadout(['tech1_30','skill_name_1','skill_prestige_1'])),['','skill_name_1','skill_prestige_1']);
const data={'titleLoadouts/player':{0:'tech1_30',1:'skill_name_1',2:'skill_prestige_1'}};
context.ref=(_db,p)=>p;context.get=async p=>({val:()=>data[p]??null});context.set=async(p,v)=>{data[p]=v;};
context.update=async()=>{};context.serverTimestamp=()=>0;
const serviceSource=fs.readFileSync(path.join(root,'title-service.js'),'utf8').replace(/^import[^\n]*\n/,'').replace('export function','function');
vm.runInContext(serviceSource+'\nglobalThis.createService=createTitleService;',context);
(async()=>{
 const service=context.createService({}, {currentUser:{uid:'player',isAnonymous:false}},{});
 assert.deepEqual(Array.from(await service.loadoutFor('player')),['','skill_name_1','skill_prestige_1']);
 await service.saveLoadout(['tech7_30','skill_prestige_7','s1_champion']);
 assert.deepEqual(JSON.parse(JSON.stringify(data['titleLoadouts/player'])),{0:'',1:'skill_prestige_7',2:'s1_champion'});
 assert.deepEqual(Array.from(service.peek('player')),['','skill_prestige_7','s1_champion']);
 console.log('PASS: 12 skills × thresholds, removed IDs, preserved awards, loadout read/save');
})().catch(error=>{console.error(error);process.exitCode=1;});
