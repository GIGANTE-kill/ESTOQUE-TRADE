"use client";

import { useState, useEffect, useRef } from "react";
import {
  X, AlertCircle, LogOut, FileText, Upload, CheckCircle2, Loader2, ImagePlus, Search, Plus, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/upload-helper";
import { useAuth } from "@/lib/AuthContext";
import Image from "next/image";

interface SaidaModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedMaterial?: { id: string; name: string; quantity: number };
  onSuccess?: () => void;
}

type Step = "form" | "success";

interface MovementResult {
  id: string;
  documentId?: string;
  materialName: string;
  quantity: number;
  date: string;
  fornecedor?: string;
  nomeAcao?: string;
}

export function SaidaModal({ isOpen, onClose, preselectedMaterial, onSuccess }: SaidaModalProps) {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedMat, setSelectedMat] = useState<any | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [currentQuantity, setCurrentQuantity] = useState<number>(1);
  const [items, setItems] = useState<{ material: any; quantity: number }[]>([]);
  
  const [justificativa, setJustificativa] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [results, setResults] = useState<MovementResult[]>([]);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docSaved, setDocSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingMaterials(true);
    fetch("/api/materials")
      .then((r) => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setMaterials(data);
          if (preselectedMaterial) {
            const mat = data.find((m) => m.id === preselectedMaterial.id);
            if (mat) {
              setItems([{ material: mat, quantity: 1 }]);
            }
          }
        }
      })
      .finally(() => setLoadingMaterials(false));
  }, [isOpen, preselectedMaterial]);

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
    setStep("form");
    setSearch("");
    setSelectedMat(null);
    setCurrentQuantity(1);
    setItems([]);
    setJustificativa("");
    setError("");
    setResults([]);
    setDocFile(null);
    setDocPreview(null);
    setDocSaved(false);
    setDropdownOpen(false);
  }

  function selectMaterial(m: any) {
    setSelectedMat(m);
    setSearch(m.name);
    setDropdownOpen(false);
  }

  function handleAddItem() {
    if (!selectedMat) return;
    if (currentQuantity <= 0) {
      setError("Quantidade inválida.");
      return;
    }
    const exists = items.find(i => i.material.id === selectedMat.id);
    if (exists) {
      if (exists.quantity + currentQuantity > selectedMat.quantity) {
        setError("Quantidade excede o estoque disponível.");
        return;
      }
      setItems(items.map(i => i.material.id === selectedMat.id ? { ...i, quantity: i.quantity + currentQuantity } : i));
    } else {
      if (currentQuantity > selectedMat.quantity) {
        setError("Quantidade excede o estoque disponível.");
        return;
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
    setItems(items.map(i => {
      if (i.material.id === materialId) {
        return { ...i, quantity: Math.min(qty, i.material.quantity) };
      }
      return i;
    }));
  }

  const filteredMaterials = materials.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) && !items.find(i => i.material.id === m.id)
  );

  function handleDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFile(file);
    setDocPreview(URL.createObjectURL(file));
  }

  function handleGerarPDF() {
    if (results.length === 0) return;
    
    const rowsHtml = results.map(r => `
      <tr>
        <td>${r.materialName}</td>
        <td>${r.quantity} un.</td>
        <td>${r.fornecedor || "-"}</td>
        <td>${r.nomeAcao || "-"}</td>
      </tr>
    `).join("");

    const html = `
      <html><head><title>Termo de Saída</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .sub { font-size: 12px; color: #666; margin-bottom: 32px; }
        .info { margin-bottom: 24px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
        td, th { border: 1px solid #ddd; padding: 8px 12px; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; text-align: left; }
        .linha { border-top: 1px solid #333; width: 260px; margin-top: 56px; padding-top: 6px; font-size: 12px; text-align: center; }
      </style></head><body>
      <h1>TERMO DE RESPONSABILIDADE DE SAÍDA</h1>
      <div class="sub">CD São Roque / Promotoria — Ação Trade Estoque</div>
      
      <div class="info">
        <p><strong>Solicitante:</strong> ${user?.name ?? "—"}</p>
        <p><strong>Data/Hora:</strong> ${results[0].date}</p>
        <p><strong>Justificativa:</strong> ${justificativa}</p>
      </div>

      <table>
        <tr>
          <th>Material</th>
          <th>Quantidade</th>
          <th>Fornecedor</th>
          <th>Ação</th>
        </tr>
        ${rowsHtml}
      </table>
      
      <p style="font-size:13px">
        Declaro que recebi os materiais acima listados e me responsabilizo pela guarda,
        uso adequado e devolução ou comprovação de utilização conforme as normas da empresa.
      </p>
      <div class="linha">${user?.name ?? ""}</div>
      </body></html>
    `;
    const win = window.open("", "_blank");
    if (win) { win.document.open(); win.document.write(html); win.document.close(); win.print(); }
  }

  async function handleUploadDoc() {
    if (!docFile || results.length === 0) return;
    setUploadingDoc(true);
    setError("");
    try {
      const url = await uploadFile(docFile, "docassinado");
      
      // Update all documents generated for these movements
      await Promise.all(results.map(async (r) => {
        if (!r.documentId) return;
        await fetch(`/api/documents/${r.documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signedDocUrl: url, signedBy: user?.name, status: "ASSINADO" }),
        });
      }));
      
      setDocSaved(true);
    } catch (err: any) {
      setError(err.message || "Falha ao salvar documento assinado.");
    } finally {
      setUploadingDoc(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (items.length === 0) { setError("Adicione ao menos um material."); return; }
    if (!justificativa.trim()) { setError("Justificativa é obrigatória."); return; }
    if (!user) { setError("Sessão expirada. Faça login novamente."); return; }

    setSubmitting(true);
    setError("");

    try {
      const responses = await Promise.all(items.map(async (item) => {
        const res = await fetch("/api/movements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialId: item.material.id,
            type: "SAIDA",
            quantity: item.quantity,
            notes: justificativa,
            userId: user.id,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Erro ao registrar saída para ${item.material.name}`);
        }
        return { item, data: await res.json() };
      }));

      const newResults = responses.map(({ item, data }) => ({
        id: data.id,
        documentId: data.documentId ?? undefined,
        materialName: item.material.name,
        quantity: item.quantity,
        date: new Date().toLocaleString("pt-BR"),
        fornecedor: item.material.fornecedor,
        nomeAcao: item.material.nomeAcao,
      }));

      setResults(newResults);
      setStep("success");
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
              <LogOut className="h-4 w-4 text-blue-600" />
              {step === "form" ? "Registrar Saída" : "Saída Registrada"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {step === "form"
                ? "Adicione múltiplos produtos e gere o termo único."
                : "Gere o PDF e faça upload do documento assinado."}
            </p>
          </div>
          <button
            onClick={() => { reset(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── FORM ── */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Solicitante */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Solicitante
                </label>
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

              {/* Adicionar Material */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-3">
                <p className="text-xs font-semibold text-blue-800">Adicionar Produtos</p>
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
                          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
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
                                    {(m.fornecedor || m.nomeAcao) && (
                                      <p className="text-[10px] text-slate-400 truncate">
                                        {[m.fornecedor, m.nomeAcao].filter(Boolean).join(" · ")}
                                      </p>
                                    )}
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
                          {(item.material.fornecedor || item.material.nomeAcao) && (
                            <p className="text-[10px] text-slate-400">
                              {[item.material.fornecedor, item.material.nomeAcao].filter(Boolean).join(" · ")}
                            </p>
                          )}
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
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => { reset(); onClose(); }}
                disabled={submitting}
                className="h-9 px-4 rounded-xl text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting || items.length === 0 || !user}
                className="h-9 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-100 flex items-center gap-1.5"
              >
                {submitting ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Registrando...</>
                ) : (
                  <><LogOut className="h-3.5 w-3.5" /> Confirmar Saída</>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && results.length > 0 && (
          <div className="p-6 space-y-5 overflow-y-auto">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Saída registrada com sucesso!</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {results.length} produtos liberados — {results[0].date}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                1. Gere e imprima o Termo de Responsabilidade Único
              </p>
              <Button
                onClick={handleGerarPDF}
                variant="outline"
                className="w-full h-10 rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Gerar Termo de Responsabilidade (PDF)
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                2. Faça upload do documento assinado (foto)
              </p>
              {docSaved ? (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Documento assinado salvo para todos os itens!
                </div>
              ) : (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative flex items-center justify-center h-24 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all overflow-hidden group"
                  >
                    {docPreview ? (
                      <Image src={docPreview} alt="Doc assinado" fill className="object-cover rounded-xl" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-blue-500 transition-colors">
                        <ImagePlus className="h-6 w-6" />
                        <span className="text-xs">Foto do documento assinado</span>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleDocChange} />
                  {error && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {error}
                    </p>
                  )}
                  <Button
                    onClick={handleUploadDoc}
                    disabled={!docFile || uploadingDoc}
                    className="w-full h-9 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center gap-2"
                  >
                    {uploadingDoc ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...</>
                    ) : (
                      <><Upload className="h-3.5 w-3.5" /> Salvar Documento Assinado</>
                    )}
                  </Button>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Button
                onClick={() => { reset(); onClose(); }}
                variant="outline"
                className="w-full h-9 rounded-xl text-xs border-slate-200 text-slate-600"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
