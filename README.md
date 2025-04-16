# 英語発音評価システム

Azure Speech APIを使用した英語発音評価システムです。中学生向けに、フリートークや原稿読み上げを通じて発音のフィードバックを提供します。

## 機能

- フリートークモード
- 原稿読み上げモード
- リアルタイム音声認識
- 発音フィードバック

## セットアップ

1. 必要なパッケージのインストール:
```bash
npm install
```

2. 環境変数の設定:
`.env.local`ファイルを作成し、以下の情報を設定してください：
```
NEXT_PUBLIC_AZURE_SPEECH_KEY=your_azure_speech_key_here
NEXT_PUBLIC_AZURE_SPEECH_REGION=your_azure_region_here
```

3. 開発サーバーの起動:
```bash
npm run dev
```

## 使用方法

1. ブラウザで `http://localhost:3000` にアクセス
2. 練習モード（フリートークまたは原稿読み上げ）を選択
3. 「録音開始」ボタンをクリックして話し始める
4. 録音を停止すると、認識されたテキストとフィードバックが表示されます

## 注意事項

- Azure Speech APIの利用には有効なサブスクリプションキーが必要です
- ブラウザのマイクアクセスを許可する必要があります
- 推奨ブラウザ: Chrome, Edge, Firefox 