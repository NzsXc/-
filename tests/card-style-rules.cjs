/* Atomic 100-coin player-card backgrounds; existing wallets retain their schema. */
function addCardStyles(doc){
 const r=doc.rules,ids=['obsidian','abyss'],keys=['claimDay','claimFrom','colorUnlocked','glossUnlocked','color','gloss'],defaults={balance:'0',claimDay:'-1',claimFrom:"''",colorUnlocked:'false',glossUnlocked:'false',color:"'white'",gloss:'false'};
 const oldWallet=k=>`(data.child('${k}').exists()?data.child('${k}').val():${defaults[k]})`;
 const oldOwned=id=>`root.child('playerCardStyles').child($uid).child('owned/${id}')`;
 const nextStyles="newData.parent().parent().child('playerCardStyles').child($uid)";
 const purchase=(id,other)=>`${oldOwned(id)}.val()!==true&&${nextStyles}.child('owned/${id}').val()===true&&${nextStyles}.child('owned/${other}').val()===${oldOwned(other)}.val()&&newData.child('balance').val()===${oldWallet('balance')}-100&&${keys.map(k=>`newData.child('${k}').val()===${oldWallet(k)}`).join('&&')}`;
 const wallet=r.coinWallets.$uid;wallet['.validate']=`(${wallet['.validate']})||(newData.hasChildren(['balance','claimDay','claimFrom','colorUnlocked','glossUnlocked','color','gloss'])&&(${purchase(ids[0],ids[1])}||${purchase(ids[1],ids[0])}))`;
 const newRoot="newData.parent().parent().parent().parent()",oldW="root.child('coinWallets').child($uid)",newW=`${newRoot}.child('coinWallets').child($uid)`;
 const paid=(id,other)=>`${newW}.child('balance').val()===(${oldW}.child('balance').exists()?${oldW}.child('balance').val():0)-100&&newData.parent().child('${other}').val()===${oldOwned(other)}.val()&&${keys.map(k=>`${newW}.child('${k}').val()===(${oldW}.child('${k}').exists()?${oldW}.child('${k}').val():${defaults[k]})`).join('&&')}`;
 const A="auth!=null&&auth.token.firebase.sign_in_provider!=='anonymous'&&root.child('users').child(auth.uid).exists()";
 r.playerCardStyles={'.read':'auth!=null','$uid':{'.write':`${A}&&auth.uid===$uid&&newData.exists()`,'.validate':`newData.hasChildren(['selected'])&&${ids.map(id=>`(data.child('owned/${id}').val()!==true||newData.child('owned/${id}').val()===true)`).join('&&')}`,owned:{obsidian:{'.validate':`newData.val()===true&&(data.val()===true||${paid('obsidian','abyss')})`},abyss:{'.validate':`newData.val()===true&&(data.val()===true||${paid('abyss','obsidian')})`},'$other':{'.validate':false}},selected:{'.validate':"newData.isString()&&(newData.val()===''||((newData.val()==='obsidian'||newData.val()==='abyss')&&newData.parent().child('owned').child(newData.val()).val()===true))"},'$other':{'.validate':false}}};return doc;
}
module.exports={addCardStyles};
