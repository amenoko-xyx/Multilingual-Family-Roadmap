import { useEffect, useRef, useState, type ReactNode } from 'react'
import { STAGES, type Lang, type Skill } from '../types'
import type { Status } from '../lib/logic'
import { T } from '../i18n'
import { useApp } from '../context/AppContext'

/** 段階見出し(例: `S3・初中級`)。idx は STAGES.idx(1〜6) */
export function stageLabel(idx: number): string {
  const s = STAGES.find((x) => x.idx === idx)
  return s ? `S${s.idx}・${s.name}` : `S${idx}`
}

/** 段階見出し+年齢目安(例: `S3・初中級(母語話者の9〜11歳相当)`) */
export function stageLabelWithAge(idx: number): string {
  const s = STAGES.find((x) => x.idx === idx)
  return s ? `${stageLabel(idx)}(母語話者の${s.ageHint}相当)` : `S${idx}`
}

/** Material Symbols アイコン(装飾用。意味はラベル併記で伝える) */
export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`material-symbols-rounded select-none leading-none ${className}`}>
      {name}
    </span>
  )
}

/* ---------- GeoBanner: 流体的なフィールド+型染めモチーフで言語分布を表す ---------- */

/** アクセント用の手切り風モチーフ(原点中心、直径 約34)。丸・三角・月・十字 */
const GEO_MOTIFS = [
  'M -9 -12 Q 4 -19 12 -8 Q 18 3 10 12 Q -1 19 -11 11 Q -17 2 -13 -7 Q -11 -10 -9 -12 Z',
  'M -14 13 L 0 -16 L 15 11 Q 0 18 -14 13 Z',
  'M -5 -15 Q 11 -11 13 2 Q 14 13 2 17 Q 8 7 6 -2 Q 4 -10 -5 -15 Z',
  'M -3 -17 L 5 -16 L 6 -6 L 16 -7 L 17 2 L 7 3 L 8 15 L -1 16 L -2 5 L -13 6 L -14 -3 L -4 -4 Z',
]

/** 文字列 → 32bitハッシュ(子供IDから絵柄シードを作る) */
function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 決定的な擬似乱数(同じシードなら常に同じ絵柄になる) */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 上端(x付近, 0)から下端へ、大きくうねる流体的な縦の境界線。
 * ph(±1)で位相、ra/rb(0〜1)でうねりの形を変える(シード由来の個性)。
 */
function fluidSeam(x: number, h: number, amp: number, ph: number, ra: number, rb: number): string {
  const a = amp * ph
  return (
    `L ${x + a * 0.4} 0 ` +
    `C ${x + a * (0.9 + ra * 0.5)} ${h * (0.18 + ra * 0.12)}, ${x - a} ${h * (0.36 + rb * 0.12)}, ${x + a * 0.5} ${h * 0.6} ` +
    `C ${x + a * (1.1 + rb * 0.4)} ${h * 0.78}, ${x - a * 0.7} ${h * (0.9 + ra * 0.05)}, ${x - a * 0.3} ${h}`
  )
}

interface GeoScene {
  fields: { d: string; fill: string }[]
  motifs: { cx: number; cy: number; m: number; rot: number; s: number; fill: string }[]
}

/**
 * 指定サイズのシーン(面+モチーフ)を計算する。画面表示とPNG書き出しで共用。
 * 同じ seed・weights なら、サイズが変わっても同じ「柄」になる。
 */
function computeGeoScene(w: number, h: number, ws: number[], seed: string, colors: string[]): GeoScene {
  const n = ws.length
  const rng = mulberry32(hashSeed(seed))

  // 各言語の面積比(達成数に比例、最低10%は確保して存在が見えるように)
  const smoothed = ws.map((v) => v + 0.5)
  const sum = smoothed.reduce((a, b) => a + b, 0)
  const floored = smoothed.map((v) => Math.max(v / sum, 0.1))
  const fsum = floored.reduce((a, b) => a + b, 0)
  const ratios = floored.map((r) => r / fsum)

  // 面の右端x(累積)。最後の面は w まで
  const bounds: number[] = []
  let acc = 0
  for (let i = 0; i < n - 1; i++) {
    acc += ratios[i]
    bounds.push(acc * w)
  }
  const amp = Math.max(6, Math.min(h * 0.22, (Math.min(...ratios) * w) / 2.4))

  // 右の面から重ね塗り:最終言語を全面 → 手前の言語ほど後に左側を塗る
  const fields: GeoScene['fields'] = [{ d: `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`, fill: colors[n - 1] }]
  const seamParams = bounds.map(() => ({ ph: rng() > 0.5 ? 1 : -1, ra: rng(), rb: rng() }))
  for (let i = n - 2; i >= 0; i--) {
    const p = seamParams[i]
    fields.push({ d: `M 0 0 ${fluidSeam(bounds[i], h, amp, p.ph, p.ra, p.rb)} L 0 ${h} Z`, fill: colors[i] })
  }

  // アクセントのモチーフ:各面に1つ、種類・位置・傾き・大きさ・色はシード由来
  const edges = [0, ...bounds, w]
  const motifs = ws
    .map((_, i) => {
      const bandW = edges[i + 1] - edges[i]
      const center = (edges[i] + edges[i + 1]) / 2
      const sizeF = 0.85 + rng() * 0.3
      return {
        cx: center + bandW * 0.24 * (rng() - 0.5),
        cy: h * (0.3 + rng() * 0.34),
        m: Math.floor(rng() * GEO_MOTIFS.length),
        rot: -18 + rng() * 36,
        s: (Math.min(bandW * 0.32, h * 0.42) / 17) * sizeF,
        fill: colors[(i + 1 + Math.floor(rng() * (n - 1))) % n],
      }
    })
    .filter((m) => m.s > 0.55)

  return { fields, motifs }
}

/** SNS投稿用の書き出しサイズ(タップして保存) */
const GEO_EXPORTS = [
  { key: 'x-post', label: 'Xの投稿', size: '1200×675', w: 1200, h: 675 },
  { key: 'x-banner', label: 'Xのバナー', size: '1500×500', w: 1500, h: 500 },
  { key: 'ig-post', label: 'Instagramの投稿', size: '1080×1080', w: 1080, h: 1080 },
  { key: 'ig-reel', label: 'Instagramのリール', size: '1080×1920', w: 1080, h: 1920 },
] as const

/** シーンをSVG文字列にする(書き出し用。メモ書きを左下に焼き込む) */
function geoSvgString(w: number, h: number, ws: number[], seed: string, colors: string[], memo: string): string {
  const scene = computeGeoScene(w, h, ws, seed, colors)
  const fields = scene.fields.map((f) => `<path d="${f.d}" fill="${f.fill}"/>`).join('')
  const motifs = scene.motifs
    .map((m) => `<path d="${GEO_MOTIFS[m.m]}" transform="translate(${m.cx} ${m.cy}) rotate(${m.rot}) scale(${m.s})" fill="${m.fill}"/>`)
    .join('')
  const fontSize = Math.max(18, Math.round(Math.min(w, h) * 0.032))
  const pad = Math.round(fontSize * 1.2)
  const text = `<text x="${pad}" y="${h - pad}" font-family="sans-serif" font-size="${fontSize}" font-weight="600" fill="rgba(255,255,255,0.92)">${memo}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${fields}${motifs}${text}</svg>`
}

/** SVG文字列をPNGにしてダウンロードする */
async function downloadGeoPng(w: number, h: number, svg: string, filename: string): Promise<void> {
  const blob: Blob = await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
    }
    img.onerror = reject
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 言語の色のみで描く、流体的な言語バランスのグラフィック。
 * 左から第一言語(薄)→第三言語(鮮)の大きな面が流れるように並び、
 * 各面の面積が達成数に比例する(=どの言語に傾いているかがパッと分かる)。
 * seed(メンバーID)ごとにうねり・モチーフの種類・位置・傾きが変わり、その人だけの絵柄になる。
 * caption で割合のメモ書き、shareable でタップ→SNSサイズのPNG保存に対応。
 */
export function GeoBanner({
  className = '',
  weights = [],
  seed = 'default',
  caption = false,
  shareable = false,
}: {
  className?: string
  weights?: number[]
  seed?: string
  caption?: boolean
  shareable?: boolean
}) {
  const { langs, showToast } = useApp()
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 480, h: 96 })
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0) setSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w, h } = size
  const colors = langs.map((_, i) => langStroke(i))
  const ws = langs.map((_, i) => Math.max(0, weights[i] ?? 0))
  const { fields, motifs } = computeGeoScene(w, h, ws, seed, colors)

  const total = ws.reduce((a, b) => a + b, 0)
  const pct = (i: number) => (total > 0 ? Math.round((ws[i] / total) * 100) : 0)
  const memo =
    total > 0
      ? langs.map((l, i) => `${T.langChip[l]} ${pct(i)}%`).join('・')
      : 'まだ記録がありません'

  const save = async (fmt: (typeof GEO_EXPORTS)[number]) => {
    try {
      await downloadGeoPng(fmt.w, fmt.h, geoSvgString(fmt.w, fmt.h, ws, seed, colors, memo), `language-balance-${fmt.key}.png`)
      showToast({ message: `${fmt.label}用の画像を保存しました` })
      setShareOpen(false)
    } catch {
      showToast({ message: '画像の書き出しに失敗しました' })
    }
  }

  const banner = (
    <div
      ref={ref}
      role="img"
      aria-label={`言語別の達成バランス: ${memo}`}
      className={`overflow-hidden rounded-2xl ${className}`}
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" role="presentation" aria-hidden>
        {fields.map((f, i) => (
          <path key={`f${i}`} d={f.d} fill={f.fill} />
        ))}
        {motifs.map((m, i) => (
          <path
            key={`m${i}`}
            d={GEO_MOTIFS[m.m]}
            transform={`translate(${m.cx} ${m.cy}) rotate(${m.rot}) scale(${m.s})`}
            fill={m.fill}
          />
        ))}
      </svg>
    </div>
  )

  return (
    <div>
      {shareable ? (
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="言語バランスの画像を保存"
          className="block w-full cursor-pointer text-left transition-opacity hover:opacity-90"
        >
          {banner}
        </button>
      ) : (
        banner
      )}
      {/* 言語別の割合のメモ書き */}
      {caption && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] leading-relaxed tracking-wide text-neutral-400">
          {memo}
          {shareable && (
            <span className="inline-flex items-center gap-0.5 text-neutral-300">
              <Icon name="download" className="text-xs" />
              タップで画像保存
            </span>
          )}
        </p>
      )}

      {/* SNSサイズでの保存モーダル */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="画像として保存">
        <p className="mb-3 text-sm leading-relaxed text-neutral-500">
          いまの言語バランスの絵柄を、投稿サイズのPNG画像で保存します。
        </p>
        <div className="grid grid-cols-2 gap-2">
          {GEO_EXPORTS.map((fmt) => (
            <button
              key={fmt.key}
              onClick={() => save(fmt)}
              className="flex flex-col items-start gap-0.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-left hover:border-brand-400 hover:bg-brand-50/40"
            >
              <span className="text-sm font-semibold text-neutral-800">{fmt.label}</span>
              <span className="text-xs tabular-nums text-neutral-400">{fmt.size}px</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-sm font-semibold tracking-wide text-neutral-500">{children}</h2>
      {action}
    </div>
  )
}

/**
 * 言語の色はブランドカラーの類似色で、言語の「位置」によって決まる:
 * 第一言語=もっとも薄い、第二言語=2番目に薄い、第三言語=一番鮮やか。
 * 選択外の言語(教材タグ等に残る場合)はニュートラル。
 */
const LANG_POS_STYLE = [
  'bg-brand-100 text-brand-800 border-brand-200',
  'bg-brand-300 text-brand-950 border-brand-400',
  'bg-brand-500 text-white border-brand-500',
]
const LANG_POS_FALLBACK = 'bg-neutral-100 text-neutral-500 border-neutral-200'

/** チャート線・グラフィックに使う位置別カラー(L1薄→L3鮮、なだらかな階調) */
const LANG_STROKES = ['#9badff', '#5c76ff', '#3859ff']

export function langStroke(pos: number): string {
  return LANG_STROKES[pos] ?? '#a3a3a3'
}

/** 言語タグ:内容にかかわらず固定幅(4.5rem)。色は第一〜第三言語の位置で決まる */
export function LangChip({ lang }: { lang: Lang }) {
  const { langs } = useApp()
  const pos = langs.indexOf(lang)
  const chip = pos >= 0 ? LANG_POS_STYLE[pos] : LANG_POS_FALLBACK
  return (
    <span
      className={`inline-flex w-[4.5rem] shrink-0 items-center justify-center rounded-full border py-0.5 text-xs font-medium ${chip}`}
    >
      {T.langChip[lang]}
    </span>
  )
}

export const SKILL_ICON: Record<Skill, string> = {
  listening: 'hearing',
  speaking: 'chat',
  reading: 'menu_book',
  writing: 'edit',
}

/**
 * 技能ラベル:アイコンの下にテキストを縦積みした固定幅ブロック。
 * 幅が一定(w-10)なので行の他要素がカード外にはみ出さない。
 */
export function SkillLabel({ skill, className = '' }: { skill: Skill; className?: string }) {
  return (
    <span className={`inline-flex w-10 shrink-0 flex-col items-center gap-0.5 whitespace-nowrap ${className}`}>
      <Icon name={SKILL_ICON[skill]} className="text-xl text-neutral-500" />
      <span className="text-[10px] font-medium leading-none text-neutral-600">{T.skill[skill]}</span>
    </span>
  )
}

const STATUS_STYLE: Record<Status, { cls: string; icon: string }> = {
  achieved: { cls: 'bg-emerald-600 text-white border-emerald-600', icon: 'verified' },
  ahead: { cls: 'bg-sky-50 text-sky-700 border-sky-200', icon: 'trending_up' },
  onTrack: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'check_circle' },
  slightBehind: { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'trending_down' },
  attention: { cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: 'warning' },
  unrecorded: { cls: 'bg-neutral-100 text-neutral-500 border-neutral-200', icon: 'horizontal_rule' },
}

/** ステータス:色だけに依存せずラベル+アイコンを常に併記(アクセシビリティ) */
export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status]
  return (
    <span className={`inline-flex w-[5.25rem] shrink-0 items-center justify-center gap-1 rounded-full border py-0.5 text-xs font-semibold ${s.cls}`}>
      <Icon name={s.icon} className="text-[1.1em]" />
      {T.status[status]}
    </span>
  )
}

export function ProgressBar({ ratio, className = '' }: { ratio: number; className?: string }) {
  const pct = Math.round(ratio * 100)
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-neutral-400">{pct}%</span>
    </div>
  )
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[]
  value: V
  onChange: (v: V) => void
}) {
  return (
    <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`whitespace-nowrap rounded-[10px] px-3 py-1.5 text-sm font-medium transition-colors ${
            value === o.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/30 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className={`max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900">{title}</h3>
          <button onClick={onClose} aria-label="閉じる" className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100">
            <Icon name="close" className="text-xl" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = '削除する',
  danger = true,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm leading-relaxed text-neutral-600">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50">
          キャンセル
        </button>
        <button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${danger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-brand-600 hover:bg-brand-700'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export function EmptyState({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Icon name={icon} className="text-4xl text-neutral-300" />
      <div className="font-semibold text-neutral-700">{title}</div>
      {children && <div className="text-sm text-neutral-500">{children}</div>}
    </Card>
  )
}

export function PrimaryButton({ children, onClick, disabled, className = '' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}
