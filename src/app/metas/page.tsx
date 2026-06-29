"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, Search, Plus, Trash2, RefreshCw, Gift, Building2,
  CheckCircle2, Target, Loader2, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tipos ──────────────────────────────────────────────────────
interface Fornecedor {
  id: number;
  nome: string;
  clientes: number;
  selloutTotal: number;
}
interface Meta {
  id: string;
  fornecedorId: number;
  fornecedorNome: string;
  nome: string;
  valorMinimo: number;
  recompensa: string;
  ativo: boolean;
  _count?: { liberacoes: number };
}
interface SelloutCliente {
  codCli: string;
  cliente: string;
  cnpj: string | null;
  sellout: number;
}
interface Liberacao {
  id: string;
  fornecedorNome: string;
  nomeCliente: string;
  valorAtingido: number;
  status: string;
  comprovanteUrl: string | null;
  liberadoEm: string;
  meta: { nome: string; recompensa: string; valorMinimo: number };
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function MetasPage() {
  const [search, setSearch] = useState("");
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loadingForn, setLoadingForn] = useState(false);
  const [selected, setSelected] = useState<Fornecedor | null>(null);

  const [metas, setMetas] = useState<Meta[]>([]);
  const [clientes, setClientes] = useState<SelloutCliente[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [liberacoes, setLiberacoes] = useState<Liberacao[]>([]);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Formulário de nova faixa
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novaRecompensa, setNovaRecompensa] = useState("");

  // ── Carregar fornecedores (com debounce na busca) ──
  useEffect(() => {
    const t = setTimeout(() => {
      setLoadingForn(true);
      fetch(`/api/fornecedores?search=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then((d) => setFornecedores(d.fornecedores ?? []))
        .catch(console.error)
        .finally(() => setLoadingForn(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Carregar detalhe do fornecedor selecionado ──
  function loadDetail(f: Fornecedor) {
    setSelected(f);
    setLoadingDetail(true);
    Promise.all([
      fetch(`/api/metas?fornecedorId=${f.id}`).then((r) => r.json()),
      fetch(`/api/sellout?fornecedorId=${f.id}`).then((r) => r.json()),
    ])
      .then(([m, s]) => {
        setMetas(m.metas ?? []);
        setClientes(s.clientes ?? []);
      })
      .catch(console.error)
      .finally(() => setLoadingDetail(false));
  }

  function loadLiberacoes() {
    fetch("/api/liberacoes")
      .then((r) => r.json())
      .then((d) => setLiberacoes(d.liberacoes ?? []))
      .catch(console.error);
  }
  useEffect(() => { loadLiberacoes(); }, []);

  // ── Criar faixa ──
  async function addMeta() {
    if (!selected || !novoNome || !novoValor || !novaRecompensa) return;
    const res = await fetch("/api/metas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fornecedorId: selected.id,
        fornecedorNome: selected.nome,
        nome: novoNome,
        valorMinimo: Number(novoValor),
        recompensa: novaRecompensa,
      }),
    });
    if (res.ok) {
      setNovoNome(""); setNovoValor(""); setNovaRecompensa("");
      loadDetail(selected);
    }
  }

  async function deleteMeta(id: string) {
    if (!selected) return;
    if (!confirm("Excluir esta faixa de meta? As liberações dela também serão removidas.")) return;
    await fetch(`/api/metas/${id}`, { method: "DELETE" });
    loadDetail(selected);
  }

  // ── Processar motor ──
  async function processar() {
    setProcessing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/liberacoes/processar", { method: "POST" });
      const d = await res.json();
      setMsg(
        d.novasLiberacoes > 0
          ? `🎉 ${d.novasLiberacoes} nova(s) liberação(ões) gerada(s)!`
          : "Nenhuma nova liberação — tudo já estava em dia."
      );
      loadLiberacoes();
      if (selected) loadDetail(selected);
    } finally {
      setProcessing(false);
    }
  }

  // Faixas ordenadas (maior valor primeiro) para checar progresso
  const faixasOrdenadas = useMemo(
    () => [...metas].sort((a, b) => b.valorMinimo - a.valorMinimo),
    [metas]
  );

  // Para um cliente, qual a melhor faixa atingida
  function faixaAtingida(sellout: number): Meta | null {
    return faixasOrdenadas.find((m) => m.ativo && sellout >= m.valorMinimo) ?? null;
  }
  // Próxima faixa (a menor não atingida) p/ barra de progresso
  function proximaFaixa(sellout: number): Meta | null {
    const naoAtingidas = [...metas]
      .filter((m) => m.ativo && sellout < m.valorMinimo)
      .sort((a, b) => a.valorMinimo - b.valorMinimo);
    return naoAtingidas[0] ?? null;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Trophy className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Metas & Ações</h1>
              <p className="text-sm text-slate-500">
                Defina metas de sell-out por fornecedor e libere recompensas automaticamente.
              </p>
            </div>
          </div>
          <Button onClick={processar} disabled={processing} className="bg-amber-600 hover:bg-amber-700">
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Processar liberações
          </Button>
        </div>

        {msg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 font-medium">
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* ── Coluna esquerda: busca de fornecedores ── */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar fornecedor..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <p className="mt-2 px-1 text-[11px] text-slate-400">
                Só fornecedores com faturamento (sell-out) aparecem aqui.
              </p>
            </div>
            <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-50">
              {loadingForn ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Carregando…
                </div>
              ) : fornecedores.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">Nenhum fornecedor encontrado.</div>
              ) : (
                fornecedores.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => loadDetail(f)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-amber-50 transition-colors flex items-center gap-3",
                      selected?.id === f.id && "bg-amber-50"
                    )}
                  >
                    <span className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-slate-500" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{f.nome}</p>
                      <p className="text-[11px] text-slate-400">{f.clientes} clientes · {brl(f.selloutTotal)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Coluna direita: detalhe do fornecedor ── */}
          <div className="space-y-6">
            {!selected ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
                <Target className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                Selecione um fornecedor à esquerda para configurar metas.
              </div>
            ) : loadingDetail ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-500" />
              </div>
            ) : (
              <>
                {/* Faixas de meta */}
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Gift className="h-4 w-4 text-amber-600" />
                    <h2 className="font-semibold text-slate-800">Faixas de meta — {selected.nome}</h2>
                  </div>
                  <div className="p-5 space-y-3">
                    {metas.length === 0 && (
                      <p className="text-sm text-slate-400">Nenhuma faixa cadastrada ainda.</p>
                    )}
                    {[...metas].sort((a, b) => a.valorMinimo - b.valorMinimo).map((m) => (
                      <div key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3">
                        <Badge className="bg-amber-100 text-amber-700 border-0 font-bold">{brl(m.valorMinimo)}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{m.nome}</p>
                          <p className="text-xs text-slate-500 truncate">🎁 {m.recompensa}</p>
                        </div>
                        {m._count && m._count.liberacoes > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0">{m._count.liberacoes} liberadas</Badge>
                        )}
                        <button onClick={() => deleteMeta(m.id)} className="text-slate-300 hover:text-red-500 p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {/* Form nova faixa */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.5fr_auto] gap-2 pt-2">
                      <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
                        placeholder="Nome (ex.: Stand)"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200" />
                      <input value={novoValor} onChange={(e) => setNovoValor(e.target.value)} type="number"
                        placeholder="Valor mín. R$"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200" />
                      <input value={novaRecompensa} onChange={(e) => setNovaRecompensa(e.target.value)}
                        placeholder="Recompensa"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200" />
                      <Button onClick={addMeta} variant="outline" className="shrink-0">
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Ranking de clientes / progresso */}
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <h2 className="font-semibold text-slate-800">Progresso por cliente</h2>
                    <span className="text-xs text-slate-400 ml-auto">{clientes.length} clientes</span>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
                    {clientes.slice(0, 100).map((c) => {
                      const atingida = faixaAtingida(c.sellout);
                      const proxima = proximaFaixa(c.sellout);
                      const pct = proxima ? Math.min(100, (c.sellout / proxima.valorMinimo) * 100) : 100;
                      return (
                        <div key={c.codCli} className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-800 truncate flex-1">{c.cliente}</p>
                            {atingida ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> {atingida.nome}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">{brl(c.sellout)}</span>
                            )}
                          </div>
                          {proxima && (
                            <div className="mt-1.5">
                              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {brl(c.sellout)} / {brl(proxima.valorMinimo)} → {proxima.nome}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Liberações geradas */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Gift className="h-4 w-4 text-emerald-600" />
                <h2 className="font-semibold text-slate-800">Liberações geradas</h2>
                <Badge className="bg-emerald-100 text-emerald-700 border-0 ml-auto">{liberacoes.length}</Badge>
                <button onClick={loadLiberacoes} className="text-slate-400 hover:text-slate-600 p-1">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50">
                {liberacoes.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-slate-400">
                    Nenhuma liberação ainda. Cadastre metas e clique em “Processar liberações”.
                  </p>
                ) : (
                  liberacoes.map((l) => (
                    <div key={l.id} className="px-5 py-3 flex items-center gap-3">
                      <span className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <Gift className="h-4 w-4 text-emerald-600" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{l.nomeCliente}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {l.fornecedorNome} · {l.meta.recompensa} · {brl(l.valorAtingido)}
                        </p>
                      </div>
                      <Badge className={cn(
                        "border-0",
                        l.status === "ENTREGUE" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {l.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
