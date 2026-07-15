import type { Lang, MaterialStatusValue, MaterialType, Skill } from './types'
import type { Status } from './lib/logic'

/**
 * i18n 構造:UIは日本語デフォルト。将来 en 辞書を追加して
 * setLocale() で切り替えられるようにキーを分離してある。
 */
const ja = {
  appName: 'Multilingual Family Roadmap',
  tagline: '家族で育てる、ことばのロードマップ',
  nav: {
    home: 'ホーム',
    record: '記録',
    roadmap: 'ロードマップ',
    gap: 'ギャップ分析',
    plan: 'プラン',
    compare: 'きょうだい比較',
    settings: '設定',
  },
  /** 正式名称(設定画面などで使用) */
  lang: {
    ja: '日本語',
    en: '英語',
    zh: '中国語(標準語)',
    yue: '中国語(広東語)',
    pt: 'ポルトガル語',
    es: 'スペイン語',
  } as Record<Lang, string>,
  /** タグ表示用の短縮名(固定幅チップに収める) */
  langChip: {
    ja: '日本語',
    en: '英語',
    zh: '中国語',
    yue: '広東語',
    pt: '葡語',
    es: '西語',
  } as Record<Lang, string>,
  skill: { listening: '聞く', speaking: '話す', reading: '読む', writing: '書く' } as Record<Skill, string>,
  status: {
    ahead: '先行',
    onTrack: '順調',
    slightBehind: 'やや遅れ',
    attention: '要注意',
    unrecorded: '未記録',
  } as Record<Status, string>,
  materialType: {
    book: '本',
    app: 'アプリ',
    'online-lesson': 'オンライン',
    video: '動画',
    workbook: 'ワーク',
  } as Record<MaterialType, string>,
  materialStatus: {
    notStarted: '未挑戦',
    inProgress: '履修中',
    completed: '修了',
    deferred: '後回し',
  } as Record<MaterialStatusValue, string>,
  langOrder: ['第一言語', '第二言語', '第三言語'],
  compareNote: '比較は優劣をつけるためではなく、それぞれの子に合った打ち手を見つけるためのものです。ペースの違いは個性です。',
}

const dictionaries = { ja }
let locale: keyof typeof dictionaries = 'ja'

export function setLocale(l: keyof typeof dictionaries): void {
  locale = l
}

export function useT() {
  return dictionaries[locale]
}

export const T = ja
