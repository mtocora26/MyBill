import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { monthLabel } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import type { MonthPoint } from '../../domain/reports'
import { useAppSettings } from '../settings-context'
import { ChartCard, DataTable, LegendItem } from './ChartCard'
import { ChartFrame, TooltipBox } from './ChartTooltip'

export function MonthlyBarsChart({ data }: { data: MonthPoint[] }) {
  const settings = useAppSettings()
  const scale = 10 ** settings.decimals
  const rows = data.map((d) => ({
    ...d,
    label: monthLabel(d.month, settings.locale, 'short'),
    income: d.incomeMinor / scale,
    expense: d.expenseMinor / scale,
  }))
  const totalIncome = data.reduce((a, d) => a + d.incomeMinor, 0)
  const totalExpense = data.reduce((a, d) => a + d.expenseMinor, 0)
  const money = (minor: number) => formatMoney(minor, settings)

  return (
    <ChartCard
      title="Ingresos y gastos por mes"
      subtitle={`Últimos ${data.length} meses`}
      legend={
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <LegendItem color="var(--series-income)" label="Ingresos" value={money(totalIncome)} />
          <LegendItem color="var(--series-expense)" label="Gastos" value={money(totalExpense)} />
        </div>
      }
      table={
        <DataTable
          head={['Mes', 'Ingresos', 'Gastos', 'Balance']}
          rows={data.map((d) => [monthLabel(d.month, settings.locale), money(d.incomeMinor), money(d.expenseMinor), money(d.netMinor)])}
        />
      }
    >
      <ChartFrame height={240} label={`Gráfica de columnas de ingresos y gastos de los últimos ${data.length} meses`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barGap={2} barCategoryGap="22%" margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: 'var(--axis)' }}
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
            <Tooltip
              cursor={{ fill: 'var(--surface-2)', radius: 8 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (typeof rows)[number] | undefined
                if (!active || !p) return null
                return (
                  <TooltipBox
                    title={monthLabel(p.month, settings.locale)}
                    rows={[
                      { color: 'var(--series-income)', label: 'Ingresos', value: money(p.incomeMinor) },
                      { color: 'var(--series-expense)', label: 'Gastos', value: money(p.expenseMinor) },
                      { label: 'Balance', value: money(p.netMinor), strong: true },
                    ]}
                  />
                )
              }}
            />
            <Bar dataKey="income" name="Ingresos" fill="var(--series-income)" radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
            <Bar dataKey="expense" name="Gastos" fill="var(--series-expense)" radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </ChartCard>
  )
}
