import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { monthLabel } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import type { MonthPoint } from '../../domain/reports'
import { useAppSettings } from '../settings-context'
import { ChartCard, DataTable } from './ChartCard'
import { ChartFrame, TooltipBox } from './ChartTooltip'

export function BalanceAreaChart({ data }: { data: MonthPoint[] }) {
  const settings = useAppSettings()
  const scale = 10 ** settings.decimals
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month, settings.locale, 'short'), value: d.cumulativeMinor / scale }))
  const last = data[data.length - 1]
  const first = data[0]
  const money = (minor: number) => formatMoney(minor, settings)

  return (
    <ChartCard
      title="Balance acumulado"
      subtitle={first ? `Lo que has ahorrado desde ${monthLabel(first.month, settings.locale)}` : undefined}
      legend={
        last && (
          <p className="text-sm text-ink-2">
            Al cierre del periodo: <span className="tabular font-semibold text-ink">{money(last.cumulativeMinor)}</span>
          </p>
        )
      }
      table={
        <DataTable
          head={['Mes', 'Balance del mes', 'Acumulado']}
          rows={data.map((d) => [monthLabel(d.month, settings.locale), money(d.netMinor), money(d.cumulativeMinor)])}
        />
      }
    >
      <ChartFrame height={200} label="Gráfica de área del balance acumulado mes a mes">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 10, right: 10, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={4}
            />
            <YAxis
              width={52}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              tickFormatter={(v: number) => formatMoney(Math.round(v * scale), settings, { compact: true })}
              tickCount={4}
            />
            <ReferenceLine y={0} stroke="var(--axis)" />
            <Tooltip
              cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (typeof rows)[number] | undefined
                if (!active || !p) return null
                return (
                  <TooltipBox
                    title={monthLabel(p.month, settings.locale)}
                    rows={[
                      { label: 'Balance del mes', value: money(p.netMinor) },
                      { color: 'var(--brand)', label: 'Acumulado', value: money(p.cumulativeMinor), strong: true },
                    ]}
                  />
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--brand)"
              strokeWidth={2}
              fill="url(#balanceFill)"
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 5, fill: 'var(--brand)', stroke: 'var(--surface)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>
    </ChartCard>
  )
}
