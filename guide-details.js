/* Detail overlays and a separate, read-only copy of the actual battle view. */
(()=>{
 'use strict';
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const all=[...Object.entries(basicActions).map(([id,a])=>({...a,id,actionId:['charge','attack','block'].indexOf(id),category:'basics'})),...techniquePool.map((a,i)=>({...a,id:a.skill,actionId:BattleV4.normalId(i),category:'techniques'})),...techniquePool.map((a,i)=>({...SpecialRules.actionData(BattleV4.specialId(i),techniquePool),id:'s-'+a.skill,actionId:BattleV4.specialId(i),category:'specialTechniques'})),...AdvancedRules.SKILLS.map(a=>({...a,category:'skills'}))];
 const catalog=Array(41);for(const a of all)if(a.category!=='skills')catalog[a.actionId]=a;
 const modal=el('dialog','guideDetailDialog');modal.id='guideDetailDialog';modal.setAttribute('aria-labelledby','guideDetailTitle');
 const header=el('header','guideDetailHeader'),heading=el('div'),title=el('h2');title.id='guideDetailTitle';
 const label=el('span','guideDetailEyebrow','MOVE GUIDE'),description=el('p','guideDetailDescription');heading.append(label,title,description);
 const close=el('button','guideDetailClose','×');close.type='button';close.setAttribute('aria-label','技の詳細を閉じる');close.onclick=()=>modal.close();header.append(heading,close);
 const layout=el('div','guideDetailLayout'),copy=el('div','guideDetailCopy'),notes=el('div','guideDetailNotes');
 const strength=el('p'),weakness=el('p');
 for(const [name,p]of [['強み',strength],['弱み',weakness]]){const section=el('section');section.append(el('h3','',name),p);notes.append(section);}
 const ratings=el('div','guideDetailRatings');
 function rating(kind,name){const section=el('section','guideDetailRating');section.dataset.rating=kind;const score=el('strong','guideDetailScore'),words=el('div'),text=el('p');words.append(el('h3','',name),text);section.append(score,words);ratings.append(section);return {score,text};}
 const vote=rating('vote','人評価 · 投票平均'),owner=rating('owner','人評価 · 指定評価'),ai=rating('ai','AI評価 · 仮');
 const provisional=el('p','guideDetailFootnote','AI評価は仮です。ゲームAIのデータを用いた評価は準備中です。');
 const voteButton=el('button','guideDetailButton','投票する');voteButton.type='button';
 copy.append(notes,ratings,provisional,voteButton);
 const demo=el('section','guideDetailDemo');demo.setAttribute('aria-label','ゲーム実演');demo.append(el('h3','','ゲーム実演'),el('p','guideDetailDemoNote','CP対CP · 場面再生'));
 const tabs=el('div','guideDetailSceneTabs'),buttons=['リターン例','損をした例'].map((name,i)=>{const b=el('button','',name);b.type='button';b.onclick=()=>selectScene(i);tabs.append(b);return b;});
 const caption=el('p','guideDetailCaption'),stage=el('div','guideDetailStage');
 let frame=null;
 function createFrame(){const f=el('iframe');f.title='ゲーム本体の対戦実演';f.tabIndex=-1;f.setAttribute('sandbox','allow-scripts allow-same-origin');return f;}
 const replay=el('button','guideDetailButton','再生する');replay.type='button';replay.onclick=()=>{replay.disabled=true;send('play');};
 const result=el('p','guideDetailReplayStatus');result.setAttribute('role','status');result.setAttribute('aria-live','polite');
 demo.append(tabs,caption,stage,replay,result);layout.append(copy,demo);modal.append(header,layout);document.body.append(modal);
 let item=null,data=null,sceneIndex=0,ready=false,latest=null;
 const setScore=(target,score,text)=>{target.score.textContent=score==null?'—':String(score);target.score.setAttribute('aria-label',score==null?'未設定':score+'点 / 10点');target.text.textContent=text;};
 function paintVotes(){
  if(!item)return;
  if(item.category==='basics'){vote.score.parentElement.hidden=true;return;}
  vote.score.parentElement.hidden=false;
  if(!latest?.loaded?.[item.category])return setScore(vote,null,latest?.errors?.[item.category]?'投票を読み込めません。通信と公開ルールを確認してください。':'投票を読み込んでいます…');
  const summary=CommunityRatingCore.summarize(item.category,latest.ballots[item.category])[item.id];
  setScore(vote,summary.average==null?null:summary.average.toFixed(2),summary.count?summary.count+'人の投票による平均点です。投票の変更は、この点数にも反映されます。'+(!latest.connected?' 現在は最後に取得した評価です。':''):'まだ投票がありません。1〜10点の投票が集まると平均点を表示します。');
 }
 function send(command){if(!ready||!item)return;frame.contentWindow.postMessage({type:'guide-replay-command',command,item,catalog,scene:data.scenes[sceneIndex]},location.origin);}
 function selectScene(index){sceneIndex=index;buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));caption.textContent=data.scenes[index].caption;result.textContent='再生ボタンでこの場面を見られます。';replay.disabled=!ready;replay.textContent='再生する';send('prepare');}
 function source(){
  const board=document.getElementById('battleScreen').cloneNode(true);board.className='screen active';
  board.querySelectorAll('[onclick]').forEach(n=>n.removeAttribute('onclick'));
  board.querySelectorAll('script,audio,#battleHomeButton,#spectatorLoadouts,#advancedSkillPresentation,.advancedBattleControls,.specialSwitchDock,.specialGaugePanel').forEach(n=>n.remove());
  board.querySelector('#countdown').textContent='';board.querySelector('#resultMessage').textContent='';board.querySelector('#onlineTechniqueDescription').textContent='';
  const styles=[...document.querySelectorAll('style,link[rel="stylesheet"]')].map(n=>n.outerHTML).join('');
  const paths=['combat-v4.js','advanced/rules.js','advanced/special-rules.js','battle-action-art.js','battle-new-effects.js','battle-timeline.js','battle-effects.js','advanced/cutin.js','guide-replay-core.js'];
  const scripts=paths.map(path=>{const n=[...document.scripts].find(s=>new URL(s.src||location.href).pathname.endsWith('/'+path));return '<script src="'+(n?.src||new URL(path,location.href).href)+'"><'+'/script>';}).join('');
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><base href="'+new URL('.',location.href).href+'">'+styles+'<link rel="stylesheet" href="guide-replay.css?v=guide-details-20261026"></head><body>'+board.outerHTML+scripts+'<script src="guide-replay.js?v=guide-details-20261026"><'+'/script></body></html>';
 }
 function open(id){
  item=all.find(a=>a.id===id);if(!item)return;data=GuideDetailData.entry(id);title.textContent=item.name;description.textContent=item.description;
  strength.textContent=data.strength;weakness.textContent=data.weakness;setScore(owner,data.ownerScore,data.ownerText);setScore(ai,data.aiScore,data.aiText);paintVotes();
  ready=false;replay.disabled=true;voteButton.hidden=item.category==='basics';frame?.remove();frame=createFrame();stage.replaceChildren(frame);frame.srcdoc=source();modal.showModal();selectScene(0);resizeFrame();window.NoticeGuide.loadRatings();
 }
 function stop(){ready=false;frame?.remove();frame=null;replay.disabled=true;item=null;}
 modal.addEventListener('close',()=>{if(!modal.open)stop();});
 window.addEventListener('pagehide',()=>{if(modal.open)modal.close();});
 window.addEventListener('message',event=>{
  if(event.source!==frame?.contentWindow||event.origin!==location.origin||!modal.open)return;
  if(event.data?.type==='guide-replay-ready'){ready=true;replay.disabled=false;send('prepare');}
  if(event.data?.type==='guide-replay-status'){result.textContent=event.data.text;replay.disabled=!!event.data.busy;replay.textContent=event.data.busy?'再生中…':'もう一度再生';}
 });
 window.addEventListener('guide-ratings-change',e=>{latest=e.detail;paintVotes();});
 voteButton.onclick=()=>window.NoticeGuide.openVote(item.category);
 function resizeFrame(){if(!frame)return;const scale=stage.clientWidth/800;frame.style.transform='scale('+scale+')';stage.style.height=620*scale+'px';}
 const resize=new ResizeObserver(resizeFrame);resize.observe(stage);
 window.GuideDetails=Object.freeze({open,items:all});
})();
