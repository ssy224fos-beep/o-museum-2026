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

CSVの列順は `floor, number, artist, title, museum, place, memo, rank` です。
日本語では「フロア、作品番号、作家名、題名、所蔵先美術館、所蔵都市/所蔵国、メモ、ランク」に対応します。

ランクは確認済みのS・A・Bを入力し、それ以外は空欄にしています。Sは赤、Aはゴールドで表示されます。

CSVを編集した後、Pythonを利用できる場合はこのフォルダーで `python generate_data.py` を実行すると、JS版とJSON版が自動更新されます。Pythonを利用しない場合は、`artworks.js` の同じ項目も合わせて編集してください。
