# 友達対戦のルール設定

「友達対戦」→「部屋を作る」→ルール設定→「このルールで部屋を作成」の順で進みます。設定画面を開いたり、戻ったりするだけでは部屋を作りません。

- **Standard**: 従来どおりHP10・初期ゲージ8・最大ゲージ10・基礎技3種＋選択技3種。
- **Advanced**: HP10・初期ゲージ8・最大ゲージ10。試合前にスキルを1つ選び、各ターン開始時の3秒間に発動できます。詳細は [ADVANCED.md](ADVANCED.md)。
- **Custom**: 両プレイヤー共通のHP・初期ゲージ・最大ゲージを設定。HPと最大ゲージは1〜100の整数、初期ゲージは0〜最大ゲージの整数。基礎技3種＋選択技3種、技の効果・コスト・封印解除条件などはStandardと同じです。設定したHPが回復上限にもなります。「スキルモード」「スペシャルモード」は小さいチェックボックスで個別に追加でき、両方の同時使用もできます。

入室一覧にはStandard／Advanced／Customを表示し、Customは数値も表示します。旧形式の部屋はStandardとして扱います。Standardとランダム対戦は既存の保存形式・ルールを維持します。

## 本番でCustomを有効にする

GitHub Pagesへの公開だけでは、Realtime Databaseのルールは更新されません。

1. 進行中の対戦を終えます。
2. [Firebase ConsoleのRealtime Databaseルール画面](https://console.firebase.google.com/project/psy-5d3d1/database/psy-5d3d1-default-rtdb/rules)を開きます。
3. この変更と同じリビジョンの `firebase-database.rules.json` **全文**を貼り付けて「公開」します。既存ルールの一部を削除したり、読み書きを全許可したりしないでください。
4. 両方の端末でページを再読み込みし、新しいCustomの部屋を作成します。

ルール未更新の環境でもStandardは作成できます。Customはルール対応の有無を確認してから作成し、未対応の場合は保存せずメッセージを表示します。ルールを更新したらページを再読み込みしてください。

Custom設定は `friendRooms/<room>/roomRules` から `freeGames/<game>/roomRules` にコピーします。作成後の変更・削除、異なる設定での入室、設定を省略した入室をDBルールで拒否します。履歴にも同じ設定を保存し、回復・チャージ上限・自動選択・観戦表示・再生で使用します。Customは通常は戦闘ルール2、スペシャル有効時は戦闘ルール3を使用し、友達対戦としてレート変動はありません。

## 検証

- `node tests/friend-room-rules.test.cjs`: 実ルールを使った作成・入室・初期値・ターン進行・精算・履歴・観戦、675組のCustomの行動組み合わせ、数値と改ざんの検証。
- `node tests/friend-lobby-ui.test.cjs`: Playwright/ChromiumでPC・スマホ幅の設定画面、キャンセル、入力検証、再試行、二重作成防止、部屋の種類表示、入室を確認。
- `node tests/spectator-ui.test.cjs`: Standardに加え、CustomのHP・ゲージ表示とバーの比率を確認。
- `node tests/punish.test.cjs`, `node tests/battle-rules.test.cjs`, `node tests/turn-gap.test.cjs`: Standard・既存対戦の回帰検証。

ブラウザーテストでは `PLAYWRIGHT_MODULE` と `PLAYWRIGHT_CHROMIUM_EXECUTABLE` を任意指定できます。本番Firebaseではなく、ローカルのテストデータで検証します。
