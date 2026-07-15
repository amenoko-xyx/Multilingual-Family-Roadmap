import type { CanDoItem, Cell, Lang, Skill } from '../types'

/**
 * マスターロードマップ初期テンプレート。
 * 設計方針:
 * - 英語:18歳で CEFR B2〜C1(英検準1級/IELTS 6.0前後、海外大学出願視野)からの逆算
 * - 中国語:18歳で HSK4〜5級相当を目標とする緩やかな曲線
 * - 日本語:学齢相当の国語力維持(他言語とのバランス崩れの検知役)
 * - すべて家庭で観察・確認できる行動レベルの Can-Do 項目で記述
 */

interface SeedSkill {
  summary: string
  items: string[]
}

interface SeedCell {
  benchmark: string
  tip: string
  source?: string
  skills: Partial<Record<Skill, SeedSkill>>
}

// 手書きテンプレート:各言語 6 帯(0-2 / 3-5 / 6-8 / 9-11 / 12-14 / 15-18)
const BASE_SEED: Record<'ja' | 'en' | 'zh', SeedCell[]> = {
  ja: [
    {
      benchmark: '乳幼児期の言語発達目安(検定なし)',
      tip: '読み聞かせを毎日10分以上。語りかけを多めに、絵本は繰り返しでOK。',
      source: '乳幼児健診の発達目安を参考',
      skills: {
        listening: {
          summary: '身近な言葉を聞いて反応できる',
          items: ['名前を呼ばれると振り向く', '「ちょうだい」「ポイして」など簡単な指示がわかる'],
        },
        speaking: {
          summary: '二語文で話し始める',
          items: ['「ワンワン きた」など二語文を話す', '日常の単語を50個以上話す'],
        },
        reading: {
          summary: '絵本に親しむ',
          items: ['絵本の読み聞かせを最後まで聞ける', '好きな絵本を自分から持ってくる'],
        },
        writing: {
          summary: '運筆の準備段階',
          items: ['クレヨンでなぐり書きを楽しむ', '絵本の文字を指差すなど文字に興味を示す'],
        },
      },
    },
    {
      benchmark: '就学前の言語発達目安(ひらがな読み)',
      tip: '読み聞かせ継続+ひらがな遊び(かるた・積み木)。1日15分目安。',
      source: '幼稚園教育要領・小学校入学前の目安を参考',
      skills: {
        listening: {
          summary: '少し長い話を理解できる',
          items: ['園での出来事など少し長い話を聞いて理解できる', 'しりとりができる(音の分解ができる)'],
        },
        speaking: {
          summary: '経験を順序立てて話せる',
          items: ['経験したことを順序立てて話せる', 'ごっこ遊びで役になりきって会話できる'],
        },
        reading: {
          summary: 'ひらがなを読める',
          items: ['ひらがなをすべて読める', 'ひらがなの絵本を1冊一人で音読できる'],
        },
        writing: {
          summary: 'ひらがなを書き始める',
          items: ['自分の名前をひらがなで書ける', 'ひらがなをおおむね書ける'],
        },
      },
    },
    {
      benchmark: '小1〜小3相当 / 漢検10〜8級',
      tip: '音読を毎日+短い日記の習慣化。1日15〜20分。',
      source: '学習指導要領(小学校国語)・漢検級別基準',
      skills: {
        listening: {
          summary: '指示や説明を聞いて行動できる',
          items: ['先生の話や連絡事項を聞いて行動できる', '読み聞かせを聞いて内容の質問に答えられる'],
        },
        speaking: {
          summary: '構成を意識して発表できる',
          items: ['経験や考えを「はじめ・なか・おわり」で発表できる', '自分の気持ちを言葉で相手に伝えられる'],
        },
        reading: {
          summary: '学年相当の文章を読める',
          items: ['学年相当の物語文をすらすら音読できる', '児童書(かいけつゾロリ等)を1冊一人で読み切る', '漢検9級(小2相当)に合格する'],
        },
        writing: {
          summary: '短い文章を書ける',
          items: ['カタカナと学年配当漢字を書ける', '3文以上の日記や作文を書ける'],
        },
      },
    },
    {
      benchmark: '小4〜小6相当 / 漢検7〜5級',
      tip: '読書習慣(月2冊以上)+要約練習。子ども新聞もおすすめ。',
      source: '学習指導要領(小学校国語)・漢検級別基準',
      skills: {
        listening: {
          summary: '聞いて要点を整理できる',
          items: ['授業や説明を聞いてメモを取れる', '聞いた話の要点を自分の言葉で言い直せる'],
        },
        speaking: {
          summary: '場面に応じて話せる',
          items: ['調べたことを構成立てて発表できる', '相手や場面に応じた言葉づかいを使い分けられる'],
        },
        reading: {
          summary: '長い文章を読み要約できる',
          items: ['200ページ程度の児童書を1冊読み切れる', '説明文の要点を3行で要約できる', '漢検5級(小6相当)に合格する'],
        },
        writing: {
          summary: '段落構成のある作文を書ける',
          items: ['400字程度の作文を段落を分けて書ける', '学年配当漢字を使って文章を書ける'],
        },
      },
    },
    {
      benchmark: '中学相当 / 漢検4〜3級',
      tip: '新聞・新書に触れる機会を作り、意見文を書く練習。週2〜3回。',
      source: '学習指導要領(中学校国語)・漢検級別基準',
      skills: {
        listening: {
          summary: '論理的な話を聞き取れる',
          items: ['講義形式の話を聞いて要点をノートに整理できる', 'ニュースを聞いて論点を説明できる'],
        },
        speaking: {
          summary: '根拠を示して議論できる',
          items: ['ディスカッションで根拠を示して意見を言える', '目上の人と敬語で受け答えできる'],
        },
        reading: {
          summary: '評論・記事を読める',
          items: ['新聞記事や新書を読んで内容を説明できる', '漢検3級(中学卒業相当)に合格する'],
        },
        writing: {
          summary: '意見文・レポートを書ける',
          items: ['600〜800字の意見文を構成立てて書ける', 'レポートで引用と自分の考えを区別して書ける'],
        },
      },
    },
    {
      benchmark: '高校相当 / 漢検準2〜2級',
      tip: '評論文の読解と小論文演習。進路に合わせて調整。',
      source: '学習指導要領(高等学校国語)・漢検級別基準',
      skills: {
        listening: {
          summary: '講演から論理構成を掴める',
          items: ['講演や授業から要点と論理構成を把握できる', '複数の意見を聞き比べて違いを整理できる'],
        },
        speaking: {
          summary: '論理的にプレゼンできる',
          items: ['面接やプレゼンで論理的に話せる', '初対面の大人と敬語で会話を続けられる'],
        },
        reading: {
          summary: '評論の論旨を要約できる',
          items: ['評論文・論説文を読んで論旨を要約できる', '漢検2級(高校卒業相当)に合格する'],
        },
        writing: {
          summary: '小論文を書ける',
          items: ['800字の小論文を書ける', '敬語を適切に使った文書(メール等)を書ける'],
        },
      },
    },
  ],

  en: [
    {
      benchmark: '英語音声への親しみ(検定なし)',
      tip: '毎日15分、英語の歌・かけ流し。親も一緒に歌って「楽しい時間」にする。',
      source: '早期英語教育の第二言語習得研究(音声インプット重視)を参考',
      skills: {
        listening: {
          summary: '英語の音に反応する',
          items: ['英語の歌がかかると体を揺らしたり喜んだりする', '簡単な英語の呼びかけ(bye-bye / clap!)に動作で反応する'],
        },
        speaking: {
          summary: '音まねを楽しむ',
          items: ['英語の歌の一部をまねして声に出す', '身近な英単語(apple, dog など)を5個以上言える'],
        },
        reading: {
          summary: '英語絵本に親しむ',
          items: ['英語絵本の読み聞かせを最後まで聞ける', '好きな英語絵本を自分から持ってくる'],
        },
        writing: {
          summary: '文字への興味(準備段階)',
          items: ['アルファベットの歌を口ずさむ', '絵本のアルファベットを指差すなど文字に興味を示す'],
        },
      },
    },
    {
      benchmark: '英検Jr. Bronze〜Silver / CEFR Pre-A1',
      tip: '1日20〜30分。フォニックス入門+英語アニメ・歌の多聴。',
      source: 'CEFR-J Pre-A1・英検Jr.出題範囲を参考',
      skills: {
        listening: {
          summary: '身近な単語・指示を聞き取れる',
          items: ['色・数・動物など身近な単語を聞いて絵を指させる', '簡単な指示(Stand up / Touch your nose)に従える', '短い英語アニメ(Peppa Pig等)を英語のまま楽しめる'],
        },
        speaking: {
          summary: '定型フレーズで話せる',
          items: ["What's your name? に名前・年齢を英語で答えられる", '身近な英単語を50個以上言える', 'I like 〜 / This is 〜 で気持ちや物を言える'],
        },
        reading: {
          summary: 'アルファベットと基本音を読める',
          items: ['アルファベット大文字・小文字をすべて読める', 'フォニックスの基本音を10個以上言える', 'サイトワード(the, a, is など)を10個読める'],
        },
        writing: {
          summary: 'アルファベットを書ける',
          items: ['自分の名前をアルファベットで書ける', 'アルファベット大文字をすべて書ける'],
        },
      },
    },
    {
      benchmark: '英検5〜4級 / CEFR A1',
      tip: '1日30分。ORT等の段階別多読を週3冊+オンラインレッスン週1〜2回。',
      source: 'CEFR-J A1・英検5/4級基準を参考',
      skills: {
        listening: {
          summary: '日常のやりとりを聞き取れる',
          items: ['日常的な指示や質問を聞いて適切に応答できる', '英語アニメや朗読音声のあらすじを日本語で説明できる', '英検5級リスニングで6割正解する'],
        },
        speaking: {
          summary: '自分のことを文で話せる',
          items: ['今日の出来事を英語3文で話せる', 'オンラインレッスンで講師と25分やりとりを続けられる'],
        },
        reading: {
          summary: 'ORT Stage 4〜6程度を自力で読む',
          items: ['フォニックスのルールで知らない単語を読める', 'ORT Stage 4の本を1冊一人で読み切る', '英検5級の筆記問題で6割正解する'],
        },
        writing: {
          summary: '短い英文を書ける',
          items: ['単語を音から推測してつづれる(つづり間違いOK)', '自分や家族について3文の英文を書ける'],
        },
      },
    },
    {
      benchmark: '英検3級 / CEFR A2',
      tip: '1日30〜40分。チャプターブック多読+英語日記+オンライン英会話週2回。',
      source: 'CEFR-J A2・英検3級基準を参考',
      skills: {
        listening: {
          summary: '子供向けコンテンツを字幕なしで理解',
          items: ['英語の児童向けアニメ・動画を字幕なしで大意理解できる', '英検3級リスニングで6割正解する'],
        },
        speaking: {
          summary: '意見を理由付きで話せる',
          items: ['身近な話題について意見を理由付きで3文以上話せる', '英検3級の面接形式(音読+Q&A)で受け答えできる'],
        },
        reading: {
          summary: '初級チャプターブックを読める',
          items: ['初級チャプターブック(Magic Tree House等)を1冊読み切る', '英検3級の長文問題で6割正解する'],
        },
        writing: {
          summary: 'まとまった文章を書ける',
          items: ['5文以上の英語日記を週1回書ける', '英検3級ライティング形式(意見+理由2つ)で25語以上書ける'],
        },
      },
    },
    {
      benchmark: '英検準2〜2級 / CEFR B1',
      tip: '1日40分。海外ドラマ・ニュースの多聴多読+エッセイを書いて添削を受ける。',
      source: 'CEFR-J B1・英検準2/2級基準を参考',
      skills: {
        listening: {
          summary: '生の英語コンテンツを楽しめる',
          items: ['洋画・海外ドラマを英語字幕付きで楽しめる', '英語ニュース(VOA等)の要点を聞き取れる', '英検準2級リスニングで6割正解する'],
        },
        speaking: {
          summary: '社会的な話題で意見を言える',
          items: ['環境・学校生活などの話題について1分間意見を話せる', '英検2級の面接形式で受け答えできる'],
        },
        reading: {
          summary: 'ペーパーバック入門',
          items: ['児童〜YA向けペーパーバック(Wonder等)を1冊読み切る', '英検2級の長文問題で6割正解する'],
        },
        writing: {
          summary: '構成のあるエッセイを書ける',
          items: ['80語程度の意見エッセイ(主張+理由+結論)を書ける', '英語でメールやチャットのやりとりができる'],
        },
      },
    },
    {
      benchmark: '英検準1級 / CEFR B2〜C1 / IELTS 5.5〜6.5',
      tip: '1日40〜60分。アカデミックな素材で4技能をバランスよく。出願を視野に試験対策も。',
      source: 'CEFR B2-C1・英検準1級・IELTSバンドスコア対応表を参考',
      skills: {
        listening: {
          summary: '講演・アカデミック素材を理解',
          items: ['TED等の講演を字幕なしで大意把握できる', '英検準1級リスニングで6割正解する'],
        },
        speaking: {
          summary: '議論に参加できる',
          items: ['時事問題について2分間、構成立てて意見を述べられる', '英語話者との雑談・議論に不自由なく参加できる'],
        },
        reading: {
          summary: '一般向け書籍・記事を読める',
          items: ['一般向けペーパーバックや英字ニュースを辞書少なめで読める', '英検準1級の長文問題で6割正解する'],
        },
        writing: {
          summary: 'アカデミックエッセイを書ける',
          items: ['120〜150語のアカデミックエッセイを書ける', 'IELTS Task2形式で構成の整った文章を書ける'],
        },
      },
    },
  ],

  zh: [
    {
      benchmark: '中国語音声への親しみ(検定なし)',
      tip: '1日10分、中国語の童謡かけ流し。声調の音感づくりが目的。',
      source: '幼児期の音韻獲得研究(声調言語は早期接触が有利)を参考',
      skills: {
        listening: {
          summary: '中国語の音に反応する',
          items: ['中国語の童謡がかかると体を揺らすなど反応する', '「你好」「再见」の声かけに反応する'],
        },
        speaking: {
          summary: '音まねを楽しむ',
          items: ['中国語の歌の一部をまねして声に出す', '「你好」「谢谢」を言える'],
        },
        reading: {
          summary: '中国語絵本に親しむ',
          items: ['中国語絵本の読み聞かせを最後まで聞ける', '音の出る中国語絵本・カードで自分から遊ぶ'],
        },
        writing: {
          summary: '文字への興味(準備段階)',
          items: ['絵本の漢字を指差すなど文字に興味を示す', 'クレヨンで線や丸をまねして描ける'],
        },
      },
    },
    {
      benchmark: 'YCT1級の準備段階',
      tip: '1日15分。歌・動画+単語カード遊び。「わかる単語」を増やす時期。',
      source: 'YCT(青少年向け中国語検定)1級語彙リストを参考',
      skills: {
        listening: {
          summary: '身近な単語を聞き取れる',
          items: ['色・数・動物など身近な単語30個を聞いてわかる', '簡単な指示(过来 / 坐下 など)に従える'],
        },
        speaking: {
          summary: '数や名前を言える',
          items: ['1〜10を中国語で数えられる', '名前を聞かれて中国語で答えられる', '身近な単語を20個以上言える'],
        },
        reading: {
          summary: '漢字と音の対応に気づく',
          items: ['よく見る漢字(大・小・人 など)を中国語読みで5個読める', '絵カードと単語カードをマッチングできる'],
        },
        writing: {
          summary: 'なぞり書きを楽しむ',
          items: ['簡単な漢字(一・二・三 など)をなぞり書きできる', '点線なぞりで漢数字を書ける'],
        },
      },
    },
    {
      benchmark: 'YCT1〜2級',
      tip: '1日15〜20分。拼音入門+オンラインレッスン週1回。',
      source: 'YCT1-2級基準・拼音学習の標準的導入時期を参考',
      skills: {
        listening: {
          summary: '短文を聞いて理解できる',
          items: ['YCT1級レベルの単語・短文を聞いて理解できる', '中国語の子供向けアニメを場面から大意理解できる'],
        },
        speaking: {
          summary: '自己紹介と定型表現',
          items: ['名前・年齢・好きなものを中国語で自己紹介できる', '日常の定型フレーズを20個使える'],
        },
        reading: {
          summary: '拼音を読める',
          items: ['拼音(声調記号付き)を読める', '拼音付き絵本を1冊一人で読み切る', 'YCT1級の筆記問題で6割正解する'],
        },
        writing: {
          summary: '基本漢字を書ける',
          items: ['基本の簡体字を20字書ける', '声調記号付きで拼音を書き写せる'],
        },
      },
    },
    {
      benchmark: 'YCT3〜4級 / HSK1〜2級',
      tip: '週3回×20分+オンラインレッスン週1回。細く長く続けることを優先。',
      source: 'YCT3-4級・HSK1-2級語彙(150〜300語)を参考',
      skills: {
        listening: {
          summary: 'ゆっくりした会話を聞き取れる',
          items: ['HSK1級リスニングで6割正解する', 'ゆっくりした日常会話(買い物・学校)を聞き取れる'],
        },
        speaking: {
          summary: '会話のキャッチボールができる',
          items: ['日常の話題で3往復以上の会話を続けられる', '今日の出来事を中国語2〜3文で話せる'],
        },
        reading: {
          summary: '拼音なしの短文に挑戦',
          items: ['HSK1〜2級の単語300語を読める', '拼音なしの簡単な短文を読める'],
        },
        writing: {
          summary: '短い文を書ける',
          items: ['習った漢字で短い文(我喜欢〜 など)を書ける', 'よく使う簡体字を100字書ける'],
        },
      },
    },
    {
      benchmark: 'HSK2〜3級',
      tip: '週3〜4回×30分。検定対策+中国語動画の多聴で語彙を定着させる。',
      source: 'HSK2-3級基準(語彙300〜600語)を参考',
      skills: {
        listening: {
          summary: '日常会話・動画を理解できる',
          items: ['HSK3級リスニングで6割正解する', '中国語のドラマ・動画を中国語字幕付きで大意理解できる'],
        },
        speaking: {
          summary: '実用場面をこなせる',
          items: ['身近な話題について1分間中国語で話せる', '注文・道案内など実用場面のやりとりができる'],
        },
        reading: {
          summary: '簡単な文章を読める',
          items: ['HSK3級の読解問題で6割正解する', '簡単な中国語のSNS投稿や記事を読める'],
        },
        writing: {
          summary: '短い文章を書ける',
          items: ['中国語で5文程度の日記・短文を書ける', 'よく使う簡体字を300字書ける'],
        },
      },
    },
    {
      benchmark: 'HSK4〜5級',
      tip: '週4回×30〜40分。長文読解・作文・会話実践へ。留学や検定を目標にすると続きやすい。',
      source: 'HSK4-5級基準(語彙1200〜2500語)を参考',
      skills: {
        listening: {
          summary: 'ニュース・ドラマの大意を掴める',
          items: ['HSK4級リスニングで6割正解する', '中国語ニュースやドラマの大意を字幕なしで掴める'],
        },
        speaking: {
          summary: '意見を述べられる',
          items: ['社会的な話題について自分の意見を中国語で述べられる', '中国語話者と日常会話を不自由なく続けられる'],
        },
        reading: {
          summary: '記事・短編を読める',
          items: ['HSK4級の読解問題で6割正解する', '中国語の短い記事・物語を辞書を引きながら読み切れる'],
        },
        writing: {
          summary: 'まとまった文章を書ける',
          items: ['80字程度の短文(意見・感想)を中国語で書ける', 'HSK4級の作文形式(並べ替え・写真作文)に対応できる'],
        },
      },
    },
  ],
}

/* ---------- 派生テンプレート(広東語・ポルトガル語・スペイン語) ----------
 * 手書きテンプレートを基に、検定名などを置換して下書きを自動生成する。
 * あくまで編集前提の初期テンプレート(ロードマップ画面で自由に編集可能)。
 */

type Rule = [string | RegExp, string]

function applyRules(text: string, rules: Rule[]): string {
  return rules.reduce<string>(
    (t, [from, to]) => (typeof from === 'string' ? t.split(from).join(to) : t.replace(from, to)),
    text,
  )
}

interface DerivedDef {
  base: 'en' | 'zh'
  benchmarks: string[]
  source: string
  rules: Rule[]
}

const DERIVED: Record<'yue' | 'pt' | 'es', DerivedDef> = {
  yue: {
    base: 'zh',
    benchmarks: [
      '広東語音声への親しみ(検定なし)',
      '入門準備(語彙あそび)',
      '入門(粤拼と基本漢字)',
      '初級(日常会話の聞き取り)',
      '中級(実用場面の会話)',
      '中上級(意見を述べられる)',
    ],
    source: '広東語には広く使われる公的検定が少ないため、標準語テンプレート(YCT/HSK基準)をレベル感の目安として翻案した下書きです。',
    rules: [
      ['YCT1級の筆記問題で6割正解する', '粤拼付きの単語カード50枚を読める'],
      ['YCT1級レベルの単語・短文を聞いて理解できる', '入門レベルの単語・短文を聞いて理解できる'],
      ['HSK1級リスニングで6割正解する', '初級教材のリスニング問題で6割正解する'],
      ['HSK1〜2級の単語300語を読める', '基礎単語300語を読める'],
      ['HSK3級リスニングで6割正解する', '中級教材のリスニング問題で6割正解する'],
      ['HSK3級の読解問題で6割正解する', '中級レベルの短文読解で6割正解する'],
      ['HSK4級リスニングで6割正解する', '中上級教材のリスニング問題で6割正解する'],
      ['HSK4級の読解問題で6割正解する', '中上級レベルの読解問題で6割正解する'],
      ['HSK4級の作文形式(並べ替え・写真作文)に対応できる', '80字程度の作文課題に対応できる'],
      ['拼音', '粤拼(Jyutping)'],
      ['簡体字', '繁体字'],
      ['中国語', '広東語'],
    ],
  },
  pt: {
    base: 'en',
    benchmarks: [
      '音声への親しみ(検定なし)',
      'CEFR Pre-A1(入門準備)',
      'CEFR A1',
      'CEFR A2',
      'CEFR B1 / CELPE-Bras導入',
      'CEFR B2〜C1 / CELPE-Bras中級〜',
    ],
    source: '英語テンプレートをCEFR基準に翻案した下書きです。家庭の実情に合わせて編集してください。',
    rules: [
      ["What's your name? に名前・年齢を英語で答えられる", '名前・年齢を聞かれて答えられる'],
      ['短い英語アニメ(Peppa Pig等)を英語のまま楽しめる', '短い子供向けアニメを音声そのままで楽しめる'],
      ['英語アニメや朗読音声のあらすじを日本語で説明できる', 'アニメや朗読音声のあらすじを日本語で説明できる'],
      ['英語の児童向けアニメ・動画を字幕なしで大意理解できる', '児童向けアニメ・動画を字幕なしで大意理解できる'],
      ['洋画・海外ドラマを英語字幕付きで楽しめる', '映画・ドラマを字幕付きで楽しめる'],
      ['英語ニュース(VOA等)の要点を聞き取れる', 'やさしいニュース音声の要点を聞き取れる'],
      ['TED等の講演を字幕なしで大意把握できる', '講演動画を字幕なしで大意把握できる'],
      ['英検5級リスニングで6割正解する', 'CEFR A1レベルのリスニング問題で6割正解する'],
      ['英検5級の筆記問題で6割正解する', 'CEFR A1レベルの筆記問題で6割正解する'],
      ['英検3級リスニングで6割正解する', 'CEFR A2レベルのリスニング問題で6割正解する'],
      ['英検3級の長文問題で6割正解する', 'CEFR A2レベルの読解問題で6割正解する'],
      ['英検3級の面接形式(音読+Q&A)で受け答えできる', '音読+Q&Aの面接形式で受け答えできる'],
      ['英検3級ライティング形式(意見+理由2つ)で25語以上書ける', '意見+理由2つの形式で25語以上書ける'],
      ['英検準2級リスニングで6割正解する', 'CEFR B1レベルのリスニング問題で6割正解する'],
      ['英検2級の面接形式で受け答えできる', '身近な社会的話題の面接練習で受け答えできる'],
      ['英検2級の長文問題で6割正解する', 'CEFR B1レベルの長文問題で6割正解する'],
      ['英検準1級リスニングで6割正解する', 'CEFR B2レベルのリスニング問題で6割正解する'],
      ['英検準1級の長文問題で6割正解する', 'CEFR B2レベルの長文問題で6割正解する'],
      ['IELTS Task2形式で構成の整った文章を書ける', 'CEFR B2レベルの作文課題で構成の整った文章を書ける'],
      ['ORT Stage 4の本を1冊一人で読み切る', '段階別リーダーの初級本を1冊一人で読み切る'],
      ['ORT等の段階別多読', '段階別リーダーでの多読'],
      ['初級チャプターブック(Magic Tree House等)を1冊読み切る', '子供向けの初級読み物を1冊読み切る'],
      ['児童〜YA向けペーパーバック(Wonder等)を1冊読み切る', '児童〜YA向けの小説を1冊読み切る'],
      ['一般向けペーパーバックや英字ニュースを辞書少なめで読める', '一般向けの本やニュース記事を辞書少なめで読める'],
      ['サイトワード(the, a, is など)を10個読める', 'よく出る基本単語を10個読める'],
      ['フォニックスの基本音を10個以上言える', '文字と音の対応ルールを10個以上言える'],
      ['フォニックスのルールで知らない単語を読める', '文字と音の対応ルールで知らない単語を読める'],
      ['I like 〜 / This is 〜 で気持ちや物を言える', '基本の定型フレーズで気持ちや物を言える'],
      ['英単語', '単語'],
      ['英文', '文章'],
      ['英語話者', 'ネイティブ話者'],
      ['英語', 'ポルトガル語'],
    ],
  },
  es: {
    base: 'en',
    benchmarks: [
      '音声への親しみ(検定なし)',
      'CEFR Pre-A1(入門準備)',
      'CEFR A1 / DELE A1',
      'CEFR A2 / DELE A2',
      'CEFR B1 / DELE B1',
      'CEFR B2〜C1 / DELE B2以上',
    ],
    source: '英語テンプレートをCEFR/DELE基準に翻案した下書きです。家庭の実情に合わせて編集してください。',
    rules: [], // pt のルールを流用し、最後の言語名だけ差し替える(下で合成)
  },
}

// es は pt と同じ置換で、置換後の言語名だけ差し替える
DERIVED.es.rules = DERIVED.pt.rules.map(
  ([from, to]) => [from, to.replace('ポルトガル語', 'スペイン語')] as Rule,
)

function transformCell(cell: SeedCell, def: DerivedDef, band: number): SeedCell {
  const tx = (s: string) => applyRules(s, def.rules)
  const skills: SeedCell['skills'] = {}
  ;(Object.keys(cell.skills) as Skill[]).forEach((skill) => {
    const s = cell.skills[skill]!
    skills[skill] = { summary: tx(s.summary), items: s.items.map(tx) }
  })
  return {
    benchmark: def.benchmarks[band],
    tip: tx(cell.tip),
    source: def.source,
    skills,
  }
}

/** 言語ごとのテンプレートを返す(手書き or 翻案) */
export function seedCellsFor(lang: Lang): SeedCell[] {
  if (lang === 'ja' || lang === 'en' || lang === 'zh') return BASE_SEED[lang]
  const def = DERIVED[lang]
  return BASE_SEED[def.base].map((cell, band) => transformCell(cell, def, band))
}

const SKILL_CODE: Record<Skill, string> = {
  listening: 'l',
  speaking: 's',
  reading: 'r',
  writing: 'w',
}

export const SEEDABLE_LANGS: Lang[] = ['ja', 'en', 'zh', 'yue', 'pt', 'es']

/** 1言語分のシード(セル+Can-Do項目)を生成 */
export function buildLangSeed(lang: Lang): { cells: Cell[]; items: CanDoItem[] } {
  const cells: Cell[] = []
  const items: CanDoItem[] = []
  seedCellsFor(lang).forEach((cell, band) => {
    const summaries: Partial<Record<Skill, string>> = {}
    ;(Object.keys(cell.skills) as Skill[]).forEach((skill) => {
      const s = cell.skills[skill]!
      summaries[skill] = s.summary
      s.items.forEach((text, i) => {
        items.push({
          id: `${lang}-${band}-${SKILL_CODE[skill]}-${i + 1}`,
          lang,
          band,
          skill,
          text,
          order: i,
        })
      })
    })
    cells.push({
      id: `${lang}-${band}`,
      lang,
      band,
      benchmark: cell.benchmark,
      tip: cell.tip,
      source: cell.source,
      summaries,
    })
  })
  return { cells, items }
}

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

