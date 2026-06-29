"use client";

/**
 * LocacoesManager
 *
 * CRUD + Gerador em Lote de endereços do estoque.
 *
 * Modo SIMPLES: campos com prefixo automático (digita "A" → salva "Rua A")
 * Modo LOTE: define Rua, nº Prédios, nº Andares (+ Picking), nº Aptos
 *            → gera o produto cartesiano e salva tudo de uma vez.
 */

import { useState, useEffect, useMemo } from "react";
import {
  MapPin, Plus, Pencil, Trash2, Save, X, Loader2, AlertCircle,
  Building2, Zap, List, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Localizacao {
  id: string;
  rua: string;
  predio: string;
  andar: string;
  apartamento: string;
  createdAt: string;
  _count?: { materials: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Aplica prefixo padrão ao identificador digitado */
function prefix(label: string, value: string) {
  const v = value.trim();
  if (!v) return "";
  return `${label} ${v}`;
}

/** Gera sequência ["1","2",...,"n"] */
function seq(n: number): string[] {
  return Array.from({ length: n }, (_, i) => String(i + 1));
}

// ─── Componente de campo com prefixo ──────────────────────────────────────────

function PrefixedInput({
  prefixLabel,
  value,
  onChange,
  placeholder,
  className,
}: {
  prefixLabel: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-blue-500 focus-within:bg-white transition-all", className)}>
      <span className="px-3 py-0 h-10 flex items-center text-xs font-bold text-slate-400 bg-slate-100 border-r border-slate-200 select-none whitespace-nowrap shrink-0">
        {prefixLabel}
      </span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-10 px-3 text-xs text-slate-700 bg-transparent outline-none"
      />
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function LocacoesManager({ onRefresh }: { onRefresh?: () => void }) {
  const [localizacoes, setLocalizacoes] = useState<Localizacao[]>([]);
  const [loading, setLoading] = useState(true);

  // Modo do formulário: null=fechado, "simples"=um endereço, "lote"=gerador
  const [mode, setMode] = useState<null | "simples" | "lote">(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── Formulário simples ──
  const [fRua, setFRua] = useState("");
  const [fPredio, setFPredio] = useState("");
  const [fAndar, setFAndar] = useState("");
  const [fApto, setFApto] = useState("");

  // ── Gerador em lote ──
  const [bRua, setBRua] = useState("");
  const [bPredios, setBPredios] = useState<number>(1);
  const [bAndares, setBAndares] = useState<number>(1);
  const [bPicking, setBPicking] = useState(true);
  const [bAptos, setBAptos] = useState<number>(1);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // ── Preview do lote ──────────────────────────────────────────────────────────
  const batchPreview = useMemo(() => {
    const rua = prefix("Rua", bRua);
    if (!rua) return [];
    const predios = seq(bPredios).map((n) => `Prédio ${n}`);
    const andares = [
      ...seq(bAndares).map((n) => `Andar ${n}`),
      ...(bPicking ? ["Picking"] : []),
    ];
    const aptos = seq(bAptos).map((n) => `Apto ${n}`);

    const result: { rua: string; predio: string; andar: string; apartamento: string }[] = [];
    for (const p of predios)
      for (const a of andares)
        for (const ap of aptos)
          result.push({ rua, predio: p, andar: a, apartamento: ap });
    return result;
  }, [bRua, bPredios, bAndares, bPicking, bAptos]);

  // ── Carregar ─────────────────────────────────────────────────────────────────
  async function load() {
    try {
      const res = await fetch("/api/localizacoes", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setLocalizacoes(data);
    } catch { } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  // ── Agrupar por Rua ──────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<string, Localizacao[]> = {};
    for (const loc of localizacoes) {
      if (!map[loc.rua]) map[loc.rua] = [];
      map[loc.rua].push(loc);
    }
    return map;
  }, [localizacoes]);

  // ── Abrir/Fechar ─────────────────────────────────────────────────────────────
  function openSimples() {
    setEditingId(null);
    setFRua(""); setFPredio(""); setFAndar(""); setFApto("");
    setError("");
    setMode("simples");
  }

  function openLote() {
    setError("");
    setMode("lote");
  }

  function startEdit(loc: Localizacao) {
    setEditingId(loc.id);
    // Remove prefixos para exibir só o identificador
    setFRua(loc.rua.replace(/^Rua\s+/i, ""));
    setFPredio(loc.predio.replace(/^Prédio\s+/i, ""));
    setFAndar(loc.andar.replace(/^Andar\s+/i, ""));
    setFApto(loc.apartamento.replace(/^Apto\s+/i, ""));
    setError("");
    setMode("simples");
  }

  function cancel() {
    setMode(null);
    setEditingId(null);
    setFRua(""); setFPredio(""); setFAndar(""); setFApto("");
    setBRua(""); setBPredios(1); setBAndares(1); setBPicking(true); setBAptos(1);
    setError("");
  }

  // ── Salvar simples ───────────────────────────────────────────────────────────
  async function handleSubmitSimples(e: React.FormEvent) {
    e.preventDefault();
    const rua = prefix("Rua", fRua);
    const predio = prefix("Prédio", fPredio);
    const andar = prefix("Andar", fAndar);
    const apartamento = prefix("Apto", fApto);

    if (!rua || !predio || !andar || !apartamento) {
      setError("Preencha todos os identificadores.");
      return;
    }
    setSubmitting(true); setError("");
    try {
      const url = editingId ? `/api/localizacoes/${editingId}` : "/api/localizacoes";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rua, predio, andar, apartamento }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      cancel(); await load(); onRefresh?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Salvar lote ──────────────────────────────────────────────────────────────
  async function handleSubmitLote(e: React.FormEvent) {
    e.preventDefault();
    if (batchPreview.length === 0) { setError("Preencha a Rua e configure os campos."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/localizacoes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localizacoes: batchPreview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar em lote");
      cancel(); await load(); onRefresh?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Excluir ──────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError((p) => ({ ...p, [id]: "" }));
    try {
      const res = await fetch(`/api/localizacoes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setDeleteError((p) => ({ ...p, [id]: data.error || "Erro" })); return; }
      await load(); onRefresh?.();
    } catch { setDeleteError((p) => ({ ...p, [id]: "Erro de rede" })); }
    finally { setDeletingId(null); }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const inputClass = "flex-1 h-10 px-3 text-xs text-slate-700 bg-transparent outline-none";

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-500" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Endereços do Estoque</h2>
            <p className="text-xs text-slate-400">Gerencie os locais onde os produtos ficam armazenados</p>
          </div>
        </div>
        {!mode && (
          <div className="flex items-center gap-2">
            <Button
              onClick={openSimples}
              size="sm"
              variant="outline"
              className="h-9 gap-2 text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Endereço
            </Button>
            <Button
              onClick={openLote}
              size="sm"
              className="h-9 gap-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-200"
            >
              <Zap className="h-3.5 w-3.5" />
              Gerar em Lote
            </Button>
          </div>
        )}
      </div>

      {/* Banner explicativo */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <span className="text-lg leading-none select-none">⚠️</span>
          <div className="space-y-1">
            <p className="text-xs font-bold text-amber-800">Como cadastrar endereços</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Os endereços seguem um padrão fixo com <strong>Rua + Prédio + Andar + Apartamento</strong>. Você digita apenas o identificador — o sistema adiciona o prefixo automaticamente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Novo endereço */}
          <div className="rounded-xl border border-amber-200 bg-white p-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
              <List className="h-3 w-3" /> Novo Endereço (um por vez)
            </p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Preencha cada campo com o identificador:
            </p>
            <div className="space-y-0.5 text-[10px] font-mono text-slate-600">
              <div className="flex items-center gap-1.5"><span className="text-slate-400 w-16 shrink-0">Rua</span><span className="font-bold text-slate-800">"A"</span><span className="text-slate-400">→ salva como <strong>Rua A</strong></span></div>
              <div className="flex items-center gap-1.5"><span className="text-slate-400 w-16 shrink-0">Prédio</span><span className="font-bold text-slate-800">"1"</span><span className="text-slate-400">→ salva como <strong>Prédio 1</strong></span></div>
              <div className="flex items-center gap-1.5"><span className="text-slate-400 w-16 shrink-0">Andar</span><span className="font-bold text-slate-800">"2"</span><span className="text-slate-400">→ salva como <strong>Andar 2</strong></span></div>
              <div className="flex items-center gap-1.5"><span className="text-slate-400 w-16 shrink-0">Apto</span><span className="font-bold text-slate-800">"301"</span><span className="text-slate-400">→ salva como <strong>Apto 301</strong></span></div>
            </div>
          </div>

          {/* Gerar em lote */}
          <div className="rounded-xl border border-amber-200 bg-white p-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
              <Zap className="h-3 w-3" /> Gerar em Lote (vários de uma vez)
            </p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Informe a estrutura completa e o sistema gera todas as combinações:
            </p>
            <div className="space-y-0.5 text-[10px] text-slate-600">
              <div className="flex items-center gap-1.5"><span className="text-slate-400 w-28 shrink-0">Rua</span><span className="font-bold text-slate-800">A</span></div>
              <div className="flex items-center gap-1.5"><span className="text-slate-400 w-28 shrink-0">Qtd Prédios</span><span className="font-bold text-slate-800">5</span></div>
              <div className="flex items-center gap-1.5"><span className="text-slate-400 w-28 shrink-0">Qtd Andares</span><span className="font-bold text-slate-800">2 + Picking</span></div>
              <div className="flex items-center gap-1.5"><span className="text-slate-400 w-28 shrink-0">Aptos por Andar</span><span className="font-bold text-slate-800">2</span></div>
              <div className="mt-1.5 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                = 5 × 3 × 2 = <strong>30 endereços</strong> gerados automaticamente
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-amber-600 flex items-center gap-1">
          <span>💡</span>
          Após criar os endereços, vincule cada produto ao seu endereço no módulo <strong>Estoque → Novo Material</strong>.
        </p>
      </div>

      {/* ── Formulário Simples ── */}
      {mode === "simples" && (
        <form
          onSubmit={handleSubmitSimples}
          className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <List className="h-3.5 w-3.5 text-slate-500" />
            <p className="text-xs font-semibold text-slate-700">
              {editingId ? "Editar Endereço" : "Novo Endereço"}
              <span className="ml-2 text-[10px] font-normal text-slate-400">
                — Digite só o identificador (letra ou número)
              </span>
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Rua <span className="text-red-400">*</span>
              </label>
              <PrefixedInput prefixLabel="Rua" value={fRua} onChange={setFRua} placeholder="A" />
              {fRua && <p className="text-[10px] text-slate-400 ml-1">Será salvo como: <strong>Rua {fRua.trim()}</strong></p>}
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Prédio <span className="text-red-400">*</span>
              </label>
              <PrefixedInput prefixLabel="Prédio" value={fPredio} onChange={setFPredio} placeholder="1" />
              {fPredio && <p className="text-[10px] text-slate-400 ml-1">Será salvo como: <strong>Prédio {fPredio.trim()}</strong></p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Andar <span className="text-red-400">*</span>
              </label>
              <PrefixedInput prefixLabel="Andar" value={fAndar} onChange={setFAndar} placeholder="1" />
              {fAndar && <p className="text-[10px] text-slate-400 ml-1">Será salvo como: <strong>Andar {fAndar.trim()}</strong></p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Apartamento <span className="text-red-400">*</span>
              </label>
              <PrefixedInput prefixLabel="Apto" value={fApto} onChange={setFApto} placeholder="1" />
              {fApto && <p className="text-[10px] text-slate-400 ml-1">Será salvo como: <strong>Apto {fApto.trim()}</strong></p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={cancel} disabled={submitting}
              className="h-8 px-4 rounded-xl text-xs border-slate-200 text-slate-600">Cancelar</Button>
            <Button type="submit" disabled={submitting}
              className="h-8 px-4 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
              {submitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...</> : <><Save className="h-3.5 w-3.5" /> Salvar</>}
            </Button>
          </div>
        </form>
      )}

      {/* ── Formulário Lote ── */}
      {mode === "lote" && (
        <form
          onSubmit={handleSubmitLote}
          className="bg-slate-50 border border-blue-200 rounded-2xl p-5 space-y-5"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-blue-500" />
            <p className="text-xs font-semibold text-slate-700">
              Gerador em Lote
              <span className="ml-2 text-[10px] font-normal text-slate-400">
                — Cria todas as combinações de uma vez
              </span>
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rua */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Rua <span className="text-red-400">*</span>
              </label>
              <PrefixedInput prefixLabel="Rua" value={bRua} onChange={setBRua} placeholder="A" />
            </div>

            {/* Prédios */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Quantidade de Prédios
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={50}
                  value={bPredios}
                  onChange={(e) => setBPredios(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="w-24 h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-blue-400 text-center font-bold"
                />
                <span className="text-xs text-slate-500">Prédio 1 → Prédio {bPredios}</span>
              </div>
            </div>

            {/* Andares */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Quantidade de Andares
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={50}
                  value={bAndares}
                  onChange={(e) => setBAndares(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="w-24 h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-blue-400 text-center font-bold"
                />
                <span className="text-xs text-slate-500">Andar 1 → Andar {bAndares}</span>
              </div>
            </div>

            {/* Picking */}
            <div className="sm:col-span-2">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                <input
                  id="batch-picking"
                  type="checkbox"
                  checked={bPicking}
                  onChange={(e) => setBPicking(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="batch-picking" className="text-xs font-medium text-slate-600 cursor-pointer select-none">
                  Incluir <strong>Picking</strong> como andar adicional em cada prédio
                </label>
              </div>
            </div>

            {/* Apartamentos */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Apartamentos por Andar
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={50}
                  value={bAptos}
                  onChange={(e) => setBAptos(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="w-24 h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-blue-400 text-center font-bold"
                />
                <span className="text-xs text-slate-500">Apto 1 → Apto {bAptos}</span>
              </div>
            </div>
          </div>

          {/* Preview do lote */}
          {batchPreview.length > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-blue-700">
                  Serão criados <span className="text-base font-bold">{batchPreview.length}</span> endereços
                </p>
                <span className="text-[10px] text-blue-500 font-mono">
                  {bPredios} Prédios × {bAndares + (bPicking ? 1 : 0)} Andares × {bAptos} Aptos
                </span>
              </div>

              {/* Mostra os primeiros 12 como amostra */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                {batchPreview.slice(0, 12).map((loc, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-700 border border-blue-100">
                    <MapPin className="h-2.5 w-2.5 text-blue-400 shrink-0" />
                    {loc.rua} · {loc.predio} · {loc.andar} · {loc.apartamento}
                  </div>
                ))}
                {batchPreview.length > 12 && (
                  <div className="flex items-center justify-center col-span-2 text-[10px] text-blue-500 py-1">
                    + {batchPreview.length - 12} mais endereços...
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={cancel} disabled={submitting}
              className="h-8 px-4 rounded-xl text-xs border-slate-200 text-slate-600">Cancelar</Button>
            <Button
              type="submit"
              disabled={submitting || batchPreview.length === 0}
              className="h-8 px-4 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              {submitting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Criando...</>
                : <><Zap className="h-3.5 w-3.5" /> Criar {batchPreview.length} Endereços</>}
            </Button>
          </div>
        </form>
      )}

      {/* ── Lista agrupada por Rua ── */}
      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando endereços...</span>
        </div>
      ) : localizacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-300">
          <Building2 className="h-10 w-10" />
          <p className="text-sm font-medium text-slate-400">Nenhum endereço cadastrado</p>
          <p className="text-xs text-slate-400">Use "Novo Endereço" ou "Gerar em Lote" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([rua, locs]) => {
            const isOpen = expandedGroups[rua] !== false; // aberto por padrão
            const total = locs.length;
            const vinculados = locs.reduce((s, l) => s + (l._count?.materials ?? 0), 0);

            return (
              <div key={rua} className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                {/* Header do grupo */}
                <button
                  type="button"
                  onClick={() => setExpandedGroups((p) => ({ ...p, [rua]: !isOpen }))}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-sm shadow-blue-200">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900">{rua}</p>
                      <p className="text-[10px] text-slate-400">
                        {total} endereço{total !== 1 ? "s" : ""}
                        {vinculados > 0 && ` · ${vinculados} produto${vinculados !== 1 ? "s" : ""} vinculado${vinculados !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>

                {/* Grid de endereços do grupo */}
                {isOpen && (
                  <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    {locs.map((loc) => (
                      <div
                        key={loc.id}
                        className="group relative rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:border-blue-200 hover:bg-white hover:shadow-sm"
                      >
                        {/* Badge de produtos */}
                        {loc._count && loc._count.materials > 0 && (
                          <span className="absolute top-2 right-2 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 border border-blue-100">
                            {loc._count.materials}p
                          </span>
                        )}

                        {/* Conteúdo */}
                        <div className="space-y-1.5 pr-8">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              {loc.predio}
                            </span>
                            <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-white">
                              {loc.andar}
                            </span>
                            <span className="inline-flex items-center rounded-md border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {loc.apartamento}
                            </span>
                          </div>
                        </div>

                        {/* Erro de exclusão */}
                        {deleteError[loc.id] && (
                          <p className="mt-1 text-[10px] text-red-500 leading-tight">{deleteError[loc.id]}</p>
                        )}

                        {/* Ações */}
                        <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(loc)}
                            className="flex items-center gap-0.5 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <Pencil className="h-2.5 w-2.5" /> Editar
                          </button>
                          <button
                            onClick={() => handleDelete(loc.id)}
                            disabled={deletingId === loc.id}
                            className="flex items-center gap-0.5 rounded-md border border-red-100 px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deletingId === loc.id
                              ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              : <Trash2 className="h-2.5 w-2.5" />}
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
