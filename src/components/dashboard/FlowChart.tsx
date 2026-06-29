"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart2 } from "lucide-react";

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-lg text-sm">
        <p className="font-semibold text-slate-800 mb-2">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-slate-600 capitalize">
              {p.name === "entradas" ? "Entradas" : "Saídas"}:{" "}
            </span>
            <span className="font-semibold text-slate-900">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface FlowChartProps {
  chartData?: Array<{ name: string; entradas: number; saidas: number }>;
}

export function FlowChart({ chartData }: FlowChartProps) {
  const data = chartData && chartData.length > 0 ? chartData : [];
  
  const totalEntradas = data.reduce((s, d) => s + d.entradas, 0);
  const totalSaidas = data.reduce((s, d) => s + d.saidas, 0);

  return (
    <Card className="border-0 rounded-2xl shadow-sm bg-white">
      <CardHeader className="pb-2 px-5 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Fluxo da Semana
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Entradas e saídas de materiais
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1">
            <TrendingUp className="h-3 w-3 text-emerald-600" />
            <span className="text-[10px] font-semibold text-emerald-700">
              +12% vs semana anterior
            </span>
          </div>
        </div>

        {/* Resumo rápido */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-600">
              Entradas:{" "}
              <span className="font-semibold text-slate-800">{totalEntradas}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-violet-400" />
            <span className="text-xs text-slate-600">
              Saídas:{" "}
              <span className="font-semibold text-slate-800">{totalSaidas}</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 pb-4">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-slate-400">
            <BarChart2 className="h-8 w-8 opacity-30" />
            <p className="text-xs">Nenhuma movimentação nos últimos 7 dias</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={data}
              margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="entradas"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorEntradas)"
                dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              />
              <Area
                type="monotone"
                dataKey="saidas"
                stroke="#a78bfa"
                strokeWidth={2}
                fill="url(#colorSaidas)"
                dot={{ fill: "#a78bfa", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
