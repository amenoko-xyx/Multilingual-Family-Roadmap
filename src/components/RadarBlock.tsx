import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Legend } from 'recharts'
import { SKILLS, type Skill } from '../types'
import { T } from '../i18n'

export interface RadarSeries {
  name: string
  color: string
  dashed?: boolean
  /** 技能ごとの到達レベル(0〜6、未記録は null → 0 で描画) */
  values: Record<Skill, number | null>
}

/** 言語×技能レーダー(値=到達レベル、0〜6) */
export function RadarBlock({ title, series }: { title: string; series: RadarSeries[] }) {
  const data = SKILLS.map((skill) => {
    const row: Record<string, string | number> = { skill: T.skill[skill] }
    series.forEach((s) => {
      row[s.name] = Math.round(((s.values[skill] ?? 0) + Number.EPSILON) * 10) / 10
    })
    return row
  })

  return (
    <div>
      <div className="mb-1 text-center text-sm font-semibold text-neutral-700">{title}</div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="#e5e5e5" />
            <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12, fill: '#525252' }} />
            <PolarRadiusAxis domain={[0, 6]} tick={false} axisLine={false} />
            {series.map((s) => (
              <Radar
                key={s.name}
                name={s.name}
                dataKey={s.name}
                stroke={s.color}
                fill={s.color}
                fillOpacity={s.dashed ? 0 : 0.18}
                strokeWidth={2}
                strokeDasharray={s.dashed ? '5 4' : undefined}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
