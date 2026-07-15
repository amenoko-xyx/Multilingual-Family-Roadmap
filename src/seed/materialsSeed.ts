import type { Material } from '../types'

/** 推奨教材の初期テンプレート(編集・追加・削除可能) */
export const MATERIALS_SEED: Material[] = [
  // ---- 英語 ----
  { id: 'm-en-01', title: 'Super Simple Songs', type: 'video', languages: ['en'], skills: ['listening', 'speaking'], ageRange: [0, 5], url: 'https://supersimple.com/', note: '歌でインプット。親子で一緒に歌うのが効果的' },
  { id: 'm-en-02', title: 'Peppa Pig(英語版)', type: 'video', languages: ['en'], skills: ['listening'], ageRange: [2, 7], note: '短くて日常語彙が豊富。英語のまま見せる' },
  { id: 'm-en-03', title: 'CTP絵本(Learn to Read)', type: 'book', languages: ['en'], skills: ['reading', 'listening'], ageRange: [3, 7], note: 'パターン文で音読導入に最適' },
  { id: 'm-en-04', title: 'Oxford Reading Tree(ORT)', type: 'book', languages: ['en'], skills: ['reading'], ageRange: [4, 9], note: '段階別多読の定番。Stage 1から週3冊ペースで' },
  { id: 'm-en-05', title: 'Raz-Kids', type: 'app', languages: ['en'], skills: ['reading', 'listening'], ageRange: [5, 12], url: 'https://www.raz-kids.com/', note: 'レベル別電子書籍。音声付きで多読量を稼げる' },
  { id: 'm-en-06', title: 'オンライン英会話(子供向け)', type: 'online-lesson', languages: ['en'], skills: ['speaking', 'listening'], ageRange: [4, 18], note: 'Novakid・QQキッズ等。週1〜2回の発話機会を確保' },
  { id: 'm-en-07', title: '英検5級 でる順パス単', type: 'workbook', languages: ['en'], skills: ['reading'], ageRange: [6, 10], note: '初めての検定対策に' },
  { id: 'm-en-08', title: 'Magic Tree House', type: 'book', languages: ['en'], skills: ['reading'], ageRange: [8, 12], note: '初級チャプターブックの定番' },
  { id: 'm-en-09', title: '英語日記ドリル', type: 'workbook', languages: ['en'], skills: ['writing'], ageRange: [8, 13], note: '1日1文から。書く習慣づくり' },
  { id: 'm-en-10', title: '英語オーディオブック(Audible等)', type: 'app', languages: ['en'], skills: ['listening'], ageRange: [8, 18], note: '耳からの多読。移動時間の活用に' },
  { id: 'm-en-11', title: 'Wonder(ペーパーバック)', type: 'book', languages: ['en'], skills: ['reading'], ageRange: [11, 15], note: 'YA入門の定番。映画と併用も◎' },
  { id: 'm-en-12', title: 'BBC Learning English', type: 'video', languages: ['en'], skills: ['listening'], ageRange: [12, 18], url: 'https://www.bbc.co.uk/learningenglish', note: 'ニュース英語への橋渡し' },
  { id: 'm-en-13', title: '英検準1級 過去問・パス単', type: 'workbook', languages: ['en'], skills: ['reading', 'writing'], ageRange: [14, 18], note: 'B2レベルの総仕上げ' },
  { id: 'm-en-14', title: 'IELTS公式問題集', type: 'workbook', languages: ['en'], skills: ['writing', 'reading', 'listening', 'speaking'], ageRange: [15, 18], note: '海外大学出願を視野に入れる場合' },
  { id: 'm-en-15', title: 'エッセイ添削サービス', type: 'online-lesson', languages: ['en'], skills: ['writing'], ageRange: [12, 18], note: 'ライティングは添削フィードバックが不可欠' },

  // ---- 中国語 ----
  { id: 'm-zh-01', title: '中国語童謡(贝瓦儿歌 等)', type: 'video', languages: ['zh'], skills: ['listening'], ageRange: [0, 5], note: '声調の音感づくり。かけ流しでOK' },
  { id: 'm-zh-02', title: 'Little Fox Chinese', type: 'app', languages: ['zh'], skills: ['listening', 'reading'], ageRange: [4, 10], url: 'https://chinese.littlefox.com/', note: 'レベル別アニメ絵本。英語版と同シリーズ' },
  { id: 'm-zh-03', title: '四五快读', type: 'book', languages: ['zh'], skills: ['reading'], ageRange: [5, 9], note: '漢字認識のロングセラー教材' },
  { id: 'm-zh-04', title: '拼音学習アプリ(悟空拼音 等)', type: 'app', languages: ['zh'], skills: ['reading'], ageRange: [5, 9], note: 'ゲーム感覚で拼音を習得' },
  { id: 'm-zh-05', title: '拼音付き中国語絵本', type: 'book', languages: ['zh'], skills: ['reading'], ageRange: [5, 10], note: '拼音を頼りに一人読みへ移行' },
  { id: 'm-zh-06', title: 'YCT公式テキスト', type: 'workbook', languages: ['zh'], skills: ['reading', 'listening'], ageRange: [6, 12], note: '子供向け検定で目標設定しやすい' },
  { id: 'm-zh-07', title: 'オンライン中国語レッスン(子供向け)', type: 'online-lesson', languages: ['zh'], skills: ['speaking', 'listening'], ageRange: [5, 18], note: 'CCレッスン等。週1回の発話機会を確保' },
  { id: 'm-zh-08', title: '汉字なぞり書きワーク', type: 'workbook', languages: ['zh'], skills: ['writing'], ageRange: [4, 9], note: '筆順と字形の基礎づくり' },
  { id: 'm-zh-09', title: 'HSK Standard Course(标准教程)', type: 'workbook', languages: ['zh'], skills: ['reading', 'writing', 'listening'], ageRange: [11, 18], note: 'HSK対策の定番教科書' },
  { id: 'm-zh-10', title: '中国語ドラマ・バラエティ(字幕付き)', type: 'video', languages: ['zh'], skills: ['listening'], ageRange: [12, 18], note: '中国語字幕付きで大量インプット' },
  { id: 'm-zh-11', title: 'HSK4級 過去問・単語帳', type: 'workbook', languages: ['zh'], skills: ['reading', 'writing'], ageRange: [14, 18], note: '最終目標レベルの総仕上げ' },

  // ---- 日本語 ----
  { id: 'm-ja-01', title: '読み聞かせ絵本(福音館・偕成社 等)', type: 'book', languages: ['ja'], skills: ['listening', 'reading'], ageRange: [0, 6], note: '毎日10分。語彙の土台づくり' },
  { id: 'm-ja-02', title: 'くもん ひらがなドリル', type: 'workbook', languages: ['ja'], skills: ['writing'], ageRange: [3, 6], note: '運筆からひらがなへ段階的に' },
  { id: 'm-ja-03', title: 'かいけつゾロリ シリーズ', type: 'book', languages: ['ja'], skills: ['reading'], ageRange: [6, 9], note: '一人読みへの移行に最適' },
  { id: 'm-ja-04', title: '音読ドリル', type: 'workbook', languages: ['ja'], skills: ['reading', 'speaking'], ageRange: [6, 10], note: '毎日1ページ。流暢さと語彙の定着' },
  { id: 'm-ja-05', title: '漢検 ステップ シリーズ', type: 'workbook', languages: ['ja'], skills: ['reading', 'writing'], ageRange: [6, 18], note: '学年相当の級を年1回受検すると目安になる' },
  { id: 'm-ja-06', title: '作文・日記ドリル', type: 'workbook', languages: ['ja'], skills: ['writing'], ageRange: [6, 12], note: '書く習慣づくり。テーマ付きが続けやすい' },
  { id: 'm-ja-07', title: '子ども新聞(朝日小学生新聞 等)', type: 'book', languages: ['ja'], skills: ['reading'], ageRange: [8, 14], note: '説明文・時事語彙のインプット' },
  { id: 'm-ja-08', title: 'ちくまプリマー新書', type: 'book', languages: ['ja'], skills: ['reading'], ageRange: [13, 18], note: '評論文への入り口として' },
  { id: 'm-ja-09', title: '小論文練習ノート', type: 'workbook', languages: ['ja'], skills: ['writing'], ageRange: [15, 18], note: '構成メモ→800字の練習を繰り返す' },
]
