# かぞえよう！ 🔢

こどもようの かず かぞえゲームです。ものの かずを かぞえて こたえよう！

## ゲームのとくちょう

- **3つの なんいど**: かんたん・ふつう・むずかしい（かくなんいど 5もん）
- **2つの かいとうほうほう**: せんたく（すうじボタン）/ てがき（マウス・タッチ）
- **ビジュアルな こたえあわせ**: せいかいの かずを ひとつずつ かぞえる アニメーション
- **クリアきろく**: クリアした ステージは ⭐ マークで ひょうじ
- PC・タブレット・スマホ たいおう

## かいはつかんきょう

### ひつようなもの

- Node.js (v18 いじょう)
- npm

### ローカルかいはつ

```bash
# かいはつサーバーをきどう（Python3がひつよう）
npm run dev
# ブラウザで http://localhost:8080 をひらく
```

Python3 がない場合は、`src/` ディレクトリを任意の HTTP サーバーで配信してください:

```bash
# 例: npx を使う場合
npx serve src

# 例: PHP の場合
php -S localhost:8080 -t src
```

### プロジェクトこうぞう

```
src/
  index.html      ... メインHTML
  style.css       ... スタイルシート
  stages.js       ... ステージデータ定義
  handwriting.js  ... 手書き数字認識モジュール
  game.js         ... メインゲームロジック
```

## ビルド

```bash
npm run build
```

`dist/` ディレクトリに配信用ファイルが生成されます。

## Google Cloud Storage でのこうかい

### 1. GCS バケットのさくせい

```bash
# プロジェクトを設定
gcloud config set project YOUR_PROJECT_ID

# バケットを作成（リージョンは適宜変更）
gsutil mb -l asia-northeast1 gs://YOUR_BUCKET_NAME
```

### 2. バケットを Web サイトホスティング用に設定

```bash
# メインページとエラーページを設定
gsutil web set -m index.html -e index.html gs://YOUR_BUCKET_NAME

# 公開アクセスを許可
gsutil iam ch allUsers:objectViewer gs://YOUR_BUCKET_NAME
```

### 3. ビルド & デプロイ

```bash
# ビルド
npm run build

# dist/ の中身をバケットにアップロード
gsutil -m rsync -r -d dist/ gs://YOUR_BUCKET_NAME

# キャッシュヘッダーを設定（オプション）
gsutil -m setmeta -h "Cache-Control:public, max-age=3600" gs://YOUR_BUCKET_NAME/**
```

### 4. アクセス

バケットに直接アクセスする場合:
```
https://storage.googleapis.com/YOUR_BUCKET_NAME/index.html
```

カスタムドメインを使う場合は、ロードバランサー経由で設定してください:
- [Cloud Storage でのウェブサイトホスティング](https://cloud.google.com/storage/docs/hosting-static-website)

### CI/CD（オプション）

Cloud Build を使って自動デプロイする場合、`cloudbuild.yaml` を作成:

```yaml
steps:
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'build']
  - name: 'gcr.io/cloud-builders/gsutil'
    args: ['-m', 'rsync', '-r', '-d', 'dist/', 'gs://YOUR_BUCKET_NAME']
```

## ライセンス

ISC
