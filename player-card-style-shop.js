/* Bought backgrounds are separate from earned battle frames and title slots. */
window.PlayerCardStyleCatalog=Object.freeze([
 {id:'',name:'標準',price:0},
 {id:'obsidian',name:'黒曜プラチナ',price:100},
 {id:'abyss',name:'深海プリズム',price:100}
]);
function renderPlayerCardStyleShop(data,wallet,saving,onBuy,onSelect){
 const panel=document.getElementById('playerCardStyleShop');if(!panel)return;
 const node=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!=null)n.textContent=text;return n;};
 panel.replaceChildren(node('h2','titleCollectionHeading','プレイヤーカードの背景'),node('p','playerCardStyleHint','購入した背景はランキングから開くプレイヤーカードに表示します。購入時に装備し、選択はすぐに保存されます。'));
 if(!window.GameMotion){panel.append(node('p','playerCardStyleHint','背景の表示を読み込めませんでした。再読み込みしてください。'));return;}
 if(!data){panel.append(node('p','playerCardStyleHint','ログインすると背景を購入・選択できます。'));return;}
 if(data.error){panel.append(node('p','playerCardStyleHint','背景情報を取得できません。しばらくしてから称号画面を開き直してください。'));return;}
 const grid=node('div','playerCardStyleGrid');
 for(const item of PlayerCardStyleCatalog){
  const owned=item.id===''||data.owned?.[item.id]===true,selected=data.selected===item.id,choice=node('article','playerCardStyleChoice');
  choice.append(window.GameMotion.preview(item.id));
  const button=node('button','titles-button',selected?'選択中':owned?'この背景を選択':item.price+'コインで購入して装備');
  button.type='button';button.disabled=saving||selected||!owned&&(!wallet||wallet.balance<item.price);button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',item.name+'：'+button.textContent);
  button.onclick=()=>owned?onSelect(item.id):onBuy(item.id);
  choice.append(node('div','playerCardStylePrice',owned?(item.id===''?'無料':'購入済み'):item.price+'コイン'),button);grid.append(choice);
 }
 panel.append(grid);window.GameMotion.sync();
}
