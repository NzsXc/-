## 2026/10/26：S技5つの追加効果・S消費変更

このリポジトリの `firebase-database.rules.json` 全文を、Firebase Console → Realtime Database → ルールへ貼り付けて公開してください。GitHubへの反映だけではFirebase側のルールは更新されません。

新しいスペシャル対戦は `rulesVersion:4`・`special.version:4`。Sドレイン8、Sブラスト10、Sフリーズ16、Sリファンド4、Sヴェノム12を追加し、Sパニッシュ・SモーメンタムはS消費10です。ルール側でも消費・装備・各効果・弱体の残りターンを検証します。既存のspecial.version 1〜3の対戦・履歴は旧仕様を保持します。

`freeGames/_protocol/advanced/specialMovesV3` の読取権限で公開済みか確認します。対応ルールが未公開の場合、新しいスペシャル部屋の作成・参加時に更新を案内します。通常モードは引き続き利用できます。

# Turn synchronization rules update

## スキル発動時の permission_denied（2026/10/24）

スキルの保存時刻を端末の `Date.now() + serverTimeOffset` からFirebaseの `serverTimestamp()` に変更しました。従来は推定時刻がサーバーより少し未来になったり、通信で500ms以上経過したりすると、受付中に押してもルールに拒否される場合がありました。[Firebase公式説明](https://firebase.google.com/docs/database/web/offline-capabilities#handling_latency)でも、時刻オフセットは通信遅延の影響を受ける推定値とされています。

画面の受付は3秒、受信確認の猶予は500msです。DB側はサーバーの `now` で共通の受信確認時刻より前に届いたことを判定します。未来時刻・古い時刻の拒否、所有者、1ターン1回、使用上限、履歴との同時保存は維持します。確認時刻以降の遅延送信は引き続き拒否します。

1. 進行中の対戦を終了します。
2. 先に、この変更の `firebase-database.rules.json` 全文をRealtime Databaseの「ルール」で公開します。既存のクライアントも従来の受付条件で利用できます。
3. この変更のクライアントコードをGitHub Pagesに反映し、両端末でページを再読み込みして新しい部屋を作成します。

GitHub側への反映だけではFirebaseルールは公開されません。クライアントだけ先に更新すると、締切直前にサーバー受信時刻で送った記録が旧ルールに拒否されるため、上記の順で反映してください。保存済みの試合や履歴の書き換えは不要です。

検証は `tests/skill-timestamp.test.cjs`、`tests/advanced-latency.test.cjs` と既存のスキル・時計・進行・観戦・履歴テストで実際のルール式を評価します。公式エミュレーターや本番Firebaseでの2端末試験とは別のローカル検証です。

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

## Customの追加モード（2026/10/22）

Customに「スキルモード」「スペシャルモード」のチェックボックスを追加しました。両方の同時使用も可能です。HP・初期ゲージ・最大ゲージはCustomの設定を保ちます。

オンラインで使うには、このコミットの `firebase-database.rules.json` 全体をRealtime Databaseの「ルール」に貼り付けて公開してください。`customOptionsV1` の読み取りで対応を確認し、公開前は追加モードの部屋作成・参加を案内付きで止めます。既存のStandard／Advanced／追加なしCustomの形式は維持しています。

ルールの更新処理は `tests/upgrade-custom-options-rules.cjs` にあります。数値上限をCustom設定に合わせ、共通の計算検証をまとめて256 KiB以内に収めています。再生成時の式整形にはAcorn 8とAstring 1を使い、整形前後の構文木を比較します。
