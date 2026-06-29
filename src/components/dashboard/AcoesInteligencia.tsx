"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Brain, AlertTriangle, PauseCircle, TrendingUp, CheckCircle2,
  ChevronDown, Users, Loader2, Gauge, Search, Gift, ShoppingCart,
  ArrowRightCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Projecao {
  diasUteisDecorridos: number;
  diasUteisRestantes: number;
  totalSaidas: number;
  ritmoReal: number;
  ritmoIdeal: number | null;
  projecaoDiasUteis: number | null;
  estoqueProjetadoFim: number | null;
  diasSemSaida: number | null;
  status: "PARADO" | "RISCO" | "SOBRANDO" | "OK";
  resumo: string;
}
interface Acao {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  fornecedor: string | null;
  nomeAcao: string | null;
  quantity: number;
  produtoAlvo: boolean;
  periodoAcaoFim: string | null;
  fornecedorOracleId: number | null;
  fornecedorOracleNome: string | null;
  projecao: Projecao;
}
interface Liberacao {
  status: string;
  numped: number;
  numPedidos?: number;
  valorAtingido: number;
  recompensa: string;
}
interface Cliente {
  codCli: string;
  cliente: string;
  cnpj: string | null;
  sellout: number;
  liberacao: Liberacao | null;
}

type SortKey = "faturamento" | "pedido";
type SortDir = "desc" | "asc";
type PedidoFiltro = "todos" | "com_pedido" | "sem_pedido" | "LIBERADO" | "MONTADO";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_CFG = {
  RISCO: { label: "Em risco", cls: "bg-red-100 text-red-700", icon: AlertTriangle, dot: "bg-red-500" },
  PARADO: { label: "Parado", cls: "bg-slate-200 text-slate-700", icon: PauseCircle, dot: "bg-slate-500" },
  SOBRANDO: { label: "Sobrando", cls: "bg-blue-100 text-blue-700", icon: TrendingUp, dot: "bg-blue-500" },
  OK: { label: "No ritmo", cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, dot: "bg-emerald-500" },
} as const;

const LIB_CFG: Record<string, { label: string; cls: string }> = {
  PEDIDO:   { label: "Com pedido",  cls: "bg-blue-100 text-blue-700" },
  LIBERADO: { label: "Liberado",    cls: "bg-emerald-100 text-emerald-700" },
  MONTADO:  { label: "Montado",     cls: "bg-violet-100 text-violet-700" },
};

export function AcoesInteligencia() {
  const router = useRouter();
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [resumo, setResumo] = useState({ emRisco: 0, parados: 0, sobrando: 0, ok: 0 });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Record<string, Cliente[]>>({});
  const [loadingClientes, setLoadingClientes] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<Record<string, SortKey>>({});
  const [sortDir, setSortDir] = useState<Record<string, SortDir>>({});
  const [pedidoFiltro, setPedidoFiltro] = useState<Record<string, PedidoFiltro>>({});

  useEffect(() => {
    fetch("/api/acoes")
      .then((r) => r.json())
      .then((d) => { if (!d.error) { setAcoes(d.acoes ?? []); setResumo(d.resumo ?? resumo); } })
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(a: Acao) {
    if (expanded === a.id) { setExpanded(null); return; }
    setExpanded(a.id);
    if (a.fornecedorOracleId && !clientes[a.id]) {
      setLoadingClientes(a.id);
      fetch(`/api/sellout?fornecedorId=${a.fornecedorOracleId}`)
        .then((r) => r.json())
        .then((d) => setClientes((prev) => ({ ...prev, [a.id]: (d.clientes ?? []) })))
        .catch(console.error)
        .finally(() => setLoadingClientes(null));
    }
  }

  function handleGerarSaida(a: Acao, c: Cliente) {
    const justificativa = `Cliente: ${c.cliente} (cód. ${c.codCli}) — Ação: ${a.nomeAcao ?? a.name}`;
    const params = new URLSearchParams({
      materialId: a.id,
      clienteNome: c.cliente,
      codCli: c.codCli,
      justificativa,
    });
    router.push(`/solicitacoes?${params.toString()}`);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Skeleton header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-4 w-40 rounded-full bg-slate-100 animate-pulse" />
          <div className="ml-auto flex gap-2">
            <div className="h-5 w-16 rounded-full bg-slate-100 animate-pulse" />
            <div className="h-5 w-16 rounded-full bg-slate-100 animate-pulse" />
          </div>
        </div>
        {/* Skeleton cards */}
        <div className="divide-y divide-slate-50">
          {[
            { dot: "bg-red-200", titleW: "w-56", badgeW: "w-16" },
            { dot: "bg-slate-200", titleW: "w-44", badgeW: "w-14" },
            { dot: "bg-emerald-200", titleW: "w-52", badgeW: "w-16" },
          ].map((s, i) => (
            <div key={i} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${s.dot} animate-pulse`} />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-4 ${s.titleW} rounded-full bg-slate-100 animate-pulse`} />
                      <div className={`h-4 ${s.badgeW} rounded-full bg-slate-100 animate-pulse`} />
                    </div>
                    <div className="h-4 w-4 rounded bg-slate-100 animate-pulse" />
                  </div>
                  <div className="h-3 w-4/5 rounded-full bg-slate-50 animate-pulse" />
                  <div className="grid grid-cols-3 gap-2">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-2">
                        <div className="h-2 w-14 rounded-full bg-slate-100 animate-pulse mb-2" />
                        <div className="h-3 w-20 rounded-full bg-slate-100 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (acoes.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-400 text-sm">
        <Brain className="h-8 w-8 mx-auto mb-2 text-slate-300" />
        <p>Nenhum produto alvo com ação ativa.</p>
        <p className="text-xs mt-1">Marque um material como <strong>Produto Alvo</strong> na tela de Estoque.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Header + resumo */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 flex-wrap">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
          <Brain className="h-4 w-4 text-violet-600" />
        </div>
        <h2 className="font-semibold text-slate-800">Inteligência de Ações</h2>
        <div className="flex items-center gap-2 ml-auto text-xs">
          {resumo.emRisco > 0 && <Badge className="bg-red-100 text-red-700 border-0">{resumo.emRisco} em risco</Badge>}
          {resumo.parados > 0 && <Badge className="bg-slate-200 text-slate-700 border-0">{resumo.parados} parados</Badge>}
          {resumo.sobrando > 0 && <Badge className="bg-blue-100 text-blue-700 border-0">{resumo.sobrando} sobrando</Badge>}
          {resumo.ok > 0 && <Badge className="bg-emerald-100 text-emerald-700 border-0">{resumo.ok} no ritmo</Badge>}
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        {acoes.map((a) => {
          const cfg = STATUS_CFG[a.projecao.status];
          const Icon = cfg.icon;
          const isOpen = expanded === a.id;
          // SKUs do mesmo fornecedor Oracle nesta lista
          const skusMesmoFornec = a.fornecedorOracleId
            ? acoes.filter((x) => x.fornecedorOracleId === a.fornecedorOracleId)
            : [a];
          const totalQtyFornec = skusMesmoFornec.reduce((s, x) => s + x.quantity, 0);

          return (
            <div key={a.id}>
              <button onClick={() => toggle(a)} className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", cfg.dot)} />
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Cabeçalho: título + status à esquerda, chevron à direita */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800 truncate">{a.name}</p>
                          <Badge className={cn("border-0 gap-1 text-[10px] shrink-0", cfg.cls)}>
                            <Icon className="h-3 w-3" /> {cfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {a.fornecedor ?? "—"} · {a.quantity} un
                          {skusMesmoFornec.length > 1 && (
                            <span className="ml-1 text-slate-400">
                              ({skusMesmoFornec.length} SKUs · {totalQtyFornec} un total)
                            </span>
                          )}
                          {" · "}{a.projecao.resumo}
                        </p>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-slate-300 shrink-0 mt-0.5 transition-transform", isOpen && "rotate-180")} />
                    </div>

                    {/* Mini-métricas de ritmo */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <Metric
                        label="Ritmo real"
                        value={`${a.projecao.ritmoReal} un/dia`}
                        icon={<Gauge className="h-3 w-3 shrink-0" />}
                      />
                      <Metric
                        label="Ritmo ideal"
                        value={a.projecao.ritmoIdeal != null ? `${a.projecao.ritmoIdeal} un/dia` : "—"}
                      />
                      <Metric
                        label="Dias úteis restantes"
                        value={String(a.projecao.diasUteisRestantes)}
                      />
                    </div>
                  </div>
                </div>
              </button>

              {/* Drill-down: clientes que compram a marca (com filtros e ordenação) */}
              {isOpen && (() => {
                const todos = clientes[a.id] ?? [];
                const termo = (filtro[a.id] ?? "").trim().toLowerCase();
                const pFiltro: PedidoFiltro = pedidoFiltro[a.id] ?? "todos";
                const key: SortKey = sortBy[a.id] ?? "faturamento";
                const dir: SortDir = sortDir[a.id] ?? "desc";

                // 1. Filtro por nome
                let lista = termo
                  ? todos.filter((c) => c.cliente.toLowerCase().includes(termo))
                  : [...todos];

                // 2. Filtro por status de pedido
                if (pFiltro === "com_pedido")  lista = lista.filter((c) => !!c.liberacao);
                if (pFiltro === "sem_pedido")  lista = lista.filter((c) => !c.liberacao);
                if (pFiltro === "LIBERADO")    lista = lista.filter((c) => c.liberacao?.status === "LIBERADO");
                if (pFiltro === "MONTADO")     lista = lista.filter((c) => c.liberacao?.status === "MONTADO");

                // 3. Ordenação
                lista.sort((a, b) => {
                  let va = 0, vb = 0;
                  if (key === "faturamento") { va = a.sellout; vb = b.sellout; }
                  if (key === "pedido")      { va = a.liberacao?.valorAtingido ?? -1; vb = b.liberacao?.valorAtingido ?? -1; }
                  return dir === "desc" ? vb - va : va - vb;
                });

                const totalFat    = lista.reduce((s, c) => s + c.sellout, 0);
                const totalPedido = lista.filter((c) => !!c.liberacao).length;

                function toggleSort(k: SortKey) {
                  if ((sortBy[a.id] ?? "faturamento") === k) {
                    setSortDir((p) => ({ ...p, [a.id]: (p[a.id] ?? "desc") === "desc" ? "asc" : "desc" }));
                  } else {
                    setSortBy((p) => ({ ...p, [a.id]: k }));
                    setSortDir((p) => ({ ...p, [a.id]: "desc" }));
                  }
                }

                const PFILTROS: { v: PedidoFiltro; label: string; cls: string }[] = [
                  { v: "todos",      label: "Todos",      cls: "bg-slate-200 text-slate-700" },
                  { v: "com_pedido", label: "Com pedido", cls: "bg-blue-100 text-blue-700" },
                  { v: "sem_pedido", label: "Sem pedido", cls: "bg-slate-100 text-slate-500" },
                  { v: "LIBERADO",   label: "Liberado",   cls: "bg-emerald-100 text-emerald-700" },
                  { v: "MONTADO",    label: "Montado",    cls: "bg-violet-100 text-violet-700" },
                ];

                return (
                  <div className="px-5 pb-5 pl-12">
                    <div className="rounded-xl bg-slate-50 p-3 space-y-3">

                      {/* Título + contador */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                          <Users className="h-3.5 w-3.5" />
                          Clientes que compram {a.fornecedorOracleNome ?? a.fornecedor}
                        </p>
                        {todos.length > 0 && (
                          <Badge className="bg-slate-200 text-slate-600 border-0 text-[10px]">
                            {lista.length !== todos.length ? `${lista.length} de ${todos.length}` : `${todos.length}`}
                          </Badge>
                        )}
                      </div>

                      {!a.fornecedorOracleId ? (
                        <p className="text-xs text-slate-400">Fornecedor sem sell-out mapeado no Oracle.</p>
                      ) : loadingClientes === a.id ? (
                        <div className="space-y-2 py-1">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-8 rounded-lg bg-slate-100 animate-pulse" />
                          ))}
                        </div>
                      ) : todos.length === 0 ? (
                        <p className="text-xs text-slate-400">Sem dados de clientes.</p>
                      ) : (
                        <>
                          {/* ── Controles: busca + chips de pedido ── */}
                          <div className="space-y-2">
                            {/* Busca por nome */}
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <input
                                value={filtro[a.id] ?? ""}
                                onChange={(e) => setFiltro((prev) => ({ ...prev, [a.id]: e.target.value }))}
                                placeholder="Buscar cliente..."
                                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-200"
                              />
                            </div>
                            {/* Filtros de pedido */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <ShoppingCart className="h-3 w-3 text-slate-400 shrink-0" />
                              {PFILTROS.map((pf) => (
                                <button
                                  key={pf.v}
                                  onClick={() => setPedidoFiltro((p) => ({ ...p, [a.id]: pf.v }))}
                                  className={cn(
                                    "text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all",
                                    pFiltro === pf.v
                                      ? `${pf.cls} ring-1 ring-offset-1 ring-current`
                                      : "bg-white text-slate-400 border border-slate-200 hover:border-slate-300"
                                  )}
                                >
                                  {pf.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* ── Cabeçalho de colunas com sort ── */}
                          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 items-center px-1">
                            <span className="text-[9px] uppercase tracking-wide text-slate-400 w-6">#</span>
                            <span className="text-[9px] uppercase tracking-wide text-slate-400">Cliente</span>
                            {/* Faturamento — clicável para ordenar */}
                            <button
                              onClick={() => toggleSort("faturamento")}
                              className={cn(
                                "flex items-center gap-0.5 text-[9px] uppercase tracking-wide transition-colors shrink-0",
                                key === "faturamento" ? "text-violet-600 font-bold" : "text-slate-400 hover:text-slate-600"
                              )}
                            >
                              Faturamento
                              {key === "faturamento" && (dir === "desc" ? " ↓" : " ↑")}
                            </button>
                            {/* Pedido — clicável para ordenar */}
                            <button
                              onClick={() => toggleSort("pedido")}
                              className={cn(
                                "flex items-center gap-0.5 text-[9px] uppercase tracking-wide transition-colors shrink-0",
                                key === "pedido" ? "text-violet-600 font-bold" : "text-slate-400 hover:text-slate-600"
                              )}
                            >
                              Pedido
                              {key === "pedido" && (dir === "desc" ? " ↓" : " ↑")}
                            </button>
                            <span className="w-20" />
                          </div>

                          {/* ── Lista de clientes ── */}
                          <ul className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                            {lista.length === 0 ? (
                              <li className="text-xs text-slate-400 py-2">Nenhum cliente encontrado.</li>
                            ) : (
                              lista.map((c, i) => {
                                const lib = c.liberacao;
                                const libCfg = lib ? (LIB_CFG[lib.status] ?? { label: lib.status, cls: "bg-slate-100 text-slate-600" }) : null;
                                return (
                                  <li
                                    key={c.codCli}
                                    className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 items-center py-2 px-2 rounded-lg hover:bg-white transition-colors"
                                  >
                                    <span className="w-6 text-slate-400 font-medium text-xs shrink-0">{i + 1}º</span>

                                    {/* Nome + CNPJ */}
                                    <div className="min-w-0">
                                      <p className="truncate text-xs text-slate-700 font-medium">{c.cliente}</p>
                                      {c.cnpj && (
                                        <p className="text-[10px] text-slate-400 truncate">{c.cnpj}</p>
                                      )}
                                    </div>

                                    {/* Faturamento */}
                                    <span className="text-xs font-semibold text-slate-800 shrink-0 text-right">{brl(c.sellout)}</span>

                                    {/* Pedido — destaque visual */}
                                    <div className="shrink-0 text-right min-w-[90px]">
                                      {lib ? (
                                        <div>
                                          <span className={cn(
                                            "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                                            libCfg!.cls
                                          )}>
                                            <Gift className="h-2.5 w-2.5" />
                                            {libCfg!.label} #{lib.numped}
                                          </span>
                                          <p className="text-[10px] text-slate-500 mt-0.5 text-right">
                                            {brl(lib.valorAtingido)}
                                          </p>
                                        </div>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-300">
                                          <ShoppingCart className="h-2.5 w-2.5" />
                                          Sem pedido
                                        </span>
                                      )}
                                    </div>

                                    {/* Botão gerar saída */}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleGerarSaida(a, c); }}
                                      className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-[10px] font-semibold px-2 py-1 transition-colors w-20 justify-center"
                                      title="Gerar solicitação de saída"
                                    >
                                      <ArrowRightCircle className="h-3 w-3" />
                                      Gerar saída
                                    </button>
                                  </li>
                                );
                              })
                            )}
                          </ul>

                          {/* ── Totais ── */}
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-4 text-xs">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500">
                                {lista.length !== todos.length ? `${lista.length} de ${todos.length} clientes` : `${todos.length} clientes`}
                              </span>
                              <span className="text-slate-400">·</span>
                              <span className="text-slate-500">
                                <span className="font-semibold text-blue-600">{totalPedido}</span> com pedido
                              </span>
                            </div>
                            <span className="font-bold text-slate-800">{brl(totalFat)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, icon, danger }: { label: string; value: string; icon?: React.ReactNode; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-2 min-w-0 overflow-hidden">
      <p className="text-[9px] uppercase tracking-wide text-slate-400 flex items-center gap-1 min-w-0">
        {icon && <span className="shrink-0 flex items-center">{icon}</span>}
        <span className="truncate">{label}</span>
      </p>
      <p className={cn("mt-1 text-xs font-bold truncate", danger ? "text-red-600" : "text-slate-800")}>{value}</p>
    </div>
  );
}
