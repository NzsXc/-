(()=>{
// Generated from the supplied game's resolver. Do not edit rule logic here independently.
// Source SHA256: 6d6753c1bafd8af8417f3bfee046115210911e18fd60714c96befef914051818
const basicActions = {

  charge:{
    name:"チャージ",
    power:0,
    cost:0,
    type:"charge",
    description:
      "ゲージ+2"
  },

  attack:{
    name:"アタック",
    power:1,
    cost:1,
    type:"attack",
    pierce:false,
    description:
      "ゲージ1消費 / 1ダメージ"
  },

  block:{
    name:"ブロック",
    power:0,
    cost:0,
    type:"block",
    description:
      "ブロック状態になる"
  }

};


/* =========================
   技
========================= */

const techniquePool = [

  {
    name:"ブリーチ",
    cost:4,
    power:2,
    pierce:true,
    type:"attack",
    skill:"tech1",
    description:
      "ゲージ4消費 / 2ダメージ / ブロック無視"
  },

  {
    name:"カウンター",
    cost:2,
    power:0,
    pierce:false,
    type:"reflect",
    skill:"tech2",
    description:
      "ゲージ2消費 / 相手の攻撃を無効化し、威力に関係なく1ダメージだけ相手に返す"
  },

  {
    name:"パニッシュ",
    cost:5,
    power:2,
    pierce:false,
    type:"attack",
    skill:"tech3",
    description:
      "ゲージ5消費 / 2ダメージ / 相手がチャージ中なら追加2ダメージ"
  },

  {
    name:"ヒール",
    cost:2,
    power:0,
    pierce:false,
    type:"heal",
    skill:"tech4",
    description:
      "ゲージ2消費 / 自分のHPを1回復"
  },

  {name:"フォーサイト",cost:1,power:0,pierce:false,type:"block",skill:"tech5",description:"ゲージ1消費 / ブロック状態 / 相手がチャージならゲージ+3"},
  {name:"モーメンタム",cost:2,power:1,pierce:false,type:"attack",skill:"tech6",description:"ゲージ2消費 / 1ダメージ / 2連続使用ならさらに+1"},
  {name:"ランページ",cost:0,power:0,pierce:false,type:"special",skill:"tech7",description:"前のターンにチャージしていた場合のみ / ゲージ+8 / HP-2"},
  {name:"アンチガード",cost:0,power:0,pierce:false,type:"seal",skill:"tech8",description:"相手のブロック系技を封印 / 相手のゲージが7に達すると解除"},
  {name:"エンハンス",cost:2,power:0,pierce:false,type:"enhance",skill:"tech9",description:"ゲージ2消費 / 次の2ターン、攻撃力+1 / 再使用で残り2ターンに更新"},
  {name:"サイフォン",cost:3,power:0,pierce:false,type:"siphon",skill:"tech10",description:"ゲージ3消費 / 相手のゲージを最大2奪い、奪った分だけ自分に加える"}

];


function resolve(s,a1,a2){
 const hp=s.hp.slice(),gauge=s.gauge.slice(),blockSeal=s.seal.slice(),enhanceTurns=s.enhance.slice(),momentumBonus=s.momentum.slice();
   let damageTo1 = 0;
  let damageTo2 = 0;

  // アンチガードの条件は技選択時点の相手ゲージで判定する。
  // ヒール等のコスト消費後のゲージを使うと誤判定になる。
  const gaugeBeforeCost = {
    1:Number(gauge[1] || 0),
    2:Number(gauge[2] || 0)
  };

  // 先に技のコストを消費
  gauge[1] = Math.max(0, gauge[1] - Number(a1.cost || 0));
  gauge[2] = Math.max(0, gauge[2] - Number(a2.cost || 0));

  const attack1 = a1.type === "attack";
  const attack2 = a2.type === "attack";
  const reflect1 = a1.type === "reflect";
  const reflect2 = a2.type === "reflect";

  // 技8：アンチガードの封印判定は「技を選んだ時点の相手ゲージ」で決まる。
  // コスト消費後のゲージでは判定しない。
  // 重要：block1 / block2 を計算する“前”に封印状態を反映する。
  if(a1.skill === "tech8" && gaugeBeforeCost[2] < 7) blockSeal[2] = true;
  if(a2.skill === "tech8" && gaugeBeforeCost[1] < 7) blockSeal[1] = true;

  const block1 = a1.type === "block" && !blockSeal[1];
  const block2 = a2.type === "block" && !blockSeal[2];

  // チャージ
  if(a1.type === "charge") gauge[1] = Math.min(10, gauge[1] + 2);
  if(a2.type === "charge") gauge[2] = Math.min(10, gauge[2] + 2);

  // 技5：相手がチャージなら自分のゲージ+3
  if(a1.skill === "tech5" && a2.type === "charge") gauge[1] = Math.min(10, gauge[1] + 3);
  if(a2.skill === "tech5" && a1.type === "charge") gauge[2] = Math.min(10, gauge[2] + 3);

  // 技4：HP+1
  if(a1.skill === "tech4") hp[1] = Math.min(10, hp[1] + 1);
  if(a2.skill === "tech4") hp[2] = Math.min(10, hp[2] + 1);

  // 強化はこのターンの開始時点の残数で判定する。
  // モーメンタムを含む全攻撃技の実威力を先に求め、衝突時にも同じ値を使う。
  const power1 = attack1 ? (a1.skill === "tech6" ? (momentumBonus[1] ? 2 : 1) : Number(a1.power || 0)) + (enhanceTurns[1] > 0 ? 1 : 0) : 0;
  const power2 = attack2 ? (a2.skill === "tech6" ? (momentumBonus[2] ? 2 : 1) : Number(a2.power || 0)) + (enhanceTurns[2] > 0 ? 1 : 0) : 0;

  // カウンターは攻撃を無効化して固定1ダメージを返す。エンハンスの対象外。
  if(reflect1 && attack2) damageTo2 += 1;
  if(reflect2 && attack1) damageTo1 += 1;

  // 攻撃同士は強化を含む威力差で決める。
  if(attack1 && attack2){
    if(power1 > power2) damageTo2 += power1 - power2;
    else if(power2 > power1) damageTo1 += power2 - power1;
  }else{
    if(attack1 && !reflect2 && (!block2 || a1.pierce)) damageTo2 += power1;
    if(attack2 && !reflect1 && (!block1 || a2.pierce)) damageTo1 += power2;
  }

  // 技3：チャージ中の相手には追加2ダメージ。
  if(a1.skill === "tech3" && a2.type === "charge" && !block2 && !reflect2) damageTo2 += 2;
  if(a2.skill === "tech3" && a1.type === "charge" && !block1 && !reflect1) damageTo1 += 2;

  // 技7：前ターンチャージ後のみ使用可能。ゲージ+8、HP-2
  if(a1.skill === "tech7"){
    gauge[1] = Math.min(10, gauge[1] + 8);
  }
  if(a2.skill === "tech7"){
    gauge[2] = Math.min(10, gauge[2] + 8);
  }

  // サイフォン：双方の消費・ゲージ獲得後に、同じ時点の残量から奪う量を決める。
  // 同時使用でも処理順で結果が変わらず、相手が0ならゲージを生み出さない。
  const siphonGauge = {1:gauge[1],2:gauge[2]};
  const stolenBy1 = a1.skill === "tech10" ? Math.min(2,siphonGauge[2]) : 0;
  const stolenBy2 = a2.skill === "tech10" ? Math.min(2,siphonGauge[1]) : 0;
  gauge[1] = Math.min(10,Math.max(0,siphonGauge[1] + stolenBy1 - stolenBy2));
  gauge[2] = Math.min(10,Math.max(0,siphonGauge[2] + stolenBy2 - stolenBy1));

  // 既存の強化は毎ターン消費する。新規使用・再使用では次の2ターンへ更新する。
  enhanceTurns[1] = a1.skill === "tech9" ? 2 : Math.max(0,enhanceTurns[1] - 1);
  enhanceTurns[2] = a2.skill === "tech9" ? 2 : Math.max(0,enhanceTurns[2] - 1);

  // ランページの自傷ダメージも表示対象にする。
  if(a1.skill === "tech7") damageTo1 += 2;
  if(a2.skill === "tech7") damageTo2 += 2;

  // アンチガードの封印解除は「封印されている本人」のゲージだけを見る。
  // 1Pが2Pを封印 → 2P自身のゲージが7以上で解除。
  // 2Pが1Pを封印 → 1P自身のゲージが7以上で解除。
  if(blockSeal[2] && Number(gauge[2]) >= 7){
    blockSeal[2] = false;
  }
  if(blockSeal[1] && Number(gauge[1]) >= 7){
    blockSeal[1] = false;
  }


 hp[1]=Math.max(0,hp[1]-damageTo1);hp[2]=Math.max(0,hp[2]-damageTo2);
 return {hp,gauge,seal:blockSeal,enhance:enhanceTurns,
 momentum:[false,a1.skill==='tech6'?!s.momentum[1]:false,a2.skill==='tech6'?!s.momentum[2]:false],
 last:['',a1.type,a2.type],loadouts:s.loadouts,turn:s.turn+1};
}
const ACTIONS=[basicActions.charge,basicActions.attack,basicActions.block,...techniquePool];
const combinations=[];
for(let a=0;a<10;a++)for(let b=a+1;b<10;b++)for(let c=b+1;c<10;c++)combinations.push([a,b,c]);
function initial(a=[0,1,2],b=[0,1,2]){
 for(const x of [a,b])if(x.length!==3||new Set(x).size!==3||x.some(i=>!Number.isInteger(i)||i<0||i>9))throw Error('技は異なる3つを選んでください');
 return {hp:[0,10,10],gauge:[0,0,0],seal:[false,false,false],enhance:[0,0,0],momentum:[false,false,false],last:['','',''],loadouts:[null,a.slice(),b.slice()],turn:1};
}
function terminal(s){return s.hp[1]<=0?(s.hp[2]<=0?0:-1):s.hp[2]<=0?1:null;}
function legal(s,p){
 if(terminal(s)!==null)return [];
 return [0,1,2,...s.loadouts[p].map(i=>i+3)].filter(id=>{
  const a=ACTIONS[id],o=3-p;
  return a.cost<=s.gauge[p] && !(s.seal[p]&&(id===2||a.skill==='tech5'))
   && !(id===2&&s.last[p]==='block') && !(id===0&&s.gauge[p]>=10)
   && !(a.skill==='tech7'&&s.last[p]!=='charge') && !(a.skill==='tech8'&&s.gauge[o]>=7);
 });
}
function step(s,a,b){
 if(!legal(s,1).includes(a)||!legal(s,2).includes(b))throw Error('Illegal action');
 return resolve(s,ACTIONS[a],ACTIONS[b]);
}
function evaluate(s){
 const end=terminal(s);if(end!==null)return end;
 const side=p=>s.hp[p]+0.30*s.gauge[p]+0.20*s.enhance[p]+0.12*Number(s.momentum[p])-0.22*Number(s.seal[p]);
 return Math.tanh((side(1)-side(2))/5)*0.94;
}
// Simultaneous regret matching; average strategies and a duality gap for THIS matrix.
function matrixSolve(M,iterations=160){
 const m=M.length,n=M[0].length,r=Array(m).fill(0),c=Array(n).fill(0),ps=Array(m).fill(0),qs=Array(n).fill(0);
 const strategy=reg=>{const z=reg.reduce((s,x)=>s+Math.max(0,x),0);return reg.map(x=>z?Math.max(0,x)/z:1/reg.length);};
 for(let t=0;t<iterations;t++){
  const p=strategy(r),q=strategy(c),u=Array(m).fill(0),v=Array(n).fill(0);
  for(let i=0;i<m;i++)for(let j=0;j<n;j++){u[i]+=M[i][j]*q[j];v[j]+=M[i][j]*p[i];}
  let value=0;for(let i=0;i<m;i++)value+=p[i]*u[i];
  for(let i=0;i<m;i++){r[i]+=u[i]-value;ps[i]+=p[i];}
  for(let j=0;j<n;j++){c[j]+=value-v[j];qs[j]+=q[j];}
 }
 const p=ps.map(x=>x/iterations),q=qs.map(x=>x/iterations);
 const lo=Math.min(...Array.from({length:n},(_,j)=>M.reduce((z,row,i)=>z+p[i]*row[j],0)));
 const hi=Math.max(...M.map(row=>row.reduce((z,x,j)=>z+x*q[j],0)));
 return {p,q,value:(lo+hi)/2,lower:lo,upper:hi,gap:hi-lo};
}
function key(s){return [s.hp[1],s.hp[2],s.gauge[1],s.gauge[2],+s.seal[1],+s.seal[2],s.enhance[1],s.enhance[2],+s.momentum[1],+s.momentum[2],s.last[1],s.last[2]].join(',');}
function analyze(s,{depth=2,iterations=160,maxNodes=100000,model=null}={}){
 if(terminal(s)!==null)return {terminal:terminal(s)};
 let nodes=0,completed=null;const cache=new Map(),budget=Symbol('budget');
 function search(s,d){
  if(++nodes>maxNodes)throw budget;
  if(terminal(s)!==null||d===0)return {value:model?modelValue(s,model):evaluate(s)};
  const k=d+':'+key(s);if(cache.has(k))return cache.get(k);
  const a=legal(s,1),b=legal(s,2);
  const M=a.map(x=>b.map(y=>search(resolve(s,ACTIONS[x],ACTIONS[y]),d-1).value));
  const out={...matrixSolve(M,iterations),actions1:a,actions2:b,matrix:M};cache.set(k,out);return out;
 }
 for(let d=1;d<=depth;d++)try{completed={...search(s,d),depth:d};}catch(e){if(e!==budget)throw e;break;}
 if(!completed)throw Error('Search budget too small');
 return {...completed,nodes,requestedDepth:depth};
}
function rng(seed=1){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function sample(actions,prob,random=Math.random){let r=random();for(let i=0;i<actions.length;i++){r-=prob[i];if(r<0)return actions[i];}return actions.at(-1);}
// Antisymmetric value features: changing player seats negates every feature.
// Model weights are the durable knowledge shared by self-play and CPU search.
const MODEL_SCHEMA='psy-value-v1-75';
function features(s){
 const side=p=>{
  const h=s.hp[p]/10,g=s.gauge[p]/10;
  const v=[h,g,s.enhance[p]/2,+s.momentum[p],+s.seal[p],h*g,h*h,g*g,+(s.last[p]==='charge'),+(s.last[p]==='block'),h*(s.enhance[p]/2),g*(+s.seal[p]),+(s.hp[p]<=2),+(s.gauge[p]>=7),+(s.gauge[p]===0)];
  for(let i=0;i<10;i++){
   const owns=s.loadouts[p].includes(i),cost=techniquePool[i].cost;
   v.push(owns?1:0,owns?h:0,owns?g:0,owns?+(s.gauge[p]>=cost):0,owns?+(s.hp[p]<=3):0,owns?+(s.last[p]==='charge'):0);
  }return v;
 };
 const x=side(1),y=side(2);return x.map((v,i)=>v-y[i]);
}
function newModel(){const weights=Array(75).fill(0);weights.splice(0,5,2,.6,.08,.024,-.044);return {schema:MODEL_SCHEMA,weights,updates:0};}
function validModel(m){return m?.schema===MODEL_SCHEMA&&Array.isArray(m.weights)&&m.weights.length===75&&m.weights.every(x=>Number.isFinite(x)&&Math.abs(x)<=10)&&Number.isSafeInteger(m.updates)&&m.updates>=0;}
function modelValue(s,m){const t=terminal(s);if(t!==null)return t;const x=features(s);let v=0;for(let i=0;i<x.length;i++)v+=x[i]*m.weights[i];return .94*Math.tanh(v);}
function learn(m,s,target,rate=.03){
 if(terminal(s)!==null)return;
 const x=features(s);let z=0,norm=1;for(let i=0;i<x.length;i++){z+=x[i]*m.weights[i];norm+=x[i]*x[i];}
 const t=Math.tanh(z),error=Math.max(-1,Math.min(1,target))-.94*t,gradient=.94*(1-t*t);
 for(let i=0;i<x.length;i++)m.weights[i]=Math.max(-10,Math.min(10,m.weights[i]+rate*error*gradient*x[i]/Math.sqrt(norm)));
 m.updates++;return error;
}
const API={ACTIONS,techniques:techniquePool,combinations,initial,terminal,legal,step,resolve,evaluate,matrixSolve,key,analyze,rng,sample,features,newModel,validModel,modelValue,learn,MODEL_SCHEMA};
if(typeof module!=='undefined')module.exports=API;
else globalThis.BattleAI=API;

})();
