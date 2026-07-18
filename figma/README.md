# Figmaデザインシステム移行キット

アプリの実装(`src/index.css` / `src/components/ui.tsx`)から抽出した
**Variables・コンポーネント・画面雛形**をFigmaに再現するためのキットです。
案C(自作プラグイン+実画面の取り込み)の手順をまとめています。

## 1. プラグインでデザインシステムを生成する(メイン)

**用意するもの:** Figma **デスクトップアプリ**(開発プラグインの読み込みに必要。ブラウザ版は不可)

1. Figmaで新規デザインファイルを作成(または既存ファイルを開く)
2. メニュー → **Plugins → Development → Import plugin from manifest…**
3. このフォルダの `plugin/manifest.json` を選択
4. **Plugins → Development → MFR Design System Generator** を実行

### 生成されるもの

| 種類 | 内容 |
|---|---|
| Variables「MFR Colors」 | brand 50〜950 / neutral / 役割色(母語・第一外国語・第二外国語のbg・text・border・graphic)/ ステータス色6種 |
| Variables「MFR Layout」 | radius(sm〜full)/ spacing(4〜32) |
| テキストスタイル | MFR/Heading H1〜H3・Body・Caption・Label |
| 🧩 Components ページ | LangChip(役割4種)/ StatusBadge(6種)/ SkillLabel(4技能・縦積み)/ Button(primary・secondary)/ Card / CheckRow(チェック右端)/ ProgressBar / Segmented / StepIndicatorItem / BottomNavItem — 主要な塗り・線はVariablesにバインド済み |
| 📱 Screens ページ | ホーム/オンボーディング(ことばの設定)の雛形2枚(コンポーネントのインスタンスで構成) |

### 補足
- フォントは **Noto Sans JP** を使用(Figma標準のGoogle Fontsにあります)。環境に無い場合はInterへ自動フォールバック(日本語が□になるのでNoto Sans JPの利用を推奨)
- アイコンは絵文字プレースホルダです。Community の **Material Symbols** プラグイン等で差し替えてください(実装は Material Symbols Rounded)
- 生成は追記型です。まっさらなファイルで実行するのがおすすめ

## 2. 実画面を参照用に取り込む(html.to.design)

1. Figma Community で **html.to.design**(divRIOTS)をインストール
2. プラグインを起動し、URLに公開サイトを入力して Import:
   - `https://amenoko-xyx.github.io/Multilingual-Family-Roadmap/`(ホーム)
   - `…/#/roadmap` `…/#/gap` `…/#/plan` `…/#/settings` `…/#/family` `…/#/onboarding`
3. 取り込んだ画面は「参照用ページ」に置き、①のコンポーネントで組み直すのが推奨ワークフローです
   (html.to.designの出力はコンポーネント化されていない平置きレイヤーのため)

※ データが入った状態を取り込みたい場合は、手元でアプリを操作してから
ブラウザ拡張版のhtml.to.designでキャプチャする方法もあります。

## 3. (代替)Tokens Studio でVariablesだけ入れる

プラグインを使わずVariablesだけ欲しい場合:

1. Figma Community で **Tokens Studio for Figma** をインストール
2. プラグインの Tools → **Load from file/folder or preset** → `tokens.json` を読み込み
3. Styles & Variables → **Export to Figma**(Variables として書き出し)

## 色の対応表(実装との対応)

- ブランド: `#3859FF`(brand/600)を基準とした50〜950スケール
- 言語の役割色: 母語=薄(brand100系)→ 第一外国語(brand300系)→ 第二外国語=鮮(brand500系)。チャート・GeoBanner用のgraphic色は `#9badff / #5c76ff / #3859ff`
- ステータス: 達成=emerald600 / 先行=sky系 / 順調=emerald系 / やや遅れ=amber系 / 要注意=rose系 / 未記録=neutral系
