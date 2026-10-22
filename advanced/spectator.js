// Read-only presentation data. Never changes the persisted game or its receipts.
export function spectatorSkillMatch(id,raw,advanced,roomRules,players,closed,serverNow){
 if(!window.AdvancedRules.isAdvanced(roomRules))return null;
 const rules=window.AdvancedRules,skillWindow=rules.skillWindowForState(raw);
 const opensAt=skillWindow.confirmAt+rules.presentationMs(advanced,raw.turn);
 const after=rules.preview(raw,advanced?.selected,rules.forTurn(advanced,raw.turn),roomRules);
 const board=s=>({turn:s.turn,...Object.fromEntries(['specialSeal','specialRuin','specialMomentum'].map(k=>[k,{1:s[k+'1']||0,2:s[k+'2']||0}])),hp:{1:s.hp1,2:s.hp2},gauge:{1:s.gauge1,2:s.gauge2},enhanceTurns:{1:s.enhance1,2:s.enhance2},blockSeal:{1:s.seal1,2:s.seal2},ruinTurns:{1:s.ruin1||0,2:s.ruin2||0},lastAction:{1:s.last1?{data:{type:s.last1}}:null,2:s.last2?{data:{type:s.last2}}:null}});
 const m={id,roomRules,players,you:1,spectator:true,closed:!!closed,state:board(raw),advanced:advanced||{},skillWindow,opensAt,serverNow,skillResult:board(after)};
 return {...m,displayState:rules.presentationComplete(m,serverNow)?m.skillResult:m.state};
}
