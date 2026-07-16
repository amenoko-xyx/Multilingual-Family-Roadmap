import Dexie, { type Table } from 'dexie'
import type {
  AppSetting,
  CanDoItem,
  Cell,
  CheckRecord,
  ExportData,
  Material,
  MaterialStatus,
  MaterialStatusValue,
  Member,
  MemberLanguage,
} from './types'
import { buildLangSeed, SEEDABLE_LANGS } from './seed/roadmapSeed'
import { MATERIALS_SEED } from './seed/materialsSeed'

export const EXPORT_VERSION = 4

class RoadmapDB extends Dexie {
  members!: Table<Member, string>
  checks!: Table<CheckRecord, string>
  items!: Table<CanDoItem, string>
  cells!: Table<Cell, string>
  materials!: Table<Material, string>
  materialStatus!: Table<MaterialStatus, string>
  settings!: Table<AppSetting, string>

  constructor() {
    // v3 で「家族全員・レベル段階軸」へ移行したため、旧アプリ(trilingual-roadmap)とは別DBとして新規定義
    super('multilingual-family-roadmap')
    this.version(1).stores({
      members: 'id',
      checks: 'id, memberId, itemId, achievedOn',
      items: 'id, stage, [lang+skill]',
      cells: 'id',
      materials: 'id',
      materialStatus: 'id, memberId, materialId',
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
    const exists = await db.cells.get(`${lang}-1`)
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

/** 選択中メンバーの言語構成(役割・目標・ペース)を更新する */
export async function updateMemberLanguages(memberId: string, languages: MemberLanguage[]): Promise<void> {
  await db.members.update(memberId, { languages })
}

/** ロードマップ(セル・項目・教材)を初期テンプレートに戻す。チェック記録とメンバーは残す */
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
  const [members, checks, cells, items, materials, materialStatuses, settings] = await Promise.all([
    db.members.toArray(),
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
    members,
    checks,
    materialStatuses,
    settings,
    roadmap: { cells, items, materials },
  }
}

export async function importAll(data: ExportData): Promise<void> {
  if (data.app !== 'trilingual-roadmap' || !Array.isArray(data.members) || !data.roadmap) {
    throw new Error('このファイルは Multilingual Family Roadmap のバックアップではありません')
  }
  await db.transaction(
    'rw',
    [db.members, db.checks, db.cells, db.items, db.materials, db.materialStatus, db.settings],
    async () => {
      await Promise.all([
        db.members.clear(),
        db.checks.clear(),
        db.cells.clear(),
        db.items.clear(),
        db.materials.clear(),
        db.materialStatus.clear(),
        db.settings.clear(),
      ])
      await db.members.bulkPut(data.members)
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
export async function addCheck(memberId: string, itemId: string, achievedOn: string): Promise<void> {
  await db.checks.put({
    id: `${memberId}:${itemId}`,
    memberId,
    itemId,
    achievedOn,
    recordedAt: new Date().toISOString(),
  })
}

export async function removeCheck(memberId: string, itemId: string): Promise<void> {
  await db.checks.delete(`${memberId}:${itemId}`)
}

export async function updateCheckDate(memberId: string, itemId: string, achievedOn: string): Promise<void> {
  await db.checks.update(`${memberId}:${itemId}`, { achievedOn })
}

/** 教材の取り組みステータス(メンバーごと) */
export async function setMaterialStatus(
  memberId: string,
  materialId: string,
  status: MaterialStatusValue,
): Promise<void> {
  const id = `${memberId}:${materialId}`
  if (status === 'notStarted') {
    await db.materialStatus.delete(id) // 既定値はレコード不要
  } else {
    await db.materialStatus.put({ id, memberId, materialId, status })
  }
}

/** Can-Do項目の削除(紐づく全メンバーのチェック記録も削除) */
export async function deleteItemWithChecks(itemId: string): Promise<void> {
  await db.transaction('rw', db.items, db.checks, async () => {
    await db.items.delete(itemId)
    await db.checks.where('itemId').equals(itemId).delete()
  })
}

export async function deleteMemberWithChecks(memberId: string): Promise<void> {
  await db.transaction('rw', db.members, db.checks, db.materialStatus, async () => {
    await db.members.delete(memberId)
    await db.checks.where('memberId').equals(memberId).delete()
    await db.materialStatus.where('memberId').equals(memberId).delete()
  })
}

export function uid(): string {
  return crypto.randomUUID()
}
