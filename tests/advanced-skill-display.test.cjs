const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const root=require('path').resolve(__dirname,'..')+'/',read=p=>fs.readFileSync(root+p,'utf8');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.style={setProperty(k,v){this[k]=v;}};this.hidden=false;this.textContent='';this.events={};this.classes=new Set();this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),contains:x=>this.classes.has(x),toggle:(x,v)=>{v=v??!this.classes.has(x);v?this.classes.add(x):this.classes.delete(x);return v;}};}
 set className(v){this.classes=new Set(v.split(/\s+/).filter(Boolean));}get className(){return [...this.classes].join(' ');}
 append(...xs){this.children.push(...xs);}appendChild(x){this.append(x);return x;}replaceChildren(...xs){this.children=[...xs];}
 setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}
 addEventListener(k,fn){this.events[k]=fn;}
 matches(s){return s.startsWith('#')?this.id===s.slice(1):s.startsWith('.')?this.classes.has(s.slice(1)):s==='[role="progressbar"]'?this.attributes.role==='progressbar':this.tagName===s;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 querySelectorAll(s){const a=[];for(const c of this.children){if(c.matches(s))a.push(c);a.push(...c.querySelectorAll(s));}return a;}
 getBoundingClientRect(){return {left:100,right:400,top:100,bottom:300,width:300,height:200};}get offsetWidth(){return 56;}
}
const body=new Element('body'),document={body,createElement:t=>new Element(t),getElementById:id=>body.querySelector('#'+id)};
for(const id of ['battleScreen','battleCenter','battleHomeButton','techScreen','player1Area','player2Area','spectatorLoadouts']){const el=new Element('div');el.id=id;body.append(el);}
let clock=0,nextFrame=0;const frames=new Map();const c=vm.createContext({document,console,performance:{now:()=>clock},rankedAnimating:false,rankedSending:false,PlayerIntro:{cancel(){}},requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id)});c.window=c;c.addEventListener=()=>{};
vm.runInContext(read('advanced/rules.js'),c);vm.runInContext(read('advanced/client.js'),c);
const R=c.AdvancedRules,client=c.AdvancedSkills;
const rules={mode:'advanced',hp:10,initialGauge:8,maxGauge:10};
function fixture(){const a={selected:{1:'boost',2:'cleanse'},current:{1:{id:'boost',turn:4,used:2},2:{id:'cleanse',turn:4,used:1}},uses:{}};return {id:'test',roomRules:rules,players:{1:{name:'A'},2:{name:'B'}},you:1,closed:false,state:{turn:4},advanced:a,serverNow:100,skillWindow:{startAt:0,endAt:3000,confirmAt:3500},opensAt:6600};}
const count=id=>document.getElementById(id).querySelector('.advancedSkillUses').textContent;
let m=fixture();const original=JSON.stringify(m);
for(const now of [100,2999,3500,5399,5400,6599]){
 m.serverNow=now;client.sync(m,now);
 assert.equal(count('advancedSkillButton'),'2/3');assert.equal(count('advancedEnemySkillButton'),'1/1');
 const enemy=document.getElementById('advancedEnemySkillButton');assert(!enemy.classList.contains('exhausted'));assert(!enemy.classList.contains('usedThisTurn'));assert(enemy.getAttribute('aria-label').includes('残り1/1'));assert(!enemy.title.includes('残り0/1'));
}
m.serverNow=3500;client.sync(m,6600);assert.equal(count('advancedSkillButton'),'1/3');assert.equal(count('advancedEnemySkillButton'),'0/1');assert(document.getElementById('advancedEnemySkillButton').classList.contains('exhausted'));assert(document.getElementById('advancedEnemySkillButton').classList.contains('usedThisTurn'));
// A stale pre-deadline snapshot cannot reveal a last-moment use on the local clock alone.
m.serverNow=3499;client.sync(m,10000);assert.equal(count('advancedEnemySkillButton'),'1/1');
m.serverNow=100;assert.equal(JSON.stringify(m),original);assert.equal(document.getElementById('advancedSkillButton').disabled,true);
// Previous-turn charges are already public; a player who did not use this turn loses no extra count.
m.advanced.current[2].turn=3;assert.equal(R.visibleUses(m,2,100),1);
m.closed=true;assert.equal(R.visibleUses(m,1,100),2);
console.log('PASS counts, exhaustion, use marker, accessibility text, exact animation end, stale snapshot, prior turn and immutable receipts');

const spectatorCode=read('advanced/spectator.js').replace('export function','function');vm.runInContext(spectatorCode,c);
const raw={turn:1,startedAt:1000,hp1:8,hp2:10,gauge1:5,gauge2:3,last1:'block',last2:'',seal1:false,seal2:true,ruin1:0,ruin2:2,enhance1:0,enhance2:0};
const a={selected:{1:'boost',2:'cleanse'},current:{1:{id:'boost',turn:1,used:1},2:{id:'cleanse',turn:1,used:1}}};
const make=now=>c.spectatorSkillMatch('observe',raw,a,rules,{1:{name:'P1'},2:{name:'P2'}},false,now);
let view=make(10100);assert.equal(view.skillWindow.startAt,6600);assert.equal(view.skillWindow.endAt,9600);assert.equal(view.opensAt,13200);assert.equal(view.displayState.gauge[1],5);assert.equal(view.skillResult.gauge[1],7);assert.equal(view.skillResult.gauge[2],7);assert(view.displayState.blockSeal[2]);
let completed=0;clock=10100;client.observe(view,()=>completed++);assert.equal(count('advancedEnemySkillButton'),'1/1');assert(document.getElementById('advancedSkillButton').disabled);assert(document.getElementById('advancedEnemySkillButton').disabled);
function advance(now){clock=now;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f());}
advance(13199);assert.equal(count('advancedEnemySkillButton'),'1/1');assert.equal(completed,0);
advance(13200);assert.equal(count('advancedEnemySkillButton'),'0/1');assert.equal(completed,1);advance(14000);assert.equal(completed,1);
client.reset();assert.equal(frames.size,0);assert(document.getElementById('advancedSkillDock').hidden);
assert.equal(make(14000).displayState.blockSeal[2],false);assert.equal(c.spectatorSkillMatch('s',raw,null,{mode:'standard'},null,false,0),null);
view=make(9000);clock=9000;client.observe(view,()=>{throw Error('stale spectator snapshot exposed result');});advance(14000);assert.equal(count('advancedEnemySkillButton'),'1/1');client.reset();
for(const s of [{...raw,turn:2,startedAt:10000,previousDeadline:11000},{...raw,turn:2,startedAt:10000,previousDeadline:9000},{...raw,skillsExhausted:true}]){
 const w=R.skillWindowForState(s),duration=R.windowMs(s),expected=(Number.isFinite(s.previousDeadline)?Math.max(s.startedAt,Math.min(s.startedAt+3000,s.previousDeadline))+3100:s.startedAt+(s.turn>1?7500:5600));
 assert.equal(w.startAt,expected);assert.equal(w.confirmAt,expected+duration+(duration?500:0));
}
console.log('PASS spectator counts/effects, simultaneous use, read-only controls, cancellation, stale polling and shared turn timing');

// Load real calculators and history replay, with only ESM wiring adapted for the VM.
function calculator(file,name){return '(function(){'+read(file).replace(/export /g,'')+';return {calculate,stateFields};})()';}
c.calc1=vm.runInContext(calculator('history-calculator-v1.js'),c);c.calc2=vm.runInContext(calculator('free-calculator.js'),c);
vm.runInContext('const calculateV1=calc1.calculate,calculateV2=calc2.calculate,stateFields=calc1.stateFields;'+read('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replace(/export /g,''),c);
vm.runInContext(read('battle-history-client.js').replace(/^import[^\n]*\n/gm,'').replace(/export /g,''),c);
const state=vm.runInContext('initialReplayState({})',c),moves={1:{1:0,2:1},2:{1:1,2:0}},skills={selected:{1:'boost',2:'stance'},current:{1:{id:'boost',turn:2,used:1},2:{id:'stance',turn:1,used:1}},uses:{1:{1:{id:'boost',turn:2,used:1}},2:{1:{id:'stance',turn:1,used:1}}}};
let after={...state};for(const turn of [1,2])after=R.resolve(after,moves[turn],skills.selected,R.forTurn(skills,turn),c.calc2.calculate,rules);
const history={version:1,rulesVersion:2,roomRules:rules,advanced:skills,kind:'friend',turnCount:2,endedAt:Date.now(),reason:'battle',players:{1:{uid:'one',name:'A',loadout:{0:0,1:1,2:2}},2:{uid:'two',name:'B',loadout:{0:3,1:4,2:5}}},settled:{winner:1,before1:1000,before2:1000,after1:1000,after2:1000},moves,finalState:after};
c.h=history;assert.equal(vm.runInContext('replayHistory(h).length',c),2);
const textOf=n=>n.textContent+' '+n.children.map(textOf).join(' ');
async function render(h){const screen=c.createHistoryScreen({list:async()=>[h]});c.showScreen=()=>{};await screen.open({uid:'one',name:'A'});const el=body.children.at(-1),card=el.querySelector('.historyCard');card.open=true;card.events.toggle();return textOf(el);}
(async()=>{
 let text=await render(history);for(const phrase of ['Advanced','スキル：ゲージ補給 / 使用 1/3回','スキル：攻撃態勢 / 使用 1/3回','スキル：使用なし','スキル：ゲージ補給','スキル：攻撃態勢'])assert(text.includes(phrase),phrase);
 const standard={...history,roomRules:{mode:'standard'},advanced:undefined,finalState:undefined};text=await render(standard);assert(!text.includes('使用 1/3回'));assert(!text.includes('historyTurnSkill'));
 const missing={...history,advanced:undefined,finalState:undefined};text=await render(missing);assert(text.includes('スキル：未記録'));
 const unresolved={...history,turnCount:0,reason:'resigned',finalState:{...state,turn:1},advanced:{selected:{1:'boost',2:'stance'},current:{1:{id:'boost',turn:1,used:1}}}};text=await render(unresolved);assert(text.includes('T1 A：ゲージ補給を発動（技の解決前に終了）'));
 console.log('PASS actual replay plus history rendering: loadout, counts, each-turn use, Standard, legacy missing data and unresolved final turn');
 // Parse every changed script and each classic inline script in the entry point.
 for(const file of ['advanced/rules.js','advanced/client.js','advanced/spectator.js','protected-rooms.js','battle-history-client.js'])new vm.Script(read(file).replace(/^import[^\n]*\n/gm,'').replace(/export /g,''),{filename:file});
 const html=read('index.html');for(const [i,match]of [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].entries()){if(!match[1].includes('type="module"'))new vm.Script(match[2],{filename:'index-inline-'+i});}
 for(const version of ['advanced/rules.js?v=skill-display-2','advanced/client.js?v=skill-display-2','protected-rooms.js?v=skill-display-2','battle-history-client.js?v=history-skills-2'])assert(html.includes(version),version);
 console.log('PASS syntax and cache versions');
})().catch(error=>{console.error(error);process.exitCode=1;});
