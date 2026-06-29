"use client";

import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { FlowChart } from "@/components/dashboard/FlowChart";
import { StockTable } from "@/components/dashboard/StockTable";
import { MovementTimeline } from "@/components/dashboard/MovementTimeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ArrowRightLeft,
  Clock,
  FileSignature,
  Plus,
  Download,
} from "lucide-react";
import { useState, useEffect } from "react";
import { MovementModal } from "@/components/dashboard/MovementModal";
import { MaterialModal } from "@/components/dashboard/MaterialModal";
import { NotificationsPanel } from "@/components/dashboard/NotificationsPanel";
import { AcoesInteligencia } from "@/components/dashboard/AcoesInteligencia";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEntradaOpen, setIsEntradaOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setStats(data);
        }
      })
      .catch((err) => console.error("Error loading stats:", err))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const totalItems = stats?.totalItems ?? 0;
  const monthlyMovements = stats?.monthlyMovements ?? 0;
  const avgDaysInStock = stats?.avgDaysInStock ?? 0;
  const pendingSignatures = stats?.pendingSignatures ?? 0;

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen">
        {/* ── Topbar ── */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-sm px-6">
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">
              Visão Geral do Estoque
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">{today}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Sino de notificações */}
            <NotificationsPanel />

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 text-sm border-slate-200 text-slate-600 rounded-xl hover:border-slate-300"
              id="btn-export-report"
            >
              <Download className="h-4 w-4" />
              Exportar Relatório
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="sm"
                    className="h-9 gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-200"
                    id="btn-new-movement"
                  />
                }
              >
                <Plus className="h-4 w-4" />
                Nova Movimentação
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40 border border-slate-100 bg-white shadow-lg rounded-xl p-1 text-xs text-slate-700">
                <DropdownMenuItem
                  onClick={() => setIsEntradaOpen(true)}
                  className="px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Registrar Entrada
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsModalOpen(true)}
                  className="px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Registrar Saída
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ── Conteúdo principal ── */}
        <div className="flex-1 p-6 space-y-6">

          {/* ── KPI Cards ── */}
          <section aria-label="Indicadores de desempenho">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
              Indicadores
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard
                title="Itens em Estoque"
                value={loading ? "..." : totalItems.toLocaleString("pt-BR")}
                subtitle="Total de unidades disponíveis"
                icon={Package}
                variant="primary"
              />
              <KpiCard
                title="Movimentações no Mês"
                value={loading ? "..." : monthlyMovements}
                subtitle="Entradas e saídas registradas"
                icon={ArrowRightLeft}
              />
              <KpiCard
                title="Tempo Médio na Casa"
                value={loading ? "..." : `${avgDaysInStock} Dias`}
                subtitle="Média de permanência no estoque"
                icon={Clock}
              />
              <KpiCard
                title="Saídas Pendentes"
                value={loading ? "..." : pendingSignatures}
                subtitle="Aguardando assinatura do documento"
                icon={FileSignature}
                badge={pendingSignatures > 0 ? "Requer atenção" : undefined}
                variant="warning"
              />
            </div>
          </section>

          {/* ── Gráfico + Timeline ── */}
          <section aria-label="Fluxo e movimentações">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
              Análise e Atividade
            </p>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2">
                <FlowChart chartData={stats?.chartData} />
              </div>
              <div className="xl:col-span-1">
                <MovementTimeline refreshTrigger={refreshTrigger} />
              </div>
            </div>
          </section>

          {/* ── Inteligência de Ações (projeção de esgotamento) ── */}
          <section aria-label="Inteligência de ações">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
              Inteligência de Ações
            </p>
            <AcoesInteligencia />
          </section>

          {/* ── Tabela de Estoque ── */}
          <section aria-label="Tabela de materiais em estoque">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Estoque Detalhado
              </p>
              <Badge className="bg-amber-50 text-amber-700 border-amber-100 border text-[10px] font-semibold rounded-full">
                Itens atualizados em tempo real
              </Badge>
            </div>
            <StockTable refreshTrigger={refreshTrigger} />
          </section>
        </div>

        {/* ── Footer ── */}
        <footer className="border-t border-slate-100 px-6 py-3">
          <p className="text-[10px] text-slate-400 text-center">
            Ação Trade Estoque · Sistema de Gestão de Materiais · ABBC ©{" "}
            {new Date().getFullYear()}
          </p>
        </footer>
      </div>

      <MaterialModal
        isOpen={isEntradaOpen}
        onClose={() => setIsEntradaOpen(false)}
        onSuccess={() => setRefreshTrigger((p) => p + 1)}
      />
      <MovementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="SAIDA"
        onSuccess={() => setRefreshTrigger((p) => p + 1)}
      />
    </AppShell>
  );
}
