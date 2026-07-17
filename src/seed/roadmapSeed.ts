import type { CanDoItem, Cell, Lang, Skill } from '../types'

/**
 * マスターロードマップ初期テンプレート(6言語 × 6段階 S1〜S6 × 4技能)。
 *
 * 設計方針(docs/level-design.md に準拠):
 * - Can-Do項目は「年齢非依存の行動表現」で書く。子供も大人も同じ項目で判定できる文にする
 *   (悪い例「読解力が上がる」/良い例「段階別リーダーを1冊読み切る」「今日の予定を3文で話せる」)
 * - 役割(母語 native / 外国語 foreign)の違いは Cell.benchmarks の foreign / native 表示にだけ反映する
 * - 各技能に検定以外の項目を必ず併存させる(検定合格項目も併記してよい)
 * - S6 は大人の運用(仕事のメール、講演理解、論説執筆など)を想定する
 * - id規約: `${lang}-${stage}-${skillCode}-${n}`(skillCode: l/s/r/w)
 */

interface SeedSkill {
  /** 技能サマリ(セルに表示する短い見出し) */
  summary: string
  /** Can-Do項目(1技能あたり2〜4項目) */
  items: string[]
}

interface SeedCell {
  /** 役割別ベンチマーク(外国語トラック / 母語トラック)。docs/level-design.md の表に従う */
  benchmarks: { foreign: string; native: string }
  /** 家庭での取り組み例(時間目安+関わり方) */
  tip: string
  /** 出典・根拠メモ */
  source?: string
  /** 4技能の Can-Do(listening → speaking → reading → writing の順で記述) */
  skills: Record<Skill, SeedSkill>
}

/**
 * 言語ごとの 6 段階テンプレート。配列 index 0〜5 が段階 S1〜S6 に対応する。
 * 6言語すべてを明示的に記述する(旧バージョンの置換生成 DERIVED は廃止)。
 */
const SEED: Record<Lang, SeedCell[]> = {
  // ======================= 日本語 =======================
  ja: [
    // ---- S1 入門 ----
    {
      benchmarks: {
        foreign: 'ひらがなが読める・あいさつ(JLPT未満)',
        native: '就学前(ひらがな読み)',
      },
      tip: '1日10〜15分。読み聞かせと語りかけを毎日。ひらがなはかるた・積み木など遊びで親しむ。',
      source: '幼稚園教育要領・小学校入学前の言語発達目安を参考',
      skills: {
        listening: {
          summary: 'あいさつや身近な指示がわかる',
          items: [
            '「おはよう」「ありがとう」などのあいさつを聞いて反応できる',
            '「ちょうだい」「見せて」など身近な指示を聞いて行動できる',
          ],
        },
        speaking: {
          summary: 'あいさつと身近な言葉を言える',
          items: [
            '場面に合ったあいさつ(おはよう・ありがとう・さようなら)を言える',
            '身近なものの名前を10個以上言える',
          ],
        },
        reading: {
          summary: 'ひらがなを読み始める',
          items: [
            'ひらがなをすべて読める',
            'ひらがなの短い絵本を1冊、指でたどりながら音読できる',
          ],
        },
        writing: {
          summary: '文字を書く準備ができる',
          items: [
            '自分の名前をひらがなで書ける',
            '線や丸をまねして書き、鉛筆で運筆ができる',
          ],
        },
      },
    },
    // ---- S2 初級 ----
    {
      benchmarks: {
        foreign: 'JLPT N5',
        native: '小1〜2相当 / 漢検10〜9級',
      },
      tip: '1日15〜20分。音読を毎日+短い日記の習慣化。基本の漢字を生活の中で読む機会を作る。',
      source: '学習指導要領(小学校国語)・JLPT N5・漢検級別基準を参考',
      skills: {
        listening: {
          summary: '少し長い話や続けた指示を理解できる',
          items: [
            'その日の出来事など少し長い話を聞いて内容がわかる',
            '「〜してから〜する」など2つ続けた指示を理解して行動できる',
            'JLPT N5の聴解問題で6割正解する',
          ],
        },
        speaking: {
          summary: '経験を短く順序立てて話せる',
          items: [
            'その日にあったことを3文で順序立てて話せる',
            '身近な話題で相手と数往復のやりとりができる',
          ],
        },
        reading: {
          summary: 'ひらがな中心の短い本を読める',
          items: [
            'ひらがな・カタカナの短い本を1冊一人で読み切る',
            '小1〜2配当漢字(100字程度)を読める',
            '漢検10級に合格する',
          ],
        },
        writing: {
          summary: '短い文を書ける',
          items: [
            'カタカナと小1〜2配当漢字を書ける',
            '「いつ・どこで・なにをした」を入れた3文以上の文を書ける',
          ],
        },
      },
    },
    // ---- S3 初中級 ----
    {
      benchmarks: {
        foreign: 'JLPT N4',
        native: '小3〜4相当 / 漢検8〜7級',
      },
      tip: '1日15〜20分。読書習慣(月2冊以上)+要約練習。子ども新聞やニュースにも触れる。',
      source: '学習指導要領(小学校国語)・JLPT N4・漢検級別基準を参考',
      skills: {
        listening: {
          summary: 'まとまった説明を聞いて要点をつかめる',
          items: [
            'まとまった説明を聞いて要点を自分の言葉で言い直せる',
            'JLPT N4の聴解問題で6割正解する',
          ],
        },
        speaking: {
          summary: '構成を意識して発表・意見が言える',
          items: [
            '経験や考えを「はじめ・なか・おわり」で発表できる',
            '理由を1つ添えて自分の意見を言える',
          ],
        },
        reading: {
          summary: '学年相当の本を読み通せる',
          items: [
            '150ページ程度の児童書を1冊読み切る',
            '小3〜4配当漢字を読める',
            '漢検8級に合格する',
          ],
        },
        writing: {
          summary: '段落構成のある文章を書ける',
          items: [
            '段落を分けて400字程度の文章を書ける',
            '小3〜4配当漢字を使って文章を書ける',
          ],
        },
      },
    },
    // ---- S4 中級 ----
    {
      benchmarks: {
        foreign: 'JLPT N3',
        native: '小5〜中1相当 / 漢検6〜4級',
      },
      tip: '週3〜4回×20〜30分。新聞・新書に触れ、要約と意見文を書く練習。添削で仕上げる。',
      source: '学習指導要領(小学校〜中学校国語)・JLPT N3・漢検級別基準を参考',
      skills: {
        listening: {
          summary: '論理的な話を聞き取り整理できる',
          items: [
            '講義形式の話を聞いて要点をノートに整理できる',
            'ニュースを聞いて話題と要点を説明できる',
            'JLPT N3の聴解問題で6割正解する',
          ],
        },
        speaking: {
          summary: '根拠を示して話し、敬語が使える',
          items: [
            '根拠を示して自分の意見を1分間話せる',
            '相手や場面に応じて敬語で受け答えできる',
          ],
        },
        reading: {
          summary: '説明文・記事の要点を要約できる',
          items: [
            '新聞記事や説明文の要点を3行で要約できる',
            '小5〜中1配当漢字を読める',
            '漢検5級に合格する',
          ],
        },
        writing: {
          summary: '意見文を構成立てて書ける',
          items: [
            '600〜800字の意見文を構成立てて書ける',
            '引用と自分の考えを区別して書ける',
          ],
        },
      },
    },
    // ---- S5 中上級 ----
    {
      benchmarks: {
        foreign: 'JLPT N2',
        native: '中2〜高1相当 / 漢検3〜準2級',
      },
      tip: '週3〜4回×30分。評論文の読解と小論文演習。討論やプレゼンで論理を口頭でも鍛える。',
      source: '学習指導要領(中学〜高校国語)・JLPT N2・漢検級別基準を参考',
      skills: {
        listening: {
          summary: '講演・討論の論点を整理できる',
          items: [
            '講演や討論を聞いて複数の論点を整理できる',
            'JLPT N2の聴解問題で6割正解する',
          ],
        },
        speaking: {
          summary: '筋道立てて主張し議論できる',
          items: [
            '複数の立場を踏まえて自分の主張を筋道立てて述べられる',
            '初対面の相手と敬語で会話を続けられる',
          ],
        },
        reading: {
          summary: '評論・新書の論旨を要約できる',
          items: [
            '新書や評論を読んで論旨を要約できる',
            '漢検準2級に合格する',
          ],
        },
        writing: {
          summary: '小論文・実用文書を書ける',
          items: [
            '800字の小論文を構成立てて書ける',
            '敬語を適切に使った依頼・案内の文書を書ける',
          ],
        },
      },
    },
    // ---- S6 上級(大人の運用) ----
    {
      benchmarks: {
        foreign: 'JLPT N1',
        native: '高2以上相当 / 漢検2級以上',
      },
      tip: '週4回×30〜40分。論説・専門書の読解と、仕事のメール・報告書など実務文書の作成に取り組む。',
      source: '学習指導要領(高校国語)・JLPT N1・漢検級別基準を参考',
      skills: {
        listening: {
          summary: '専門的な議論の論理構成まで把握できる',
          items: [
            '講演や専門的な議論を聞いて論理構成まで把握できる',
            'JLPT N1の聴解問題で6割正解する',
          ],
        },
        speaking: {
          summary: '会議・議論で論点を整理して発言できる',
          items: [
            '会議やプレゼンで論点を整理して発言し、質疑に応答できる',
            '抽象的・専門的な話題について立場を明確にして議論できる',
          ],
        },
        reading: {
          summary: '論説・専門文書を正確に読み取れる',
          items: [
            '論説文・専門書・契約文書などを正確に読み取れる',
            '漢検2級に合格する',
          ],
        },
        writing: {
          summary: '実務文書・論説文を書ける',
          items: [
            '仕事のメールや報告書を目的・相手に応じて過不足なく書ける',
            '1200字程度の論説文を構成立てて書ける',
          ],
        },
      },
    },
  ],

  // ======================= 英語 =======================
  en: [
    // ---- S1 入門 ----
    {
      benchmarks: {
        foreign: '英検Jr. / CEFR Pre-A1',
        native: 'US Pre-K(読み聞かせ期)',
      },
      tip: '毎日15分、英語の歌・かけ流しとフォニックス入門。親も一緒に歌って「楽しい時間」にする。',
      source: 'CEFR-J Pre-A1・英検Jr.出題範囲・US Pre-K読解目安を参考',
      skills: {
        listening: {
          summary: '英語の音と身近な語がわかる',
          items: [
            '色・数・動物など身近な英単語を聞いて絵を指させる',
            '簡単な指示(Stand up / Touch your nose)に動作で応じる',
          ],
        },
        speaking: {
          summary: '定型フレーズと単語で言える',
          items: [
            "あいさつと \"What's your name?\" に名前を英語で答えられる",
            '身近な英単語を10個以上言える',
          ],
        },
        reading: {
          summary: 'アルファベットと基本音を読める',
          items: [
            'アルファベット大文字・小文字をすべて読める',
            'フォニックスの基本音を10個以上言える',
          ],
        },
        writing: {
          summary: 'アルファベットを書ける',
          items: [
            '自分の名前をアルファベットで書ける',
            'アルファベット大文字をすべて書ける',
          ],
        },
      },
    },
    // ---- S2 初級 ----
    {
      benchmarks: {
        foreign: '英検5〜4級 / CEFR A1',
        native: 'US Grade K-1 / Lexile 〜300L',
      },
      tip: '1日30分。段階別リーダー(ORT等)の多読を週3冊+オンラインレッスン週1〜2回。',
      source: 'CEFR-J A1・英検5/4級・US Grade K-1 / Lexile基準を参考',
      skills: {
        listening: {
          summary: '日常のやりとりを聞き取れる',
          items: [
            '日常的な指示や質問を聞いて適切に応答できる',
            '短い英語アニメや朗読音声のあらすじをつかめる',
            '英検5級の聴解問題で6割正解する',
          ],
        },
        speaking: {
          summary: '自分のことを文で話せる',
          items: [
            '今日の出来事を英語3文で話せる',
            '相手と身近な話題で数往復のやりとりができる',
          ],
        },
        reading: {
          summary: '段階別リーダーの初級を読める',
          items: [
            'フォニックスのルールで知らない単語を読める',
            '段階別リーダー(ORT Stage 4〜6 / Lexile 〜300L)を1冊一人で読み切る',
            '英検5級の筆記問題で6割正解する',
          ],
        },
        writing: {
          summary: '短い英文を書ける',
          items: [
            '自分や家族について3文の英文を書ける',
            'よく使う基本単語を音から推測してつづれる',
          ],
        },
      },
    },
    // ---- S3 初中級 ----
    {
      benchmarks: {
        foreign: '英検3級 / CEFR A2',
        native: 'US Grade 2-3 / Lexile 300〜600L',
      },
      tip: '1日30〜40分。チャプターブック多読+英語日記+オンライン英会話週2回。',
      source: 'CEFR-J A2・英検3級・US Grade 2-3 / Lexile基準を参考',
      skills: {
        listening: {
          summary: '子供向けコンテンツを字幕なしで理解',
          items: [
            '児童向けアニメ・動画を字幕なしで大意理解できる',
            '英検3級の聴解問題で6割正解する',
          ],
        },
        speaking: {
          summary: '意見を理由付きで話せる',
          items: [
            '身近な話題について理由を1つ添えて意見を3文以上話せる',
            '注文・道案内など日常の用事のやりとりができる',
          ],
        },
        reading: {
          summary: '初級チャプターブックを読める',
          items: [
            '初級チャプターブック(Magic Tree House / Lexile 300〜600L)を1冊読み切る',
            '英検3級の長文問題で6割正解する',
          ],
        },
        writing: {
          summary: 'まとまった文章を書ける',
          items: [
            '5文以上の英語日記を書ける',
            '英検3級ライティング形式(意見+理由2つ)で25語以上書ける',
          ],
        },
      },
    },
    // ---- S4 中級 ----
    {
      benchmarks: {
        foreign: '英検準2〜2級・TOEIC 550+ / CEFR B1',
        native: 'US Grade 4-6 / Lexile 600〜900L',
      },
      tip: '1日40分。海外ドラマ・ニュースの多聴多読+エッセイを書いて添削を受ける。',
      source: 'CEFR-J B1・英検準2/2級・TOEIC・US Grade 4-6 / Lexile基準を参考',
      skills: {
        listening: {
          summary: '生の英語コンテンツを楽しめる',
          items: [
            '映画・海外ドラマを英語字幕付きで楽しめる',
            'やさしい英語ニュースの要点を聞き取れる',
            '英検2級の聴解問題で6割正解する',
          ],
        },
        speaking: {
          summary: '社会的な話題で意見を言える',
          items: [
            '学校生活や環境などの話題について1分間意見を話せる',
            '英検2級の面接形式で受け答えできる',
          ],
        },
        reading: {
          summary: '児童〜YA向け読み物を読める',
          items: [
            '児童〜YA向け読み物(Wonder / Lexile 600〜900L)を1冊読み切る',
            '英検2級の長文問題で6割正解する',
          ],
        },
        writing: {
          summary: '構成のあるエッセイを書ける',
          items: [
            '80語程度の意見エッセイ(主張+理由+結論)を書ける',
            '英語でメールやチャットのやりとりができる',
          ],
        },
      },
    },
    // ---- S5 中上級 ----
    {
      benchmarks: {
        foreign: '英検準1級・TOEIC 785+・IELTS 5.5〜6.5 / CEFR B2',
        native: 'US Grade 7-9 / Lexile 900〜1100L',
      },
      tip: '1日40〜60分。アカデミックな素材で4技能をバランスよく。出願を視野に試験対策も。',
      source: 'CEFR B2・英検準1級・IELTSバンドスコア・US Grade 7-9 / Lexile基準を参考',
      skills: {
        listening: {
          summary: '講演・アカデミック素材を理解',
          items: [
            'TED等の講演を字幕なしで大意把握できる',
            '英検準1級の聴解問題で6割正解する',
          ],
        },
        speaking: {
          summary: '議論に参加できる',
          items: [
            '時事問題について2分間、構成立てて意見を述べられる',
            'ネイティブ話者との雑談・議論に不自由なく参加できる',
          ],
        },
        reading: {
          summary: '一般向け書籍・記事を読める',
          items: [
            '一般向けペーパーバックや英字ニュースを辞書少なめで読める',
            '英検準1級の長文問題で6割正解する',
          ],
        },
        writing: {
          summary: '構成の整った意見文を書ける',
          items: [
            '120〜150語の構成の整った意見文を書ける',
            '仕事や学校の連絡メールを不自由なく書ける',
          ],
        },
      },
    },
    // ---- S6 上級(大人の運用) ----
    {
      benchmarks: {
        foreign: '英検1級・IELTS 7.0+ / CEFR C1',
        native: 'US Grade 10+ / Lexile 1100L〜',
      },
      tip: '週4回×40分。専門的な講演・論説に触れ、仕事のメールや報告書など実務英語を書く。',
      source: 'CEFR C1・英検1級・IELTS 7.0+・US Grade 10+ / Lexile基準を参考',
      skills: {
        listening: {
          summary: '専門的な講演・議論を理解できる',
          items: [
            '専門的な講演や議論を字幕なしで論点まで理解できる',
            '英検1級の聴解問題で6割正解する',
          ],
        },
        speaking: {
          summary: '専門的な議論で発言できる',
          items: [
            '仕事や専門分野の話題について立場を明確にして議論できる',
            '会議で意見を述べ、質疑に的確に応答できる',
          ],
        },
        reading: {
          summary: '専門書・論説を読める',
          items: [
            '専門書・論説記事・業務文書を辞書なしで読み通せる',
            '英検1級の長文問題で6割正解する',
          ],
        },
        writing: {
          summary: '論理的な文章・実務文書を書ける',
          items: [
            '250語程度の論理的なエッセイを書ける',
            '仕事のメールや報告書を目的・相手に応じて的確に書ける',
          ],
        },
      },
    },
  ],

  // ======================= 中国語(標準語) =======================
  zh: [],

  // ======================= 韓国語 =======================
  ko: [],

  // ======================= ポルトガル語 =======================
  pt: [],

  // ======================= スペイン語 =======================
  es: [],
}

/** 技能コード(id生成に使用) */
export const SKILL_CODE: Record<Skill, string> = {
  listening: 'l',
  speaking: 's',
  reading: 'r',
  writing: 'w',
}

/** シード投入対象の言語 */
export const SEEDABLE_LANGS: Lang[] = ['ja', 'en', 'zh', 'ko', 'pt', 'es']

/**
 * 1言語分のシード(セル+Can-Do項目)を生成する。
 * 配列 index を段階(stage 1〜6)へ変換し、id規約 `${lang}-${stage}-${skillCode}-${n}` で採番する。
 */
export function buildLangSeed(lang: Lang): { cells: Cell[]; items: CanDoItem[] } {
  const cells: Cell[] = []
  const items: CanDoItem[] = []
  const seedCells = SEED[lang] ?? []
  seedCells.forEach((cell, idx) => {
    const stage = idx + 1
    const summaries: Partial<Record<Skill, string>> = {}
    ;(Object.keys(cell.skills) as Skill[]).forEach((skill) => {
      const s = cell.skills[skill]
      summaries[skill] = s.summary
      s.items.forEach((text, i) => {
        items.push({
          id: `${lang}-${stage}-${SKILL_CODE[skill]}-${i + 1}`,
          lang,
          stage,
          skill,
          text,
          order: i,
        })
      })
    })
    cells.push({
      id: `${lang}-${stage}`,
      lang,
      stage,
      benchmarks: { foreign: cell.benchmarks.foreign, native: cell.benchmarks.native },
      tip: cell.tip,
      source: cell.source,
      summaries,
    })
  })
  return { cells, items }
}

/** 全言語分のシードをまとめて生成する */
export function buildRoadmapSeed(): { cells: Cell[]; items: CanDoItem[] } {
  const cells: Cell[] = []
  const items: CanDoItem[] = []
  SEEDABLE_LANGS.forEach((lang) => {
    const s = buildLangSeed(lang)
    cells.push(...s.cells)
    items.push(...s.items)
  })
  return { cells, items }
}
