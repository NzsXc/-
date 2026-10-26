import {calculate as calculateV1,stateFields} from './history-calculator-v1.js';
import {calculate as calculateV2} from './free-calculator.js?v=account-update-20261024';

export const HISTORY_LIMIT=10;
export const HISTORY_REASONS={battle:'決着',resigned:'降参','reconnect-timeout':'切断・復帰猶予切れ','selection-timeout':'技選択の時間切れ','idle-forfeit':'連続無入力','turn-limit':'ターン上限'};
export const ACTION_NAMES=['チャージ','アタック','ブロック','ブリーチ','カウンター','パニッシュ','ヒール','フォーサイト','モーメンタム','ランページ','アンチガード','エンハンス','サイフォン','ルイン','ミラー'];
ACTION_NAMES.push(...ACTION_NAMES.slice(3).map(name=>'S'+name));
ACTION_NAMES.push('フォーカス','コンバート','ブラスト','フリーズ','リファンド','ヴェノム','ドレイン','Sフォーカス','Sコンバート','Sブラスト','Sフリーズ','Sリファンド','Sヴェノム','Sドレイン');ACTION_NAMES[-1]='凍結';
export const historySide=(h,uid)=>h?.players?.[1]?.uid===uid?1:h?.players?.[2]?.uid===uid?2:0;
export const slots=value=>[0,1,2].map(i=>value?.[i]??'');
export function initialReplayState(roomRules={}){
 return Object.fromEntries(stateFields.map(k=>[k,k==='turn'?1:k==='startedAt'?0:k.startsWith('hp')?(roomRules.hp??10):k.startsWith('gauge')?(roomRules.initialGauge??8):k.startsWith('seal')||k.startsWith('momentum')?false:k.startsWith('last')?'':0]));
}
export function finishReason(g){
 if(g.resigned)return 'resigned';
 const s=g.state;
 if(!s)return 'selection-timeout';
 if(s.misses1>=2||s.misses2>=2)return 'idle-forfeit';
 if(s.turn>300)return 'turn-limit';
 return s.hp1<=0||s.hp2<=0?'battle':'reconnect-timeout';
}
export function buildHistory(id,g,accounts){
 if(!g?.settled||!g.players?.[1]||!g.players?.[2])throw Error('未確定の対戦は保存できません');
 const turnCount=g.state?g.state.turn-1:0;
 if(!Number.isInteger(turnCount)||turnCount<0||turnCount>300)throw Error('ターン数が不正です');
 const h={version:1,createdAt:g.createdAt,endedAt:g.settled.at,kind:g.kind||'random',room:g.room||'',turnCount,reason:finishReason(g),players:{},settled:{...g.settled}};
 if([2,3,4].includes(g.rulesVersion))h.rulesVersion=g.rulesVersion;
 if(g.foresightShield===true)h.foresightShield=true;
 if(g.roomRules)h.roomRules={...g.roomRules};
 if(window.AdvancedRules.isAdvanced(g.roomRules)&&g.roomRules.special===true&&g.special)h.special=JSON.parse(JSON.stringify(g.special));
 if(window.AdvancedRules.isAdvanced(g.roomRules)&&g.advanced)h.advanced=JSON.parse(JSON.stringify(g.advanced));
 for(const p of [1,2]){
  const snapshot=g.profiles?.[p],account=accounts?.[p];
  const player={uid:g.players[p],name:snapshot?.name||account?.name||'プレイヤー',rating:g.settled['before'+p],snapshot:!!snapshot,titles:Object.fromEntries([0,1,2].map(i=>[i,snapshot?.titles?.[i]||'']))};
  if(g.loadouts?.[p])player.loadout=Object.fromEntries([0,1,2].map(i=>[i,g.loadouts[p][i]]));
  h.players[p]=player;
 }
 if(g.state)h.finalState={...g.state};
 if(turnCount){
  h.moves={};
  for(let turn=1;turn<=turnCount;turn++){
   const moves=g.moves?.[turn];
   if(![1,2].every(p=>Number.isInteger(moves?.[p])&&moves[p]>=(h.rulesVersion===4?-1:0)&&moves[p]<=(h.rulesVersion===4?40:h.rulesVersion===3?26:14)))throw Error('T'+turn+'の確定行動がありません。ルームは削除しません');
   h.moves[turn]={turn,1:moves[1],2:moves[2]};
  }
 }
 return h;
}
export function replayHistory(h){
 if(h?.version!==1)throw Error('この対戦のバトルデータには対応していません');
 if(h.rulesVersion!=null&&![2,3,4].includes(h.rulesVersion))throw Error('この戦闘ルールの履歴には対応していません');
 const current=(...args)=>calculateV2(args[0],args[1],args[2],{...args[3],specialVersion:h.special?.version||0},args[4]||{},h.foresightShield===true);
 const calculate=h.rulesVersion>=2?current:calculateV1;
 let state={...(h.special?.version>=4?window.BattleV4.extraSpecialState():{}),...(h.rulesVersion>=4?window.BattleV4.extraState():{}),...initialReplayState(h.roomRules),...(h.rulesVersion>=3?window.SpecialRules.extraState():{})},special=[1,2,3,4,5].includes(h.special?.version)?window.SpecialRules.initial(h.special.version):null;const turns=[];
 for(let turn=1;turn<=h.turnCount;turn++){
  const moves=h.moves?.[turn];
  if(![1,2].every(p=>Number.isInteger(moves?.[p])&&moves[p]>=(h.rulesVersion===4?-1:0)&&moves[p]<=(h.rulesVersion===4?40:h.rulesVersion===3?26:14)))throw Error('バトルデータが不足しています');
  const result=window.AdvancedRules.isAdvanced(h.roomRules)?window.AdvancedRules.resolve(state,moves,h.advanced?.selected,window.AdvancedRules.forTurn(h.advanced,turn),current,h.roomRules):h.rulesVersion>=2?calculate(state,moves,h.rulesVersion,h.roomRules):calculate(state,moves);
  if(special)window.SpecialRules.adjustCosts(special,result);
  const beforeSpecial=special;special=special?window.SpecialRules.advance(special,result):null;
  turns.push({...(special?{special:{before:beforeSpecial.gauge,after:special.gauge}}:{}),turn,actions:{1:moves[1],2:moves[2]},before:{hp:{1:state.hp1,2:state.hp2},gauge:{1:state.gauge1,2:state.gauge2}},after:{hp:{1:result.hp1,2:result.hp2},gauge:{1:result.gauge1,2:result.gauge2}},damage:{1:result.damage1,2:result.damage2}});
  state={...result,startedAt:0};
 }
 if(h.finalState&&[...stateFields,...(h.rulesVersion>=3?window.SpecialRules.fields:[]),...(h.rulesVersion>=4?window.BattleV4.fields:[]),...(h.special?.version>=4?window.BattleV4.specialFields:[])].some(k=>k!=='startedAt'&&state[k]!==h.finalState[k]))throw Error('保存済みの最終状態と一致しないため、バトルデータを表示できません');
 if(special&&[1,2].some(p=>special.gauge[p]!==h.special.gauge[p]))throw Error('保存済みのスペシャルゲージと一致しません');
 return turns;
}
export function historyMatch(h,uid,serverNow){
 const you=historySide(h,uid);if(!you)throw Error('参加者ではありません');
 const rawState=h.finalState,s=rawState&&window.AdvancedRules.isAdvanced(h.roomRules)?window.AdvancedRules.preview(rawState,h.advanced?.selected,window.AdvancedRules.forTurn(h.advanced,rawState.turn),h.roomRules):rawState,players={},loadouts={},ready={};
 for(const p of [1,2]){players[p]={name:h.players[p].name,rating:h.players[p].rating,bot:false,titles:slots(h.players[p].titles)};if(h.players[p].loadout){loadouts[p]=slots(h.players[p].loadout);ready[p]=true;}}
 const state=s?{turn:s.turn,...Object.fromEntries(['hp','gauge','seal','enhance','momentum','ruin','last',...(s.specialSeal1!=null?['specialSeal','specialRuin','specialMomentum']:[]),...(s.frozen1!=null?['frozen','poison']:[]),...(s.weaken1!=null?['weaken']:[])].map(k=>[k,[null,s[k+'1'],s[k+'2']]]))}:null;
 let reveal=null;
 try{const turns=replayHistory(h),last=turns.at(-1);if(last)reveal={turn:last.turn,startedAt:s.startedAt,actions:last.actions,damage:last.damage};}catch(error){/* Historical results remain readable even when a legacy replay differs. */}
 return {id:h.id,foresightShield:h.foresightShield===true,rulesVersion:h.rulesVersion,kind:h.kind,roomId:h.room||null,roomRules:h.roomRules||null,you,...(h.roomRules?.special===true?{special:h.special||{max:30,gauge:{1:0,2:0}}}:{}),...(window.AdvancedRules.isAdvanced(h.roomRules)?{advanced:h.advanced||{}}:{}),players,loadouts,ready,state,closed:true,phase:'finished',revision:serverNow,serverNow,opensAt:s?.startedAt||0,deadline:serverNow,graceDeadline:serverNow,ownAction:null,reveal,result:{winner:h.settled.winner,rated:h.kind!=='friend',reason:h.reason},rating:{before:h.settled['before'+you],after:h.settled['after'+you],delta:h.settled['delta'+you]}};
}



