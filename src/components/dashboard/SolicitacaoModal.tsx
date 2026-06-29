"use client";

import { useState, useEffect, useRef } from "react";
import { X, AlertCircle, Send, CheckCircle2, Loader2, Search, Plus, Trash2, Tag, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MarcadorOption {
  id: string;
  name: string;
  color: string;
}

interface SolicitacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedMaterial?: { id: string; name: string; quantity: number };
  prefilledJustificativa?: string;
  prefilledCodCli?: string;
  prefilledClienteNome?: string;
  onSuccess?: () => void;
}

function NewMarcadorForm({ onCreated }: { onCreated: (m: MarcadorOption) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/marcadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar marcador.");
      }
      const created: MarcadorOption = await res.json();
      toast.success(`Marcador "${created.name}" criado!`);
      onCreated(created);
      setName("");
      setColor("#6366f1");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Novo Marcador</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do marcador..."
          className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-blue-500 transition-all"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <div className="relative shrink-0">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
            title="Escolher cor"
          />
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function FilterPill({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, []);

  const sel = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "h-7 flex items-center gap-1 rounded-lg border px-2 text-[10px] font-medium transition-all",
          value ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
        )}
      >
        {sel ? sel.label : label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute z-30 top-8 left-0 min-w-[160px] max-h-52 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-xl">
          <div className="p-1">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className={cn("w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-medium", !value ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50")}
            >
              Todos
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn("w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-medium truncate", value === opt.value ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50")}
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

export function SolicitacaoModal({
  isOpen,
  onClose,
  preselectedMaterial,
  prefilledJustificativa,
  prefilledCodCli,
  prefilledClienteNome,
  onSuccess,
}: SolicitacaoModalProps) {
  const { user, loading: authLoading } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [marcadores, setMarcadores] = useState<MarcadorOption[]>([]);
  const [showNewMarcador, setShowNewMarcador] = useState(false);

  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterFornecedor, setFilterFornecedor] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedMat, setSelectedMat] = useState<any | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [currentQuantity, setCurrentQuantity] = useState<number>(1);
  const [items, setItems] = useState<{ material: any; quantity: number }[]>([]);
  const [justificativa, setJustificativa] = useState("");
  const [marcadorId, setMarcadorId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingMaterials(true);
    Promise.all([
      fetch("/api/materials").then((r) => r.json()),
      fetch("/api/marcadores").then((r) => r.json()),
    ]).then(([mats, marks]) => {
      if (Array.isArray(mats)) {
        setMaterials(mats);
        if (preselectedMaterial) {
          const mat = mats.find((m: any) => m.id === preselectedMaterial.id);
          if (mat) setItems([{ material: mat, quantity: 1 }]);
        }
      }
      if (Array.isArray(marks)) {
        setMarcadores(marks);
        if (marks.length > 0 && !marcadorId) setMarcadorId(marks[0].id);
      }
      if (prefilledJustificativa) setJustificativa(prefilledJustificativa);
    }).finally(() => setLoadingMaterials(false));
  }, [isOpen, preselectedMaterial, prefilledJustificativa]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!isOpen) return null;

  function reset() {
    setSearch("");
    setFilterCategoria("");
    setFilterFornecedor("");
    setSelectedMat(null);
    setCurrentQuantity(1);
    setItems([]);
    setJustificativa("");
    setMarcadorId(marcadores[0]?.id ?? "");
    setError("");
    setDone(false);
    setDropdownOpen(false);
    setShowNewMarcador(false);
  }

  // Opções únicas para filtros
  const categorias = Array.from(new Set(materials.map((m) => m.category).filter(Boolean))).sort() as string[];
  const fornecedores = Array.from(new Set(materials.map((m) => m.fornecedor).filter(Boolean))).sort() as string[];

  const filteredMaterials = materials.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategoria || m.category === filterCategoria;
    const matchForn = !filterFornecedor || m.fornecedor === filterFornecedor;
    const notAlreadyAdded = !items.find(i => i.material.id === m.id);
    return matchSearch && matchCat && matchForn && notAlreadyAdded;
  });

  function selectMaterial(m: any) {
    setSelectedMat(m);
    setSearch(m.name);
    setDropdownOpen(false);
  }

  function handleAddItem() {
    if (!selectedMat) return;
    if (currentQuantity <= 0) { setError("Quantidade inválida."); return; }
    const exists = items.find(i => i.material.id === selectedMat.id);
    if (exists) {
      if (exists.quantity + currentQuantity > selectedMat.quantity) {
        setError("Quantidade excede o estoque disponível."); return;
      }
      setItems(items.map(i => i.material.id === selectedMat.id ? { ...i, quantity: i.quantity + currentQuantity } : i));
    } else {
      if (currentQuantity > selectedMat.quantity) {
        setError("Quantidade excede o estoque disponível."); return;
      }
      setItems([...items, { material: selectedMat, quantity: currentQuantity }]);
    }
    setSelectedMat(null);
    setSearch("");
    setCurrentQuantity(1);
    setError("");
  }

  function handleRemoveItem(materialId: string) {
    setItems(items.filter(i => i.material.id !== materialId));
  }

  function handleQuantityChange(materialId: string, qty: number) {
    if (qty <= 0) return;
    setItems(items.map(i =>
      i.material.id === materialId ? { ...i, quantity: Math.min(qty, i.material.quantity) } : i
    ));
  }

  function handleMarcadorCreated(m: MarcadorOption) {
    setMarcadores((prev) => [...prev, m]);
    setMarcadorId(m.id);
    setShowNewMarcador(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { setError("Adicione ao menos um material."); return; }
    if (!justificativa.trim()) { setError("Justificativa é obrigatória."); return; }
    if (!marcadorId) { setError("Selecione um marcador."); return; }
    if (!user) { setError("Sessão expirada. Faça login novamente."); return; }

    setSubmitting(true);
    setError("");

    try {
      await Promise.all(items.map(async (item) => {
        const res = await fetch("/api/solicitacoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialId: item.material.id,
            solicitanteId: user.id,
            quantity: item.quantity,
            justificativa,
            marcadorId,
            codCli: prefilledCodCli || null,
            clienteNome: prefilledClienteNome || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Erro ao criar solicitação para ${item.material.name}.`);
        }
      }));

      setDone(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Erro de rede.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-600" />
              Solicitar Saída de Material
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sua solicitação será enviada para aprovação do administrador.
            </p>
          </div>
          <button
            onClick={() => { reset(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── CONFIRMAÇÃO ── */}
        {done ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Solicitação enviada!</p>
                <p className="text-xs text-blue-600 mt-1">
                  Sua solicitação de <strong>{items.length} produtos</strong> foi registrada e aguarda aprovação
                  do administrador.
                </p>
              </div>
            </div>
            <Button
              onClick={() => { reset(); onClose(); }}
              className="w-full h-9 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">

              {/* Solicitante */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Solicitante</label>
                <div className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-700 flex items-center gap-2">
                  {authLoading ? (
                    <span className="text-slate-400">Carregando...</span>
                  ) : user ? (
                    <>
                      <span className="font-semibold text-slate-800">{user.name}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">{user.email}</span>
                    </>
                  ) : (
                    <span className="text-red-400 text-[10px]">Sessão não encontrada — faça login novamente</span>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Adicionar Material */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-3">
                <p className="text-xs font-semibold text-blue-800">Adicionar Produtos</p>

                {/* Filtros de categoria e fornecedor */}
                {!loadingMaterials && (categorias.length > 0 || fornecedores.length > 0) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-medium">Filtrar:</span>
                    {categorias.length > 0 && (
                      <FilterPill
                        label="Categoria"
                        value={filterCategoria}
                        options={categorias.map((c) => ({ value: c, label: c }))}
                        onChange={(v) => { setFilterCategoria(v); setDropdownOpen(true); }}
                      />
                    )}
                    {fornecedores.length > 0 && (
                      <FilterPill
                        label="Fornecedor"
                        value={filterFornecedor}
                        options={fornecedores.map((f) => ({ value: f, label: f }))}
                        onChange={(v) => { setFilterFornecedor(v); setDropdownOpen(true); }}
                      />
                    )}
                    {(filterCategoria || filterFornecedor) && (
                      <button
                        type="button"
                        onClick={() => { setFilterCategoria(""); setFilterFornecedor(""); }}
                        className="h-7 flex items-center gap-1 px-2 rounded-lg text-[10px] font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                        Limpar
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-2 items-start" ref={searchRef}>
                  <div className="flex-1 space-y-1.5 relative">
                    {loadingMaterials ? (
                      <div className="h-10 bg-slate-50 border border-slate-200 rounded-xl animate-pulse" />
                    ) : (
                      <>
                        <Search className="absolute left-3 top-[22px] -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => { setSearch(e.target.value); setSelectedMat(null); setDropdownOpen(true); }}
                          onFocus={() => setDropdownOpen(true)}
                          placeholder="Buscar material..."
                          className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-blue-500 transition-all"
                        />
                        {dropdownOpen && (
                          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                            {filteredMaterials.length === 0 ? (
                              <p className="p-3 text-xs text-slate-400 text-center">Nenhum material encontrado</p>
                            ) : (
                              filteredMaterials.map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  disabled={m.quantity === 0}
                                  onMouseDown={() => selectMaterial(m)}
                                  className="w-full text-left px-3 py-2.5 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <div className="min-w-0">
                                    <p className="font-medium text-slate-800 truncate">{m.name}</p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {[m.category, m.fornecedor, m.nomeAcao].filter(Boolean).join(" · ")}
                                    </p>
                                  </div>
                                  <span className={`shrink-0 text-[10px] font-semibold ${m.quantity === 0 ? "text-red-400" : "text-slate-400"}`}>
                                    {m.quantity === 0 ? "Esgotado" : `${m.quantity} un.`}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="w-24 space-y-1.5">
                    <input
                      type="number"
                      min="1"
                      value={currentQuantity}
                      onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 1)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedMat || currentQuantity <= 0}
                    className="h-10 mt-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {selectedMat && (
                  <p className="text-[10px] text-slate-500">
                    Estoque disponível: <strong className="text-emerald-600">{selectedMat.quantity} un.</strong>
                    {selectedMat.entryDate && (
                      <span className="text-slate-400"> · Entrada: {selectedMat.entryDate}</span>
                    )}
                  </p>
                )}
              </div>

              {/* Lista de Itens */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex justify-between">
                  <span>Itens Adicionados</span>
                  <span className="text-blue-600">{items.length} item(s)</span>
                </label>
                {items.length === 0 ? (
                  <div className="h-16 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-400">
                    Nenhum material adicionado
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{item.material.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {[item.material.category, item.material.fornecedor, item.material.nomeAcao].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                            <input
                              type="number"
                              min="1"
                              max={item.material.quantity}
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.material.id, parseInt(e.target.value) || 1)}
                              className="w-12 h-7 bg-white rounded-md text-xs font-semibold text-center outline-none focus:border-blue-500 border border-transparent transition-all"
                            />
                            <span className="text-xs text-slate-500 pr-2">un.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.material.id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Justificativa */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Justificativa <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  rows={2}
                  placeholder="Ex: Material para ação de Natal — PDV Carrefour SP"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                  required
                />
              </div>

              {/* Marcador */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Marcador <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewMarcador((v) => !v)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Tag className="h-3 w-3" />
                    {showNewMarcador ? "Cancelar" : "Novo marcador"}
                  </button>
                </div>

                {showNewMarcador && (
                  <NewMarcadorForm onCreated={handleMarcadorCreated} />
                )}

                {loadingMaterials ? (
                  <div className="h-10 bg-slate-50 border border-slate-200 rounded-xl animate-pulse" />
                ) : marcadores.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">Nenhum marcador cadastrado. Crie um acima.</p>
                ) : (
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50 max-h-40 overflow-y-auto">
                    {marcadores.map((m) => (
                      <label key={m.id} className="flex items-center gap-2.5 cursor-pointer group py-0.5">
                        <input
                          type="radio"
                          name="marcador"
                          value={m.id}
                          checked={marcadorId === m.id}
                          onChange={() => setMarcadorId(m.id)}
                          className="sr-only"
                        />
                        <span
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${marcadorId === m.id ? "border-transparent" : "border-slate-300 bg-white"}`}
                          style={marcadorId === m.id ? { backgroundColor: m.color, borderColor: m.color } : {}}
                        >
                          {marcadorId === m.id && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white block" />
                          )}
                        </span>
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: m.color }}
                        />
                        <span className="text-xs text-slate-700 group-hover:text-slate-900 transition-colors">{m.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Info RBAC */}
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Esta solicitação precisa ser <strong>aprovada por um administrador</strong> antes
                  que o material seja baixado do estoque.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => { reset(); onClose(); }}
                disabled={submitting}
                className="h-9 px-4 rounded-xl text-xs border-slate-200 text-slate-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting || items.length === 0 || !user}
                className="h-9 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-100 flex items-center gap-1.5"
              >
                {submitting ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="h-3.5 w-3.5" /> Enviar Solicitação</>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
