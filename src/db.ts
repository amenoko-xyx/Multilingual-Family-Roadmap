import Dexie, { type Table } from 'dexie'
import {
  DEFAULT_LANGS,
  type AppSetting,
  type CanDoItem,
  type Cell,
  type CheckRecord,
  type Child,
  type ExportData,
  type Lang,
  type Material,
  type MaterialStatus,
  type MaterialStatusValue,
} from './types'
import { buildLangSeed, SEEDABLE_LANGS } from './seed/roadmapSeed'
import { MATERIALS_SEED } from './seed/materialsSeed'

export const EXPORT_VERSION = 3

class RoadmapDB extends Dexie {
  children!: Table<Child, string>
  checks!: Table<CheckRecord, string>
  items!: Table<CanDoItem, string>
  cells!: Table<Cell, string>
  materials!: Table<Material, string>
  materialStatus!: Table<MaterialStatus, string>
  settings!: Table<AppSetting, string>

  constructor() {
    super('trilingual-roadmap')
    this.version(1).stores({
      children: 'id',
      checks: 'id, childId, itemId, achievedOn',
      items: 'id, band, [lang+skill]',
      cells: 'id',
      materials: 'id',
    })
    this.version(2).stores({
      children: 'id',
      checks: 'id, childId, itemId, achievedOn',
      items: 'id, band, [lang+skill]',
      cells: 'id',
      materials: 'id',
      materialStatus: 'id, childId, materialId',
      settings: 'key',
    })
  }
}

export const db = new RoadmapDB()

/**
 * 初回起動時・アップデート時にマスターロードマップを投入する。
 * 言語ごとに存在チェックするので、既存データに新しい言語のテンプレートを追記できる。
 */
export async function ensureSeed(): Promise<void> {
  for (const lang of SEEDABLE_LANGS) {
    const exists = await db.cells.get(`${lang}-0`)
    if (exists) continue
    const { cells, items } = buildLangSeed(lang)
    // ユーザーが個別に消した項目を勝手に復活させないよう、言語単位でのみ投入
    await db.transaction('rw', db.cells, db.items, async () => {
      await db.cells.bulkPut(cells)
      await db.items.bulkPut(items)
    })
  }
  if ((await db.materials.count()) === 0) await db.materials.bulkPut(MATERIALS_SEED)
}

/** 選択中の言語を取得(2〜3個。第三言語は任意) */
export async function getSelectedLangs(): Promise<Lang[]> {
  const s = await db.settings.get('langs')
  const v = ((s?.value as Lang[] | undefined) ?? DEFAULT_LANGS).filter(Boolean)
  return v.length >= 2 ? v.slice(0, 3) : DEFAULT_LANGS
}

export async function setSelectedLangs(langs: Lang[]): Promise<void> {
  await db.settings.put({ key: 'langs', value: langs })
}

/** 判定ペース係数(第一〜第三言語の順。1=しっかり、0.75=ゆるめ) */
export async function setPaceFactors(paces: [number, number, number]): Promise<void> {
  await db.settings.put({ key: 'paceFactors', value: paces })
}

/** ロードマップ(セル・項目・教材)を初期テンプレートに戻す。チェック記録と子供は残す */
export async function resetRoadmapToSeed(): Promise<void> {
  await db.transaction('rw', db.cells, db.items, db.materials, async () => {
    await db.cells.clear()
    await db.items.clear()
    await db.materials.clear()
    for (const lang of SEEDABLE_LANGS) {
      const { cells, items } = buildLangSeed(lang)
      await db.cells.bulkPut(cells)
      await db.items.bulkPut(items)
    }
    await db.materials.bulkPut(MATERIALS_SEED)
  })
}

export async function exportAll(): Promise<ExportData> {
  const [children, checks, cells, items, materials, materialStatuses, settings] = await Promise.all([
    db.children.toArray(),
    db.checks.toArray(),
    db.cells.toArray(),
    db.items.toArray(),
    db.materials.toArray(),
    db.materialStatus.toArray(),
    db.settings.toArray(),
  ])
  return {
    app: 'trilingual-roadmap',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    children,
    checks,
    materialStatuses,
    settings,
    roadmap: { cells, items, materials },
  }
}

export async function importAll(data: ExportData): Promise<void> {
  if (data.app !== 'trilingual-roadmap' || !Array.isArray(data.children) || !data.roadmap) {
    throw new Error('このファイルは Trilingual Roadmap のバックアップではありません')
  }
  await db.transaction(
    'rw',
    [db.children, db.checks, db.cells, db.items, db.materials, db.materialStatus, db.settings],
    async () => {
      await Promise.all([
        db.children.clear(),
        db.checks.clear(),
        db.cells.clear(),
        db.items.clear(),
        db.materials.clear(),
        db.materialStatus.clear(),
        db.settings.clear(),
      ])
      await db.children.bulkPut(data.children)
      await db.checks.bulkPut(data.checks ?? [])
      await db.cells.bulkPut(data.roadmap.cells ?? [])
      await db.items.bulkPut(data.roadmap.items ?? [])
      await db.materials.bulkPut(data.roadmap.materials ?? [])
      await db.materialStatus.bulkPut(data.materialStatuses ?? [])
      await db.settings.bulkPut(data.settings ?? [])
    },
  )
  // 旧バージョンのバックアップには新言語のテンプレートがないので補完する
  await ensureSeed()
}

/** チェックの付与(当日日付で記録、後から修正可能) */
export async function addCheck(childId: string, itemId: string, achievedOn: string): Promise<void> {
  await db.checks.put({
    id: `${childId}:${itemId}`,
    childId,
    itemId,
    achievedOn,
    recordedAt: new Date().toISOString(),
  })
}

export async function removeCheck(childId: string, itemId: string): Promise<void> {
  await db.checks.delete(`${childId}:${itemId}`)
}

export async function updateCheckDate(childId: string, itemId: string, achievedOn: string): Promise<void> {
  await db.checks.update(`${childId}:${itemId}`, { achievedOn })
}

/** 教材の取り組みステータス(子供ごと) */
export async function setMaterialStatus(
  childId: string,
  materialId: string,
  status: MaterialStatusValue,
): Promise<void> {
  const id = `${childId}:${materialId}`
  if (status === 'notStarted') {
    await db.materialStatus.delete(id) // 既定値はレコード不要
  } else {
    await db.materialStatus.put({ id, childId, materialId, status })
  }
}

/** Can-Do項目の削除(紐づく全子供のチェック記録も削除) */
export async function deleteItemWithChecks(itemId: string): Promise<void> {
  await db.transaction('rw', db.items, db.checks, async () => {
    await db.items.delete(itemId)
    await db.checks.where('itemId').equals(itemId).delete()
  })
}

export async function deleteChildWithChecks(childId: string): Promise<void> {
  await db.transaction('rw', db.children, db.checks, db.materialStatus, async () => {
    await db.children.delete(childId)
    await db.checks.where('childId').equals(childId).delete()
    await db.materialStatus.where('childId').equals(childId).delete()
  })
}

export function uid(): string {
  return crypto.randomUUID()
}
