import { describe, expect, it } from 'vitest'
import { addMonths, ageAt, ageLabel, dateAtAge, fmtDateJa, minBirthDateStr, roundAge, todayStr } from './dates'

describe('ageAt(誕生日から指定日時点の年齢)', () => {
  it('誕生日と同日なら0歳', () => {
    expect(ageAt('2020-03-10', '2020-03-10')).toBe(0)
  })

  it('ちょうど1年後(365.2425日換算のため誤差を許容する)', () => {
    expect(ageAt('2020-03-10', '2021-03-10')).toBeCloseTo(1, 2)
  })

  it('誕生日より前の日付は0にクランプされる', () => {
    expect(ageAt('2020-01-01', '2019-12-31')).toBe(0)
    expect(ageAt('2020-01-01', '2019-01-01')).toBe(0)
  })
})

describe('dateAtAge と ageAt の往復整合', () => {
  it('dateAtAge(6.5) を ageAt に戻すとおよそ6.5に戻る', () => {
    const birth = '2015-05-20'
    const d = dateAtAge(birth, 6.5)
    expect(ageAt(birth, d)).toBeCloseTo(6.5, 2)
  })
})

describe('ageLabel(「6歳4ヶ月」形式のラベル)', () => {
  it('6.99年は6歳11ヶ月になる', () => {
    expect(ageLabel(6.99)).toBe('6歳11ヶ月')
  })

  it('整数年は端数の月(0ヶ月)を表示しない', () => {
    expect(ageLabel(6)).toBe('6歳')
  })
})

describe('roundAge(「10.5歳相当」用の丸め)', () => {
  it('10.55は小数1桁に丸められて10.6になる', () => {
    expect(roundAge(10.55)).toBe(10.6)
  })

  it('10.54は10.5に、10.56は10.6に丸められる', () => {
    expect(roundAge(10.54)).toBe(10.5)
    expect(roundAge(10.56)).toBe(10.6)
  })
})

describe('fmtDateJa(日本語の日付表示)', () => {
  it('ゼロ埋めなしで「年月日」形式にする', () => {
    expect(fmtDateJa('2026-07-05')).toBe('2026年7月5日')
  })
})

describe('addMonths(月の加減算)', () => {
  it('月をまたいで加算できる', () => {
    expect(addMonths('2024-11-15', 2)).toBe('2025-01-15')
  })

  it('負数を渡すと減算でき、年もまたぐ', () => {
    expect(addMonths('2024-02-15', -3)).toBe('2023-11-15')
  })
})

describe('minBirthDateStr(生年月日として許容する最小日付)', () => {
  it('今日より過去で、およそ101年前の日付になる(0〜100歳を想定)', () => {
    const today = todayStr()
    const min = minBirthDateStr()
    expect(min < today).toBe(true)
    const age = ageAt(min, today)
    expect(age).toBeGreaterThan(100.9)
    expect(age).toBeLessThan(101.1)
  })
})
