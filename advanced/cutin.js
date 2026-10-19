// Visual-only Advanced skill reveal. HP/gauge remain owned by AdvancedRules.
(()=>{
 const art={boost:['battery-shape','bolt-shape'],heal:['cross-shape'],chain:['chain-shape chain-top','chain-shape chain-bottom'],cleanse:['cleanse-ring','bolt-shape'],invincible:['star-shape','star-spark'],stance:['sword-shape sword-left','sword-shape sword-right']};
 const colors={boost:'#56bcf2',heal:'#49d5a1',chain:'#e6a440',cleanse:'#aa86ef',invincible:'#ffe06b',stance:'#ff8b72'};
 const labels={boost:'ゲージ＋2',heal:'HP＋1',chain:'連続使用解除',cleanse:'ゲージ＋4・状態異常解除',invincible:'無敵',stance:'攻撃力＋1'};
 const effects={boost:'ゲージ＋2',heal:'HPを1回復',chain:'このターンの連続使用禁止を解除',cleanse:'ゲージ＋4・ルインとアンチガードを解除',invincible:'このターン、相手からのHPダメージを無効化',stance:'このターンの攻撃力＋1'};
 let root=null,key='',phase='',signature='',ownsEffect=false;
 const sounded=new Set();
 const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const playerName=(m,side)=>String(m.players?.[side]?.name||(side===m.you?'自分':'相手'));
 function ensure(){
  if(root)return;
  root=node('section');root.id='advancedSkillPresentation';root.hidden=true;root.setAttribute('role','status');root.setAttribute('aria-live','polite');root.setAttribute('aria-label','スキル公開');
  const dim=node('div','scene-dim'),streaks=node('div','motion-streaks'),layer=node('div','cutin-layer');
  const post=node('div','post-effect-stage');post.append(node('div','game-effect-layer'),node('div','extra-effect-layer'));root.append(dim,streaks,layer,post);document.getElementById('battleScreen').append(root);
 }
 function stopEffect(){if(ownsEffect){window.BattleEffects?.cancel();ownsEffect=false;}}
 function cancel(){stopEffect();if(root){root.hidden=true;root.querySelector('.game-effect-layer').replaceChildren();root.querySelector('.extra-effect-layer').replaceChildren();}key='';phase='';signature='';const audio=document.getElementById('seAdvancedCutin');if(audio){audio.pause();audio.currentTime=0;}}
 function reset(){cancel();sounded.clear();}
 function drawPanels(used,m,elapsed){
  const layer=root.querySelector('.cutin-layer');layer.classList.toggle('pair',used.length===2);layer.replaceChildren();
  for(const skill of used){
   const panel=node('section','comic-panel '+(skill.player===m.you?'panel-self':'panel-enemy'));panel.dataset.player=skill.player;panel.style.setProperty('--accent',colors[skill.id]);panel.classList.toggle('long-title',skill.name.length>=5);
   const frame=node('div','comic-frame'),paper=node('div','comic-paper'),inner=node('div','comic-inner'),drawing=node('div','panel-art'),copy=node('div','panel-copy');drawing.setAttribute('aria-hidden','true');
   for(const cls of art[skill.id]||[])drawing.append(node('i',cls));
   const owner=node('div','panel-owner'),name=node('span','panel-player-name',playerName(m,skill.player));name.title=name.textContent;owner.append(name,node('span','panel-owner-label','スキル発動'));
   copy.append(owner,node('h2',null,skill.name),node('div','panel-effect',effects[skill.id]));inner.append(node('div','speed-ink'),drawing,copy);paper.append(inner);panel.append(frame,paper);layer.append(panel);
  }
  layer.style.animationDelay=-elapsed+'ms';
 }
 function drawEffects(used){
  const extra=root.querySelector('.extra-effect-layer'),bounds=root.getBoundingClientRect();extra.replaceChildren();
  for(const skill of used){
   const area=document.getElementById('player'+skill.player+'Area');if(!area)continue;const r=area.getBoundingClientRect(),x=r.left+r.width/2-bounds.left,y=r.top+r.height/2-bounds.top;
   if(['chain','cleanse','invincible','stance'].includes(skill.id)){
    const mark=node('div','post-skill-mark');mark.style.left=x+'px';mark.style.top=y+'px';mark.style.setProperty('--accent',colors[skill.id]);
    const parts=skill.id==='chain'?['chain-shape chain-top','chain-shape chain-bottom']:skill.id==='cleanse'?['cleanse-ring']:skill.id==='stance'?art.stance:['star-shape'];
    for(const cls of parts)mark.append(node('i',cls));extra.append(mark);
   }
   const label=node('div','post-skill-label',labels[skill.id]);label.style.left=Math.max(110,Math.min(bounds.width-110,x))+'px';label.style.top=Math.max(22,r.top-bounds.top-12)+'px';label.style.setProperty('--accent',colors[skill.id]);extra.append(label);
  }
  const actions=[1,2].map(player=>{const id=used.find(s=>s.player===player)?.id;return id==='boost'||id==='cleanse'?{type:'charge'}:id==='heal'?{type:'heal',skill:'tech4'}:{type:''};});
  if(typeof playBattleSituationSE==='function')playBattleSituationSE(actions[0],actions[1],0,0);
  ownsEffect=!!window.BattleEffects?.play({layer:root.querySelector('.game-effect-layer'),actions,rawActions:actions,damage:[0,0],sealed:[false,false],onComplete(){ownsEffect=false;}});
 }
 function sync(m,now,{blocked=false}={}){
  if(!window.AdvancedRules.hasSkills(m?.roomRules)||!m.state||m.closed||blocked||!m.skillWindow){if(key)cancel();return;}
  const used=window.AdvancedSkills.usedForTurn(m),start=m.skillWindow.confirmAt??m.skillWindow.endAt,end=start+window.AdvancedRules.presentationMs(m.advanced,m.state.turn);
  // Wait for a server snapshot at/after the deadline: it includes last-moment uses.
  if(!used.length||now<start||now>=end||m.serverNow<start){if(key)cancel();return;}
  ensure();const nextKey=m.id+':'+m.state.turn,nextPhase=now<start+window.AdvancedRules.CUTIN_MS?'cutin':'effects',nextSignature=JSON.stringify([m.you,used.map(s=>[s.player,s.id,playerName(m,s.player)])]);
  if(key!==nextKey){cancel();key=nextKey;root.hidden=false;}
  const changed=phase!==nextPhase,updated=signature!==nextSignature;phase=nextPhase;signature=nextSignature;root.hidden=false;root.classList.toggle('effects-phase',phase==='effects');
  for(const selector of ['.scene-dim','.motion-streaks','.cutin-layer'])root.querySelector(selector).hidden=phase!=='cutin';root.querySelector('.post-effect-stage').hidden=phase!=='effects';
  if(phase==='cutin'){
   if(changed||updated)drawPanels(used,m,now-start);
   if(!sounded.has(key)){sounded.add(key);if(typeof playBattleSE==='function')playBattleSE('seAdvancedCutin');}
  }else if(changed||updated){stopEffect();drawEffects(used);}
 }
 window.AdvancedCutin={sync,cancel,reset};
})();


