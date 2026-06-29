"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "ENTRADA" | "SAIDA";
  onSuccess?: () => void;
}

export function MovementModal({ isOpen, onClose, type, onSuccess }: MovementModalProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [user, setUser] = useState("Carlos Administrador");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLoadingMaterials(true);
      fetch("/api/materials")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setMaterials(data);
            if (data.length > 0) {
              setSelectedMaterialId(data[0].id);
            }
          }
        })
        .catch((err) => console.error("Error loading materials:", err))
        .finally(() => setLoadingMaterials(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId) {
      setError("Por favor, selecione um material.");
      return;
    }
    if (quantity <= 0) {
      setError("A quantidade deve ser maior que zero.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: selectedMaterialId,
          type,
          quantity,
          user,
          notes,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro ao registrar movimentação.");
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Erro de rede.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {type === "ENTRADA" ? "Registrar Entrada" : "Registrar Saída"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {type === "ENTRADA"
                ? "Adicione novos itens ao estoque de materiais."
                : "Registre a saída de itens e gere o termo."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Material Select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Material
            </label>
            {loadingMaterials ? (
              <div className="h-10 bg-slate-50 border border-slate-200 rounded-xl animate-pulse flex items-center px-3 text-xs text-slate-400">
                Carregando materiais...
              </div>
            ) : (
              <select
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.quantity} un. em estoque)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quantidade */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Quantidade
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Responsavel */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Responsável
            </label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
              required
            />
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ex: Entrega para promotora Joana / Campanha de Natal..."
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="h-9 px-4 rounded-xl text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className={`h-9 px-4 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 ${
                type === "ENTRADA"
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              {submitting ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
