// Server-owned solo matches. Only public match snapshots cross the client boundary.
export function createSoloService(engine) {
 const {initialPosition,analyze,sample,play,terminal,activate,skillChoices,rulesAPIs,pack,version,ErrorType=Error}=engine;
 const {A,Modes}=rulesAPIs;
 const clone=x=>structuredClone(x),require=(ok,message,status=400)=>{if(!ok)throw new ErrorType(status,message);};
 const keys=(body,allowed)=>require(body&&typeof body==='object'&&!Array.isArray(body)&&Object.keys(body).every(k=>allowed.includes(k)),'送信形式が不正です');
 function rules(raw={mode:'standard'}) {
  keys(raw,['mode','hp','initialGauge','maxGauge','skills','special','classic','draft']);
  const standard={mode:'standard',hp:10,initialGauge:8,maxGauge:10};
  if(raw.mode==='standard')return standard;
  require(['advanced','custom'].includes(raw.mode),'対戦ルールを選択してください');
  for(const k of ['skills','special','classic','draft'])require(raw[k]===undefined||typeof raw[k]==='boolean','追加モードを確認してください');
  if(raw.mode==='advanced')return {...standard,mode:'advanced',skills:raw.skills!==false,special:raw.special===true};
  require(Number.isSafeInteger(raw.hp)&&raw.hp>=1&&raw.hp<=100,'HPは1〜100の整数にしてください');
  require(Number.isSafeInteger(raw.maxGauge)&&raw.maxGauge>=1&&raw.maxGauge<=100,'最大ゲージは1〜100の整数にしてください');
  require(Number.isSafeInteger(raw.initialGauge)&&raw.initialGauge>=0&&raw.initialGauge<=raw.maxGauge,'初期ゲージは0〜最大ゲージにしてください');
  require(!raw.classic||!raw.skills&&!raw.special&&!raw.draft,'クラシックは他の追加モードと同時に選べません');
  return {mode:'custom',hp:raw.hp,initialGauge:raw.initialGauge,maxGauge:raw.maxGauge,skills:raw.skills===true,special:raw.special===true,classic:raw.classic===true,draft:raw.draft===true};
 }
 const loadout=x=>{require(Array.isArray(x)&&x.length===3&&new Set(x).size===3&&x.every(i=>Number.isInteger(i)&&i>=0&&i<19),'異なる技を3つ選んでください');return x.slice();};
 const pick=items=>items[Math.floor(Math.random()*items.length)];
 const botSkill=(s)=>s.botSkill==='random'?pick(A.SKILLS).id:s.botSkill;
 function draftView(s,now){return Modes.view(s.draft,now);}
 function pickDraft(s,index,now){const v=draftView(s,now);s.draft.picks[v.count]={tech:index,at:now};s.revision++;}
 function draftTick(s,now){
  if(!s.rules.draft||s.position)return;
  for(let i=0;i<6;i++){
   const v=draftView(s,now);if(v.complete){s.loadouts={1:v.loadouts[1],2:v.loadouts[2]};return;}
   if(v.player!==2&&v.remaining>0)return;
   const available=Array.from({length:19},(_,j)=>j).filter(j=>!v.taken.includes(j));
   pickDraft(s,pick(available),now);
  }
 }
 function open(body,uid,now=Date.now()) {
  keys(body,['rules','difficulty','botLoadout','botTechniques','botSkill','name']);
  require(['easy','normal','hard'].includes(body.difficulty),'BOTの強さが不正です');
  const r=rules(body.rules),custom=body.botLoadout==='custom';
  require(['custom','random'].includes(body.botLoadout),'BOTの技の設定が不正です');
  require(body.botSkill===undefined||body.botSkill==='random'||A.byId[body.botSkill],'BOTのスキルが不正です');
  require(body.name===undefined||typeof body.name==='string'&&body.name.length<=40,'名前が不正です');
  const pool=Array.from({length:19},(_,i)=>i),random=[];
  while(random.length<3)random.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  const s={id:crypto.randomUUID(),uid,version:version+':solo-v1',difficulty:body.difficulty,rules:r,botSkill:body.botSkill||'random',createdAt:now,revision:1,name:body.name||'あなた',loadouts:{1:[0,1,2],2:r.classic?[0,1,2]:custom?loadout(body.botTechniques):random},selected:{},advanced:{selected:{},current:{},uses:{1:{},2:{}}},position:null,closed:false,selectDeadline:now+300000,ownAction:null};
  if(A.hasSkills(r)){s.selected[2]=botSkill(s);s.advanced.selected[2]=s.selected[2];}
  if(r.draft){s.draft={first:Math.random()<.5?1:2,startedAt:now,picks:{}};draftTick(s,now);}
  return s;
 }
 function commitAction(s) {
  const p=s.position;
  const result=s.difficulty==='easy'?null:analyze(p,pack,{depth:s.difficulty==='hard'?2:1});
  const actions=result?.actions2||engine.legal(p,2);
  require(actions.length,'CPUの有効な行動がありません',409);
  s.pending=result?sample(actions,result.q):pick(actions);
 }
 function receipt(s,side){
  const p=s.position,skill=A.byId[p.selected[side]],used=skill.limit-p.remaining[side]+1;
  const r={id:skill.id,turn:p.state.turn,used};s.advanced.current[side]=r;s.advanced.uses[side][used]=r;
 }
 function completeSkills(s){
  const p=s.position;if(p.phase!=='skills')return;
  const uses={1:s.humanSkill===true,2:s.cpuSkill===true};
  if(uses[2])receipt(s,2);
  s.position=activate(p,uses);
  s.skillResult=A.preview(s.position.state,s.position.selected,s.position.active,s.rules);
  const presentation=uses[1]||uses[2]?3100:0;
  s.opensAt=s.skillWindow.confirmAt+presentation;s.deadline=s.opensAt+10000;
  commitAction(s);s.revision++;
 }
 function beginTurn(s,startAt){
  const p=s.position;s.ownAction=null;s.pending=null;s.humanSkill=false;s.skillResult=null;
  const hasWindow=A.hasSkills(s.rules)&&[1,2].some(side=>p.remaining[side]>0);
  s.skillWindow={startAt,endAt:startAt+(hasWindow?3000:0),confirmAt:startAt+(hasWindow?3500:0)};
  s.opensAt=s.skillWindow.confirmAt;s.deadline=s.opensAt+10000;s.turnStartedAt=startAt;
  if(p.phase==='skills'){
   const result=s.difficulty==='easy'?null:analyze(p,pack,{depth:s.difficulty==='hard'?2:1});
   s.cpuSkill=result?sample(result.actions2,result.q):pick(skillChoices(p,2));
  }else commitAction(s);
 }
 function finish(s,winner,reason){s.closed=true;s.result={winner,reason,rated:false};s.revision++;}
 function resolve(s,action,now){
  const before=s.position,turn=before.state.turn,cpu=s.pending;
  const outcome=play(before,action,cpu);s.position=outcome.position;
  s.lastActionRequest={turn,action};s.ownAction=action;
  const countdownEndsAt=action===-1||cpu===-1?now:Math.max(now,Math.min(s.deadline,now+3000));
  s.reveal={turn,actions:{1:action,2:cpu},damage:{1:outcome.result.damage1,2:outcome.result.damage2},startedAt:now,countdownEndsAt,resources:{after:{hp:{1:s.position.state.hp1,2:s.position.state.hp2},gauge:{1:s.position.state.gauge1,2:s.position.state.gauge2},special:s.position.special?.gauge},outcome:outcome.result}};
  s.revision++;
  const end=terminal(s.position);
  if(end!==null)finish(s,end===0?0:end===1?1:2,'battle');
  else if(s.position.state.turn>300)finish(s,0,'turn-limit');
  else beginTurn(s,countdownEndsAt+4500);
 }
 function tick(s,now){
  if(s.closed)return;
  if(!s.position){draftTick(s,now);return;}
  if(s.position.phase==='skills'&&now>=s.skillWindow.confirmAt)completeSkills(s);
  if(s.position.phase==='actions'&&now>=s.opensAt&&(s.position.state.frozen1>0||now>=s.deadline)){
   const actions=engine.legal(s.position,1),automatic=s.position.state.frozen1>0?-1:actions.includes(0)?0:actions.includes(1)?1:actions[0];
   resolve(s,automatic,now);
  }
 }
 function publicState(raw,startedAt){
  const state={turn:raw.turn,startedAt};
  for(const [key,value]of Object.entries(raw)){
   const m=key.match(/^(.+)([12])$/);if(!m)continue;state[m[1]]??=[0,0,0];state[m[1]][Number(m[2])]=value;
  }
  return state;
 }
 function view(s,now=Date.now()){
  const m={id:s.id,kind:'solo',you:1,phase:s.position?'turn':'select',roomRules:clone(s.rules),rulesVersion:4,foresightShield:true,serverNow:now,revision:s.revision,closed:s.closed,players:{1:{name:s.name,uid:s.uid},2:{name:'CPU',uid:'solo-cpu',bot:true}},ready:{1:!!s.position,2:true},loadouts:clone(s.loadouts),advanced:clone(s.advanced),ownAction:s.ownAction,deadline:s.position?s.deadline:s.selectDeadline,graceDeadline:s.position?s.deadline+10000:s.selectDeadline+30000,opensAt:s.opensAt||0};
  if(s.draft)m.draft=clone(s.draft);
  if(s.position){m.state=publicState(s.position.state,s.turnStartedAt);m.special=clone(s.position.special);m.skillWindow=clone(s.skillWindow);if(s.skillResult)m.skillResult=publicState(s.skillResult,s.turnStartedAt);}
  if(s.reveal)m.reveal=clone(s.reveal);if(s.result)m.result=clone(s.result);
  return m;
 }
 function command(s,body,now=Date.now()){
  keys(body,['session','op','matchId','turn','action','loadout','advancedSkill','step','tech']);
  require(s&&s.version===version+':solo-v1'&&body.session===s.id&&(!body.matchId||body.matchId===s.id),'CPU戦を開始し直してください',409);
  require(['status','loadout','draftPick','advancedSkill','action','resign'].includes(body.op),'対応していない操作です');
  if(body.op==='action'&&s.lastActionRequest?.turn===body.turn){require(s.lastActionRequest.action===body.action,'確定した行動は変更できません',409);return view(s,now);}
  if(body.op==='loadout'&&s.position){require(JSON.stringify(body.loadout)===JSON.stringify(s.loadouts[1])&&(!A.hasSkills(s.rules)||body.advancedSkill===s.selected[1]),'確定した装備は変更できません',409);return view(s,now);}
  if(body.op==='advancedSkill'&&s.position?.state.turn===body.turn&&s.humanSkill)return view(s,now);
  tick(s,now);
  if(body.op==='action'&&s.lastActionRequest?.turn===body.turn)return view(s,now);
  if(body.op==='status'||s.closed)return view(s,now);
  if(body.op==='resign'){finish(s,2,'resigned');return view(s,now);}
  if(body.op==='draftPick'){
   require(!s.position&&s.rules.draft,'ドラフトの選択中ではありません',409);
   const v=draftView(s,now);
   if(body.step<v.count){require(s.draft.picks[body.step]?.tech===body.tech,'選択済みの技は変更できません',409);return view(s,now);}
   require(body.step===v.count&&v.player===1&&v.remaining>0,'技を選ぶ順番ではありません',409);
   require(Number.isInteger(body.tech)&&body.tech>=0&&body.tech<19&&!v.taken.includes(body.tech),'選択できない技です');
   pickDraft(s,body.tech,now);draftTick(s,now);
  }else if(body.op==='loadout'){
   require(!s.position,'対戦は開始済みです',409);const selected=loadout(body.loadout);
   if(s.rules.classic)require(selected.every((i,j)=>i===j),'クラシックの技は固定です');
   if(s.rules.draft)require(draftView(s,now).complete&&JSON.stringify(selected)===JSON.stringify(s.loadouts[1]),'ドラフトを完了してください');
   if(A.hasSkills(s.rules)){require(!!A.byId[body.advancedSkill],'スキルを選んでください');s.selected[1]=body.advancedSkill;s.advanced.selected[1]=body.advancedSkill;}
   s.loadouts[1]=selected;s.position=initialPosition({rules:s.rules,loadouts:s.loadouts,selected:s.selected,specialVersion:6});beginTurn(s,now+5600);s.revision++;
  }else if(body.op==='advancedSkill'){
   require(s.position?.phase==='skills'&&body.turn===s.position.state.turn&&now>=s.skillWindow.startAt&&now<s.skillWindow.endAt,'スキルを使える時間ではありません',409);
   require(skillChoices(s.position,1).includes(true),'スキルの残り回数がありません');s.humanSkill=true;receipt(s,1);s.revision++;
  }else if(body.op==='action'){
   require(s.position?.phase==='actions'&&body.turn===s.position.state.turn&&now>=s.opensAt&&now<s.deadline,'行動を選べる時間ではありません',409);
   require(Number.isInteger(body.action)&&engine.legal(s.position,1).includes(body.action),'使用できない行動です');resolve(s,body.action,now);
  }
  return view(s,now);
 }
 return {open,command,tick,view,normalizeRules:rules};
}


