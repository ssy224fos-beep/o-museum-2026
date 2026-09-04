# 展示作品一覧 GitHub Pages

## 公開手順

1. GitHubで新しいRepositoryを作成します。
2. このフォルダー内のファイルとフォルダーを、構成を変えずにすべてアップロードします。
3. Repositoryの `Settings` → `Pages` を開きます。
4. `Build and deployment` のSourceを `Deploy from a branch` にします。
5. Branchを `main`、フォルダーを `/(root)` にして `Save` を押します。
6. 数分後、同じ画面に表示されるURLをiPhoneで開きます。

## 作品データの更新

- 編集用データ: `data/artworks.csv`（Excelで開けます）
- サイト表示用データ: `data/artworks.js`
- JSON版: `data/artworks.json`

CSVの列順は `floor, room, number, artist, title, museum, place, memo, rank` です。
日本語では「フロア、展示室番号、作品番号、作家名、題名、所蔵先美術館、所蔵都市/所蔵国、メモ、ランク」に対応します。

選択中フロアの展示室番号がフロアボタンの下に表示され、展示室・ランク・キーワードを組み合わせて絞り込めます。ランクはS〜Eで表示され、Sは赤、Aはゴールドです。S・Aランクの作品カードには、日本語版Wikipediaへのリンクが表示されます。

各フロアページの固定ヘッダー右上に `MAP` ボタンがあります。押すと現在のフロアだけのマップをオーバーレイ表示し、iPhoneではピンチ操作とスクロールで拡大・移動できます。`×`、オーバーレイ外側、またはEscキーで閉じられます。マップ画像は `assets/maps/` に保存しています。

## 作品リンクの追加・編集

1. GitHubでFine-grained personal access tokenを作成します。
2. Repository accessは `ssy224fos-beep/o-museum-2026` のみに限定します。
3. Repository permissionsの `Contents` を `Read and write` にします。
4. サイト上で対象作品を開き、`管理者用：リンクを編集` を押します。
5. URLを1行に1件ずつ入力し、トークンを入力して `GitHubへ保存` を押します。

リンクは `data/links.json` に保存され、GitHub Pagesの更新後に全端末へ反映されます。入力したトークンはソースコードや永続ストレージには保存せず、保存成功後に現在のタブの `sessionStorage` だけで保持します。タブを閉じると削除されます。

- YouTubeのリンク: `Y`
- QuizKnock Webサイトのリンク: `Q`
- その他のリンク: `L`

リンクを削除する場合は、編集画面で該当URLの行を消して保存します。すべての行を消して保存すると、その作品のリンク情報自体が削除されます。

CSVを編集した後、Pythonを利用できる場合はこのフォルダーで `python generate_data.py` を実行すると、JS版とJSON版が自動更新されます。Pythonを利用しない場合は、`artworks.js` の同じ項目も合わせて編集してください。
