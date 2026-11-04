import {requestAI} from './remote-ai-client.mjs';
const root=document.getElementById('spectatorEvaluation'),number=root.querySelector('strong'),label=root.querySelector('.evaluationLabel'),caption=root.querySelector('.evaluationCaption'),fill=root.querySelector('.evaluationFill');
let generation=0,controller=null,timer=null,current=null;
const screen=document.getElementById('battleScreen');
function stop(){generation++;controller?.abort();clearTimeout(timer);current=null;root.hidden=true;number.textContent='—';fill.style.width='50%';root.setAttribute('aria-label','局面評価');}
new MutationObserver(()=>{if(!screen.classList.contains('spectatorMode')||!screen.classList.contains('active'))stop();}).observe(screen,{attributes:true,attributeFilter:['class']});
function sameView(key){return current===key&&screen.classList.contains('active')&&screen.classList.contains('spectatorMode')&&!document.hidden;}
async function update(state){
 if(!state?.matchId||!screen.classList.contains('spectatorMode'))return;
 const key=state.matchId+':'+state.turn;if(current===key)return;
 generation++;const epoch=generation;controller?.abort();clearTimeout(timer);current=key;
 root.hidden=false;number.textContent='—';label.textContent='局面評価';caption.textContent='評価を取得中…';fill.style.width='50%';root.setAttribute('aria-label','局面評価を取得中');
 async function run(){
  if(epoch!==generation||!sameView(key))return;controller=new AbortController();
  try{const data=await requestAI('live/'+encodeURIComponent(state.matchId),{signal:controller.signal});if(epoch!==generation||!sameView(key))return;
   if(data.stateTurn!==state.turn){caption.textContent='局面の更新を待っています';timer=setTimeout(run,1800);return;}
   const v=data.value;if(!Number.isFinite(v)||v<-1000||v>1000)throw Error('評価値を取得できません');
   number.textContent=v>0?'＋'+v:v<0?'−'+Math.abs(v):'0';label.textContent=v>0?'1P側有利':v<0?'2P側有利':'互角';
   caption.textContent=`${data.turn}T終了時${data.complete?'':' · 浅い探索'}${data.coverage==='special-model-with-skill-correction'?' · 補正評価':''}`;fill.style.width=(v+1000)/20+'%';
   root.setAttribute('aria-label',`局面評価 ${v}。${label.textContent}。勝率ではありません。`);
  }catch(error){if(epoch!==generation||!sameView(key))return;caption.textContent=error.message;timer=setTimeout(run,error.status===409?1500:10000);}
 }
 run();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){controller?.abort();clearTimeout(timer);}else if(current){const [matchId,turn]=current.split(':');current=null;update({matchId,turn:Number(turn)});}});
window.SpectatorEvaluation={update,stop};
