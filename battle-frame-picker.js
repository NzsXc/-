/* The title screen owns the request epoch and saving state. */
function renderBattleFramePicker(data,saving,onSelect){
 const panel=document.getElementById('battleFramePanel');if(!panel)return;
 const node=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!=null)el.textContent=text;return el;};
 panel.replaceChildren(node('h2','titleCollectionHeading','バトルカードのフレーム'));
 if(!data){panel.append(node('p','battleFrameHint','ログインすると、解放条件と選択中のフレームを確認できます。'));return;}
 const grid=node('div','battleFrameGrid');
 for(const item of BattleFrameCatalog.items){
  const unlocked=BattleFrameCatalog.unlocked(item.id,data),selected=data.frame===item.id,button=node('button','battleFrameChoice');button.type='button';button.disabled=saving||!unlocked;
  button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',item.name+'：'+item.description+(unlocked?'、選択可能':'、未解放'));
  button.append(BattleFrames.preview(item.id),node('span','battleFrameCondition',item.description),node('span','battleFrameProgress',selected?'選択中':unlocked?'選択可能':BattleFrameCatalog.detail(item.id,data)));
  button.onclick=()=>onSelect(item.id);grid.append(button);
 }
 panel.append(grid);for(const warning of data.warnings||[])panel.append(node('p','battleFrameHint',warning));
}
