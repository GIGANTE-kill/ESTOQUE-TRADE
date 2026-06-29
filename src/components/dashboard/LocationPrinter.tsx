"use client";

/**
 * LocationPrinter
 *
 * Impressor de etiqueta de localização de produto no estoque.
 * - Seleciona um produto (dropdown buscável)
 * - Mostra a localização vinculada ao produto (via FK Localizacao)
 * - Categoria é opcional (checkbox para incluir)
 * - Preview em tempo real da etiqueta
 * - Impressão via window.print() com CSS @media print
 */

import { useState, useEffect, useRef } from "react";
import { Search, Printer, MapPin, Package, ChevronDown, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Localizacao {
  id: string;
  rua: string;
  predio: string;
  andar: string;
  apartamento: string;
}

interface Material {
  id: string;
  name: string;
  sku: string;
  category: string;
  localizacao: Localizacao | null;
}

export function LocationPrinter({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<Material | null>(null);
  const [includeCategory, setIncludeCategory] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/materials", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMaterials(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectMaterial(mat: Material) {
    setSelected(mat);
    setDropdownOpen(false);
    setSearch("");
  }

  function clearSelection() {
    setSelected(null);
    setIncludeCategory(false);
  }

  const filtered = materials.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase()) ||
    (m.sku && m.sku !== "-" && m.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const loc = selected?.localizacao ?? null;
  const hasLocation = !!loc;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Impressora de Etiqueta</h2>
          <p className="text-xs text-slate-400 mt-0.5">Selecione um produto para imprimir sua etiqueta de localização</p>
        </div>
        <Button
          onClick={handlePrint}
          disabled={!selected || !hasLocation}
          className={cn(
            "h-9 gap-2 text-sm rounded-xl font-semibold shadow-sm",
            selected && hasLocation
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          <Printer className="h-4 w-4" />
          Imprimir Etiqueta
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Painel Esquerdo: Seleção ── */}
        <div className="space-y-5">
          {/* Seletor de Produto */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Produto <span className="text-red-400">*</span>
            </label>
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className={cn("truncate", selected ? "text-slate-700" : "text-slate-400")}>
                    {selected ? selected.name : "Selecione um produto..."}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {selected && (
                    <span
                      onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                      className="p-0.5 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3 text-slate-400" />
                    </span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar produto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                        className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <ul className="max-h-56 overflow-y-auto py-1">
                    {loading ? (
                      <li className="flex items-center justify-center py-6 gap-2 text-xs text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                      </li>
                    ) : filtered.length === 0 ? (
                      <li className="px-3 py-4 text-xs text-slate-400 text-center">Nenhum produto encontrado</li>
                    ) : (
                      filtered.map((mat) => (
                        <li
                          key={mat.id}
                          onClick={() => selectMaterial(mat)}
                          className={cn(
                            "px-3 py-2.5 text-xs cursor-pointer transition-colors",
                            selected?.id === mat.id
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <p className="font-medium">{mat.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400">{mat.category}</span>
                            {mat.localizacao ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                                <MapPin className="h-2.5 w-2.5" />
                                {mat.localizacao.rua}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-500">Sem localização</span>
                            )}
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Info da localização do produto selecionado */}
          {selected && (
            <div className={cn(
              "rounded-xl border p-4 space-y-2",
              loc ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"
            )}>
              <div className="flex items-center gap-1.5">
                <MapPin className={cn("h-3.5 w-3.5 shrink-0", loc ? "text-emerald-600" : "text-amber-500")} />
                <p className={cn("text-[10px] font-semibold uppercase tracking-widest", loc ? "text-emerald-600" : "text-amber-500")}>
                  {loc ? "Localização vinculada" : "Sem localização"}
                </p>
              </div>
              {loc ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">{loc.rua}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center rounded-lg bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">{loc.predio}</span>
                    <span className="inline-flex items-center rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-white">{loc.andar} Andar</span>
                    <span className="inline-flex items-center rounded-lg border-2 border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-600">Apto {loc.apartamento}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-600">
                  Este produto não tem localização vinculada. Edite-o no estoque para vincular um endereço.
                </p>
              )}
            </div>
          )}

          {/* Categoria opcional */}
          {selected && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
              <input
                id="include-category"
                type="checkbox"
                checked={includeCategory}
                onChange={(e) => setIncludeCategory(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="include-category" className="text-xs font-medium text-slate-600 cursor-pointer select-none">
                Incluir categoria na etiqueta
                <span className="ml-1.5 text-[10px] font-normal text-slate-400">(opcional)</span>
              </label>
            </div>
          )}
        </div>

        {/* ── Painel Direito: Preview ── */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Preview da Etiqueta
          </p>

          <div
            id="print-area"
            className={cn(
              "relative rounded-2xl border-2 transition-all duration-300",
              selected && hasLocation
                ? "border-blue-200 shadow-lg shadow-blue-50"
                : "border-dashed border-slate-200"
            )}
          >
            {!selected ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">
                <Package className="h-10 w-10" />
                <p className="text-sm font-medium">Selecione um produto</p>
              </div>
            ) : !loc ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-amber-300">
                <MapPin className="h-10 w-10" />
                <p className="text-sm font-medium text-amber-500">Produto sem localização</p>
                <p className="text-xs text-slate-400 text-center px-6">
                  Vincule um endereço ao produto no Estoque para imprimir a etiqueta
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* Cabeçalho da etiqueta */}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-200">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight">{selected.name}</p>
                    {selected.sku && selected.sku !== "-" && (
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{selected.sku}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100" />

                {/* Localização */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-500">Localização</p>
                  </div>
                  <p className="text-base font-bold text-slate-800">{loc.rua}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-200">
                      {loc.predio}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white">
                      {loc.andar} Andar
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg border-2 border-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800">
                      Apto {loc.apartamento}
                    </span>
                  </div>
                </div>

                {/* Categoria (opcional) */}
                {includeCategory && selected.category && (
                  <>
                    <div className="border-t border-slate-100" />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Categoria</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-medium text-slate-700">
                        {selected.category}
                      </span>
                    </div>
                  </>
                )}

                {/* Rodapé */}
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[9px] font-mono text-slate-300 uppercase tracking-widest">
                    Ação Trade · Controle de Estoque
                  </p>
                </div>
              </div>
            )}
          </div>

          {selected && hasLocation && (
            <p className="text-[10px] text-slate-400 text-center">
              Clique em "Imprimir Etiqueta" para abrir o diálogo de impressão
            </p>
          )}
        </div>
      </div>

      {/* CSS de impressão */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
          }
          #print-area > div {
            width: 380px !important;
            border: 2px solid #e2e8f0 !important;
            border-radius: 16px !important;
            padding: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
