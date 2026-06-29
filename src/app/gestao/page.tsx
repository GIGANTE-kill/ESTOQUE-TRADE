"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LocacoesManager } from "@/components/dashboard/LocacoesManager";
import { LocationPrinter } from "@/components/dashboard/LocationPrinter";
import { WarehouseMap } from "@/components/dashboard/WarehouseMap";
import { MapPin, Printer, Map } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GestaoPage() {
  const [tab, setTab] = useState<"enderecos" | "mapa" | "impressora">("enderecos");
  const [locRefresh, setLocRefresh] = useState(0);

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm px-6">
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">Gestão</h1>
            <p className="text-xs text-slate-400 mt-0.5">Endereços de estoque e impressão de etiquetas</p>
          </div>

          {/* Tabs */}
          <div className="ml-auto flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setTab("enderecos")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                tab === "enderecos"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <MapPin className="h-3.5 w-3.5" />
              Endereços
            </button>
            <button
              onClick={() => setTab("mapa")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                tab === "mapa"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Map className="h-3.5 w-3.5" />
              Mapa 3D
            </button>
            <button
              onClick={() => setTab("impressora")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                tab === "impressora"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Printer className="h-3.5 w-3.5" />
              Impressora
            </button>
          </div>
        </header>

        {/* Conteúdo */}
        <div className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            {tab === "enderecos" && (
              <section
                aria-label="Cadastro de endereços do estoque"
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
              >
                <LocacoesManager onRefresh={() => setLocRefresh((v) => v + 1)} />
              </section>
            )}

            {tab === "mapa" && (
              <section
                aria-label="Mapa 3D do estoque"
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
              >
                <div className="flex items-center gap-2 mb-6">
                  <Map className="h-4 w-4 text-blue-500" />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Mapa do Estoque</h2>
                    <p className="text-xs text-slate-400">Visualização 3D das posições ocupadas e livres</p>
                  </div>
                </div>
                <WarehouseMap refreshKey={locRefresh} />
              </section>
            )}

            {tab === "impressora" && (
              <section
                aria-label="Impressora de etiqueta de localização"
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
              >
                <LocationPrinter refreshTrigger={locRefresh} />
              </section>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
