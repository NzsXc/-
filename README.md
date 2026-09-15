<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>心理バトル</title>

<style>

*{
  box-sizing:border-box;
  user-select:none;
}

body{
  margin:0;
  min-height:100vh;
  background:#111;
  color:white;
  font-family:Arial,"Noto Sans JP",sans-serif;
  overflow:hidden;
}

.screen{
  display:none;
  width:100%;
  min-height:100vh;
  justify-content:center;
  align-items:center;
  flex-direction:column;
}

.screen.active{
  display:flex;
}


/* =========================
   起動画面
========================= */

#startScreen{
  background:#111;
  cursor:pointer;
}

.startTitle{
  font-size:42px;
  font-weight:900;
  letter-spacing:4px;
}

.startSub{
  margin-top:20px;
  opacity:.6;
  font-size:16px;
}


/* =========================
   モード選択
========================= */

#modeScreen{
  gap:25px;
}

.screenTitle{
  font-size:32px;
  margin-bottom:20px;
}

.modeButton,
.confirmButton{
  width:280px;
  padding:18px;
  border:2px solid #555;
  border-radius:14px;
  background:#222;
  color:white;
  font-size:22px;
  font-weight:bold;
  cursor:pointer;
}

.modeButton:hover,
.confirmButton:hover{
  background:#333;
}


/* =========================
   技選択
========================= */

.techSelect{
  display:flex;
  flex-direction:column;
  gap:18px;
  margin-bottom:15px;
}

.techRow{
  display:flex;
  align-items:center;
  gap:15px;
}

.techArrow{
  width:45px;
  height:45px;
  border:1px solid #555;
  border-radius:10px;
  background:#222;
  color:white;
  font-size:25px;
  cursor:pointer;
}

.techIcon{
  width:100px;
  height:70px;
  border:2px solid #666;
  border-radius:12px;
  background:#222;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:bold;
}

#techDescription{
  width:90%;
  max-width:600px;
  min-height:100px;
  margin:5px auto 20px;
  padding:12px 16px;
  border:1px solid #555;
  border-radius:12px;
  background:#1b1b1b;
  color:#ddd;
  font-size:15px;
  line-height:1.7;
  text-align:left;
}


/* =========================
   バトル画面
========================= */

#battleScreen{
  position:relative;
  display:block;
  min-height:100vh;
  width:100%;
  padding:0;
  overflow:hidden;
}

.playerArea{
  position:absolute;
  width:270px;
  border:1px solid #444;
  border-radius:12px;
  padding:8px;
  background:#181818;
  z-index:2;
}

#player1Area{
  bottom:18px;
  left:18px;
}

#player2Area{
  top:18px;
  right:18px;
}

.playerHeader{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:8px;
}

.playerName{
  font-size:20px;
  font-weight:bold;
}

.hpText,
.gaugeText{
  font-size:16px;
}

.hpBar{
  width:100%;
  height:14px;
  background:#333;
  border-radius:10px;
  overflow:hidden;
  margin-bottom:8px;
}

.hpFill{
  height:100%;
  width:100%;
  background:#e33;
  transition:.2s;
}

.gaugeBar{
  width:100%;
  height:10px;
  background:#333;
  border-radius:10px;
  overflow:hidden;
  margin-bottom:12px;
}

.gaugeFill{
  height:100%;
  width:0%;
  background:#4aa3ff;
  transition:.2s;
}

.actionList{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:5px;
}

.action{
  min-height:42px;
  border:1px solid #666;
  border-radius:10px;
  background:#292929;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction:column;
  transition:.15s;
  cursor:pointer;
}

.actionKey{
  font-size:10px;
  opacity:.6;
}

.actionName{
  font-size:11px;
  font-weight:bold;
  margin-top:4px;
}

.playerArea.locked .action{
  filter:brightness(.35);
}

.action.disabled{
  opacity:.3;
}


/* =========================
   中央
========================= */

#battleCenter{
  position:absolute;
  inset:0;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  z-index:3;
  pointer-events:none;
}

#countdown{
  font-size:45px;
  font-weight:900;
}

#resultMessage{
  font-size:20px;
  min-height:28px;
  text-align:center;
}


/* =========================
   戦闘エフェクト
========================= */

#battleEffectLayer{
  position:absolute;
  inset:0;
  z-index:4;
  pointer-events:none;
  overflow:hidden;
}

.battleProjectile{
  position:absolute;
  width:22px;
  height:22px;
  border-radius:50%;
  transform:translate(-50%,-50%);
  box-shadow:
    0 0 10px 4px currentColor,
    0 0 24px 8px currentColor;
}

.battleProjectile.p1{
  color:#ff4d4d;
  background:#fff;
}

.battleProjectile.p2{
  color:#4da6ff;
  background:#fff;
}


/* =========================
   行動名
========================= */

.battleActionLabel{
  position:absolute;
  z-index:6;

  font-size:42px;
  font-weight:900;

  padding:10px 20px;

  border-radius:12px;

  opacity:0;

  animation:actionLabelIn .8s ease-out forwards;

  text-shadow:
    0 0 10px currentColor,
    0 0 22px currentColor,
    0 0 40px currentColor;

  white-space:nowrap;
}


/* 1P：左下から中央寄り */

.battleActionLabel.p1{
  left:30%;
  bottom:30%;
  transform:translateX(-50%);
  color:#ff6b6b;
}

.battleActionLabel.p2{
  left:46%;
  top:30%;
  transform:translateX(-50%);
  color:#69aaff;
}
@keyframes actionLabelIn{
  0%{
    opacity:0;
    transform:scale(.75);
  }

  25%{
    opacity:1;
    transform:scale(1.08);
  }

  100%{
    opacity:1;
    transform:scale(1);
  }
}


/* =========================
   シールド
========================= */

.battleShield{
  position:absolute;
  width:92px;
  height:120px;
  z-index:5;
  transform:translate(-50%,-50%);
  border:5px solid currentColor;
  border-radius:
    50% 50% 45% 45% /
    18% 18% 72% 72%;

  opacity:0;

  box-shadow:
    0 0 12px currentColor,
    0 0 30px currentColor,
    inset 0 0 18px currentColor;

  background:
    radial-gradient(
      circle,
      transparent 35%,
      rgba(255,255,255,.08) 70%,
      transparent 72%
    );

  animation:shieldAppear .8s ease-out forwards;
}

.battleShield.p1{
  left:15%;
  top:75%;
  color:#69aaff;
}

.battleShield.p2{
  right:15%;
  top:25%;
  color:#69aaff;
}

@keyframes shieldAppear{

  0%{
    opacity:0;
    transform:translate(-50%,-50%) scale(.45);
  }

  25%{
    opacity:1;
    transform:translate(-50%,-50%) scale(1.12);
  }

  100%{
    opacity:.9;
    transform:translate(-50%,-50%) scale(1);
  }

}


/* =========================
   ヒット表示
========================= */

.battleImpact{
  position:absolute;
  left:50%;
  top:50%;
  transform:translate(-50%,-50%) scale(.2);
  font-size:38px;
  font-weight:900;
  opacity:0;

  text-shadow:
    0 0 12px currentColor,
    0 0 28px currentColor;

  animation:impactFlash .45s ease-out forwards;
}

.battleImpact.hit{
  color:#ffcf4d;
}

.battleImpact.blocked{
  color:#65b5ff;
}

.battleImpact.clash{
  color:#fff;
}

.battleImpact.reflect{
  color:#d66cff;
}

.battleImpact.heal{
  color:#63ff8b;
}

@keyframes impactFlash{

  0%{
    opacity:0;
    transform:translate(-50%,-50%) scale(.2);
  }

  30%{
    opacity:1;
    transform:translate(-50%,-50%) scale(1.35);
  }

  100%{
    opacity:0;
    transform:translate(-50%,-50%) scale(1.8);
  }

}


/* =========================
   スマホ対応
========================= */

@media(max-width:600px){

  .startTitle{
    font-size:30px;
  }

  .screenTitle{
    font-size:26px;
  }

  .playerArea{
    width:220px;
    padding:6px;
  }

  #player1Area{
    bottom:10px;
    left:10px;
  }

  #player2Area{
    top:10px;
    right:10px;
  }

  .action{
    min-height:36px;
  }

  .actionName{
    font-size:11px;
  }

  .actionKey{
    font-size:10px;
  }

  .techIcon{
    width:85px;
  }

  #techDescription{
    font-size:13px;
  }

}

</style>
</head>


<body>


<!-- =========================
     画面1：起動
========================= -->

<div id="startScreen"
     class="screen active"
     onclick="showScreen('modeScreen')">

  <div class="startTitle">
    心理バトル
  </div>

  <div class="startSub">
    タップしてスタート
  </div>

</div>


<!-- =========================
     画面2：モード選択
========================= -->

<div id="modeScreen" class="screen">

  <div class="screenTitle">
    バトルモード
  </div>

  <button
    class="modeButton"
    onclick="selectMode('offline')">
    オフライン
  </button>

  <button
    class="modeButton"
    onclick="selectMode('online')">
    オンライン
  </button>

</div>


<!-- =========================
     画面3：技選択
========================= -->

<div id="techScreen" class="screen">

  <div id="techTitle"
       class="screenTitle">
    1P：技を3つ選択
  </div>


  <div class="techSelect">

    <div class="techRow">

      <button
        class="techArrow"
        onclick="changeTech(0,-1)">
        ＜
      </button>

      <div
        id="techIcon0"
        class="techIcon">
        技1
      </div>

      <button
        class="techArrow"
        onclick="changeTech(0,1)">
        ＞
      </button>

    </div>


    <div class="techRow">

      <button
        class="techArrow"
        onclick="changeTech(1,-1)">
        ＜
      </button>

      <div
        id="techIcon1"
        class="techIcon">
        技2
      </div>

      <button
        class="techArrow"
        onclick="changeTech(1,1)">
        ＞
      </button>

    </div>


    <div class="techRow">

      <button
        class="techArrow"
        onclick="changeTech(2,-1)">
        ＜
      </button>

      <div
        id="techIcon2"
        class="techIcon">
        技3
      </div>

      <button
        class="techArrow"
        onclick="changeTech(2,1)">
        ＞
      </button>

    </div>

  </div>


  <!-- 技の説明 -->

  <div id="techDescription">
  </div>


  <button
    id="techConfirmButton"
    class="confirmButton"
    onclick="confirmTech()">
    次へ
  </button>

</div>


<!-- =========================
     画面4：バトル
========================= -->

<div id="battleScreen"
     class="screen">


  <!-- 1P -->

  <div id="player1Area"
       class="playerArea">

    <div class="playerHeader">

      <div class="playerName">
        1P
      </div>

      <div>
        HP
        <span id="hp1Text">
          10
        </span>
      </div>

    </div>


    <div class="hpBar">

      <div
        id="hp1Fill"
        class="hpFill">
      </div>

    </div>


    <div class="gaugeText">

      ゲージ
      <span id="gauge1Text">
        0
      </span>
      / 10

    </div>


    <div class="gaugeBar">

      <div
        id="gauge1Fill"
        class="gaugeFill">
      </div>

    </div>


    <div id="actions1"
         class="actionList">


      <div
        class="action"
        data-player="1"
        data-action="charge">

        <div class="actionKey">
          1
        </div>

        <div class="actionName">
          チャージ
        </div>

      </div>


      <div
        class="action"
        data-player="1"
        data-action="attack">

        <div class="actionKey">
          2
        </div>

        <div class="actionName">
          攻撃
        </div>

      </div>


      <div
        class="action"
        data-player="1"
        data-action="block">

        <div class="actionKey">
          3
        </div>

        <div class="actionName">
          ブロック
        </div>

      </div>


      <div
        id="p1tech0"
        class="action"
        data-player="1">

        <div class="actionKey">
          Q
        </div>

        <div class="actionName">
          技1
        </div>

      </div>


      <div
        id="p1tech1"
        class="action"
        data-player="1">

        <div class="actionKey">
          W
        </div>

        <div class="actionName">
          技2
        </div>

      </div>


      <div
        id="p1tech2"
        class="action"
        data-player="1">

        <div class="actionKey">
          E
        </div>

        <div class="actionName">
          技3
        </div>

      </div>

    </div>

  </div>


  <!-- 中央 -->

  <div id="battleCenter">

    <div id="countdown">
      3
    </div>

    <div id="resultMessage">
    </div>

  </div>


  <!-- 2P -->

  <div id="player2Area"
       class="playerArea">

    <div class="playerHeader">

      <div class="playerName">
        2P
      </div>

      <div>
        HP
        <span id="hp2Text">
          10
        </span>
      </div>

    </div>


    <div class="hpBar">

      <div
        id="hp2Fill"
        class="hpFill">
      </div>

    </div>


    <div class="gaugeText">

      ゲージ
      <span id="gauge2Text">
        0
      </span>
      / 10

    </div>


    <div class="gaugeBar">

      <div
        id="gauge2Fill"
        class="gaugeFill">
      </div>

    </div>


    <div id="actions2"
         class="actionList">


      <div
        class="action"
        data-player="2"
        data-action="charge">

        <div class="actionKey">
          7
        </div>

        <div class="actionName">
          チャージ
        </div>

      </div>


      <div
        class="action"
        data-player="2"
        data-action="attack">

        <div class="actionKey">
          8
        </div>

        <div class="actionName">
          攻撃
        </div>

      </div>


      <div
        class="action"
        data-player="2"
        data-action="block">

        <div class="actionKey">
          9
        </div>

        <div class="actionName">
          ブロック
        </div>

      </div>


      <div
        id="p2tech0"
        class="action"
        data-player="2">

        <div class="actionKey">
          U
        </div>

        <div class="actionName">
          技1
        </div>

      </div>


      <div
        id="p2tech1"
        class="action"
        data-player="2">

        <div class="actionKey">
          I
        </div>

        <div class="actionName">
          技2
        </div>

      </div>


      <div
        id="p2tech2"
        class="action"
        data-player="2">

        <div class="actionKey">
          O
        </div>

        <div class="actionName">
          技3
        </div>

      </div>

    </div>

  </div>


</div>


<script>


/* =========================
   ゲーム状態
========================= */

let hp = {
  1:10,
  2:10
};

let gauge = {
  1:0,
  2:0
};

let selectedAction = {
  1:null,
  2:null
};

let locked = {
  1:false,
  2:false
};

let countdownTimer = null;

let countdown = 3;


/* =========================
   基本行動
========================= */

const basicActions = {

  charge:{
    name:"チャージ",
    power:0,
    cost:0,
    type:"charge"
  },

  attack:{
    name:"攻撃",
    power:1,
    cost:1,
    type:"attack",
    pierce:false
  },

  block:{
    name:"ブロック",
    power:0,
    cost:0,
    type:"block"
  }

};


/* =========================
   技
========================= */

const techniquePool = [

  {
    name:"技1",
    cost:4,
    power:2,
    pierce:true,
    type:"attack",
    skill:"tech1",
    description:
      "ゲージ4消費 / 2ダメージ / ブロック無視"
  },

  {
    name:"技2",
    cost:2,
    power:0,
    pierce:false,
    type:"reflect",
    skill:"tech2",
    description:
      "ゲージ2消費 / 相手が攻撃していた場合、その攻撃ダメージをすべて相手に返す"
  },

  {
    name:"技3",
    cost:5,
    power:2,
    pierce:false,
    type:"attack",
    skill:"tech3",
    description:
      "ゲージ5消費 / 2ダメージ / 相手がチャージ中なら追加2ダメージ"
  },

  {
    name:"技4",
    cost:3,
    power:0,
    pierce:false,
    type:"heal",
    skill:"tech4",
    description:
      "ゲージ3消費 / 自分のHPを1回復"
  }

];


/* =========================
   画面切り替え
========================= */

function showScreen(id){

  document
    .querySelectorAll(".screen")
    .forEach(screen => {

      screen.classList.remove("active");

    });

  document
    .getElementById(id)
    .classList.add("active");

}


/* =========================
   モード選択
========================= */

let gameMode = null;

function selectMode(mode){

  gameMode = mode;

  selectingPlayer = 1;

  selectedTechniques[1] = [0,1,2];
  selectedTechniques[2] = [0,1,2];

  showScreen("techScreen");

  document
    .getElementById("techConfirmButton")
    .textContent = "次へ";

  if(mode === "offline"){

    document
      .getElementById("techTitle")
      .textContent =
        "1P：技を3つ選択";

  }else{

    document
      .getElementById("techTitle")
      .textContent =
        "技を3つ選択";

  }

  updateTechniqueDisplay();

}


/* =========================
   技選択
========================= */

let selectingPlayer = 1;

let selectedTechniques = {

  1:[0,1,2],

  2:[0,1,2]

};


function changeTech(slot,direction){

  const current =
    selectedTechniques[selectingPlayer][slot];

  const usedByOtherSlots =
    selectedTechniques[selectingPlayer]
      .filter((_,i) => i !== slot);

  let next = current;

  do{

    next += direction;

    if(next < 0){
      next = techniquePool.length - 1;
    }

    if(next >= techniquePool.length){
      next = 0;
    }

  }while(
    usedByOtherSlots.includes(next) &&
    next !== current
  );

  selectedTechniques[selectingPlayer][slot] = next;

  updateTechniqueDisplay();

}


/* =========================
   技表示
========================= */

function updateTechniqueDisplay(){

  selectedTechniques[selectingPlayer]
    .forEach((index,slot)=>{

      const tech =
        techniquePool[index];

      document
        .getElementById(
          "techIcon" + slot
        )
        .textContent =
          tech.name;

    });


  const descriptions =
    selectedTechniques[selectingPlayer]
      .map(index => {

        const tech =
          techniquePool[index];

        return `
          <div>
            <strong>${tech.name}</strong>：
            ${tech.description}
          </div>
        `;

      })
      .join("");

  document
    .getElementById("techDescription")
    .innerHTML =
      descriptions;

}


let player1Techs = [];

let player2Techs = [];


/* =========================
   技決定
========================= */

function confirmTech(){

  if(selectingPlayer === 1){

    player1Techs =
      selectedTechniques[1]
        .map(index =>
          techniquePool[index]
        );

    selectingPlayer = 2;

    document
      .getElementById("techTitle")
      .textContent =
        "2P：技を3つ選択";

    document
      .getElementById("techConfirmButton")
      .textContent =
        "決定";

    updateTechniqueDisplay();

    return;
  }


  player2Techs =
    selectedTechniques[2]
      .map(index =>
        techniquePool[index]
      );

  setupBattle();

}


/* =========================
   バトル開始
========================= */

function setupBattle(){

  hp[1] = 10;
  hp[2] = 10;

  gauge[1] = 0;
  gauge[2] = 0;

  selectedAction[1] = null;
  selectedAction[2] = null;

  locked[1] = false;
  locked[2] = false;

  updateBattleUI();

  showScreen("battleScreen");

  setupActionNames();

  startTurn();

}


/* =========================
   技名表示
========================= */

function setupActionNames(){

  document
    .querySelector(
      "#p1tech0 .actionName"
    )
    .textContent =
      player1Techs[0].name;

  document
    .querySelector(
      "#p1tech1 .actionName"
    )
    .textContent =
      player1Techs[1].name;

  document
    .querySelector(
      "#p1tech2 .actionName"
    )
    .textContent =
      player1Techs[2].name;


  document
    .querySelector(
      "#p2tech0 .actionName"
    )
    .textContent =
      player2Techs[0].name;

  document
    .querySelector(
      "#p2tech1 .actionName"
    )
    .textContent =
      player2Techs[1].name;

  document
    .querySelector(
      "#p2tech2 .actionName"
    )
    .textContent =
      player2Techs[2].name;

}


/* =========================
   ターン開始
========================= */

function startTurn(){

  selectedAction[1] = null;
  selectedAction[2] = null;

  locked[1] = false;
  locked[2] = false;

  document
    .getElementById("player1Area")
    .classList.remove("locked");

  document
    .getElementById("player2Area")
    .classList.remove("locked");

  document
    .getElementById("resultMessage")
    .textContent = "";

  updateDisabledActions();

  countdown = 3;

  document
    .getElementById("countdown")
    .textContent =
      countdown;

  clearInterval(countdownTimer);

  countdownTimer =
    setInterval(()=>{

      countdown--;

      document
        .getElementById("countdown")
        .textContent =
          countdown;

      if(countdown <= 0){

        clearInterval(countdownTimer);

        finishTurn();

      }

    },1000);

}


/* =========================
   キー入力
========================= */

document.addEventListener(
  "keydown",
  event => {

    const key =
      event.key.toLowerCase();


    const p1Keys = {

      "1":"charge",
      "2":"attack",
      "3":"block",

      "q":"tech0",
      "w":"tech1",
      "e":"tech2"

    };


    const p2Keys = {

      "7":"charge",
      "8":"attack",
      "9":"block",

      "u":"tech0",
      "i":"tech1",
      "o":"tech2"

    };


    if(p1Keys[key]){

      chooseAction(
        1,
        p1Keys[key]
      );

      return;

    }


    if(p2Keys[key]){

      chooseAction(
        2,
        p2Keys[key]
      );

      return;

    }

  }
);


/* =========================
   マウス・タップ操作
========================= */

document.addEventListener(
  "click",
  event => {

    const actionElement =
      event.target.closest(
        ".action"
      );

    if(!actionElement){
      return;
    }

    const player =
      Number(
        actionElement.dataset.player
      );

    const action =
      actionElement.dataset.action;

    if(player && action){

      chooseAction(
        player,
        action
      );

    }

  }
);


/* =========================
   行動選択
========================= */

function chooseAction(player,action){
  if(locked[player])return;

  const data=getActionData(player,action);
  if(!data)return;

  // 選択時点ではゲージを減らさない
  if(data.cost>gauge[player])return;

  selectedAction[player]={id:action,data:data};

  locked[player]=true;

  document.getElementById("player"+player+"Area").classList.add("locked");

  // ゲージはここでは変更しない
}


/* =========================
   行動データ取得
========================= */

function getActionData(player,action){

  if(
    action === "charge" ||
    action === "attack" ||
    action === "block"
  ){

    return basicActions[action];

  }


  if(action.startsWith("tech")){

    const index =
      Number(
        action.replace("tech","")
      );

    const techs =
      player === 1
        ? player1Techs
        : player2Techs;

    return techs[index];

  }


  return null;

}


/* =========================
   ターン終了
========================= */

function finishTurn(){

  if(!selectedAction[1]){

    selectedAction[1] = {

      id:"block",

      data:basicActions.block

    };

    locked[1] = true;

    document
      .getElementById(
        "player1Area"
      )
      .classList.add("locked");

  }


  if(!selectedAction[2]){

    selectedAction[2] = {

      id:"block",

      data:basicActions.block

    };

    locked[2] = true;

    document
      .getElementById(
        "player2Area"
      )
      .classList.add("locked");

  }


  resolveBattle();

}


/* =========================
   戦闘処理
========================= */

function resolveBattle(){

  const a1 =
    selectedAction[1].data;

  const a2 =
    selectedAction[2].data;


  let damageTo1 = 0;

  let damageTo2 = 0;

// ターン終了時に選択した技のゲージを消費
if(a1.cost>0){
  gauge[1]=Math.max(0,gauge[1]-a1.cost);
}

if(a2.cost>0){
  gauge[2]=Math.max(0,gauge[2]-a2.cost);
}
  /* =========================
     チャージ
  ========================= */

  if(a1.type === "charge"){

    gauge[1] =
      Math.min(
        10,
        gauge[1] + 1
      );

  }


  if(a2.type === "charge"){

    gauge[2] =
      Math.min(
        10,
        gauge[2] + 1
      );

  }


  /* =========================
     技4：回復
  ========================= */

  if(a1.type === "heal"){

    hp[1] =
      Math.min(
        10,
        hp[1] + 1
      );

  }


  if(a2.type === "heal"){

    hp[2] =
      Math.min(
        10,
        hp[2] + 1
      );

  }


  /* =========================
     技2：反射
  ========================= */

  if(a1.type === "reflect"){

    if(a2.type === "attack"){

      damageTo2 +=
        a2.power;

    }

  }


  if(a2.type === "reflect"){

    if(a1.type === "attack"){

      damageTo1 +=
        a1.power;

    }

  }


  /*
    反射同士なら何も返さない
  */

  if(
    a1.type === "reflect" &&
    a2.type === "reflect"
  ){

    damageTo1 = 0;
    damageTo2 = 0;

  }


  /* =========================
     攻撃判定
  ========================= */

  const attack1 =
    a1.type === "attack";

  const attack2 =
    a2.type === "attack";


  /* =========================
     攻撃 vs ブロック
  ========================= */

  if(
    attack1 &&
    a2.type === "block"
  ){

    /*
      pierce=trueなら
      ブロック無視
    */

    if(a1.pierce){

      damageTo2 +=
        a1.power;

    }

  }


  else if(
    attack2 &&
    a1.type === "block"
  ){

    if(a2.pierce){

      damageTo1 +=
        a2.power;

    }

  }


  /* =========================
     攻撃 vs 攻撃
  ========================= */

  else if(
    attack1 &&
    attack2
  ){

    if(a1.power > a2.power){

      damageTo2 +=
        a1.power - a2.power;

    }

    else if(a2.power > a1.power){

      damageTo1 +=
        a2.power - a1.power;

    }

  }


  /* =========================
     攻撃 vs チャージ
  ========================= */

  if(
    a1.type === "charge" &&
    attack2
  ){

    damageTo1 +=
      a2.power;

  }


  if(
    a2.type === "charge" &&
    attack1
  ){

    damageTo2 +=
      a1.power;

  }


  /* =========================
     技3
  ========================= */

  if(
    a1.skill === "tech3" &&
    a2.type === "charge"
  ){

    damageTo2 += 2;

  }


  if(
    a2.skill === "tech3" &&
    a1.type === "charge"
  ){

    damageTo1 += 2;

  }


  /* =========================
     演出
  ========================= */

  playBattleEffect(
    a1,
    a2,
    ()=>{

      hp[1] =
        Math.max(
          0,
          hp[1] - damageTo1
        );

      hp[2] =
        Math.max(
          0,
          hp[2] - damageTo2
        );


      updateBattleUI();


      if(
        hp[1] <= 0 ||
        hp[2] <= 0
      ){

        clearInterval(
          countdownTimer
        );


        if(
          hp[1] <= 0 &&
          hp[2] <= 0
        ){

          showBattleResult(
            "DRAW"
          );

        }

        else if(
          hp[1] <= 0
        ){

          showBattleResult(
            "2P WIN"
          );

        }

        else{

          showBattleResult(
            "1P WIN"
          );

        }

        return;

      }


      startTurn();

    }
  );

}


/* =========================
   バトル演出
========================= */

function playBattleEffect(
  a1,
  a2,
  callback
){

  let layer =
    document.getElementById(
      "battleEffectLayer"
    );


  if(!layer){

    layer =
      document.createElement(
        "div"
      );

    layer.id =
      "battleEffectLayer";

    document
      .getElementById(
        "battleScreen"
      )
      .appendChild(layer);

  }


  layer.innerHTML = "";


  /* =========================
     行動名
  ========================= */

  const label1 =
    document.createElement(
      "div"
    );

  const label2 =
    document.createElement(
      "div"
    );


  label1.className =
    "battleActionLabel p1";

  label2.className =
    "battleActionLabel p2";


  label1.textContent =
    "1P　" +
    (a1.name || "行動");

  label2.textContent =
    "2P　" +
    (a2.name || "行動");


  layer.appendChild(label1);
  layer.appendChild(label2);


  const attack1 =
    a1.type === "attack";

  const attack2 =
    a2.type === "attack";


  /* =========================
     ブロックシールド
  ========================= */

  if(a1.type === "block"){

    const shield1 =
      document.createElement(
        "div"
      );

    shield1.className =
      "battleShield p1";

    layer.appendChild(
      shield1
    );

  }


  if(a2.type === "block"){

    const shield2 =
      document.createElement(
        "div"
      );

    shield2.className =
      "battleShield p2";

    layer.appendChild(
      shield2
    );

  }


  /* =========================
     攻撃 vs 攻撃
     中央で衝突
  ========================= */

  if(
    attack1 &&
    attack2
  ){

    const p1 =
      document.createElement(
        "div"
      );

    const p2 =
      document.createElement(
        "div"
      );


    p1.className =
      "battleProjectile p1";

    p2.className =
      "battleProjectile p2";


    layer.appendChild(p1);
    layer.appendChild(p2);


    let arrived = 0;


    function projectileArrived(){

      arrived++;

      if(arrived === 2){

        p1.remove();
        p2.remove();

        showImpact(
          layer,
          "CLASH!",
          "clash"
        );

      }

    }


    /*
      ここでは中央まで飛ばす
      ↓
      両方が中央に到着
      ↓
      衝突演出
    */

    animateProjectile(
      p1,
      false,
      650,
      projectileArrived,
      true
    );

    animateProjectile(
      p2,
      true,
      650,
      projectileArrived,
      true
    );


    setTimeout(()=>{

      layer.innerHTML = "";

      callback();

    },1050);

    return;

  }


  /* =========================
     1Pだけ攻撃
  ========================= */

  if(attack1){

    let shield = null;


    if(a2.type === "block"){

      shield =
        document.createElement(
          "div"
        );

      shield.className =
        "battleShield p2";

      layer.appendChild(
        shield
      );

    }


    const projectile =
      document.createElement(
        "div"
      );

    projectile.className =
      "battleProjectile p1";

    layer.appendChild(
      projectile
    );


    /*
      重要：
      攻撃側から相手側まで飛ばす
    */

    animateProjectile(
      projectile,
      false,
      800,
      ()=>{

        projectile.remove();


        if(shield){

          shield.style.animation =
            "shieldAppear .2s ease-out forwards";

        }


        if(
          a2.type === "block" &&
          !a1.pierce
        ){

          showImpact(
            layer,
            "BLOCK!",
            "blocked"
          );

        }

        else{

          showImpact(
            layer,
            "HIT!",
            "hit"
          );

        }

      },
      false
    );


    setTimeout(()=>{

      layer.innerHTML = "";

      callback();

    },1200);

    return;

  }


  /* =========================
     2Pだけ攻撃
  ========================= */

  if(attack2){

    let shield = null;


    if(a1.type === "block"){

      shield =
        document.createElement(
          "div"
        );

      shield.className =
        "battleShield p1";

      layer.appendChild(
        shield
      );

    }


    const projectile =
      document.createElement(
        "div"
      );

    projectile.className =
      "battleProjectile p2";

    layer.appendChild(
      projectile
    );


    animateProjectile(
      projectile,
      true,
      800,
      ()=>{

        projectile.remove();


        if(shield){

          shield.style.animation =
            "shieldAppear .2s ease-out forwards";

        }


        if(
          a1.type === "block" &&
          !a2.pierce
        ){

          showImpact(
            layer,
            "BLOCK!",
            "blocked"
          );

        }

        else{

          showImpact(
            layer,
            "HIT!",
            "hit"
          );

        }

      },
      false
    );


    setTimeout(()=>{

      layer.innerHTML = "";

      callback();

    },1200);

    return;

  }


  /* =========================
     技2：反射演出
  ========================= */

  if(
    a1.type === "reflect" ||
    a2.type === "reflect"
  ){

    showImpact(
      layer,
      "REFLECT!",
      "reflect"
    );


    setTimeout(()=>{

      layer.innerHTML = "";

      callback();

    },700);

    return;

  }


  /* =========================
     技4：回復演出
  ========================= */

  if(
    a1.type === "heal" ||
    a2.type === "heal"
  ){

    showImpact(
      layer,
      "+1 HP",
      "heal"
    );


    setTimeout(()=>{

      layer.innerHTML = "";

      callback();

    },700);

    return;

  }


  /* =========================
     その他
  ========================= */

  setTimeout(()=>{

    layer.innerHTML = "";

    callback();

  },700);

}


/* =========================
   玉の移動
========================= */

function animateProjectile(
  el,
  reverse,
  duration,
  done,
  stopAtCenter
){

  const start =
    reverse
      ? {
          x:85,
          y:25
        }
      : {
          x:15,
          y:75
        };


  /*
    攻撃 vs 攻撃だけ中央で止める。
    それ以外は相手側まで飛ばす。
  */

  const end =
    stopAtCenter
      ? {
          x:50,
          y:50
        }
      : (
        reverse
          ? {
              x:15,
              y:75
            }
          : {
              x:85,
              y:25
            }
      );


  const control = {
    x:50,
    y:50
  };


  const begin =
    performance.now();


  function frame(now){

    let t =
      Math.min(
        1,
        (now - begin) /
        duration
      );


    t =
      t * t *
      (3 - 2 * t);


    const x =
      (1-t)*(1-t)*start.x +
      2*(1-t)*t*control.x +
      t*t*end.x;


    const y =
      (1-t)*(1-t)*start.y +
      2*(1-t)*t*control.y +
      t*t*end.y;


    el.style.left =
      x + "%";

    el.style.top =
      y + "%";


    if(t < 1){

      requestAnimationFrame(
        frame
      );

    }

    else{

      done();

    }

  }


  requestAnimationFrame(
    frame
  );

}


/* =========================
   ヒット表示
========================= */

function showImpact(
  layer,
  text,
  cls
){

  if(!text){
    return;
  }


  const impact =
    document.createElement(
      "div"
    );


  impact.className =
    "battleImpact " + cls;


  impact.textContent =
    text;


  layer.appendChild(
    impact
  );


  setTimeout(()=>{

    impact.remove();

  },500);

}


/* =========================
   結果表示
========================= */

function showBattleResult(text){

  document
    .getElementById(
      "resultMessage"
    )
    .textContent =
      text;

}


/* =========================
   UI更新
========================= */

function updateBattleUI(){

  /* HP */

  document
    .getElementById(
      "hp1Text"
    )
    .textContent =
      hp[1];

  document
    .getElementById(
      "hp2Text"
    )
    .textContent =
      hp[2];


  document
    .getElementById(
      "hp1Fill"
    )
    .style.width =
      (hp[1] * 10) + "%";


  document
    .getElementById(
      "hp2Fill"
    )
    .style.width =
      (hp[2] * 10) + "%";


  /* ゲージ */

  document
    .getElementById(
      "gauge1Text"
    )
    .textContent =
      gauge[1];


  document
    .getElementById(
      "gauge2Text"
    )
    .textContent =
      gauge[2];


  document
    .getElementById(
      "gauge1Fill"
    )
    .style.width =
      (gauge[1] * 10) + "%";


  document
    .getElementById(
      "gauge2Fill"
    )
    .style.width =
      (gauge[2] * 10) + "%";


  updateDisabledActions();

}


/* =========================
   ゲージ不足技を暗くする
========================= */

function updateDisabledActions(){

  [1,2].forEach(
    player => {

      const techs =
        player === 1
          ? player1Techs
          : player2Techs;


      techs.forEach(
        (tech,index) => {

          const el =
            document.getElementById(
              `p${player}tech${index}`
            );


          if(!el || !tech){
            return;
          }


          if(
            tech.cost >
            gauge[player]
          ){

            el.classList.add(
              "disabled"
            );

          }

          else{

            el.classList.remove(
              "disabled"
            );

          }

        }
      );

    }
  );

}


/* =========================
   初期化
========================= */

updateTechniqueDisplay();

</script>

</body>
</html>
