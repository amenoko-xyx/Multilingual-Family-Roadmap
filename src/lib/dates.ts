const MS_YEAR = 365.2425 * 24 * 60 * 60 * 1000

export function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr(): string {
  return fmtDate(new Date())
}

/** 誕生日から指定日時点の年齢(小数年)を返す */
export function ageAt(birthDate: string, onDate: string): number {
  const diff = new Date(onDate + 'T00:00:00').getTime() - new Date(birthDate + 'T00:00:00').getTime()
  return Math.max(0, diff / MS_YEAR)
}

/** その子が指定年齢だった日付を返す */
export function dateAtAge(birthDate: string, age: number): string {
  const t = new Date(birthDate + 'T00:00:00').getTime() + age * MS_YEAR
  return fmtDate(new Date(t))
}

/** 「6歳4ヶ月」形式のラベル */
export function ageLabel(years: number): string {
  const y = Math.floor(years)
  const m = Math.floor((years - y) * 12)
  return m > 0 ? `${y}歳${m}ヶ月` : `${y}歳`
}

/** 「10.5歳相当」用の丸め */
export function roundAge(years: number): number {
  return Math.round(years * 10) / 10
}

export function fmtDateJa(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

/** 生年月日として許容する最小日付(101年前まで。0〜100歳を想定) */
export function minBirthDateStr(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 101)
  return fmtDate(d)
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return fmtDate(d)
}
