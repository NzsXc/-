# Turn synchronization rules update

## 公開方法

1. Firebase Console の `psy-5d3d1` → Realtime Database →「ルール」を開きます。
2. `firebase-database.rules.json` の全文に差し替えて「公開」を押します。
3. 両方の端末で対戦ページを再読み込みします。進行中の対戦は先に終了してください。

データの削除は不要です。GitHubへの反映だけではFirebaseルールは公開されません。
未公開の間は旧ルールに合わせた動作になります。待ち時間短縮・更新担当の排他制御・
50回称号の保存をすべて有効にするには、この公開が必要です。

## パニッシュ変更（戦闘ルール2）

このファイルにはパニッシュの更新も含みます。通常2ダメージ・消費ゲージ5は維持し、
チャージ中への追加ダメージを1、使用時の相手ゲージ減少を1にします。
ゲージ減少は獲得・奪取の処理後に適用し、0未満にはなりません。
ブロック・カウンター・攻撃の相殺でもゲージ減少は発生します。

公開後に新しく作る対戦に `rulesVersion: 2` を保存します。
既存の進行中対戦・以前の履歴は旧ルールのまま保存・再生します。
ルールを公開する前も対戦は継続できますが、オンラインの効果は旧ルールです。
両端末を再読み込みしてから、新しい対戦を開始してください。

Publish `firebase-database.rules.json` in Firebase Console → psy-5d3d1 →
Realtime Database → Rules. This file upgrades the supplied published rules;
it is not a permissive replacement. Do not delete battle/account data.

Reload both clients after publishing. Before the rules update, the new client
detects the old rules and uses their 7.5-second opening, so early input is not
sent into a 1.4-second rejection window. The full short timeline and atomic
turn ownership require the rules update.

Changes:

- Optional `state.previousDeadline` is verified against the prior turn's
  exact input deadline. Both clients use the same capped countdown end.
- The next input opens 3100 ms after that end (call 500 ms, technique 1300 ms,
  effect 1200 ms, margin 100 ms), with a full 10-second input window.
- `advance/<turn>` is a participant-only transaction claim. Only its owner
  can advance the state while the claim exists. The other participant can
  take over if the owner disconnects for 15 seconds.
- Move, grace, resignation, settlement and history timing clauses agree.
  Legacy states with no timing field retain their existing 7.5/5.6-second
  rules. History validates the optional field copied from the final state.
- `skill_prestige_1` through `skill_prestige_12` require 50 verified uses.
  Existing title IDs and all other rules are preserved.

Local checks: `node tests/turn-gap.test.cjs`,
`node tests/battle-rules.test.cjs`, `node tests/titles-release.test.cjs`.
These evaluate the actual rule expressions in a local test harness; they do
not claim to be a live Firebase or Firebase Emulator integration test.

## フォーサイトのシールド変更

`firebase-database.rules.json` の全文を上記のFirebase Consoleで公開し、両端末を再読み込みしてください。
公開後に新しく作成したオンライン対戦から、フォーサイトはブリーチ・Sブリーチなどの貫通攻撃も防ぎます。
反射ダメージはありません。消費ゲージ1、相手がチャージした場合のゲージ+3、
通常ブロックとまとめた連続使用禁止、アンチガードによる封印は従来どおりです。
エフェクトは変更していません。

対戦作成時に `foresightShield: true` を保存します。この値は対戦途中で変更できません。
公開前・更新前に開始したオンライン対戦は旧効果で継続し、過去の履歴も旧効果で再生します。
ローカル対戦とBOT戦には新効果を適用します。

確認: `node tests/foresight-shield.test.cjs`、`node tests/punish.test.cjs`。
Firebase本番へのルール公開は、これらのローカルテストやGitHubへのコミットでは実行されません。
