const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),RoomRules=require('../room-rules.js');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.style={setProperty(k,v){this[k]=v;}};this.hidden=false;this.textContent='';this.checked=false;this.disabled=false;this.events={};const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)};}
 append(...nodes){this.children.push(...nodes);}insertBefore(node,before){const i=this.children.indexOf(before);if(i<0)this.append(node);else this.children.splice(i,0,node);}replaceChildren(...nodes){this.children=[...nodes];}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}setCustomValidity(v){this.validity=v;}reportValidity(){return true;}
 matches(s){return s==='input[value="advanced"]'?this.tag==='input'&&this.value==='advanced':s==='[role="progressbar"]'?this.attrs.role==='progressbar':s.startsWith('.')?this.className?.split(' ').includes(s.slice(1)):s===this.tag;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}querySelectorAll(s){const out=[];for(const node of this.children){if(s.split(',').some(x=>node.matches(x)))out.push(node);out.push(...node.querySelectorAll(s));}return out;}
}
const nodes=new Map(),node=(id,tag='div')=>{const el=new Element(tag);el.id=id;nodes.set(id,el);return el;};
const body=node('body'),form=node('friendRuleForm','form');body.append(form);
for(const id of ['friendAdvancedOptions','friendCustomRules','friendRuleStatus','friendStandardRules','friendAdvancedRules','friendCreateButton','friendLobbyBack','friendLobbyStatus','friendRoomList','battleScreen'])body.append(node(id));
for(const id of ['friendRuleSkills','friendRuleSpecial','friendRuleHp','friendRuleInitialGauge','friendRuleMaxGauge','friendCustomSkills','friendCustomSpecial'])form.append(node(id,'input'));
nodes.get('friendRuleHp').value='10';nodes.get('friendRuleInitialGauge').value='8';nodes.get('friendRuleMaxGauge').value='10';
const radio=node('advancedRadio','input');radio.value='advanced';form.append(radio);
for(const side of [1,2]){const area=node('player'+side+'Area');area.append(node('actions'+side));body.append(area);}
let mode='advanced';const created=[];
const document={querySelectorAll:s=>body.querySelectorAll(s),createElement:t=>new Element(t),getElementById:id=>nodes.get(id)||findId(body,id),querySelector:s=>s==='input[name="friendRuleMode"]:checked'?{value:mode}:body.querySelector(s)};
function findId(n,id){if(n.id===id)return n;for(const child of n.children){const found=findId(child,id);if(found)return found;}return null;}
const c=vm.createContext({document,console,RoomRules,setInterval:()=>1,clearInterval(){},showScreen(){},protectedRooms:{create:async rules=>{created.push(rules);return 'room';},watchHost:()=>()=>{},now:()=>0},rankedActive:false});c.window=c;
vm.runInContext(read('lobby-client.js'),c);vm.runInContext(read('advanced/special.js'),c);
(async()=>{
 vm.runInContext('protectedLobbyActive=true',c);
 for(const skills of [true,false])for(const special of [false,true]){
  nodes.get('friendRuleSkills').checked=skills;nodes.get('friendRuleSpecial').checked=special;
  c.updateFriendRuleSettings();assert.equal(nodes.get('friendAdvancedOptions').hidden,false);assert.equal(nodes.get('friendAdvancedOptions').disabled,false);
  await c.submitFriendRoom({preventDefault(){}});const rules=created.at(-1);assert.equal(RoomRules.hasSkills(rules),skills);assert.equal(RoomRules.hasSpecial(rules),special);assert.equal(rules.hp,10);assert(nodes.get('friendAdvancedRules').textContent.startsWith(`HP ${rules.hp} / 初期ゲージ ${rules.initialGauge} / 最大ゲージ ${rules.maxGauge}。`),'room creation description must match the submitted rules');vm.runInContext('protectedLobbyBusy=false',c);
 }
 mode='standard';c.updateFriendRuleSettings();assert(nodes.get('friendAdvancedOptions').hidden);assert(nodes.get('friendAdvancedOptions').disabled);
 mode='advanced';c.updateFriendRuleSettings();assert.equal(nodes.get('friendRuleSpecial').checked,true,'changing the top-level mode retains the checkboxes');
 const ordinary={1:8,2:7},rules=RoomRules.normalize({mode:'advanced',skills:true,special:true});
 c.SpecialGauge.sync({roomRules:rules,special:{max:30,gauge:{1:0,2:0}}});
 for(const side of [1,2]){const panel=document.getElementById('specialGauge'+side);assert(!panel.hidden);assert.equal(panel.querySelector('.specialGaugeValue').textContent,'0/30');assert.equal(panel.querySelector('[role="progressbar"]').getAttribute('aria-valuemax'),'30');}
 c.SpecialGauge.sync({roomRules:rules,special:{max:30,gauge:{1:30,2:99}}});assert.equal(document.getElementById('specialGauge1').querySelector('.specialGaugeFill').style.width,'100%');assert.equal(document.getElementById('specialGauge2').querySelector('.specialGaugeValue').textContent,'30/30');
 assert.deepEqual(ordinary,{1:8,2:7});c.SpecialGauge.sync({roomRules:{mode:'advanced'}});assert(document.getElementById('specialGauge1').hidden);assert(document.getElementById('specialGauge2').hidden);assert(!document.getElementById('battleScreen').classList.contains('specialMode'));
 c.SpecialGauge.sync({roomRules:rules});assert.equal(document.getElementById('specialGauge1').querySelector('.specialGaugeValue').textContent,'0/30');c.SpecialGauge.reset();assert(document.getElementById('specialGauge1').hidden);
 mode='custom';nodes.get('friendRuleHp').value='25';nodes.get('friendRuleInitialGauge').value='4';nodes.get('friendRuleMaxGauge').value='6';
 for(const skills of [false,true])for(const special of [false,true]){
  nodes.get('friendCustomSkills').checked=skills;nodes.get('friendCustomSpecial').checked=special;c.updateFriendRuleSettings();
  assert.equal(nodes.get('friendCustomRules').hidden,false);assert.equal(nodes.get('friendAdvancedOptions').hidden,true);
  await c.submitFriendRoom({preventDefault(){}});const saved=created.at(-1);assert.equal(saved.hp,25);assert.equal(saved.initialGauge,4);assert.equal(saved.maxGauge,6);assert.equal(RoomRules.hasSkills(saved),skills);assert.equal(RoomRules.hasSpecial(saved),special);vm.runInContext('protectedLobbyBusy=false',c);
 }
 const html=read('index.html');assert(/id="friendRuleSkills" type="checkbox" checked/.test(html));
 for(const id of ['friendCustomSkills','friendCustomSpecial'])assert(new RegExp('id="'+id+'" type="checkbox"').test(html));
 for(const file of ['room-rules.js','free-transport.js','lobby-client.js','advanced/rules.js','battle-history-client.js','protected-rooms.js','battle-history.js','player-profile.js'])assert(html.includes(file+'?v=custom-options-1'),file);
 console.log('PASS Advanced/Custom independent checkbox submissions, custom numeric settings, mode switching, accessible independent special gauge and cache versions');
})().catch(e=>{console.error(e);process.exitCode=1;});
