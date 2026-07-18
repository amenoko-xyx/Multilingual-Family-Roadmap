// MFR Design System Generator
// Multilingual Family Roadmap の実装(src/index.css / src/components/ui.tsx)から抽出した
// カラーバリアブル・コンポーネント・画面雛形を、実行中のFigmaファイルに生成する。
// 使い方: Figmaデスクトップアプリ → Plugins → Development → Import plugin from manifest… → Run

/* ---------- カラー定義(実装と同値) ---------- */

const BRAND = {
  50: 'eef1ff', 100: 'dfe5ff', 200: 'c3ceff', 300: '9badff', 400: '6c82ff',
  500: '4a64ff', 600: '3859ff', 700: '2b43e6', 800: '2437bb', 900: '233293', 950: '141b52',
}
const NEUTRAL = {
  0: 'ffffff', 50: 'fafafa', 100: 'f5f5f5', 200: 'e5e5e5', 300: 'd4d4d4', 400: 'a3a3a3',
  500: '737373', 600: '525252', 700: '404040', 800: '262626', 900: '171717',
}
// 言語の役割色(母語=薄 → 第二外国語=鮮)。graphicはチャート・GeoBanner用
const ROLE = {
  'native/bg': BRAND[100], 'native/text': BRAND[800], 'native/border': BRAND[200], 'native/graphic': '9badff',
  'foreign1/bg': BRAND[300], 'foreign1/text': BRAND[950], 'foreign1/border': BRAND[400], 'foreign1/graphic': '5c76ff',
  'foreign2/bg': BRAND[500], 'foreign2/text': 'ffffff', 'foreign2/border': BRAND[500], 'foreign2/graphic': '3859ff',
  'unset/bg': NEUTRAL[100], 'unset/text': NEUTRAL[500], 'unset/border': NEUTRAL[200], 'unset/graphic': 'a3a3a3',
}
const STATUS = {
  'achieved/bg': '059669', 'achieved/text': 'ffffff', 'achieved/border': '059669',
  'ahead/bg': 'f0f9ff', 'ahead/text': '0369a1', 'ahead/border': 'bae6fd',
  'onTrack/bg': 'ecfdf5', 'onTrack/text': '047857', 'onTrack/border': 'a7f3d0',
  'slightBehind/bg': 'fffbeb', 'slightBehind/text': 'b45309', 'slightBehind/border': 'fde68a',
  'attention/bg': 'fff1f2', 'attention/text': 'be123c', 'attention/border': 'fecdd3',
  'unrecorded/bg': 'f5f5f5', 'unrecorded/text': '737373', 'unrecorded/border': 'e5e5e5',
}
const RADII = { sm: 8, lg: 10, xl: 12, '2xl': 16, full: 999 }
const SPACES = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 }

const STATUS_LABEL = {
  achieved: '達成', ahead: '先行', onTrack: '順調',
  slightBehind: 'やや遅れ', attention: '要注意', unrecorded: '未記録',
}
const ROLE_LABEL = { native: '日本語', foreign1: '英語', foreign2: '中国語', unset: '未設定' }
const SKILL_LABEL = { listening: '聞く', speaking: '話す', reading: '読む', writing: '書く' }
const SKILL_GLYPH = { listening: '👂', speaking: '💬', reading: '📖', writing: '✏️' }

/* ---------- ユーティリティ ---------- */

function rgb(hex) {
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  }
}
const paint = (hex) => ({ type: 'SOLID', color: rgb(hex) })

let FONT = { family: 'Noto Sans JP', style: 'Regular' }
let FONT_BOLD = { family: 'Noto Sans JP', style: 'Bold' }
let FONT_MED = { family: 'Noto Sans JP', style: 'Medium' }

async function loadFonts() {
  try {
    await figma.loadFontAsync(FONT)
    await figma.loadFontAsync(FONT_BOLD)
    try { await figma.loadFontAsync(FONT_MED) } catch (e) { FONT_MED = FONT_BOLD }
  } catch (e) {
    // Noto Sans JP が無い環境では Inter にフォールバック(日本語は豆腐になる点に注意)
    FONT = { family: 'Inter', style: 'Regular' }
    FONT_BOLD = { family: 'Inter', style: 'Bold' }
    FONT_MED = { family: 'Inter', style: 'Medium' }
    await figma.loadFontAsync(FONT)
    await figma.loadFontAsync(FONT_BOLD)
    try { await figma.loadFontAsync(FONT_MED) } catch (e2) { FONT_MED = FONT_BOLD }
  }
}

// Variables に紐づけたSolidPaintを返す
function varPaint(variable) {
  return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', variable)
}

function text(chars, size, font, hexOrVar) {
  const t = figma.createText()
  t.fontName = font
  t.characters = chars
  t.fontSize = size
  t.fills = typeof hexOrVar === 'string' ? [paint(hexOrVar)] : [varPaint(hexOrVar)]
  t.textAutoResize = 'WIDTH_AND_HEIGHT'
  return t
}

function autoFrame(dir, pad, gap) {
  const f = figma.createFrame()
  f.layoutMode = dir
  f.primaryAxisSizingMode = 'AUTO'
  f.counterAxisSizingMode = 'AUTO'
  f.paddingLeft = f.paddingRight = pad
  f.paddingTop = f.paddingBottom = pad
  f.itemSpacing = gap
  f.fills = []
  return f
}

/* ---------- 1. Variables ---------- */

const V = {} // name -> Variable

function makeColorCollection() {
  const col = figma.variables.createVariableCollection('MFR Colors')
  const mode = col.modes[0].modeId
  const add = (name, hex) => {
    const v = figma.variables.createVariable(name, col, 'COLOR')
    v.setValueForMode(mode, rgb(hex))
    V[name] = v
  }
  for (const k in BRAND) add(`brand/${k}`, BRAND[k])
  for (const k in NEUTRAL) add(`neutral/${k}`, NEUTRAL[k])
  for (const k in ROLE) add(`role/${k}`, ROLE[k])
  for (const k in STATUS) add(`status/${k}`, STATUS[k])
}

function makeLayoutCollection() {
  const col = figma.variables.createVariableCollection('MFR Layout')
  const mode = col.modes[0].modeId
  const add = (name, n) => {
    const v = figma.variables.createVariable(name, col, 'FLOAT')
    v.setValueForMode(mode, n)
    V[name] = v
  }
  for (const k in RADII) add(`radius/${k}`, RADII[k])
  for (const k in SPACES) add(`space/${k}`, SPACES[k])
}

function makeTextStyles() {
  const defs = [
    ['MFR/Heading H1', 24, FONT_BOLD], ['MFR/Heading H2', 20, FONT_BOLD], ['MFR/Heading H3', 18, FONT_BOLD],
    ['MFR/Body', 14, FONT], ['MFR/Body Semibold', 14, FONT_BOLD],
    ['MFR/Caption', 12, FONT], ['MFR/Caption XS', 11, FONT], ['MFR/Label 10', 10, FONT_MED],
  ]
  for (const [name, size, font] of defs) {
    const s = figma.createTextStyle()
    s.name = name
    s.fontName = font
    s.fontSize = size
  }
}

/* ---------- 2. コンポーネント ---------- */

function chipBase(width) {
  const c = figma.createComponent()
  c.layoutMode = 'HORIZONTAL'
  c.primaryAxisAlignItems = 'CENTER'
  c.counterAxisAlignItems = 'CENTER'
  c.paddingTop = c.paddingBottom = 3
  c.paddingLeft = c.paddingRight = 8
  c.cornerRadius = RADII.full
  c.strokeWeight = 1
  if (width) {
    c.resize(width, 22)
    c.primaryAxisSizingMode = 'FIXED'
    c.counterAxisSizingMode = 'FIXED'
  } else {
    c.primaryAxisSizingMode = 'AUTO'
    c.counterAxisSizingMode = 'AUTO'
  }
  return c
}

// LangChip: 固定幅72px・役割で配色(実装: ui.tsx LangChip)
function makeLangChip(x, y) {
  const variants = []
  for (const role of ['native', 'foreign1', 'foreign2', 'unset']) {
    const c = chipBase(72)
    c.name = `role=${role}`
    c.fills = [varPaint(V[`role/${role}/bg`])]
    c.strokes = [varPaint(V[`role/${role}/border`])]
    const t = text(ROLE_LABEL[role], 12, FONT_MED, V[`role/${role}/text`])
    c.appendChild(t)
    variants.push(c)
  }
  const set = figma.combineAsVariants(variants, figma.currentPage)
  set.name = 'LangChip'
  set.layoutMode = 'HORIZONTAL'
  set.itemSpacing = 12
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 12
  set.x = x; set.y = y
  return set
}

// StatusBadge: 固定幅84px・6ステータス(実装: ui.tsx StatusBadge)
function makeStatusBadge(x, y) {
  const variants = []
  for (const st of ['achieved', 'ahead', 'onTrack', 'slightBehind', 'attention', 'unrecorded']) {
    const c = chipBase(84)
    c.name = `status=${st}`
    c.fills = [varPaint(V[`status/${st}/bg`])]
    c.strokes = [varPaint(V[`status/${st}/border`])]
    const dot = figma.createEllipse()
    dot.resize(8, 8)
    dot.fills = [varPaint(V[`status/${st}/text`])]
    c.appendChild(dot)
    const t = text(STATUS_LABEL[st], 12, FONT_BOLD, V[`status/${st}/text`])
    c.appendChild(t)
    c.itemSpacing = 4
    variants.push(c)
  }
  const set = figma.combineAsVariants(variants, figma.currentPage)
  set.name = 'StatusBadge'
  set.layoutMode = 'HORIZONTAL'
  set.itemSpacing = 12
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 12
  set.x = x; set.y = y
  return set
}

// SkillLabel: アイコンの下にテキストの縦積み・固定幅40(実装: ui.tsx SkillLabel)
function makeSkillLabel(x, y) {
  const variants = []
  for (const sk of ['listening', 'speaking', 'reading', 'writing']) {
    const c = figma.createComponent()
    c.name = `skill=${sk}`
    c.layoutMode = 'VERTICAL'
    c.primaryAxisAlignItems = 'CENTER'
    c.counterAxisAlignItems = 'CENTER'
    c.itemSpacing = 2
    c.resize(40, 38)
    c.primaryAxisSizingMode = 'FIXED'
    c.counterAxisSizingMode = 'FIXED'
    c.fills = []
    // アイコンはプレースホルダ(絵文字)。Material Symbols プラグイン等で差し替え想定
    const icon = text(SKILL_GLYPH[sk], 16, FONT, NEUTRAL[500] ? 'a3a3a3' : 'a3a3a3')
    c.appendChild(icon)
    const t = text(SKILL_LABEL[sk], 10, FONT_MED, V['neutral/600'])
    c.appendChild(t)
    variants.push(c)
  }
  const set = figma.combineAsVariants(variants, figma.currentPage)
  set.name = 'SkillLabel'
  set.layoutMode = 'HORIZONTAL'
  set.itemSpacing = 12
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 12
  set.x = x; set.y = y
  return set
}

// Button: primary / secondary(実装: PrimaryButton / セカンダリ様式)
function makeButton(x, y) {
  const variants = []
  for (const kind of ['primary', 'secondary']) {
    const c = figma.createComponent()
    c.name = `type=${kind}`
    c.layoutMode = 'HORIZONTAL'
    c.primaryAxisAlignItems = 'CENTER'
    c.counterAxisAlignItems = 'CENTER'
    c.paddingLeft = c.paddingRight = 16
    c.paddingTop = c.paddingBottom = 10
    c.cornerRadius = RADII.xl
    c.primaryAxisSizingMode = 'AUTO'
    c.counterAxisSizingMode = 'AUTO'
    if (kind === 'primary') {
      c.fills = [varPaint(V['brand/600'])]
      c.appendChild(text('ボタン', 14, FONT_BOLD, V['neutral/0']))
    } else {
      c.fills = [varPaint(V['neutral/0'])]
      c.strokes = [varPaint(V['neutral/200'])]
      c.strokeWeight = 1
      c.appendChild(text('ボタン', 14, FONT_MED, V['neutral/700']))
    }
    variants.push(c)
  }
  const set = figma.combineAsVariants(variants, figma.currentPage)
  set.name = 'Button'
  set.layoutMode = 'HORIZONTAL'
  set.itemSpacing = 12
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 12
  set.x = x; set.y = y
  return set
}

// Card(実装: ui.tsx Card)
function makeCard(x, y) {
  const c = figma.createComponent()
  c.name = 'Card'
  c.layoutMode = 'VERTICAL'
  c.paddingLeft = c.paddingRight = c.paddingTop = c.paddingBottom = 16
  c.itemSpacing = 8
  c.cornerRadius = RADII['2xl']
  c.fills = [varPaint(V['neutral/0'])]
  c.strokes = [varPaint(V['neutral/200'])]
  c.strokeWeight = 1
  c.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.03 }, offset: { x: 0, y: 1 }, radius: 2, visible: true, blendMode: 'NORMAL' }]
  c.resize(343, 80)
  c.primaryAxisSizingMode = 'AUTO'
  c.counterAxisSizingMode = 'FIXED'
  c.appendChild(text('カードコンテンツ', 14, FONT, V['neutral/700']))
  c.x = x; c.y = y
  return c
}

// CheckRow: テキスト左・44pxチェックボックス右端(実装: CheckRow)
function makeCheckRow(x, y) {
  const variants = []
  for (const st of ['unchecked', 'checked']) {
    const c = figma.createComponent()
    c.name = `state=${st}`
    c.layoutMode = 'HORIZONTAL'
    c.counterAxisAlignItems = 'CENTER'
    c.itemSpacing = 12
    c.paddingLeft = c.paddingRight = 8
    c.paddingTop = c.paddingBottom = 10
    c.resize(343, 64)
    c.primaryAxisSizingMode = 'FIXED'
    c.counterAxisSizingMode = 'AUTO'
    c.fills = []
    const label = text('段階別リーダーを1冊読み切る', 14, FONT, st === 'checked' ? V['neutral/500'] : V['neutral/800'])
    label.layoutGrow = 1
    label.textAutoResize = 'HEIGHT'
    c.appendChild(label)
    const box = figma.createFrame()
    box.resize(44, 44)
    box.cornerRadius = RADII.xl
    box.strokeWeight = 2
    box.layoutMode = 'HORIZONTAL'
    box.primaryAxisAlignItems = 'CENTER'
    box.counterAxisAlignItems = 'CENTER'
    box.primaryAxisSizingMode = 'FIXED'
    box.counterAxisSizingMode = 'FIXED'
    if (st === 'checked') {
      box.fills = [varPaint(V['brand/500'])]
      box.strokes = [varPaint(V['brand/500'])]
      box.appendChild(text('✓', 18, FONT_BOLD, V['neutral/0']))
    } else {
      box.fills = [varPaint(V['neutral/0'])]
      box.strokes = [varPaint(V['neutral/300'])]
    }
    c.appendChild(box)
    variants.push(c)
  }
  const set = figma.combineAsVariants(variants, figma.currentPage)
  set.name = 'CheckRow'
  set.layoutMode = 'VERTICAL'
  set.itemSpacing = 8
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 12
  set.x = x; set.y = y
  return set
}

// ProgressBar(実装: ProgressBar)
function makeProgressBar(x, y) {
  const c = figma.createComponent()
  c.name = 'ProgressBar'
  c.layoutMode = 'HORIZONTAL'
  c.counterAxisAlignItems = 'CENTER'
  c.itemSpacing = 8
  c.resize(240, 16)
  c.primaryAxisSizingMode = 'FIXED'
  c.counterAxisSizingMode = 'AUTO'
  c.fills = []
  const track = figma.createFrame()
  track.resize(190, 6)
  track.cornerRadius = RADII.full
  track.fills = [varPaint(V['neutral/100'])]
  track.layoutMode = 'HORIZONTAL'
  track.primaryAxisSizingMode = 'FIXED'
  track.counterAxisSizingMode = 'FIXED'
  track.layoutGrow = 1
  const fill = figma.createFrame()
  fill.resize(114, 6)
  fill.cornerRadius = RADII.full
  fill.fills = [varPaint(V['brand/500'])]
  track.appendChild(fill)
  c.appendChild(track)
  c.appendChild(text('60%', 12, FONT, V['neutral/400']))
  c.x = x; c.y = y
  return c
}

// Segmented(実装: Segmented)
function makeSegmented(x, y) {
  const c = figma.createComponent()
  c.name = 'Segmented'
  c.layoutMode = 'HORIZONTAL'
  c.paddingLeft = c.paddingRight = c.paddingTop = c.paddingBottom = 2
  c.itemSpacing = 0
  c.cornerRadius = RADII.xl
  c.fills = [varPaint(V['neutral/100'])]
  c.strokes = [varPaint(V['neutral/200'])]
  c.strokeWeight = 1
  c.primaryAxisSizingMode = 'AUTO'
  c.counterAxisSizingMode = 'AUTO'
  const seg = (label, active) => {
    const s = autoFrame('HORIZONTAL', 0, 0)
    s.paddingLeft = s.paddingRight = 12
    s.paddingTop = s.paddingBottom = 6
    s.cornerRadius = RADII.lg
    if (active) {
      s.fills = [varPaint(V['neutral/0'])]
      s.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.06 }, offset: { x: 0, y: 1 }, radius: 2, visible: true, blendMode: 'NORMAL' }]
    }
    s.appendChild(text(label, 14, FONT_MED, active ? V['neutral/900'] : V['neutral/500']))
    return s
  }
  c.appendChild(seg('すべて', true))
  c.appendChild(seg('日本語', false))
  c.appendChild(seg('英語', false))
  c.x = x; c.y = y
  return c
}

// StepIndicator の1要素(オンボーディング)
function makeStepItem(x, y) {
  const variants = []
  for (const st of ['done', 'current', 'upcoming']) {
    const c = chipBase()
    c.name = `state=${st}`
    c.itemSpacing = 4
    if (st === 'current') {
      c.fills = [varPaint(V['brand/600'])]
      c.strokes = []
      c.appendChild(text('2', 12, FONT_MED, V['neutral/0']))
      c.appendChild(text('ことばの設定', 12, FONT_MED, V['neutral/0']))
    } else if (st === 'done') {
      c.fills = []
      c.strokes = []
      c.appendChild(text('✓', 12, FONT_BOLD, V['brand/700']))
      c.appendChild(text('メンバーの情報', 12, FONT_MED, V['brand/700']))
    } else {
      c.fills = []
      c.strokes = []
      c.appendChild(text('3', 12, FONT_MED, V['neutral/400']))
      c.appendChild(text('いまのようす', 12, FONT_MED, V['neutral/400']))
    }
    variants.push(c)
  }
  const set = figma.combineAsVariants(variants, figma.currentPage)
  set.name = 'StepIndicatorItem'
  set.layoutMode = 'HORIZONTAL'
  set.itemSpacing = 12
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 12
  set.x = x; set.y = y
  return set
}

// BottomNavItem
function makeBottomNavItem(x, y) {
  const variants = []
  for (const st of ['active', 'inactive']) {
    const c = figma.createComponent()
    c.name = `state=${st}`
    c.layoutMode = 'VERTICAL'
    c.primaryAxisAlignItems = 'CENTER'
    c.counterAxisAlignItems = 'CENTER'
    c.itemSpacing = 2
    c.paddingTop = c.paddingBottom = 8
    c.resize(93, 48)
    c.primaryAxisSizingMode = 'FIXED'
    c.counterAxisSizingMode = 'FIXED'
    c.fills = []
    const color = st === 'active' ? V['brand/600'] : V['neutral/400']
    c.appendChild(text('●', 14, FONT, color))
    c.appendChild(text('ホーム', 10, FONT_MED, color))
    variants.push(c)
  }
  const set = figma.combineAsVariants(variants, figma.currentPage)
  set.name = 'BottomNavItem'
  set.layoutMode = 'HORIZONTAL'
  set.itemSpacing = 12
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 12
  set.x = x; set.y = y
  return set
}

/* ---------- 3. 画面雛形(モバイル375) ---------- */

function screenFrame(name, x) {
  const f = figma.createFrame()
  f.name = name
  f.resize(375, 812)
  f.x = x
  f.y = 0
  f.layoutMode = 'VERTICAL'
  f.paddingLeft = f.paddingRight = 16
  f.paddingTop = 16
  f.itemSpacing = 16
  f.primaryAxisSizingMode = 'FIXED'
  f.counterAxisSizingMode = 'FIXED'
  f.fills = [varPaint(V['neutral/50'])]
  f.clipsContent = true
  return f
}

function geoBannerPlaceholder() {
  const g = figma.createFrame()
  g.name = 'GeoBanner(プレースホルダ)'
  g.resize(343, 80)
  g.cornerRadius = RADII['2xl']
  g.clipsContent = true
  g.layoutMode = 'HORIZONTAL'
  g.itemSpacing = 0
  g.primaryAxisSizingMode = 'FIXED'
  g.counterAxisSizingMode = 'FIXED'
  const seg = (varName, w) => {
    const s = figma.createFrame()
    s.resize(w, 80)
    s.fills = [varPaint(V[varName])]
    g.appendChild(s)
  }
  seg('role/native/graphic', 172)
  seg('role/foreign1/graphic', 110)
  seg('role/foreign2/graphic', 61)
  return g
}

function makeHomeScreen(components, x) {
  const f = screenFrame('Home / ホーム', x)
  // ヘッダー
  const header = autoFrame('HORIZONTAL', 0, 8)
  header.counterAxisAlignItems = 'CENTER'
  header.appendChild(text('Multilingual Family Roadmap', 16, FONT_BOLD, V['neutral/900']))
  f.appendChild(header)
  // GeoBanner + メモ
  f.appendChild(geoBannerPlaceholder())
  f.appendChild(text('日本語 54%・英語 31%・中国語 15%', 11, FONT, V['neutral/400']))
  // メンバー名
  f.appendChild(text('みお', 24, FONT_BOLD, V['neutral/900']))
  // ボタン行
  const btnRow = autoFrame('HORIZONTAL', 0, 8)
  const b1 = components.button.defaultVariant.createInstance()
  const b2 = components.button.children[1].createInstance()
  btnRow.appendChild(b1)
  btnRow.appendChild(b2)
  f.appendChild(btnRow)
  // サマリーカード(SkillLabel + StatusBadge の行 ×4)
  f.appendChild(text('ステータスサマリー', 12, FONT_BOLD, V['neutral/500']))
  const card = components.card.createInstance()
  card.resize(343, card.height)
  const langRow = components.langChip.defaultVariant.createInstance()
  card.appendChild(langRow)
  const skills = ['listening', 'speaking', 'reading', 'writing']
  for (let i = 0; i < 4; i++) {
    const row = autoFrame('HORIZONTAL', 0, 8)
    row.counterAxisAlignItems = 'CENTER'
    row.resize(311, row.height)
    row.primaryAxisSizingMode = 'FIXED'
    const sk = components.skillLabel.children[i].createInstance()
    row.appendChild(sk)
    const spacer = figma.createFrame()
    spacer.resize(10, 10)
    spacer.fills = []
    spacer.layoutGrow = 1
    row.appendChild(spacer)
    const badge = components.statusBadge.children[i + 1] ? components.statusBadge.children[i + 1].createInstance() : components.statusBadge.defaultVariant.createInstance()
    row.appendChild(badge)
    card.appendChild(row)
  }
  f.appendChild(card)
  // 記録セクション
  f.appendChild(text('できたことを記録', 12, FONT_BOLD, V['neutral/500']))
  const recCard = components.card.createInstance()
  recCard.resize(343, recCard.height)
  recCard.appendChild(components.progressBar.createInstance())
  recCard.appendChild(components.checkRow.defaultVariant.createInstance())
  recCard.appendChild(components.checkRow.children[1].createInstance())
  f.appendChild(recCard)
  return f
}

function makeOnboardingScreen(components, x) {
  const f = screenFrame('Onboarding / ことばの設定', x)
  // ステップインジケーター
  const steps = autoFrame('HORIZONTAL', 0, 6)
  steps.counterAxisAlignItems = 'CENTER'
  steps.appendChild(components.stepItem.defaultVariant.createInstance())
  steps.appendChild(components.stepItem.children[1].createInstance())
  steps.appendChild(components.stepItem.children[2].createInstance())
  f.appendChild(steps)
  // 見出しカード
  const head = components.card.createInstance()
  head.resize(343, head.height)
  head.appendChild(text('みおさんのことばの設定', 18, FONT_BOLD, V['neutral/900']))
  head.appendChild(text('母語・第一外国語・第二外国語の3つのことばを選びます。', 14, FONT, V['neutral/500']))
  f.appendChild(head)
  // 役割行 ×3
  const roleCard = components.card.createInstance()
  roleCard.resize(343, roleCard.height)
  const roles = [['母語', 'native'], ['第一外国語', 'foreign1'], ['第二外国語', 'foreign2']]
  for (const [label, role] of roles) {
    roleCard.appendChild(text(label, 14, FONT_BOLD, V['neutral/700']))
    const sel = autoFrame('HORIZONTAL', 0, 8)
    sel.paddingLeft = sel.paddingRight = 10
    sel.paddingTop = sel.paddingBottom = 6
    sel.cornerRadius = RADII.xl
    sel.fills = [varPaint(V['neutral/0'])]
    sel.strokes = [varPaint(V['neutral/300'])]
    sel.strokeWeight = 1
    sel.resize(240, sel.height)
    sel.primaryAxisSizingMode = 'FIXED'
    sel.appendChild(text(ROLE_LABEL[role], 14, FONT, V['neutral/800']))
    roleCard.appendChild(sel)
  }
  f.appendChild(roleCard)
  const btn = components.button.defaultVariant.createInstance()
  btn.resize(343, btn.height)
  btn.primaryAxisSizingMode = 'FIXED'
  f.appendChild(btn)
  return f
}

/* ---------- メイン ---------- */

async function main() {
  await loadFonts()

  makeColorCollection()
  makeLayoutCollection()
  makeTextStyles()

  // コンポーネントページ
  const compPage = figma.createPage()
  compPage.name = '🧩 MFR Components'
  figma.currentPage = compPage

  const components = {}
  components.langChip = makeLangChip(0, 0)
  components.statusBadge = makeStatusBadge(0, 120)
  components.skillLabel = makeSkillLabel(0, 240)
  components.button = makeButton(0, 360)
  components.card = makeCard(0, 470)
  components.checkRow = makeCheckRow(420, 0)
  components.progressBar = makeProgressBar(420, 240)
  components.segmented = makeSegmented(420, 320)
  components.stepItem = makeStepItem(420, 420)
  components.bottomNavItem = makeBottomNavItem(420, 540)

  // 画面ページ
  const screenPage = figma.createPage()
  screenPage.name = '📱 MFR Screens'
  figma.currentPage = screenPage
  makeHomeScreen(components, 0)
  makeOnboardingScreen(components, 475)

  figma.currentPage = compPage
  figma.viewport.scrollAndZoomIntoView(compPage.children)
  figma.closePlugin('MFR Design System を生成しました(Variables 2コレクション / コンポーネント10種 / 画面雛形2枚)')
}

main().catch((e) => {
  figma.closePlugin('エラー: ' + (e && e.message ? e.message : String(e)))
})
