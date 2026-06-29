"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Trash2, Loader2, AlertCircle, X, ChevronDown, Pencil, AlertTriangle, Clock, Lock, LockOpen } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import { Lightbox } from "@/components/ui/Lightbox";
import { EditMaterialModal } from "@/components/dashboard/EditMaterialModal";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    DISPONIVEL: { label: "Disponível", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    RESERVADO:  { label: "Reservado",  className: "bg-amber-50 text-amber-700 border-amber-100" },
    ESGOTADO:   { label: "Esgotado",   className: "bg-red-50 text-red-600 border-red-100" },
  };
  const { label, className } = map[status] || { label: status, className: "bg-slate-50 text-slate-600 border-slate-100" };
  return (
    <Badge className={cn("border text-[10px] font-semibold uppercase tracking-wide rounded-full", className)}>
      {label}
    </Badge>
  );
}

function DaysBadge({ days }: { days: number }) {
  const isCritical = days > 60;
  const isUrgent   = days > 30;
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border",
      isCritical ? "bg-red-50 text-red-600 border-red-100"
        : isUrgent ? "bg-amber-50 text-amber-600 border-amber-100"
        : "bg-slate-50 text-slate-600 border-slate-100"
    )}>
      {(isCritical || isUrgent) && (
        <span className={cn("h-1.5 w-1.5 rounded-full", isCritical ? "bg-red-500 animate-pulse" : "bg-amber-400")} />
      )}
      {days} dias
    </div>
  );
}

// Badge para validade do produto (avisa 60 dias antes)
function ValidadeProdutoBadge({ dataValidade, diasParaVencer }: { dataValidade: string | null; diasParaVencer: number | null }) {
  if (!dataValidade || diasParaVencer === null) return <span className="text-xs text-slate-300">—</span>;

  const vencido = diasParaVencer < 0;
  const critico = diasParaVencer >= 0 && diasParaVencer <= 60;

  const label = vencido
    ? "Vencido"
    : critico
    ? `${diasParaVencer}d para vencer`
    : new Date(dataValidade + "T00:00:00").toLocaleDateString("pt-BR");

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border",
      vencido
        ? "bg-red-100 text-red-700 border-red-200"
        : critico
        ? "bg-orange-50 text-orange-700 border-orange-200"
        : "bg-slate-50 text-slate-600 border-slate-100"
    )}>
      {(vencido || critico) && <AlertTriangle className="h-3 w-3 shrink-0" />}
      {label}
    </div>
  );
}

// Badge para ação (avisa 15 dias antes do fim)
function AcaoBadge({ nomeAcao, periodoAcaoFim, diasRestantesAcao }: {
  nomeAcao: string | null;
  periodoAcaoFim: string | null;
  diasRestantesAcao: number | null;
}) {
  if (!nomeAcao) return <span className="text-xs text-slate-300">—</span>;

  const acabando = diasRestantesAcao !== null && diasRestantesAcao >= 0 && diasRestantesAcao <= 15;
  const encerrada = diasRestantesAcao !== null && diasRestantesAcao < 0;

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]">{nomeAcao}</span>
      {periodoAcaoFim && (
        <div className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border w-fit",
          encerrada
            ? "bg-slate-100 text-slate-500 border-slate-200"
            : acabando
            ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
            : "bg-emerald-50 text-emerald-700 border-emerald-100"
        )}>
          {acabando && <Clock className="h-2.5 w-2.5 shrink-0" />}
          {encerrada
            ? "Encerrada"
            : acabando
            ? `${diasRestantesAcao}d restantes`
            : `até ${new Date(periodoAcaoFim + "T00:00:00").toLocaleDateString("pt-BR")}`}
        </div>
      )}
    </div>
  );
}

function ProductThumb({ photoUrl, name, onClick }: { photoUrl?: string | null; name: string; onClick?: () => void }) {
  if (photoUrl) {
    return (
      <div
        className="h-9 w-9 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onClick}
      >
        <Image src={photoUrl} alt={name} width={36} height={36} className="object-cover w-full h-full" />
      </div>
    );
  }
  return (
    <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
      <span className="text-[10px] font-bold text-slate-400">{name.substring(0, 2).toUpperCase()}</span>
    </div>
  );
}

function CategoryCell({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {imageUrl ? (
        <div className="h-6 w-6 shrink-0 rounded-md overflow-hidden border border-slate-200 bg-slate-100">
          <Image src={imageUrl} alt={name} width={24} height={24} className="object-cover w-full h-full" />
        </div>
      ) : (
        <div className="h-6 w-6 shrink-0 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center">
          <span className="text-[8px] font-bold text-slate-400">{name.substring(0, 1)}</span>
        </div>
      )}
      <span className="text-xs font-medium text-slate-600 truncate max-w-[110px]">{name}</span>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "h-8 flex items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all",
          value
            ? "border-blue-300 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
        )}
      >
        {selected ? selected.label : label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute top-9 left-0 z-50 min-w-[180px] max-h-64 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-xl">
          <div className="p-1">
            <button
              onClick={() => { onChange(""); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                !value ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Todos
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors truncate",
                  value === opt.value ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeleteModal({
  material,
  onClose,
  onSuccess,
}: {
  material: { id: string; name: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleDelete() {
    if (!material) return;
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/materials/${material.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao excluir");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!material) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Excluir material</p>
            <p className="text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
        <p className="text-sm text-slate-700">
          Tem certeza que deseja excluir <span className="font-semibold">"{material.name}"</span>?
          Todo o histórico de movimentações vinculado também será removido.
        </p>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <Button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface Material {
  id: string;
  name: string;
  sku: string;
  category: string;
  categoryId: string;
  categoryImageUrl?: string | null;
  quantity: number;
  photoUrl: string | null;
  entryDate: string;
  daysInStock: number;
  status: string;
  fornecedor: string | null;
  nomeAcao: string | null;
  periodoAcaoInicio: string | null;
  periodoAcaoFim: string | null;
  diasRestantesAcao: number | null;
  dataValidade: string | null;
  diasParaVencer: number | null;
  produtoAlvo: boolean;
  bloqueado: boolean;
  localizacaoId: string | null;
  localizacao: {
    id: string;
    rua: string;
    predio: string;
    andar: string;
    apartamento: string;
  } | null;
}

interface CategoryInfo {
  id: string;
  name: string;
  imageUrl: string | null;
}

export function StockTable({ refreshTrigger = 0, defaultCategoryId }: { refreshTrigger?: number; defaultCategoryId?: string }) {
  const { user }    = useAuth();
  const isAdmin = user?.role === "ADMINISTRADOR";
  const isGestor = user?.role === "GESTOR";
  const canManage = isAdmin || isGestor;

  const [materials, setMaterials]               = useState<Material[]>([]);
  const [categories, setCategories]             = useState<CategoryInfo[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [searchTerm, setSearchTerm]             = useState("");
  const [filterCategory, setFilterCategory]     = useState(defaultCategoryId ?? "");
  const [filterFornecedor, setFilterFornecedor] = useState("");
  const [filterAcao, setFilterAcao]             = useState("");
  const [filterAcaoVencendo, setFilterAcaoVencendo] = useState(false);
  const [filterProdutoVencendo, setFilterProdutoVencendo] = useState(false);
  const [deleting, setDeleting]                 = useState<{ id: string; name: string } | null>(null);
  const [editing, setEditing]                   = useState<Material | null>(null);
  const [refresh, setRefresh]                   = useState(0);
  const [lightboxImage, setLightboxImage]       = useState<string | null>(null);
  const [bloqueando, setBloqueando]             = useState<string | null>(null); // id do material sendo processado

  useEffect(() => {
    fetch("/api/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCategories(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let intervalId: any;
    const fetchMaterials = async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      try {
        const res = await fetch("/api/materials", { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data)) setMaterials(data);
      } catch (err) {
        console.error("Error fetching materials:", err);
      } finally {
        if (!isBackground) setLoading(false);
      }
    };

    fetchMaterials();
    intervalId = setInterval(() => fetchMaterials(true), 10000);
    return () => clearInterval(intervalId);
  }, [refreshTrigger, refresh]);

  async function handleToggleBloqueio(material: Material) {
    setBloqueando(material.id);
    try {
      const res = await fetch(`/api/materials/${material.id}/bloquear`, { method: "PATCH" });
      if (!res.ok) throw new Error("Falha ao alterar bloqueio");
      setMaterials((prev) =>
        prev.map((m) => (m.id === material.id ? { ...m, bloqueado: !m.bloqueado } : m))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setBloqueando(null);
    }
  }

  // Enrich with category image
  const enriched = materials.map((m) => {
    const cat = categories.find((c) => c.id === m.categoryId);
    return { ...m, categoryImageUrl: cat?.imageUrl ?? null };
  });

  // Unique fornecedores
  const fornecedores = Array.from(
    new Set(materials.map((m) => m.fornecedor).filter(Boolean) as string[])
  ).sort();

  // Unique ações
  const acoes = Array.from(
    new Set(materials.map((m) => m.nomeAcao).filter(Boolean) as string[])
  ).sort();

  const filtered = enriched.filter((m) => {
    const term = searchTerm.toLowerCase();
    const matchText =
      m.name.toLowerCase().includes(term) ||
      m.category.toLowerCase().includes(term) ||
      (m.sku && m.sku.toLowerCase().includes(term)) ||
      (m.fornecedor && m.fornecedor.toLowerCase().includes(term));
    const matchCategory      = !filterCategory      || m.categoryId === filterCategory;
    const matchFornecedor    = !filterFornecedor    || m.fornecedor === filterFornecedor;
    const matchAcao          = !filterAcao          || m.nomeAcao === filterAcao;
    const matchAcaoVencendo  = !filterAcaoVencendo  || (
      m.diasRestantesAcao !== null && m.diasRestantesAcao >= 0 && m.diasRestantesAcao <= 15
    );
    const matchProdVencendo  = !filterProdutoVencendo || (
      m.diasParaVencer !== null && m.diasParaVencer >= 0 && m.diasParaVencer <= 60
    );
    return matchText && matchCategory && matchFornecedor && matchAcao && matchAcaoVencendo && matchProdVencendo;
  });

  const activeFilters = [filterCategory, filterFornecedor, filterAcao].filter(Boolean).length
    + (filterAcaoVencendo ? 1 : 0)
    + (filterProdutoVencendo ? 1 : 0);

  function clearAllFilters() {
    setFilterCategory("");
    setFilterFornecedor("");
    setFilterAcao("");
    setFilterAcaoVencendo(false);
    setFilterProdutoVencendo(false);
  }

  // Contagem de alertas
  const acaoAlertCount    = materials.filter(m => m.diasRestantesAcao !== null && m.diasRestantesAcao >= 0 && m.diasRestantesAcao <= 15).length;
  const validadeAlertCount = materials.filter(m => m.diasParaVencer !== null && m.diasParaVencer >= 0 && m.diasParaVencer <= 60).length;

  return (
    <>
      <Card className="border-0 rounded-2xl shadow-sm bg-white">
        <CardHeader className="px-5 pt-5 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">Materiais em Estoque</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? "Carregando..." : `${filtered.length} de ${materials.length} itens`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 w-48 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-300 focus:bg-white transition-all"
                />
              </div>

              <FilterSelect
                label="Categoria"
                value={filterCategory}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                onChange={setFilterCategory}
              />

              <FilterSelect
                label="Fornecedor"
                value={filterFornecedor}
                options={fornecedores.map((f) => ({ value: f, label: f }))}
                onChange={setFilterFornecedor}
              />

              <FilterSelect
                label="Ação"
                value={filterAcao}
                options={acoes.map((a) => ({ value: a, label: a }))}
                onChange={setFilterAcao}
              />

              {/* Toggle: Ação acabando */}
              <button
                onClick={() => setFilterAcaoVencendo((v) => !v)}
                className={cn(
                  "h-8 flex items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all",
                  filterAcaoVencendo
                    ? "border-red-300 bg-red-50 text-red-700"
                    : acaoAlertCount > 0
                    ? "border-red-200 bg-red-50/50 text-red-600 hover:border-red-300"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                )}
                title="Mostrar apenas ações encerrando em 15 dias"
              >
                <Clock className="h-3 w-3" />
                Ação vencendo
                {acaoAlertCount > 0 && (
                  <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                    {acaoAlertCount}
                  </span>
                )}
              </button>

              {/* Toggle: Produto vencendo */}
              <button
                onClick={() => setFilterProdutoVencendo((v) => !v)}
                className={cn(
                  "h-8 flex items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all",
                  filterProdutoVencendo
                    ? "border-orange-300 bg-orange-50 text-orange-700"
                    : validadeAlertCount > 0
                    ? "border-orange-200 bg-orange-50/50 text-orange-600 hover:border-orange-300"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                )}
                title="Mostrar produtos com validade em até 2 meses"
              >
                <AlertTriangle className="h-3 w-3" />
                Validade crítica
                {validadeAlertCount > 0 && (
                  <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-white text-[9px] font-bold">
                    {validadeAlertCount}
                  </span>
                )}
              </button>

              {activeFilters > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="h-8 flex items-center gap-1 px-2.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Limpar ({activeFilters})
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="pl-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 w-10" />
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Material</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Categoria</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Fornecedor</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Ação</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Validade Prod.</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Localização</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-widest text-slate-400">Qtd</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Tempo na Casa</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Status</TableHead>
                  {canManage && (
                    <TableHead className="pr-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 w-28" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 11 : 10} className="py-16 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 11 : 10} className="py-16 text-center text-slate-400 text-sm">
                      Nenhum material encontrado para os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((material) => {
                    const acaoUrgente = material.diasRestantesAcao !== null && material.diasRestantesAcao >= 0 && material.diasRestantesAcao <= 15;
                    const validadeUrgente = material.diasParaVencer !== null && material.diasParaVencer >= 0 && material.diasParaVencer <= 60;
                    return (
                      <TableRow
                        key={material.id}
                        className={cn(
                          "border-slate-50 transition-colors cursor-default group",
                          material.bloqueado
                            ? "bg-slate-100/80 hover:bg-slate-100"
                            : acaoUrgente && validadeUrgente
                            ? "hover:bg-red-50/40 bg-red-50/20"
                            : acaoUrgente
                            ? "hover:bg-red-50/30 bg-red-50/10"
                            : validadeUrgente
                            ? "hover:bg-orange-50/30 bg-orange-50/10"
                            : "hover:bg-slate-50/80"
                        )}
                      >
                        <TableCell className="pl-5">
                          <ProductThumb
                            photoUrl={material.photoUrl}
                            name={material.name}
                            onClick={() => {
                              if (material.photoUrl) setLightboxImage(material.photoUrl);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <p className={cn("text-sm font-medium", material.bloqueado ? "text-slate-400" : "text-slate-800")}>{material.name}</p>
                            {material.sku && material.sku !== "-" && (
                              <p className="text-[10px] font-mono text-slate-400">{material.sku}</p>
                            )}
                            <p className="text-[10px] text-slate-400">Entrada: {material.entryDate}</p>
                            {material.bloqueado && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300 w-fit">
                                <Lock className="h-2.5 w-2.5" /> BLOQUEADO
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <CategoryCell name={material.category} imageUrl={material.categoryImageUrl} />
                        </TableCell>
                        <TableCell>
                          {material.fornecedor ? (
                            <span className="text-xs text-slate-600 font-medium">{material.fornecedor}</span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <AcaoBadge
                            nomeAcao={material.nomeAcao}
                            periodoAcaoFim={material.periodoAcaoFim}
                            diasRestantesAcao={material.diasRestantesAcao}
                          />
                        </TableCell>
                        <TableCell>
                          <ValidadeProdutoBadge
                            dataValidade={material.dataValidade}
                            diasParaVencer={material.diasParaVencer}
                          />
                        </TableCell>
                        <TableCell>
                          {material.localizacao ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                {material.localizacao.rua}
                              </span>
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                  {material.localizacao.predio}
                                </span>
                                <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                  {material.localizacao.andar}
                                </span>
                                <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                  {material.localizacao.apartamento}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("text-sm font-bold", material.quantity === 0 ? "text-red-500" : "text-slate-900")}>
                            {material.quantity.toLocaleString("pt-BR")}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">un</span>
                        </TableCell>
                        <TableCell>
                          <DaysBadge days={material.daysInStock} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={material.status} />
                        </TableCell>
                        {canManage && (
                          <TableCell className="pr-5">
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                              {isAdmin && (
                                <button
                                  onClick={() => setEditing(material)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                                  title="Editar produto"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleToggleBloqueio(material)}
                                disabled={bloqueando === material.id}
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                                  material.bloqueado
                                    ? "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                                    : "text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                                )}
                                title={material.bloqueado ? "Desbloquear produto" : "Bloquear produto"}
                              >
                                {bloqueando === material.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : material.bloqueado
                                  ? <LockOpen className="h-3.5 w-3.5" />
                                  : <Lock className="h-3.5 w-3.5" />}
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => setDeleting({ id: material.id, name: material.name })}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                                  title="Excluir produto"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-50 px-5 py-3">
            <p className="text-xs text-slate-400">
              Mostrando {filtered.length} de {materials.length} itens
            </p>
            {(acaoAlertCount > 0 || validadeAlertCount > 0) && (
              <div className="flex items-center gap-3">
                {acaoAlertCount > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    {acaoAlertCount} ação{acaoAlertCount > 1 ? "ções" : ""} encerrando em breve
                  </span>
                )}
                {validadeAlertCount > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-orange-600 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {validadeAlertCount} produto{validadeAlertCount > 1 ? "s" : ""} com validade crítica
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <DeleteModal
        material={deleting}
        onClose={() => setDeleting(null)}
        onSuccess={() => setRefresh((p) => p + 1)}
      />

      <EditMaterialModal
        material={editing}
        onClose={() => setEditing(null)}
        onSuccess={() => setRefresh((p) => p + 1)}
      />

      <Lightbox
        isOpen={!!lightboxImage}
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </>
  );
}
