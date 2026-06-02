"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface DayEntry {
  date: string
  input: number
  output: number
  cacheRead: number
  cacheCreate: number
}

interface Props {
  data: DayEntry[]
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function DailyChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // "MM-DD"
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "oklch(0.708 0 0)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={fmt}
          tick={{ fontSize: 11, fill: "oklch(0.708 0 0)" }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: "oklch(0.205 0 0)",
            border: "1px solid oklch(1 0 0 / 10%)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: "oklch(0.985 0 0)", marginBottom: 4 }}
          formatter={(value, name) => [
            typeof value === "number" ? value.toLocaleString() : value,
            name,
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "oklch(0.708 0 0)" }}
          iconType="square"
        />
        <Bar dataKey="input" name="input" fill="oklch(0.6 0.15 250)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="output" name="output" fill="oklch(0.6 0.18 290)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
