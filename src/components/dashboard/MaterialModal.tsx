"use client";

import { useState, useRef, useEffect } from "react";
import { X, Save, AlertCircle, ImagePlus, Loader2, ChevronDown, Search, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/upload-helper";
import Image from "next/image";

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface LocInfo {
  id: string;
  rua: string;
  predio: string;
  andar: string;
  apartamento: string;
  _count?: { materials: number };
}

export function MaterialModal({ isOpen, onClose, onSuccess }: MaterialModalProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [status, setStatus] = useState("DISPONIVEL");
  const [fornecedor, setFornecedor] = useState("");
  const [nomeAcao, setNomeAcao] = useState("");
  const [periodoAcaoInicio, setPeriodoAcaoInicio] = useState("");
  const [periodoAcaoFim, setPeriodoAcaoFim] = useState("");
  const [dataValidade, setDataValidade] = useState("");

  const [localizacoes, setLocalizacoes] = useState<LocInfo[]>([]);
  const [localizacaoId, setLocalizacaoId] = useState("");
  const [locOpen, setLocOpen] = useState(false);
  const [locSearch, setLocSearch] = useState("");
  const [confirmMultiplos, setConfirmMultiplos] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetch("/api/categories")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setCategories(data.map((c: any) => c.name)); })
        .catch(() => { });

      fetch("/api/localizacoes")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setLocalizacoes(data); })
        .catch(() => { });
    }
  }, [isOpen]);

  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredLocalizacoes = localizacoes.filter((loc) =>
    `${loc.rua} ${loc.predio} ${loc.andar} ${loc.apartamento}`
      .toLowerCase()
      .includes(locSearch.toLowerCase())
  );

  const selectedLoc = localizacoes.find((l) => l.id === localizacaoId) || null;
  const locTemProduto = selectedLoc && (selectedLoc._count?.materials ?? 0) > 0;

  if (!isOpen) return null;

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function resetForm() {
    setName("");
    setSku("");
    setCategoryName("");
    setCategorySearch("");
    setCategoryOpen(false);
    setQuantity(0);
    setStatus("DISPONIVEL");
    setFornecedor("");
    setNomeAcao("");
    setPeriodoAcaoInicio("");
    setPeriodoAcaoFim("");
    setDataValidade("");
    setLocalizacaoId("");
    setLocOpen(false);
    setLocSearch("");
    setConfirmMultiplos(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setError("");
  }

  function handleLocSelect(id: string) {
    setLocalizacaoId(id);
    setLocOpen(false);
    setConfirmMultiplos(false);
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) { setError("Nome do material é obrigatório."); return; }
    if (!categoryName.trim()) { setError("Categoria é obrigatória."); return; }

    // Bloqueia se endereço tem produto e ainda não confirmou
    if (locTemProduto && !confirmMultiplos) {
      setError("O endereço selecionado já possui produto(s). Confirme abaixo para continuar.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        photoUrl = await uploadFile(photoFile, "produto");
      }

      const response = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sku: sku || undefined,
          categoryName,
          quantity,
          status,
          entryDate: new Date().toISOString(),
          fornecedor,
          nomeAcao,
          periodoAcaoInicio,
          periodoAcaoFim,
          dataValidade: dataValidade || undefined,
          photoUrl,
          localizacaoId: localizacaoId || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro ao criar material.");
      }

      resetForm();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Erro de rede.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Novo Material</h3>
            <p className="text-xs text-slate-500 mt-0.5">Cadastre um novo item no sistema de controle.</p>
          </div>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Foto */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Foto do Produto (Opcional)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative flex items-center justify-center h-28 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all overflow-hidden group"
            >
              {photoPreview ? (
                <Image src={photoPreview} alt="Preview" fill className="object-cover rounded-xl" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-slate-400 group-hover:text-blue-500 transition-colors">
                  <ImagePlus className="h-7 w-7" />
                  <span className="text-xs font-medium">Clique para adicionar foto</span>
                  <span className="text-[10px]">JPG, PNG ou WEBP — máx. 5 MB</span>
                </div>
              )}
              {photoPreview && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Trocar foto</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Nome do Material <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Wobbler Dia das Mães"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
              required
            />
          </div>

          {/* SKU */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">SKU (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: WOB-MAE-02"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Categoria <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setCategoryOpen((v) => !v); setCategorySearch(""); }}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all flex items-center justify-between"
              >
                <span className={categoryName ? "text-slate-700" : "text-slate-400"}>
                  {categoryName || "Selecione uma categoria..."}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </button>
              {categoryOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar categoria..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        autoFocus
                        className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {filteredCategories.length === 0 ? (
                      <li className="px-3 py-2 text-xs text-slate-400 text-center">Nenhuma categoria encontrada</li>
                    ) : (
                      filteredCategories.map((cat) => (
                        <li
                          key={cat}
                          onClick={() => { setCategoryName(cat); setCategoryOpen(false); }}
                          className={`px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors ${cat === categoryName ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"}`}
                        >
                          {cat}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Qtd & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Qtd Inicial</label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
              >
                <option value="DISPONIVEL">Disponível</option>
                <option value="RESERVADO">Reservado</option>
                <option value="ESGOTADO">Esgotado</option>
              </select>
            </div>
          </div>

          {/* Fornecedor */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Fornecedor (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Distribuidora XYZ"
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Validade do produto */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-orange-400" />
              Data de Validade do Produto (Opcional)
            </label>
            <input
              type="date"
              value={dataValidade}
              onChange={(e) => setDataValidade(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
            <p className="text-[10px] text-slate-400">Sistema avisará 2 meses antes do vencimento.</p>
          </div>

          {/* Localização */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-blue-500" />
              Localização no Estoque
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setLocOpen((v) => !v); setLocSearch(""); }}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all flex items-center justify-between gap-2"
              >
                <span className={selectedLoc ? "text-slate-700" : "text-slate-400"}>
                  {selectedLoc
                    ? `${selectedLoc.rua} · ${selectedLoc.predio} · ${selectedLoc.andar} · ${selectedLoc.apartamento}`
                    : "Selecione um endereço..."}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </button>
              {locOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar endereço..."
                        value={locSearch}
                        onChange={(e) => setLocSearch(e.target.value)}
                        autoFocus
                        className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <ul className="max-h-48 overflow-y-auto py-1">
                    <li
                      onClick={() => handleLocSelect("")}
                      className={`px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${!localizacaoId ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-500"}`}
                    >
                      Sem localização
                    </li>
                    {filteredLocalizacoes.length === 0 ? (
                      <li className="px-3 py-3 text-xs text-slate-400 text-center">
                        Nenhum endereço encontrado.
                        <span className="block text-[10px] mt-0.5">Cadastre em Gestão → Endereço</span>
                      </li>
                    ) : (
                      filteredLocalizacoes.map((loc) => {
                        const temProd = (loc._count?.materials ?? 0) > 0;
                        return (
                          <li
                            key={loc.id}
                            onClick={() => handleLocSelect(loc.id)}
                            className={`px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors ${loc.id === localizacaoId ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"}`}
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-slate-800">{loc.rua}</p>
                              {temProd && (
                                <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                                  {loc._count!.materials} prod.
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">{loc.predio}</span>
                              <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{loc.andar}</span>
                              <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{loc.apartamento}</span>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Aviso de múltiplos produtos no endereço */}
            {locTemProduto && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>Atenção:</strong> Este endereço já possui{" "}
                    <strong>{selectedLoc?._count?.materials} produto(s)</strong>. Tem certeza que deseja
                    adicionar outro produto neste endereço?
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmMultiplos}
                    onChange={(e) => setConfirmMultiplos(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-amber-300 accent-amber-600"
                  />
                  <span className="text-xs font-semibold text-amber-700">Sim, confirmo o endereço compartilhado</span>
                </label>
              </div>
            )}
          </div>

          {/* Nome da Ação */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Nome da Ação (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Promoção de Verão"
              value={nomeAcao}
              onChange={(e) => setNomeAcao(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Período da Ação */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Início da Ação</label>
              <input
                type="date"
                value={periodoAcaoInicio}
                onChange={(e) => setPeriodoAcaoInicio(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Fim da Ação</label>
              <input
                type="date"
                value={periodoAcaoFim}
                onChange={(e) => setPeriodoAcaoFim(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onClose(); }}
              disabled={submitting}
              className="h-9 px-4 rounded-xl text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-9 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-100 flex items-center gap-1.5"
            >
              {submitting ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Criando...</>
              ) : (
                <><Save className="h-3.5 w-3.5" /> Criar Material</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
