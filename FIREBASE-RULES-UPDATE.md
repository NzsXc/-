# Turn synchronization rules update

## 公開方法

1. Firebase Console の `psy-5d3d1` → Realtime Database →「ルール」を開きます。
2. `firebase-database.rules.json` の全文に差し替えて「公開」を押します。
3. 両方の端末で対戦ページを再読み込みします。進行中の対戦は先に終了してください。

データの削除は不要です。GitHubへの反映だけではFirebaseルールは公開されません。
未公開の間は旧ルールに合わせた動作になります。待ち時間短縮・更新担当の排他制御・
50回称号の保存をすべて有効にするには、この公開が必要です。

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
