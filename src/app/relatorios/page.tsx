"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package, ArrowRightLeft, Clock, FileSignature, TrendingUp, TrendingDown,
  BarChart3, RefreshCw, AlertCircle, CheckCircle2, XCircle, ClipboardList,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/lib/utils";

// ── Tipos ──────────────────────────────────────────────────────

interface Stats {
  totalItems: number;
  monthlyMovements: number;
  avgDaysInStock: number;
  pendingSignatures: number;
  chartData: { name: string; entradas: number; saidas: number }[];
}

interface Material {
  id: string;
  name: string;
  category: string;
  quantity: number;
  status: string;
  fornecedor: string | null;
  nomeAcao: string | null;
}

interface MarcadorObj {
  id: string;
  name: string;
  color: string;
}

interface Solicitacao {
  id: string;
  material: string;
  solicitante: string;
  quantity: number;
  status: "PENDENTE" | "APROVADA" | "REJEITADA";
  marcador?: MarcadorObj | null;
  createdAt: string;
}

// ── KPI Card ──────────────────────────────────────────────────

function KPI({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: string | number; subtitle: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{title}</p>
          <p className={cn("text-3xl font-bold mt-1", color)}>{value}</p>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", color.replace("text-", "bg-").replace("-700", "-50").replace("-600", "-50"))}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/dashboard/stats").then((r) => r.json()),
      fetch("/api/materials").then((r) => r.json()),
      fetch("/api/solicitacoes").then((r) => r.json()),
    ]).then(([s, m, sol]) => {
      if (!s.error) setStats(s);
      if (Array.isArray(m)) setMaterials(m);
      if (Array.isArray(sol)) setSolicitacoes(sol);
    }).finally(() => setLoading(false));
  }, [refreshKey]);

  // ── Cálculos ──────────────────────────────────────────────

  const byStatus = {
    DISPONIVEL: materials.filter((m) => m.status === "DISPONIVEL").length,
    RESERVADO: materials.filter((m) => m.status === "RESERVADO").length,
    ESGOTADO: materials.filter((m) => m.status === "ESGOTADO").length,
  };

  const byCategory: Record<string, number> = {};
  for (const m of materials) {
    byCategory[m.category] = (byCategory[m.category] ?? 0) + m.quantity;
  }
  const categoryData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const solByStatus = {
    PENDENTE: solicitacoes.filter((s) => s.status === "PENDENTE").length,
    APROVADA: solicitacoes.filter((s) => s.status === "APROVADA").length,
    REJEITADA: solicitacoes.filter((s) => s.status === "REJEITADA").length,
  };

  const marcadorMap: Record<string, { marcador: MarcadorObj; count: number }> = {};
  for (const s of solicitacoes) {
    if (!s.marcador) continue;
    const key = s.marcador.id;
    if (!marcadorMap[key]) marcadorMap[key] = { marcador: s.marcador, count: 0 };
    marcadorMap[key].count++;
  }
  const pieDataMarcador = Object.values(marcadorMap)
    .map(({ marcador, count }) => ({ name: marcador.name, value: count, color: marcador.color }))
    .filter((d) => d.value > 0);

  const topMaterials = [...materials]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  const statusColors = {
    DISPONIVEL: "#10b981",
    RESERVADO: "#f59e0b",
    ESGOTADO: "#ef4444",
  };

  const pieData = [
    { name: "Disponível", value: byStatus.DISPONIVEL, color: "#10b981" },
    { name: "Reservado", value: byStatus.RESERVADO, color: "#f59e0b" },
    { name: "Esgotado", value: byStatus.ESGOTADO, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-sm px-6">
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">Relatórios</h1>
            <p className="text-xs text-slate-400 mt-0.5">Visão analítica completa do estoque</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="h-9 gap-2 text-sm border-slate-200 text-slate-600 rounded-xl hover:border-slate-300"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </header>

        <div className="flex-1 p-6 space-y-8">

          {/* ── KPIs ── */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Indicadores Gerais</p>
            {loading ? (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 bg-white rounded-2xl border border-slate-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <KPI title="Itens em Estoque" value={(stats?.totalItems ?? 0).toLocaleString("pt-BR")} subtitle="Unidades totais disponíveis" icon={Package} color="text-blue-600" />
                <KPI title="Movimentações/Mês" value={stats?.monthlyMovements ?? 0} subtitle="Entradas + saídas últimos 30 dias" icon={ArrowRightLeft} color="text-violet-600" />
                <KPI title="Tempo Médio na Casa" value={`${stats?.avgDaysInStock ?? 0} dias`} subtitle="Média de permanência no estoque" icon={Clock} color="text-amber-600" />
                <KPI title="Doc. Pendentes" value={stats?.pendingSignatures ?? 0} subtitle="Aguardando assinatura" icon={FileSignature} color={stats?.pendingSignatures ? "text-red-600" : "text-emerald-600"} />
              </div>
            )}
          </section>

          {/* ── Gráfico semanal + Status ── */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Movimentações Semanais · Status do Estoque</p>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Gráfico de barras */}
              <div className="xl:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-800 mb-4">Entradas vs Saídas (últimos 7 dias)</p>
                {loading ? (
                  <div className="h-48 bg-slate-50 rounded-xl animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats?.chartData ?? []} barSize={14} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="saidas" name="Saídas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Pizza de status */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-800 mb-4">Status do Estoque</p>
                {loading ? (
                  <div className="h-48 bg-slate-50 rounded-xl animate-pulse" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {[
                        { key: "DISPONIVEL", label: "Disponível", color: "bg-emerald-500", count: byStatus.DISPONIVEL },
                        { key: "RESERVADO", label: "Reservado", color: "bg-amber-500", count: byStatus.RESERVADO },
                        { key: "ESGOTADO", label: "Esgotado", color: "bg-red-500", count: byStatus.ESGOTADO },
                      ].map(({ label, color, count }) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full", color)} />
                            <span className="text-slate-600">{label}</span>
                          </div>
                          <span className="font-semibold text-slate-800">{count} itens</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* ── Estoque por Categoria ── */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Estoque por Categoria</p>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              {loading ? (
                <div className="h-48 bg-slate-50 rounded-xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={categoryData} layout="vertical" barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="value" name="Unidades" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* ── Top Materiais + Solicitações ── */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Top Materiais · Resumo de Solicitações</p>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

              {/* Top materiais por quantidade */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                  <p className="text-sm font-semibold text-slate-800">Maiores Estoques</p>
                  <p className="text-xs text-slate-400 mt-0.5">Top 8 materiais por quantidade</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {loading
                    ? [...Array(5)].map((_, i) => (
                        <div key={i} className="px-5 py-3 flex items-center gap-3">
                          <div className="h-4 bg-slate-100 rounded w-full animate-pulse" />
                        </div>
                      ))
                    : topMaterials.map((m, idx) => (
                        <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[10px] font-bold text-slate-300 w-4 shrink-0">#{idx + 1}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-800 truncate">{m.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {m.category}{m.nomeAcao ? ` · ${m.nomeAcao}` : ""}{m.fornecedor ? ` · ${m.fornecedor}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold text-slate-900">{m.quantity}</span>
                            <span className="text-[10px] text-slate-400">un.</span>
                            <span className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                              m.status === "DISPONIVEL" ? "bg-emerald-50 text-emerald-600" :
                              m.status === "RESERVADO" ? "bg-amber-50 text-amber-600" :
                              "bg-red-50 text-red-600"
                            )}>
                              {m.status === "DISPONIVEL" ? "OK" : m.status === "RESERVADO" ? "Res." : "Esgt."}
                            </span>
                          </div>
                        </div>
                      ))}
                </div>
              </div>

              {/* Solicitações */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                  <p className="text-sm font-semibold text-slate-800">Solicitações de Saída</p>
                  <p className="text-xs text-slate-400 mt-0.5">Resumo por status</p>
                </div>
                <div className="p-5 space-y-4">
                  {/* Resumo por status */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-amber-700">{solByStatus.PENDENTE}</p>
                      <p className="text-[10px] text-amber-600 font-semibold mt-0.5 uppercase tracking-wide">Pendentes</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{solByStatus.APROVADA}</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 uppercase tracking-wide">Aprovadas</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">{solByStatus.REJEITADA}</p>
                      <p className="text-[10px] text-red-500 font-semibold mt-0.5 uppercase tracking-wide">Rejeitadas</p>
                    </div>
                  </div>

                  {/* Lista recentes */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Recentes</p>
                    <div className="space-y-2">
                      {loading
                        ? [...Array(4)].map((_, i) => (
                            <div key={i} className="h-10 bg-slate-50 rounded-xl animate-pulse" />
                          ))
                        : solicitacoes.slice(0, 6).map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition-colors">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-800 truncate">{s.material}</p>
                                <p className="text-[10px] text-slate-400 truncate">{s.solicitante} · {s.quantity} un.</p>
                              </div>
                              <Badge className={cn(
                                "shrink-0 border text-[10px] font-semibold rounded-full px-2",
                                s.status === "PENDENTE" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                s.status === "APROVADA" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                "bg-red-50 text-red-600 border-red-100"
                              )}>
                                {s.status === "PENDENTE" ? "Pendente" : s.status === "APROVADA" ? "Aprovada" : "Rejeitada"}
                              </Badge>
                            </div>
                          ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Marcadores de Solicitação ── */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Distribuição por Marcador (Tipos de Saída)</p>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm max-w-sm">
              <p className="text-sm font-semibold text-slate-800 mb-4">Finalidade das Solicitações</p>
              {loading ? (
                <div className="h-48 bg-slate-50 rounded-xl animate-pulse" />
              ) : pieDataMarcador.length === 0 ? (
                <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-400">
                  Nenhuma solicitação com marcador
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={pieDataMarcador} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                        {pieDataMarcador.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {pieDataMarcador.map(({ name, value, color }) => (
                      <div key={name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-slate-600">{name}</span>
                        </div>
                        <span className="font-semibold text-slate-800">{value} {value === 1 ? "solicitação" : "solicitações"}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ── Alertas ── */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Alertas de Estoque</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-white rounded-2xl border border-slate-100 animate-pulse" />
                ))
              ) : (
                <>
                  {materials.filter((m) => m.status === "ESGOTADO").map((m) => (
                    <div key={m.id} className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-red-700 truncate">{m.name}</p>
                        <p className="text-[10px] text-red-500">Estoque esgotado</p>
                      </div>
                    </div>
                  ))}
                  {materials.filter((m) => m.quantity > 0 && m.quantity < 10 && m.status !== "ESGOTADO").map((m) => (
                    <div key={m.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-amber-700 truncate">{m.name}</p>
                        <p className="text-[10px] text-amber-600">Estoque baixo: {m.quantity} un.</p>
                      </div>
                    </div>
                  ))}
                  {materials.filter((m) => m.status === "ESGOTADO").length === 0 &&
                   materials.filter((m) => m.quantity > 0 && m.quantity < 10).length === 0 && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-700">Estoque saudável</p>
                        <p className="text-[10px] text-emerald-600">Nenhum alerta no momento.</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

        </div>
      </div>
    </AppShell>
  );
}
