"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StockTable } from "@/components/dashboard/StockTable";
import { MaterialModal } from "@/components/dashboard/MaterialModal";
import { SolicitacaoModal } from "@/components/dashboard/SolicitacaoModal";
import { Button } from "@/components/ui/button";
import { Plus, Download, Send } from "lucide-react";

export default function EstoquePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSolicitacaoOpen, setIsSolicitacaoOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-sm px-6">
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">
              Controle de Estoque
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Gerencie os materiais disponíveis</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 text-sm border-slate-200 text-slate-600 rounded-xl hover:border-slate-300"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSolicitacaoOpen(true)}
              className="h-9 gap-2 text-sm border-violet-200 text-violet-700 hover:bg-violet-50 rounded-xl"
            >
              <Send className="h-4 w-4" />
              Solicitar Saída
            </Button>
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="h-9 gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-200"
            >
              <Plus className="h-4 w-4" />
              Novo Material
            </Button>
          </div>
        </header>

        <div className="flex-1 p-6 space-y-6">
          <section aria-label="Tabela de materiais em estoque">
            <StockTable refreshTrigger={refreshTrigger} />
          </section>
        </div>
      </div>

      <MaterialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => setRefreshTrigger((p) => p + 1)}
      />

      <SolicitacaoModal
        isOpen={isSolicitacaoOpen}
        onClose={() => setIsSolicitacaoOpen(false)}
        onSuccess={() => setRefreshTrigger((p) => p + 1)}
      />
    </AppShell>
  );
}
