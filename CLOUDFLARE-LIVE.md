# 公開版ソース（2026-11-04）

公開先: https://mind-battle.nzzs.workers.dev/

Cloudflareの公開バージョン `b8f53696-f745-4203-b5b6-ed236f717033` と、同バージョンが配信する画面・スクリプト・スタイルをGitHubへ同期しました。

## ファイルの場所

- 画面、ブラウザ用JavaScript、CSS: リポジトリ直下と `advanced/`。
- 公開中のWorkerモジュール: `cloudflare/worker.mjs`、`cloudflare/solo-core.mjs`、`cloudflare/solo-assets.mjs`。
- 公開Workerが優先配信する7ファイルは `cloudflare/solo-assets.mjs` にも埋め込まれています: `index.html`、`ranked-client.js`、`solo-options.js`、`solo-options.css`、`titles-client.js`、`player-card-style-shop.js`、`profile-radar.mjs`。

## 今後の編集

通常のソースファイルを編集します。上記7ファイルを変更した場合は、`node scripts/sync-worker-assets.cjs` を実行して埋め込み内容とETagを更新してください。

この同期はGitHubのソース更新です。GitHubへの保存だけでCloudflareの公開サイトが更新される構成にはしていません。Cloudflareへ反映する場合は、既存のASSETSとGAME_AIバインディング、Firebaseの環境変数を保ったうえで、Workerと静的アセットを更新します。

現在のASSETS設定では、既存の保護対象パスに加え、`/`、`/index`、`/index.html` と上記6つのJS/CSSファイルをWorkerへ先に渡します。公開中のWorkerには認証済みAI API、CPU対戦、履歴解析・プロフィール集計が含まれます。

Firebaseのデータベースルール、保存済みの対戦履歴、学習状態などの実行時データは今回のソース同期の対象外です。従来の開発用ファイルとテストは保持しています。

## 同期時の検証

- 公開アセット152件を、テキストの改行コードを除いて照合済み。
- 埋め込み7ファイルと編集用ソースの一致、変更・追加したJavaScript等29ファイルの構文を確認済み。
- 既存テスト18件中15件が成功。`guide-details.test.cjs` は従来の固定AI評価を前提にしているため失敗。`custom-options.test.cjs` と `custom-modes.test.cjs` は、リポジトリに残るFirebaseルールがS技version 6に対応していないため、新仕様開始時の確認で失敗します。公開版のソースを同期するため、ゲームコードや未取得の本番Firebaseルールはこの同期で変更していません。
