# ホーム・技選択・結果演出と、購入できるカード背景

- スタート後のホーム（modeScreen）に「星雲の航路」を適用。白い光跡は65本から98本へ増やし、約50%増としています。
- 技選択は装備カートリッジ。各ボックスの波の背景は白・灰・黒のみで、3枠の位相をずらしています。既存の重複選択の回避、S技の説明、ゲージ消費は維持します。
- 勝敗は結晶戴冠。結晶片とフレームが継続して動きます。BOT・オンラインは自分から見たVICTORY／DEFEAT、同じ端末の2人対戦と観戦はWINNERです。引き分け・切断を勝利として扱いません。画面を離れると演出を破棄します。
- 称号の一覧は収蔵インデックス。称号の内容・所持・保存条件は既存のままです。
- 称号画面の「プレイヤーカードの背景」から黒曜プラチナ・深海プリズムを各100コインで購入できます。初回購入時に装備し、その後の切替と標準への復帰は無料です。
- 背景はランキングから開くプレイヤーカードに適用します。名前、現在・最高レート、称号3枠、勝利数3種、技TOP 3と使用回数、対戦履歴の導線は保持します。

## 保存と購入

選択・所有権は playerCardStyles/<uid> の owned/obsidian、owned/abyss と selected に保存します。既存のcoinWalletsの形と称号3枠、バトル用フレームは変更しません。

残高100コインの減算と所有権の追加は、同一のRealtime Database更新に含めます。ルールが残高・他の財布情報・もう一方の所有権を検証します。2種類を100コインで取得する更新、名前色の購入との同時取得、未購入の装備、他人の設定変更、所有権の削除を拒否します。別タブの同時購入は最新値を読み直し、同じ背景は二重課金しません。

## 公開

GitHubへのマージだけではFirebaseの購入ルールは公開されません。次の順で反映します。

1. 既存の本番ルールをバックアップし、差分がcoinWalletsの購入検証とplayerCardStylesだけであることを確認します。
2. Firebaseの対象プロジェクトに認証済みの環境で、次を実行します。

    firebase deploy --only database --project psy-5d3d1

   またはFirebase ConsoleのRealtime Database「ルール」にfirebase-database.rules.jsonの完全版を公開します。既存データやルールを部分的に置き換えないでください。
3. mainのHTML・JS・CSSを通常のGitHub Pages公開で反映します。
4. ログイン済みユーザーで購入・残高・再読み込み後の所有権・背景選択を確認します。

ルールが未公開の場合、購入できたようには表示せず、背景情報の取得または保存の失敗を表示します。既存の称号・名前色と対戦は維持します。

## 検証

- node tests/card-style-purchases.test.cjs
- FIREBASE_DATABASE_EMULATOR_JAR=/path/to/database.jar node tests/card-style-emulator.test.cjs
- node tests/game-motion-ui.test.cjs

GitHub Actionsでも同じチェックを実行します。公式Realtime Databaseエミュレーターは本番認証を使わず、demo専用の名前空間で完全版ルールをコンパイル・検証します。
