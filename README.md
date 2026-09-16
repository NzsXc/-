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

.hpFill.hpDamage,.hpText.hpDamage{animation:hpDamage .42s ease-out !important;}

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

.momentumProjectile{
  width:30px !important;
  height:18px !important;
  border-radius:65% 38% 65% 38% !important;
  background:linear-gradient(135deg,#fff,#e9edf4 55%,#fff) !important;
  box-shadow:0 0 8px #fff,0 0 18px rgba(255,255,255,.9),0 0 35px rgba(190,205,225,.7) !important;
}
.momentumProjectile.p1{transform:translate(-50%,-50%) rotate(20deg) scaleX(-1);}
.momentumProjectile.p2{transform:translate(-50%,-50%) rotate(20deg);}


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


/* =========================
   心理バトル：対戦ゲームUI強化
========================= */
body{
  background:
    radial-gradient(circle at 50% 45%, #20263a 0%, #0b0d14 48%, #05060a 100%);
}

#battleScreen{
  background:
    radial-gradient(circle at 50% 50%, rgba(90,120,255,.10), transparent 34%),
    linear-gradient(135deg, rgba(255,70,90,.035), transparent 42%),
    linear-gradient(315deg, rgba(60,150,255,.035), transparent 42%);
}

#battleScreen::before{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.28;
  background-image:
    linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
  background-size:40px 40px;
  mask-image:linear-gradient(to bottom, transparent, black 18%, black 82%, transparent);
}

#battleScreen::after{
  content:"";
  position:absolute;
  left:50%;
  top:50%;
  width:55vw;
  height:55vw;
  max-width:700px;
  max-height:700px;
  transform:translate(-50%,-50%);
  border:1px solid rgba(150,180,255,.10);
  border-radius:50%;
  box-shadow:0 0 80px rgba(80,110,255,.08), inset 0 0 80px rgba(80,110,255,.05);
  pointer-events:none;
}

.playerArea{
  width:300px;
  padding:12px;
  border:1px solid rgba(255,255,255,.16);
  border-radius:18px;
  background:linear-gradient(145deg, rgba(35,40,56,.92), rgba(12,14,22,.92));
  box-shadow:0 14px 40px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.06);
  backdrop-filter:blur(8px);
  transition:transform .2s, box-shadow .2s, border-color .2s;
}

#player1Area{ border-color:rgba(255,75,90,.28); }
#player2Area{ border-color:rgba(80,150,255,.28); }

.playerArea.locked{
  box-shadow:0 0 28px rgba(255,255,255,.08), 0 14px 40px rgba(0,0,0,.38);
}

.playerName{
  letter-spacing:2px;
  text-shadow:0 0 12px currentColor;
}
#player1Area .playerName{color:#ff6975;}
#player2Area .playerName{color:#70aaff;}

.hpBar{
  height:18px;
  border:1px solid rgba(255,255,255,.10);
  background:#090b10;
  box-shadow:inset 0 2px 5px rgba(0,0,0,.6);
}
.hpFill{
  background:linear-gradient(90deg,#ff263f,#ff6875,#ff263f);
  background-size:200% 100%;
  box-shadow:0 0 12px rgba(255,50,70,.65);
  transition:width .35s cubic-bezier(.2,.8,.2,1);
  animation:hpFlow 2s linear infinite;
}

.gaugeBar{
  height:12px;
  border:1px solid rgba(255,255,255,.10);
  background:#080b12;
}
.gaugeFill{
  background:linear-gradient(90deg,#3f82ff,#7fe8ff,#3f82ff);
  background-size:200% 100%;
  box-shadow:0 0 10px rgba(70,170,255,.55);
  transition:width .35s cubic-bezier(.2,.8,.2,1);
  animation:gaugeFlow 1.7s linear infinite;
}
.gaugeFill.gaugeReady{
  box-shadow:0 0 9px #68c9ff,0 0 22px rgba(70,160,255,.9),0 0 38px rgba(70,160,255,.5);
  animation:gaugeFlow .8s linear infinite, gaugePulse .7s ease-in-out infinite alternate;
}
.gaugeFill.gaugeMax{
  box-shadow:0 0 10px #fff,0 0 25px #6de4ff,0 0 50px rgba(80,180,255,.9);
}

.action{
  border:1px solid rgba(255,255,255,.12);
  background:linear-gradient(145deg,#252b3a,#151923);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
  transition:transform .12s, filter .12s, box-shadow .12s, border-color .12s;
}
.action:hover{
  transform:translateY(-2px);
  border-color:rgba(130,180,255,.55);
  box-shadow:0 0 16px rgba(80,150,255,.18), inset 0 1px 0 rgba(255,255,255,.08);
}
.action.disabled{filter:grayscale(.7);opacity:.22;}
.playerArea.locked .action:hover{transform:none;}

#countdown{
  font-size:clamp(54px,8vw,92px);
  letter-spacing:4px;
  text-shadow:0 0 14px rgba(255,255,255,.9),0 0 40px rgba(100,150,255,.8);
}
#countdown.countPulse{animation:countPulse .65s cubic-bezier(.2,.9,.2,1);}
#countdown.battleCall{
  color:#fff;
  font-size:clamp(42px,7vw,82px);
  text-shadow:0 0 15px #fff,0 0 35px #5da5ff,0 0 70px #5da5ff;
  animation:battleCall .9s cubic-bezier(.15,.9,.2,1) forwards;
}

#resultMessage{
  min-height:0;
  font-size:clamp(54px,10vw,120px);
  font-weight:1000;
  letter-spacing:7px;
  text-transform:uppercase;
  text-shadow:0 0 12px currentColor,0 0 35px currentColor,0 0 75px currentColor;
}
#resultMessage.resultShow{animation:resultReveal .9s cubic-bezier(.16,1,.3,1) forwards;}

.battleActionLabel{
  font-size:clamp(30px,4vw,52px);
  padding:10px 18px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent);
  border-top:1px solid currentColor;
  border-bottom:1px solid currentColor;
}

.battleProjectile{
  width:26px;
  height:26px;
  box-shadow:0 0 10px 5px currentColor,0 0 28px 12px currentColor,0 0 55px 18px rgba(255,255,255,.35);
}
.battleProjectile::after{
  content:"";
  position:absolute;
  width:90px;
  height:10px;
  left:50%;
  top:50%;
  transform:translate(-50%,-50%);
  background:linear-gradient(90deg,transparent,currentColor,transparent);
  filter:blur(5px);
  opacity:.8;
}

.battleShield{
  border-width:4px;
  background:radial-gradient(circle,rgba(110,190,255,.22),rgba(70,130,255,.05) 45%,transparent 70%);
}
.battleShield.shieldBreak{animation:shieldBreak .45s ease-out forwards;}

.battleImpact{
  font-size:clamp(38px,6vw,72px);
  letter-spacing:3px;
}
.battleImpact.damageText{
  font-size:clamp(26px,4vw,48px);
  margin-top:90px;
}

/* ヒット時の画面揺れ */
#battleScreen.hitShake{animation:screenShake .28s linear;}

/* 汎用エフェクト */
.effectFlash,.effectRing,.effectSlash,.effectShockwave,.effectParticles,.effectHex,.effectAura,.effectLightning{
  position:absolute;
  left:50%;top:50%;
  pointer-events:none;
}
.effectFlash{
  width:100%;height:100%;
  transform:translate(-50%,-50%);
  background:radial-gradient(circle,rgba(255,255,255,.55),rgba(255,255,255,.08) 20%,transparent 55%);
  animation:flashBurst .35s ease-out forwards;
}
.effectRing{
  width:80px;height:80px;
  border:4px solid currentColor;
  border-radius:50%;
  transform:translate(-50%,-50%) scale(.2);
  box-shadow:0 0 18px currentColor, inset 0 0 18px currentColor;
  animation:ringBurst .65s cubic-bezier(.15,.8,.2,1) forwards;
}
.effectSlash{
  width:390px;height:18px;
  border-radius:50%;
  background:linear-gradient(90deg,transparent,#fff,currentColor,transparent);
  box-shadow:0 0 12px currentColor,0 0 28px currentColor;
  transform:translate(-50%,-50%) rotate(-25deg) scaleX(0);
  animation:slashBurst .42s cubic-bezier(.2,.9,.2,1) forwards;
}
.effectShockwave{
  width:60px;height:60px;
  border:5px solid currentColor;
  border-radius:50%;
  transform:translate(-50%,-50%) scale(.2);
  animation:shockwave .55s ease-out forwards;
}
.effectHex{
  width:130px;height:130px;
  border:3px solid currentColor;
  clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%);
  transform:translate(-50%,-50%) scale(.3) rotate(0deg);
  box-shadow:0 0 20px currentColor;
  animation:hexSeal .75s ease-out forwards;
}
.effectAura{
  width:220px;height:220px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.28),rgba(80,255,150,.12) 35%,transparent 70%);
  box-shadow:0 0 35px rgba(80,255,150,.55);
  transform:translate(-50%,-50%) scale(.35);
  animation:auraHeal .8s ease-out forwards;
}
.effectLightning{
  width:8px;height:260px;
  background:linear-gradient(transparent,#fff,currentColor,transparent);
  filter:drop-shadow(0 0 10px currentColor);
  transform:translate(-50%,-50%) rotate(25deg) scaleY(.2);
  animation:lightningStrike .42s ease-out forwards;
}

@keyframes hpDamage{0%{filter:brightness(1)}25%{filter:brightness(2.3)}55%{filter:brightness(.7)}100%{filter:brightness(1)}}
@keyframes hpFlow{to{background-position:200% 0;}}
@keyframes gaugeFlow{to{background-position:200% 0;}}
@keyframes gaugePulse{from{filter:brightness(1)}to{filter:brightness(1.55)}}
@keyframes countPulse{0%{opacity:0;transform:scale(1.8)}35%{opacity:1;transform:scale(.92)}100%{opacity:1;transform:scale(1)}}
@keyframes battleCall{0%{opacity:0;transform:scale(1.7)}35%{opacity:1;transform:scale(.92)}100%{opacity:0;transform:scale(1.08)}}
@keyframes resultReveal{0%{opacity:0;transform:scale(2.4) rotate(-4deg);filter:blur(10px)}55%{opacity:1;transform:scale(.92) rotate(1deg);filter:blur(0)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes screenShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-8px,4px)}40%{transform:translate(7px,-3px)}60%{transform:translate(-5px,-4px)}80%{transform:translate(5px,3px)}}
@keyframes flashBurst{0%{opacity:0}20%{opacity:1}100%{opacity:0}}
@keyframes ringBurst{0%{opacity:1;transform:translate(-50%,-50%) scale(.2)}100%{opacity:0;transform:translate(-50%,-50%) scale(3.4)}}
@keyframes slashBurst{0%{opacity:0;transform:translate(-50%,-50%) rotate(-25deg) scaleX(0)}35%{opacity:1;transform:translate(-50%,-50%) rotate(-25deg) scaleX(1.1)}100%{opacity:0;transform:translate(-50%,-50%) rotate(-25deg) scaleX(1.35) translateX(30px)}}
@keyframes shockwave{0%{opacity:1;transform:translate(-50%,-50%) scale(.2)}100%{opacity:0;transform:translate(-50%,-50%) scale(4.5)}}
@keyframes hexSeal{0%{opacity:0;transform:translate(-50%,-50%) scale(.2) rotate(-25deg)}30%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(0)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.25) rotate(15deg)}}
@keyframes auraHeal{0%{opacity:0;transform:translate(-50%,-50%) scale(.25)}30%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.45)}}
@keyframes lightningStrike{0%{opacity:0;transform:translate(-50%,-50%) rotate(25deg) scaleY(.1)}35%{opacity:1;transform:translate(-50%,-50%) rotate(25deg) scaleY(1)}100%{opacity:0;transform:translate(-50%,-50%) rotate(25deg) scaleY(1.2)}}
@keyframes shieldBreak{0%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.35);filter:brightness(2)}}

@media(max-width:600px){
  .playerArea{width:calc(50vw - 15px);min-width:170px;}
  #player1Area{left:8px;bottom:8px;}
  #player2Area{right:8px;top:8px;}
  .actionList{gap:3px;}
  .action{min-height:38px;}
  .actionName{font-size:10px;}
  .battleActionLabel{font-size:25px;padding:7px 10px;}
  .effectSlash{width:250px;}
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

let lastAction = {1:null,2:null};
let lastLastAction = {1:null,2:null};
// モーメンタムの「次の1回だけ2ダメージ」判定
let momentumBonus = {1:false,2:false};
let blockSeal = {1:false,2:false};

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
    name:"アタック",
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
    name:"ブリーチ",
    cost:4,
    power:2,
    pierce:true,
    type:"attack",
    skill:"tech1",
    description:
      "ゲージ4消費 / 2ダメージ / ブロック無視"
  },

  {
    name:"カウンター",
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
  },

  {name:"フォーサイト",cost:1,power:0,pierce:false,type:"block",skill:"tech5",description:"ゲージ1消費 / ブロック状態 / 相手がチャージならゲージ+3"},
  {name:"モーメンタム",cost:2,power:1,pierce:false,type:"attack",skill:"tech6",description:"ゲージ2消費 / 1ダメージ / 前のターンも技6なら2ダメージ"},
  {name:"ランページ",cost:0,power:0,pierce:false,type:"special",skill:"tech7",description:"前のターンにチャージしていた場合のみ / ゲージ+8 / HP-3"},
  {name:"技8",cost:0,power:0,pierce:false,type:"seal",skill:"tech8",description:"相手のゲージが7未満のとき使用可能 / 相手のブロック系技を封印"}

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

  // オンラインは自分（1P）だけ技を3つ選択
  if(gameMode === "online"){
    player1Techs =
      selectedTechniques[1]
        .map(index =>
          techniquePool[index]
        );

    // オンライン側の相手技は通信実装時に受信する想定。
    // 現在はバトル開始用に初期値を使用する。
    player2Techs =
      selectedTechniques[2]
        .map(index =>
          techniquePool[index]
        );

    setupBattle();
    return;
  }

  // オフラインは従来どおり1P→2Pの順で選択
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

  lastAction[1] = null;
  lastAction[2] = null;
  lastLastAction[1] = null;
  lastLastAction[2] = null;
  momentumBonus[1] = false;
  momentumBonus[2] = false;
  blockSeal[1] = false;
  blockSeal[2] = false;

  locked[1] = false;
  locked[2] = false;

  displayedHp[1] = 10;
  displayedHp[2] = 10;
  displayedGauge[1] = 0;
  displayedGauge[2] = 0;

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

  document.getElementById("player1Area").classList.remove("locked");
  document.getElementById("player2Area").classList.remove("locked");
  document.getElementById("resultMessage").textContent = "";

  updateDisabledActions();

  // 行動選択時間：10秒
  countdown = 10;
  const el = document.getElementById("countdown");
  el.className = "countPulse";
  el.textContent = "10";

  clearInterval(countdownTimer);

  countdownTimer = setInterval(()=>{
    countdown--;

    if(countdown > 0){
      el.className = "";
      void el.offsetWidth;
      el.className = "countPulse";
      el.textContent = countdown;
      return;
    }

    if(countdown === 0){
      el.className = "battleCall";
      el.textContent = "BATTLE!";
      setTimeout(()=>{
        if(countdown === 0) finishTurn();
      },500);
    }

    clearInterval(countdownTimer);
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

  // 技8でブロック系（通常ブロック・技5）が封印中
  if(blockSeal[player] && (action === "block" || data.skill === "tech5"))return;

  // 技7：前のターンにチャージしていた場合のみ
  if(data.skill === "tech7" && (!lastAction[player] || lastAction[player].data.type !== "charge"))return;

  // 技8：相手のゲージが7未満の場合のみ
  if(data.skill === "tech8"){
    const opponent = player === 1 ? 2 : 1;
    if(gauge[opponent] >= 7)return;
  }

  if(data.cost>gauge[player])return;

  selectedAction[player]={id:action,data:data};
  locked[player]=true;
  document.getElementById("player"+player+"Area").classList.add("locked");

  // 両者が決定したら、残り時間を待たず3秒カウントへ移行
  if(selectedAction[1] && selectedAction[2]){
    clearInterval(countdownTimer);
    countdown = 3;
    const el = document.getElementById("countdown");
    if(el){
      el.className = "";
      void el.offsetWidth;
      el.className = "countPulse";
      el.textContent = "3";
    }

    countdownTimer = setInterval(()=>{
      countdown--;
      if(countdown > 0){
        if(el){
          el.className = "";
          void el.offsetWidth;
          el.className = "countPulse";
          el.textContent = countdown;
        }
        return;
      }

      clearInterval(countdownTimer);
      if(el){
        el.className = "battleCall";
        el.textContent = "BATTLE!";
      }
      setTimeout(()=>{
        if(countdown === 0 && selectedAction[1] && selectedAction[2]) finishTurn();
      },500);
    },1000);
  }
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

      id:"charge",

      data:basicActions.charge

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

      id:"charge",

      data:basicActions.charge

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
  const a1 = selectedAction[1]?.data;
  const a2 = selectedAction[2]?.data;
  if(!a1 || !a2) return;

  let damageTo1 = 0;
  let damageTo2 = 0;

  // 先に技のコストを消費
  gauge[1] = Math.max(0, gauge[1] - Number(a1.cost || 0));
  gauge[2] = Math.max(0, gauge[2] - Number(a2.cost || 0));

  const attack1 = a1.type === "attack";
  const attack2 = a2.type === "attack";
  const block1 = a1.type === "block" && !blockSeal[1];
  const block2 = a2.type === "block" && !blockSeal[2];
  const reflect1 = a1.type === "reflect";
  const reflect2 = a2.type === "reflect";

  // 技8：相手のブロック系を封印
  if(a1.skill === "tech8" && gauge[2] < 7) blockSeal[2] = true;
  if(a2.skill === "tech8" && gauge[1] < 7) blockSeal[1] = true;

  // チャージ
  if(a1.type === "charge") gauge[1] = Math.min(10, gauge[1] + 2);
  if(a2.type === "charge") gauge[2] = Math.min(10, gauge[2] + 2);

  // 技5：相手がチャージなら自分のゲージ+3
  if(a1.skill === "tech5" && a2.type === "charge") gauge[1] = Math.min(10, gauge[1] + 3);
  if(a2.skill === "tech5" && a1.type === "charge") gauge[2] = Math.min(10, gauge[2] + 3);

  // 技4：HP+1
  if(a1.skill === "tech4") hp[1] = Math.min(10, hp[1] + 1);
  if(a2.skill === "tech4") hp[2] = Math.min(10, hp[2] + 1);

  // カウンター：相手の攻撃を相手へ返す
  if(reflect1 && attack2) damageTo2 += Number(a2.power || 0);
  if(reflect2 && attack1) damageTo1 += Number(a1.power || 0);

  // 攻撃同士は威力差で勝敗を決める
  if(attack1 && attack2){
    const p1 = Number(a1.power || 0);
    const p2 = Number(a2.power || 0);
    if(p1 > p2) damageTo2 += p1 - p2;
    else if(p2 > p1) damageTo1 += p2 - p1;
  }else{
    if(attack1){
      if(block2){
        if(a1.pierce) damageTo2 += Number(a1.power || 0);
      }else if(!reflect2){
        damageTo2 += Number(a1.power || 0);
      }
    }
    if(attack2){
      if(block1){
        if(a2.pierce) damageTo1 += Number(a2.power || 0);
      }else if(!reflect1){
        damageTo1 += Number(a2.power || 0);
      }
    }
  }

  // 技3：チャージ中の相手には追加2ダメージ
  // ブロック・カウンター中には追加ダメージを入れない
  if(a1.skill === "tech3" && a2.type === "charge" && !block2 && !reflect2) damageTo2 += 2;
  if(a2.skill === "tech3" && a1.type === "charge" && !block1 && !reflect1) damageTo1 += 2;

  // 技6：モーメンタムは「連続使用した次の1回」だけ2ダメージ。
  // 例：1 → 2 → 1 → 2 → 1
  const momentumDmg1 = a1.skill === "tech6" ? (momentumBonus[1] ? 2 : 1) : 0;
  const momentumDmg2 = a2.skill === "tech6" ? (momentumBonus[2] ? 2 : 1) : 0;

  if(a1.skill === "tech6" && !block2 && !reflect2){
    if(attack2){
      if(a2.skill === "tech6"){
        // モーメンタム同士は、それぞれの今回の威力を比較
        if(momentumDmg1 > momentumDmg2) damageTo2 = Math.max(damageTo2, momentumDmg1 - momentumDmg2);
        else if(momentumDmg2 > momentumDmg1) damageTo1 = Math.max(damageTo1, momentumDmg2 - momentumDmg1);
      }else{
        damageTo2 = Math.max(damageTo2, momentumDmg1 - Number(a2.power || 0), 0);
      }
    }else{
      damageTo2 = Math.max(damageTo2, momentumDmg1);
    }
  }

  if(a2.skill === "tech6" && !block1 && !reflect1){
    if(attack1){
      if(a1.skill !== "tech6") damageTo1 = Math.max(damageTo1, momentumDmg2 - Number(a1.power || 0), 0);
    }else{
      damageTo1 = Math.max(damageTo1, momentumDmg2);
    }
  }

  // 技7：前ターンチャージ後のみ使用可能。ゲージ+8、HP-3
  if(a1.skill === "tech7"){
    gauge[1] = Math.min(10, gauge[1] + 8);
    hp[1] = Math.max(0, hp[1] - 3);
  }
  if(a2.skill === "tech7"){
    gauge[2] = Math.min(10, gauge[2] + 8);
    hp[2] = Math.max(0, hp[2] - 3);
  }

  playBattleEffect(a1,a2,()=>{
    hp[1] = Math.max(0, hp[1] - damageTo1);
    hp[2] = Math.max(0, hp[2] - damageTo2);

    updateBattleUI();
    // 今回モーメンタムなら、次回だけ2ダメージにする。
    momentumBonus[1] = a1.skill === "tech6";
    momentumBonus[2] = a2.skill === "tech6";

    lastLastAction[1] = lastAction[1];
    lastLastAction[2] = lastAction[2];
    lastAction[1] = {id:selectedAction[1].id,data:a1};
    lastAction[2] = {id:selectedAction[2].id,data:a2};

    if(hp[1] <= 0 || hp[2] <= 0){
      showBattleResult(
        hp[1] <= 0 && hp[2] <= 0 ? "DRAW" :
        hp[1] <= 0 ? "2P WIN" : "1P WIN"
      );
      return;
    }

    setTimeout(()=>startTurn(),250);
  });
}


/* =========================
   バトル演出
========================= */

function playBattleEffect(a1,a2,callback){
  let layer=document.getElementById("battleEffectLayer");
  if(!layer){
    layer=document.createElement("div");
    layer.id="battleEffectLayer";
    document.getElementById("battleScreen").appendChild(layer);
  }
  layer.innerHTML="";

  const label1=document.createElement("div");
  const label2=document.createElement("div");
  label1.className="battleActionLabel p1";
  label2.className="battleActionLabel p2";
  label1.textContent="1P　"+(a1.name||"行動");
  label2.textContent="2P　"+(a2.name||"行動");
  layer.appendChild(label1);
  layer.appendChild(label2);

  const attack1=a1.type==="attack";
  const attack2=a2.type==="attack";
  const block1=a1.type==="block"&&!blockSeal[1];
  const block2=a2.type==="block"&&!blockSeal[2];
  const ranged1=a1.skill==="tech6";
  const ranged2=a2.skill==="tech6";

  // ===== 技7 ランページ：赤黒の暴走演出 =====
  if(a1.skill==="tech7" || a2.skill==="tech7"){
    const side=a1.skill==="tech7"?"p1":"p2";
    const burst=document.createElement("div");
    burst.className="effectFlash";
    burst.style.background="radial-gradient(circle,rgba(255,40,55,.85),rgba(20,0,0,.75) 35%,transparent 72%)";
    burst.style.mixBlendMode="screen";
    layer.appendChild(burst);
    const ring=document.createElement("div");
    ring.className="effectRing";
    ring.style.color="#ff263f";
    ring.style.width="240px";
    ring.style.height="240px";
    ring.style.left=side==="p1"?"15%":"85%";
    ring.style.top=side==="p1"?"75%":"25%";
    layer.appendChild(ring);
    showImpact(layer,"RAMPAGE!","hit");
    flashScreen();
    setTimeout(()=>{layer.innerHTML="";callback();},850);
    return;
  }

  // ===== 技8：敵側を盾→封印X =====
  if(a1.skill==="tech8" || a2.skill==="tech8"){
    const target=a1.skill==="tech8"?"p2":"p1";
    createSealEffect(layer,target);
    setTimeout(()=>{layer.innerHTML="";callback();},900);
    return;
  }

  // ===== 技2 カウンター：使用者に銀盾 =====
  if(a1.skill==="tech2" || a2.skill==="tech2"){
    if(a1.skill==="tech2") createCounterShield(layer,"p1");
    if(a2.skill==="tech2") createCounterShield(layer,"p2");

    // 相手が攻撃なら、その攻撃が反射されたことを中央で表現
    if(a1.skill==="tech2" && attack2){
      setTimeout(()=>{
        createReflectedSlash(layer,"p2");
        showImpact(layer,"REFLECT!","reflect");
      },260);
    }
    if(a2.skill==="tech2" && attack1){
      setTimeout(()=>{
        createReflectedSlash(layer,"p1");
        showImpact(layer,"REFLECT!","reflect");
      },260);
    }
    setTimeout(()=>{layer.innerHTML="";callback();},900);
    return;
  }

  // ===== ブロック / 技5 フォーサイト =====
  if(block1 || block2){
    if(block1) createShield(layer,"p1");
    if(block2) createShield(layer,"p2");
    if(a1.skill==="tech5" && a2.type==="charge") createChargeEffectAt(layer,"p2");
    if(a2.skill==="tech5" && a1.type==="charge") createChargeEffectAt(layer,"p1");

    // ブリーチだけはブロックを貫通するため、盾の上から斬撃
    if(attack1 && block2 && a1.pierce) createSlashAt(layer,"p2", "#ff5266");
    if(attack2 && block1 && a2.pierce) createSlashAt(layer,"p1", "#5da5ff");
    if((attack1&&!a1.pierce&&block2)||(attack2&&!a2.pierce&&block1)) showImpact(layer,"BLOCK!","blocked");

    setTimeout(()=>{layer.innerHTML="";callback();},900);
    return;
  }

  // ===== 技4 回復 =====
  if(a1.skill==="tech4" || a2.skill==="tech4"){
    if(a1.skill==="tech4") createHealAt(layer,"p1");
    if(a2.skill==="tech4") createHealAt(layer,"p2");
    showImpact(layer,"+1 HP","heal");
    setTimeout(()=>{layer.innerHTML="";callback();},850);
    return;
  }

  // ===== 両者攻撃 =====
  if(attack1 && attack2){
    if(ranged1 && ranged2){
      const p1=document.createElement("div");
      const p2=document.createElement("div");
      p1.className="battleProjectile p1 momentumProjectile";
      p2.className="battleProjectile p2 momentumProjectile";
      layer.appendChild(p1);layer.appendChild(p2);
      let arrived=0;
      const hitCenter=()=>{
        arrived++;
        if(arrived!==2)return;
        p1.remove();p2.remove();
        showImpact(layer,"CLASH!","clash");
        createRing(layer,"#fff");
        flashScreen();
      };
      animateProjectile(p1,false,650,hitCenter,true);
      animateProjectile(p2,true,650,hitCenter,true);
      setTimeout(()=>{layer.innerHTML="";callback();},950);
      return;
    }

    // 通常攻撃 / ブリーチ / 技3 は中央衝突
    createSlashAt(layer,"center", "#ff5266");
    createSlashAt(layer,"center", "#5da5ff", true);
    if(a1.skill==="tech3" || a2.skill==="tech3") createShockwave(layer,"#fff16a");
    setTimeout(()=>{showImpact(layer,"CLASH!","clash");flashScreen();},330);
    setTimeout(()=>{layer.innerHTML="";callback();},850);
    return;
  }

  // ===== 1Pだけ攻撃 =====
  if(attack1){
    if(ranged1){
      const projectile=document.createElement("div");
      projectile.className="battleProjectile p1 momentumProjectile";
      layer.appendChild(projectile);
      animateProjectile(projectile,false,720,()=>{
        projectile.remove();
        if(block2 && !a1.pierce){
          showImpact(layer,"BLOCK!","blocked");
          createRing(layer,"#65b5ff");
        }else{
          showImpact(layer,"HIT!","hit");
          createShockwave(layer,"#ffcf4d");
          flashScreen();
        }
      },false);
    }else{
      // チャージ中の相手なら相手側、それ以外は中央
      const side=a2.type==="charge"?"p2":"center";
      createSlashAt(layer,side,"#ff5266");
      if(a1.skill==="tech3" && a2.type==="charge") createShockwave(layer,"#fff16a");
      setTimeout(()=>{
        if(block2 && !a1.pierce) showImpact(layer,"BLOCK!","blocked");
        else {showImpact(layer,"HIT!","hit");flashScreen();}
      },350);
    }
    setTimeout(()=>{layer.innerHTML="";callback();},1050);
    return;
  }

  // ===== 2Pだけ攻撃 =====
  if(attack2){
    if(ranged2){
      const projectile=document.createElement("div");
      projectile.className="battleProjectile p2 momentumProjectile";
      layer.appendChild(projectile);
      animateProjectile(projectile,true,720,()=>{
        projectile.remove();
        if(block1 && !a2.pierce){
          showImpact(layer,"BLOCK!","blocked");
          createRing(layer,"#65b5ff");
        }else{
          showImpact(layer,"HIT!","hit");
          createShockwave(layer,"#ffcf4d");
          flashScreen();
        }
      },false);
    }else{
      const side=a1.type==="charge"?"p1":"center";
      createSlashAt(layer,side,"#5da5ff");
      if(a2.skill==="tech3" && a1.type==="charge") createShockwave(layer,"#fff16a");
      setTimeout(()=>{
        if(block1 && !a2.pierce) showImpact(layer,"BLOCK!","blocked");
        else {showImpact(layer,"HIT!","hit");flashScreen();}
      },350);
    }
    setTimeout(()=>{layer.innerHTML="";callback();},1050);
    return;
  }

  // チャージ
  if(a1.type==="charge" || a2.type==="charge"){
    if(a1.type==="charge") createChargeEffectAt(layer,"p1");
    if(a2.type==="charge") createChargeEffectAt(layer,"p2");
    setTimeout(()=>{layer.innerHTML="";callback();},750);
    return;
  }

  setTimeout(()=>{layer.innerHTML="";callback();},700);
}

function createSlashAt(layer,side,color,reverse=false){
  const e=document.createElement("div");
  e.className="effectSlash";
  e.style.color=color;
  if(side==="p1"){e.style.left="15%";e.style.top="75%";}
  else if(side==="p2"){e.style.left="85%";e.style.top="25%";}
  else {e.style.left="50%";e.style.top="50%";}
  if(reverse) e.style.transform="translate(-50%,-50%) rotate(155deg) scaleX(0)";
  layer.appendChild(e);
  return e;
}

function createReflectedSlash(layer,side){
  const color=side==="p1"?"#ff5266":"#5da5ff";
  createSlashAt(layer,side,color);
  createShockwave(layer,"#d9d9e8");
}

function createHealAt(layer,side){
  const e=document.createElement("div");
  e.className="effectAura";
  e.style.left=side==="p1"?"15%":"85%";
  e.style.top=side==="p1"?"75%":"25%";
  layer.appendChild(e);
}

function createCounterShield(layer,side){
  const shield=document.createElement("div");
  shield.className="battleShield "+side+" counterShield";
  shield.style.borderColor="#d9d9e8";
  shield.style.boxShadow="0 0 22px rgba(230,230,255,.95), inset 0 0 18px rgba(210,210,230,.35)";
  shield.style.background="radial-gradient(circle,rgba(220,220,235,.22),rgba(160,160,180,.06) 48%,transparent 72%)";
  layer.appendChild(shield);
  return shield;
}

function createChargeEffectAt(layer,side){
  const e=document.createElement("div");
  e.className="effectRing";
  e.style.color="#ff8a24";
  e.style.left=side==="p1"?"15%":"85%";
  e.style.top=side==="p1"?"75%":"25%";
  layer.appendChild(e);
}

function createSealEffect(layer,side){
  const shield=createShield(layer,side);
  shield.style.borderColor="#b36cff";
  const cross=document.createElement("div");
  cross.textContent="✕";
  cross.style.position="absolute";
  cross.style.left=side==="p1"?"15%":"85%";
  cross.style.top=side==="p1"?"75%":"25%";
  cross.style.transform="translate(-50%,-50%)";
  cross.style.fontSize="110px";
  cross.style.fontWeight="900";
  cross.style.color="#c06cff";
  cross.style.textShadow="0 0 15px #c06cff,0 0 35px #7a35ff";
  cross.style.zIndex="20";
  cross.style.pointerEvents="none";
  layer.appendChild(cross);
}

function createShield(layer,side){
  const shield=document.createElement("div");
  shield.className="battleShield "+side;
  layer.appendChild(shield);
  return shield;
}

function createRing(layer,color){
  const e=document.createElement("div");
  e.className="effectRing";
  e.style.color=color;
  layer.appendChild(e);
}

function createShockwave(layer,color){
  const e=document.createElement("div");
  e.className="effectShockwave";
  e.style.color=color;
  layer.appendChild(e);
}

function createAura(layer){
  const e=document.createElement("div");
  e.className="effectAura";
  layer.appendChild(e);
}

function flashScreen(){
  const screen=document.getElementById("battleScreen");
  if(!screen)return;
  screen.classList.remove("hitShake");
  void screen.offsetWidth;
  screen.classList.add("hitShake");
  setTimeout(()=>screen.classList.remove("hitShake"),300);
}

function createChargeEffect(layer){
  createRing(layer,"#4da6ff");
  const e=document.createElement("div");
  e.className="effectFlash";
  layer.appendChild(e);
}

function spawnTechniqueEffect(layer,action,player){
  const skill=action&&action.skill;
  const color=player===1?"#ff5266":"#5da5ff";
  let e;
  if(skill==="tech1"){
    e=document.createElement("div");
    e.className="effectSlash";
    e.style.color=color;
    e.style.top=player===1?"62%":"38%";
    layer.appendChild(e);
  }else if(skill==="tech2"){
    e=document.createElement("div");
    e.className="effectRing";
    e.style.color="#d66cff";
    layer.appendChild(e);
  }else if(skill==="tech3"){
    e=document.createElement("div");
    e.className="effectLightning";
    e.style.color="#fff16a";
    e.style.left=player===1?"62%":"38%";
    layer.appendChild(e);
    createShockwave(layer,"#fff16a");
  }else if(skill==="tech4"){
    createAura(layer);
  }else if(skill==="tech5"){
    createShield(layer,player===1?"p1":"p2");
  }else if(skill==="tech6"){
    for(let i=0;i<3;i++){
      const r=document.createElement("div");
      r.className="effectRing";
      r.style.color=color;
      r.style.width=(70+i*35)+"px";
      r.style.height=(70+i*35)+"px";
      r.style.animationDelay=(i*.07)+"s";
      layer.appendChild(r);
    }
  }else if(skill==="tech7"){
    e=document.createElement("div");
    e.className="effectFlash";
    e.style.background="radial-gradient(circle,rgba(255,80,60,.9),rgba(255,30,60,.22) 22%,transparent 60%)";
    layer.appendChild(e);
    createShockwave(layer,"#ff334d");
    flashScreen();
  }else if(skill==="tech8"){
    e=document.createElement("div");
    e.className="effectHex";
    e.style.color="#b36cff";
    layer.appendChild(e);
  }
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

function showImpact(layer,text,cls){
  if(!text)return;
  const impact=document.createElement("div");
  impact.className="battleImpact "+cls;
  impact.textContent=text;
  layer.appendChild(impact);

  if(cls==="hit"){
    flashScreen();
    createDamageNumber(layer);
  }
  setTimeout(()=>impact.remove(),550);
}

function createDamageNumber(layer){
  const d=document.createElement("div");
  d.className="battleImpact hit damageText";
  d.textContent="IMPACT";
  layer.appendChild(d);
  setTimeout(()=>d.remove(),500);
}

/* =========================
   結果表示
========================= */

function showBattleResult(text){
  const el=document.getElementById("resultMessage");
  el.className="";
  el.textContent=text;
  if(text==="1P WIN") el.style.color="#ff5b6b";
  else if(text==="2P WIN") el.style.color="#63aaff";
  else el.style.color="#fff";
  void el.offsetWidth;
  el.className="resultShow";
}

/* =========================
   UI更新
========================= */

let displayedHp={1:10,2:10};
let displayedGauge={1:0,2:0};

function updateBattleUI(){
  [1,2].forEach(player=>{
    const hpText=document.getElementById("hp"+player+"Text");
    const hpFill=document.getElementById("hp"+player+"Fill");
    const gaugeText=document.getElementById("gauge"+player+"Text");
    const gaugeFill=document.getElementById("gauge"+player+"Fill");

    hpText.textContent=hp[player];
    hpFill.style.width=(hp[player]*10)+"%";

    if(hp[player] < displayedHp[player]){
      hpFill.classList.remove("hpDamage");
      void hpFill.offsetWidth;
      hpFill.classList.add("hpDamage");
      hpText.classList.remove("hpDamage");
      void hpText.offsetWidth;
      hpText.classList.add("hpDamage");
    }

    gaugeText.textContent=gauge[player];
    gaugeFill.style.width=(gauge[player]*10)+"%";
    gaugeFill.classList.toggle("gaugeReady",gauge[player]>=7);
    gaugeFill.classList.toggle("gaugeMax",gauge[player]>=10);

    if(gauge[player] > displayedGauge[player]){
      gaugeFill.animate([
        {filter:"brightness(1)",transform:"scaleY(1)"},
        {filter:"brightness(2)",transform:"scaleY(1.6)"},
        {filter:"brightness(1)",transform:"scaleY(1)"}
      ],{duration:380,easing:"ease-out"});
    }

    displayedHp[player]=hp[player];
    displayedGauge[player]=gauge[player];
  });

  updateDisabledActions();
}

/* =========================
   ゲージ不足技を暗くする
========================= */

function updateDisabledActions(){
  [1,2].forEach(player=>{
    const techs = player===1 ? player1Techs : player2Techs;
    techs.forEach((tech,index)=>{
      const el=document.getElementById(`p${player}tech${index}`);
      if(!el || !tech)return;
      const opponent=player===1?2:1;
      let disabled=tech.cost>gauge[player];
      if(tech.skill==="tech7" && (!lastAction[player] || lastAction[player].data.type!=="charge")) disabled=true;
      if(tech.skill==="tech8" && gauge[opponent]>=7) disabled=true;
      if(blockSeal[player] && tech.skill==="tech5") disabled=true;
      el.classList.toggle("disabled",disabled);
    });
  });
}


/* =========================
   初期化
========================= */

updateTechniqueDisplay();

</script>

</body>
</html>
