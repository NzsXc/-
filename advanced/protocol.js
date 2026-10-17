// Persistence for Advanced skills only; Standard/Custom never call these operations.
export function createAdvancedProtocol({read,writeUpdate,now,serverTimestamp}){
 let supported=null;
 function supports(){
  if(!supported)supported=read('freeGames/_protocol/advanced/skillCutin').then(()=>true).catch(error=>{
   if(/permission.?denied/i.test(String(error.code||'')+' '+error.message))return false;
   supported=null;throw error;
  });return supported;
 }
 async function snapshot(id,g,me){
  const path='freeGames/'+id+'/advanced';
  if(g.state||g.ready[1]&&g.ready[2])return await read(path)||{};
  const selected=await read(path+'/selected/'+me);return {selected:selected?{[me]:selected}:{}};
 }
 function loadoutPatch(g,me,id){
  if(!window.AdvancedRules.byId[id])throw Error('スキルを1つ選択してください。');
  const saved=g?.selected?.[me];if(saved&&saved!==id)throw Error('確定したスキルは変更できません。');
  return saved?{}:{['advanced/selected/'+me]:id};
 }
 async function activate(id,me,turn,opensAt){
  const path='freeGames/'+id,a=await read(path+'/advanced'),s=await read(path+'/state');
  const skill=a?.selected?.[me],definition=window.AdvancedRules.byId[skill];
  if(!s||s.turn!==turn)throw Error('ターンが切り替わりました。');
  if(a?.current?.[me]?.turn===turn)return;
  if(now()<opensAt-window.AdvancedRules.WINDOW_MS||now()>=opensAt)throw Error('スキルは開始時の3秒間だけ使用できます。');
  const count=Number(a?.current?.[me]?.used||0);
  if(!definition||count>=definition.limit)throw Error('スキルの残り回数がありません。');
  const receipt={id:skill,turn,at:serverTimestamp(),used:count+1},current={...receipt};
  try{await writeUpdate(path,{['advanced/uses/'+me+'/'+(count+1)]:receipt,['advanced/current/'+me]:current});}
  catch(error){const accepted=await read(path+'/advanced/current/'+me);if(accepted?.id!==skill||accepted.turn!==turn)throw error;}
 }
 return {supports,snapshot,loadoutPatch,activate};
}
