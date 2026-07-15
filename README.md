# Multilingual Family Roadmap

> **⚠️ ライセンスについて / License**
> 本リポジトリはソース公開(source-available)であり、オープンソースではありません。
> **無断転載・商用利用・改変版の頒布を禁止します。** 詳細は [LICENSE](LICENSE) を参照してください。
> This is source-available software, **not open source**. See [LICENSE](LICENSE).

マルチリンガル家庭の**家族全員(親と子)**が、それぞれの言語構成
(母語/第一外国語/第二外国語)と目標レベルに合わせたロードマップを引き、
「できたことチェックリスト+達成日」方式で進捗を記録・可視化するアプリです。

親と子で母語が違ってしまうマルチリンガル家庭の「継承語が手遅れになる」問題に、
家族単位のバランスビューと継承語アラートで早期に気づけるようにします。

- 対応言語:日本語・英語・中国語(標準語)・韓国語・ポルトガル語・スペイン語
- レベル軸:S1(入門)〜S6(上級)、CEFR対応。大人も子供も同じ軸で使用
- 仕様の全文:[開発プロンプト v3](../multilingual-family-roadmap-prompt-v3.md)
- コンテンツ設計のたたき台:[docs/level-design.md](docs/level-design.md)

## 開発状況

v2実装(trilingual-roadmap)を土台に v3 要件へ改修中。

## 起動方法

```bash
npm install
npm run dev      # 開発サーバー
npm test         # ユニットテスト(vitest)
npm run build    # 本番ビルド(dist/)
```

## 技術スタック

React 18 + TypeScript + Vite / Tailwind CSS v4 / Recharts / Dexie(IndexedDB)。
ローカルファースト設計でデータは端末外に出ません。PWA対応。
