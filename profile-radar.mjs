import {requestAI} from './remote-ai-client.mjs';
import {RADAR_METRICS,radarScores,measuredRadarValue} from './profile-radar-scores.mjs';
const METRICS=RADAR_METRICS.map(({key,label})=>[key,label]);
const NS='http://www.w3.org/2000/svg';
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
export function renderRadar(container,status){
 container.replaceChildren();const layout=node('div','profileRadarLayout'),svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 360 270');svg.setAttribute('role','img');svg.setAttribute('aria-label','プレイスタイルの5軸グラフ。項目別の基準60点、外周100点。未集計の項目は表示しません。');
 const point=(i,v)=>[180+Math.sin(i*2*Math.PI/5)*85*v/100,133-Math.cos(i*2*Math.PI/5)*85*v/100];
 const el=(tag,attrs,text)=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!=null)e.textContent=text;return e;};
 for(const r of [25,50,75,100])svg.append(el('polygon',{points:METRICS.map((_,i)=>point(i,r).join(',')).join(' '),fill:'none',stroke:'#385169','stroke-width':1}));
 METRICS.forEach(([key,label],i)=>{const edge=point(i,100),p=point(i,121);svg.append(el('line',{x1:180,y1:133,x2:edge[0],y2:edge[1],stroke:'#385169'}),el('text',{x:p[0],y:p[1]+4,'text-anchor':i===1||i===2?'start':i===3||i===4?'end':'middle',fill:'#c5dce9','font-size':12},label));});
 const scores=radarScores(status),values=METRICS.map(([key])=>scores[key]);
 svg.append(el('polygon',{points:METRICS.map((_,i)=>point(i,60).join(',')).join(' '),fill:'none',stroke:'#8db1bf','stroke-width':1,'stroke-dasharray':'4 4'}));
 if(values.every(v=>v!==null))svg.append(el('polygon',{points:values.map((v,i)=>point(i,v).join(',')).join(' '),fill:'#75d4ff','fill-opacity':.15,stroke:'#8de4ff','stroke-width':2}));
 values.forEach((v,i)=>{if(v===null)return;const p=point(i,v);svg.append(el('circle',{cx:p[0],cy:p[1],r:3.5,fill:'#a8efff'}));});
 const table=node('table','profileRadarTable'),head=node('thead'),heading=node('tr'),body=document.createElement('tbody');for(const label of ['項目','スコア','実測']){const th=node('th',null,label);th.scope='col';heading.append(th);}head.append(heading);table.append(head,body);
 for(const[key,label]of METRICS){const tr=node('tr'),th=node('th',null,label),td=node('td',null,Number.isFinite(scores[key])?scores[key].toFixed(1):'—'),measured=node('td','profileRadarMeasured',measuredRadarValue(status,key));th.scope='row';tr.append(th,td,measured);body.append(tr);}
 layout.append(svg,table);container.append(layout);
}
let cleanup=()=>{};
export function openProfileRadar(player){
 cleanup();const section=document.getElementById('playerCardAIStats'),screen=document.getElementById('playerCardScreen');if(!section)return;
 section.replaceChildren(node('h2',null,'プレイスタイル'));
 const graph=node('div'),message=node('p','profileRadarStatus','戦績を集計しています…');message.setAttribute('role','status');
 const references=node('details','profileRadarReferences');references.append(node('summary',null,'スコアの表示基準'),node('p','profileRadarNote',RADAR_METRICS.map(m=>m.label+'：'+m.reference+'で60点').join(' ／ ')));
 const retry=node('button','historyButton','再取得');retry.type='button';retry.hidden=true;section.append(graph,message,references,retry);
 renderRadar(graph,null);let stopped=false,timer,controller;
 cleanup=()=>{stopped=true;clearTimeout(timer);controller?.abort();observer.disconnect();};
 const observer=new MutationObserver(()=>{if(!screen.classList.contains('active'))cleanup();});observer.observe(screen,{attributes:true,attributeFilter:['class']});
 async function refresh(retryFailed=false){
  if(stopped)return;controller=new AbortController();retry.hidden=true;
  try{const data=await requestAI('profile/'+encodeURIComponent(player.uid),{signal:controller.signal,...(retryFailed?{method:'POST',body:{retry:true}}:{})});if(stopped)return;
   renderRadar(graph,data.status);const total=data.indexComplete?String(data.total):data.total+'件以上';
   message.textContent=(!data.indexComplete?`保存履歴を確認中 · ${data.processed}戦集計済み`:data.pending?`集計中：${data.processed} / ${total}戦（解析済み分を表示）`:`${data.status.matches}戦を集計 · ${data.status.raw.read.turns}ターンを評価`)+(data.failed?` · ${data.failed}戦を評価できませんでした`:'');
   if(data.pending)timer=setTimeout(refresh,2500);else retry.hidden=false;
  }catch(error){if(stopped)return;message.textContent=error.message;retry.hidden=false;}
 }
 retry.onclick=()=>refresh(true);refresh();return cleanup;
}
