/* Shared icon choices for ordinary slots and the online snake draft. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const dialog=node('dialog','techniquePickerDialog');dialog.id='techniquePickerDialog';dialog.setAttribute('aria-labelledby','techniquePickerTitle');
 const header=node('div','techniquePickerHeader'),title=node('h2','','技を選択');title.id='techniquePickerTitle';const close=node('button','','×');close.type='button';close.setAttribute('aria-label','技選択を閉じる');close.onclick=()=>dialog.close();header.append(title,close);
 const grid=node('div','techniqueIconGrid'),description=node('p','techniquePickerDescription','使いたい技をタップすると、そのスロットに設定されます。');dialog.append(header,description,grid);document.body.append(dialog);
 function choices(target,{disabled=[],selected=[],onPick,owners={}}){
  target.replaceChildren(...techniquePool.map((tech,index)=>{
   const b=node('button','botTechniqueChoice');b.type='button';b.dataset.technique=index;b.disabled=disabled.includes(index);b.setAttribute('aria-pressed',String(selected.includes(index)));b.setAttribute('aria-label',tech.name+'：'+tech.description+(owners[index]?' / '+owners[index]+'が選択済み':''));b.title=tech.description;
   const art=node('span','botTechniqueArt');art.setAttribute('aria-hidden','true');const image=node('img');image.src=BattleActionArt.imageSource(BattleActionArt.kindOf(tech));image.alt='';image.draggable=false;art.append(image);
   b.append(art,node('span','botTechniqueName',tech.name));if(owners[index])b.append(node('small','',owners[index]));b.onclick=()=>onPick(index);return b;
  }));
 }
 const selectionLocked=()=>rankedSending||rankedActive&&(rankedMatch?.ready?.[rankedMatch.you]||rankedMatch?.roomRules?.classic||rankedMatch?.roomRules?.draft)||gameMode==='online'&&onlineTechConfirmed;
 window.openTechniquePicker=slot=>{
  if(!Number.isInteger(slot)||slot<0||slot>2||selectionLocked()||dialog.open)return;
  const side=selectingPlayer;title.textContent='技'+(slot+1)+'を選択';const used=selectedTechniques[side].filter((_,i)=>i!==slot);
  choices(grid,{disabled:used,selected:[selectedTechniques[side][slot]],onPick:index=>{if(selectionLocked()||selectingPlayer!==side)return;selectedTechniques[side][slot]=index;updateTechniqueDisplay();dialog.close();}});dialog.showModal();
 };
 const draft=node('section');draft.id='draftSelection';draft.hidden=true;
 const heading=node('div','draftHeading'),turn=node('strong'),timer=node('span','draftTimer');timer.setAttribute('role','timer');heading.append(turn,timer);
 const orderNote=node('p','draftOrder');
 const picked=node('div','draftPicks'),draftGrid=node('div','techniqueIconGrid'),status=node('p','techniquePickerDescription');status.setAttribute('role','status');draft.append(heading,orderNote,picked,draftGrid,status);$('techScreen').insertBefore(draft,$('techScreen').querySelector('.techSelect'));
 let signature='',draftSending=false,autoConfirm='',lastMatch=null;
 function closeDraft(){draft.hidden=true;$('techScreen').classList.remove('draftSelectionActive','classicSelection');signature='';lastMatch=null;document.querySelectorAll('.techSlotButton').forEach(b=>{b.setAttribute('aria-disabled','false');b.tabIndex=0;});document.querySelectorAll('#techScreen .techArrow').forEach(b=>b.disabled=false);}
 function sync(m,now=m.serverNow){
  if(!m||m.phase!=='select'){closeDraft();return;}
  const rules=m.roomRules||{},classic=!!rules.classic,isDraft=!!rules.draft;lastMatch=m;
  $('techScreen').classList.toggle('classicSelection',classic);
  if(classic){selectedTechniques[m.you]=[0,1,2];updateTechniqueDisplay();if(!m.ready?.[m.you]&&!rankedSending&&autoConfirm!==m.id){autoConfirm=m.id;queueMicrotask(()=>{if(rankedMatch?.id===m.id)rankedConfirm().finally(()=>{if(!rankedMatch?.ready?.[m.you])autoConfirm='';});});}}
  document.querySelectorAll('.techSlotButton').forEach(b=>{const locked=classic||isDraft||!!m.ready?.[m.you]||rankedSending;b.setAttribute('aria-disabled',String(locked));b.tabIndex=locked?-1:0;});
  document.querySelectorAll('#techScreen .techArrow').forEach(b=>b.disabled=selectionLocked());
  if(!isDraft){draft.hidden=true;$('techScreen').classList.remove('draftSelectionActive');return;}
  const view=MatchModes.view(m.draft,now);draft.hidden=false;$('techScreen').classList.toggle('draftSelectionActive',!view.complete);
  orderNote.textContent='選択順：'+view.sequence.map(p=>p+'P').join(' → ');
  turn.textContent=view.complete?'ドラフト完了':view.player+'Pの選択 · '+(view.count+1)+' / 6'+(view.player===m.you?'（あなた）':'（相手）');timer.textContent=view.complete?'':view.remaining+'秒';
  picked.replaceChildren(...[1,2].map(p=>{const group=node('div');group.append(node('strong','',p+'P'+(p===m.you?' · あなた':'')),node('p','',view.loadouts[p].map(i=>techniquePool[i].name).join(' / ')||'未選択'));return group;}));
  const next=m.id+':'+view.count+':'+m.you+':'+rankedSending;if(next!==signature){signature=next;
   const owners=Object.fromEntries(view.picks.map((v,i)=>[v.tech,view.sequence[i]+'P']));
   choices(draftGrid,{disabled:view.taken,selected:[],owners,onPick:index=>pick(m,view,index)});
  }
  for(const b of draftGrid.querySelectorAll('button'))b.disabled=view.complete||draftSending||rankedSending||view.player!==m.you||view.taken.includes(Number(b.dataset.technique))||view.remaining===0;
  draftGrid.hidden=view.complete;status.textContent=view.complete?'自分の3技が確定しました。'+(RoomRules.hasSkills(rules)?'スキルを選択して「決定」を押してください。':'対戦の準備中です。'):view.remaining===0?'時間切れの技を自動で確定しています…':view.player===m.you?'アイコンをタップして選択。15秒以内に選ばないと、残りの技からランダムに確定します。':'相手が選択しています。取られた技は選べません。';
  if(view.complete){selectedTechniques={1:view.loadouts[1].slice(),2:view.loadouts[2].slice()};updateTechniqueDisplay();
   if(!RoomRules.hasSkills(rules)&&!m.ready?.[m.you]&&!rankedSending&&autoConfirm!==m.id){autoConfirm=m.id;queueMicrotask(()=>{if(rankedMatch?.id===m.id)rankedConfirm().finally(()=>{if(!rankedMatch?.ready?.[m.you])autoConfirm='';});});}
  }
 }
 async function pick(m,view,index){
  if(draftSending||rankedSending||rankedMatch?.id!==m.id)return;draftSending=true;status.textContent='技を確定しています…';
  try{const result=await rankedCommandRpc({op:'draftPick',matchId:m.id,step:view.count,tech:index});if(rankedActive&&rankedMatch?.id===m.id)rankedApply(result.match);}
  catch(error){status.textContent='確定できません：'+error.message;}
  finally{draftSending=false;signature='';if(lastMatch)sync(rankedMatch,rankedClockServer+performance.now()-rankedClockAt);}
 }
 window.TechniquePicker={locked:selectionLocked,close:()=>{if(dialog.open)dialog.close();},choices,sync,tick:(m,now)=>{if(m?.phase!=='select'||!m.roomRules?.draft)return;const v=MatchModes.view(m.draft,now),text=v.complete?'':v.remaining+'秒';if(timer.textContent!==text)timer.textContent=text;if(!v.complete&&v.remaining===0)for(const b of draftGrid.querySelectorAll('button'))b.disabled=true;},reset:closeDraft};
})();
