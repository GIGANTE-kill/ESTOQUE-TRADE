"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { Loader2, Building2, Package, CheckCircle2, Circle, X, AlertTriangle, Clock, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface MaterialInfo {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  photoUrl: string | null;
  nomeAcao: string | null;
  periodoAcaoFim: string | null;
  dataValidade: string | null;
  status: string;
  fornecedor: string | null;
  diasRestantesAcao: number | null;
  diasParaVencer: number | null;
}

interface Localizacao {
  id: string;
  rua: string;
  predio: string;
  andar: string;
  apartamento: string;
  _count?: { materials: number };
  materials?: MaterialInfo[];
  acaoAcabando?: boolean;
  produtoVencendo?: boolean;
}

interface TooltipState {
  loc: Localizacao;
  x: number;
  y: number;
}

function groupData(locs: Localizacao[]) {
  const ruas = new Map<string, Map<string, Map<string, Localizacao[]>>>();
  for (const loc of locs) {
    if (!ruas.has(loc.rua)) ruas.set(loc.rua, new Map());
    const p = ruas.get(loc.rua)!;
    if (!p.has(loc.predio)) p.set(loc.predio, new Map());
    const a = p.get(loc.predio)!;
    if (!a.has(loc.andar)) a.set(loc.andar, []);
    a.get(loc.andar)!.push(loc);
  }
  return ruas;
}

// Determina a cor do slot baseado em status crítico
function getSlotStyle(loc: Localizacao): { bg: string; border: string; shadow: string } {
  const occupied = (loc._count?.materials ?? 0) > 0;
  if (!occupied) {
    return {
      bg: "bg-white/10",
      border: "border border-dashed border-slate-400/30",
      shadow: "",
    };
  }
  if (loc.acaoAcabando && loc.produtoVencendo) {
    return {
      bg: "bg-gradient-to-br from-red-500 to-red-700",
      border: "border border-red-400/40",
      shadow: "shadow-md shadow-red-500/60",
    };
  }
  if (loc.acaoAcabando) {
    return {
      bg: "bg-gradient-to-br from-orange-400 to-orange-600",
      border: "border border-orange-300/40",
      shadow: "shadow-md shadow-orange-400/60",
    };
  }
  if (loc.produtoVencendo) {
    return {
      bg: "bg-gradient-to-br from-amber-400 to-amber-600",
      border: "border border-amber-300/40",
      shadow: "shadow-md shadow-amber-400/60",
    };
  }
  return {
    bg: "bg-gradient-to-br from-blue-400 to-blue-600",
    border: "border border-blue-300/40",
    shadow: "shadow-md shadow-blue-400/60",
  };
}

// Modal de detalhes do slot ao clicar
function SlotDetailModal({ loc, onClose }: { loc: Localizacao; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">{loc.rua}</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {loc.predio} · {loc.andar} · {loc.apartamento}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {(loc.materials?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-slate-400">
              <Circle className="h-8 w-8" />
              <p className="text-sm">Endereço livre</p>
            </div>
          ) : (
            <>
              {(loc.materials?.length ?? 0) > 1 && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span><strong>{loc.materials!.length} produtos</strong> neste endereço</span>
                </div>
              )}
              {(loc.materials ?? []).map((mat) => {
                const acaoUrgente = mat.diasRestantesAcao !== null && mat.diasRestantesAcao >= 0 && mat.diasRestantesAcao <= 15;
                const validadeUrgente = mat.diasParaVencer !== null && mat.diasParaVencer >= 0 && mat.diasParaVencer <= 60;
                const vencido = mat.diasParaVencer !== null && mat.diasParaVencer < 0;
                return (
                  <div
                    key={mat.id}
                    className={cn(
                      "rounded-xl border p-3 space-y-2",
                      acaoUrgente && validadeUrgente
                        ? "border-red-200 bg-red-50"
                        : acaoUrgente
                        ? "border-orange-200 bg-orange-50"
                        : validadeUrgente || vencido
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-100 bg-slate-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{mat.name}</p>
                        {mat.sku && <p className="text-[10px] font-mono text-slate-400">{mat.sku}</p>}
                        {mat.fornecedor && (
                          <p className="text-[10px] text-slate-500">{mat.fornecedor}</p>
                        )}
                      </div>
                      <span className={cn(
                        "shrink-0 text-xs font-bold px-2 py-0.5 rounded-full",
                        mat.quantity === 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {mat.quantity} un.
                      </span>
                    </div>

                    {/* Ação */}
                    {mat.nomeAcao && (
                      <div className={cn(
                        "flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-xs",
                        acaoUrgente
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-50 text-blue-800"
                      )}>
                        <Tag className="h-3 w-3 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">{mat.nomeAcao}</p>
                          {mat.periodoAcaoFim && (
                            <p className="text-[10px] mt-0.5">
                              {acaoUrgente ? (
                                <span className="flex items-center gap-1 font-bold text-red-700">
                                  <Clock className="h-2.5 w-2.5" />
                                  {mat.diasRestantesAcao}d restantes — ATENÇÃO!
                                </span>
                              ) : (
                                `Termina em ${new Date(mat.periodoAcaoFim + "T00:00:00").toLocaleDateString("pt-BR")}`
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Validade */}
                    {mat.dataValidade && (
                      <div className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs",
                        vencido
                          ? "bg-red-100 text-red-800"
                          : validadeUrgente
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      )}>
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span>
                          {vencido
                            ? `Vencido em ${new Date(mat.dataValidade + "T00:00:00").toLocaleDateString("pt-BR")}`
                            : validadeUrgente
                            ? `Vence em ${mat.diasParaVencer}d — PERÍODO CRÍTICO`
                            : `Válido até ${new Date(mat.dataValidade + "T00:00:00").toLocaleDateString("pt-BR")}`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SlotCell({
  loc,
  onHover,
  onClick,
}: {
  loc: Localizacao;
  onHover: (l: Localizacao | null, e?: React.MouseEvent) => void;
  onClick: (l: Localizacao) => void;
}) {
  const occupied = (loc._count?.materials ?? 0) > 0;
  const style = getSlotStyle(loc);

  return (
    <div
      onMouseEnter={(e) => onHover(loc, e)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(loc)}
      className={cn(
        "relative flex flex-col items-center justify-center rounded cursor-pointer select-none",
        "w-8 h-8 transition-all duration-150 hover:scale-110 hover:z-10",
        style.bg,
        style.border,
        style.shadow,
        occupied ? "text-white" : "text-slate-400/70"
      )}
    >
      <span className="text-[8px] font-extrabold leading-none">{loc.apartamento.replace(/^Apto\s+/i, "")}</span>
      {occupied && (
        <div className={cn(
          "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shadow-sm",
          loc.acaoAcabando && loc.produtoVencendo
            ? "bg-red-300"
            : loc.acaoAcabando
            ? "bg-orange-300 animate-pulse"
            : loc.produtoVencendo
            ? "bg-amber-300 animate-pulse"
            : "bg-emerald-400"
        )} />
      )}
      {(loc.materials?.length ?? 0) > 1 && (
        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-white border border-amber-400 flex items-center justify-center">
          <span className="text-[6px] font-black text-amber-600">{loc.materials?.length}</span>
        </div>
      )}
    </div>
  );
}

function ShelfUnit({
  predio,
  andares,
  isLeft,
  onHover,
  onClick,
}: {
  predio: string;
  andares: Map<string, Localizacao[]>;
  isLeft: boolean;
  onHover: (l: Localizacao | null, e?: React.MouseEvent) => void;
  onClick: (l: Localizacao) => void;
}) {
  const sortedAndarNames = [...andares.keys()].sort((a, b) => {
    const isAPicking = a.toLowerCase().includes("picking");
    const isBPicking = b.toLowerCase().includes("picking");
    if (isAPicking) return -1;
    if (isBPicking) return 1;
    const numA = parseInt(a.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  if (isLeft) {
    sortedAndarNames.reverse();
  }

  return (
    <div className="flex items-center">
      {isLeft && (
        <div
          className="relative text-center text-[9px] font-black uppercase tracking-widest py-3 px-1.5 rounded-l-lg text-white z-10 shrink-0 [writing-mode:vertical-lr] [text-orientation:mixed]"
          style={{
            background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 60%, #60a5fa 100%)",
            boxShadow: "-2px 0 0 #1e3a8a inset",
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}
        >
          {predio}
        </div>
      )}

      <div
        className="relative flex gap-2 p-2"
        style={{
          background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "4px 4px 0 0 rgba(0,0,0,0.5)",
          borderRadius: isLeft ? "0 8px 8px 0" : "8px 0 0 8px",
        }}
      >
        {sortedAndarNames.map((andarName) => {
          const slots = andares.get(andarName) || [];
          const sortedSlots = [...slots].sort((a, b) => {
            const numA = parseInt(a.apartamento.replace(/\D/g, "")) || 0;
            const numB = parseInt(b.apartamento.replace(/\D/g, "")) || 0;
            return numB - numA;
          });

          return (
            <div key={andarName} className="flex flex-col items-center gap-1">
              <div
                className="flex flex-col gap-1 p-1 rounded"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 2px 0 rgba(0,0,0,0.3) inset",
                }}
              >
                {sortedSlots.map((loc) => (
                  <SlotCell key={loc.id} loc={loc} onHover={onHover} onClick={onClick} />
                ))}
              </div>
              <div
                className="text-[7px] font-bold leading-none select-none uppercase tracking-tighter"
                style={{ color: "rgba(148,163,184,0.7)" }}
              >
                {andarName.replace(/^Andar\s+/i, "A").replace(/^Picking\s+/i, "Pik")}
              </div>
            </div>
          );
        })}
      </div>

      {!isLeft && (
        <div
          className="relative text-center text-[9px] font-black uppercase tracking-widest py-3 px-1.5 rounded-r-lg text-white z-10 shrink-0 [writing-mode:vertical-lr] [text-orientation:mixed]"
          style={{
            background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 60%, #60a5fa 100%)",
            boxShadow: "2px 0 0 #1e3a8a inset",
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}
        >
          {predio}
        </div>
      )}
    </div>
  );
}

function RuaSection({
  rua,
  predios,
  onHover,
  onClick,
}: {
  rua: string;
  predios: Map<string, Map<string, Localizacao[]>>;
  onHover: (l: Localizacao | null, e?: React.MouseEvent) => void;
  onClick: (l: Localizacao) => void;
}) {
  const sortedPredios = [...predios.entries()].sort(([a], [b]) => {
    const numA = parseInt(a.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  const leftPredios = sortedPredios.filter(([name]) => {
    const num = parseInt(name.replace(/\D/g, "")) || 0;
    return num % 2 !== 0;
  });

  const rightPredios = sortedPredios.filter(([name]) => {
    const num = parseInt(name.replace(/\D/g, "")) || 0;
    return num % 2 === 0;
  });

  const maxRows = Math.max(leftPredios.length, rightPredios.length);

  const paddedLeft = [...leftPredios];
  const paddedRight = [...rightPredios];

  while (paddedLeft.length < maxRows) paddedLeft.unshift(null as any);
  while (paddedRight.length < maxRows) paddedRight.unshift(null as any);

  const rows = Array.from({ length: maxRows }, (_, i) => ({
    left: paddedLeft[i],
    right: paddedRight[i],
  })).reverse();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full text-white shadow-lg"
          style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)",
            boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
          }}
        >
          <span className="w-2 h-2 rounded-full bg-white/60" />
          {rua}
        </div>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.4) 0%, transparent 100%)" }} />
      </div>

      <div
        className="relative overflow-x-auto rounded-2xl"
        style={{
          background: "linear-gradient(180deg, #0a0f1e 0%, #0d1629 50%, #0a0f1e 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
          padding: "24px 20px",
        }}
      >
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(59,130,246,0.05) 0%, transparent 70%)",
          }}
        />

        <div className="relative grid grid-cols-[320px_56px_320px] gap-y-6 gap-x-6 items-center justify-center min-w-max">
          <div
            className="col-start-2 col-end-3 row-start-1 h-full rounded-xl flex flex-col items-center justify-center gap-4 relative overflow-hidden"
            style={{
              gridRow: `1 / span ${maxRows}`,
              background: "linear-gradient(180deg, rgba(251,191,36,0.08) 0%, rgba(251,191,36,0.04) 100%)",
              border: "1px dashed rgba(251,191,36,0.2)",
              minHeight: `${maxRows * 128}px`,
            }}
          >
            <div className="w-0.5 h-full rounded-full" style={{ background: "rgba(251,191,36,0.25)" }} />
            <span
              className="text-[6px] font-extrabold tracking-[0.2em] whitespace-nowrap absolute"
              style={{ color: "rgba(251,191,36,0.4)", writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              RUA CORREDOR
            </span>
          </div>

          {rows.map((row, index) => {
            const rowIndex = index + 1;
            return (
              <Fragment key={index}>
                <div className="flex justify-end" style={{ gridColumn: 1, gridRow: rowIndex }}>
                  {row.left ? (
                    <ShelfUnit predio={row.left[0]} andares={row.left[1]} isLeft={true} onHover={onHover} onClick={onClick} />
                  ) : (
                    <div className="w-1" />
                  )}
                </div>
                <div className="flex justify-start" style={{ gridColumn: 3, gridRow: rowIndex }}>
                  {row.right ? (
                    <ShelfUnit predio={row.right[0]} andares={row.right[1]} isLeft={false} onHover={onHover} onClick={onClick} />
                  ) : (
                    <div className="w-1" />
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function WarehouseMap({ refreshKey }: { refreshKey?: number }) {
  const [localizacoes, setLocalizacoes] = useState<Localizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [selectedLoc, setSelectedLoc] = useState<Localizacao | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/localizacoes", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLocalizacoes(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const grouped = useMemo(() => groupData(localizacoes), [localizacoes]);

  const totalSlots    = localizacoes.length;
  const occupiedSlots = localizacoes.filter((l) => (l._count?.materials ?? 0) > 0).length;
  const freeSlots     = totalSlots - occupiedSlots;
  const acaoAlerts    = localizacoes.filter((l) => l.acaoAcabando).length;
  const validadeAlerts = localizacoes.filter((l) => l.produtoVencendo).length;

  function handleHover(loc: Localizacao | null, e?: React.MouseEvent) {
    if (!loc || !e) { setTooltip(null); return; }
    setTooltip({ loc, x: e.clientX, y: e.clientY });
  }

  function handleClick(loc: Localizacao) {
    setTooltip(null);
    setSelectedLoc(loc);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Carregando mapa do estoque...</span>
      </div>
    );
  }

  if (localizacoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Building2 className="h-8 w-8 text-slate-500" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-slate-500">Nenhum endereço cadastrado</p>
          <p className="text-xs text-slate-400">
            Cadastre endereços na aba <strong>Endereços</strong> para visualizar o mapa 3D
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend / Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-blue-400 to-blue-600 shadow-sm shadow-blue-300" />
          <span className="text-xs font-semibold text-blue-700">
            {occupiedSlots} Ocupado{occupiedSlots !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
          <div className="w-3 h-3 rounded border-2 border-dashed border-slate-300" />
          <span className="text-xs font-semibold text-slate-600">
            {freeSlots} Livre{freeSlots !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
          <Package className="h-3 w-3 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">{totalSlots} posições no total</span>
        </div>

        {/* Alertas */}
        {acaoAlerts > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5">
            <div className="w-3 h-3 rounded bg-gradient-to-br from-orange-400 to-orange-600 animate-pulse" />
            <span className="text-xs font-semibold text-orange-700">
              {acaoAlerts} ação{acaoAlerts > 1 ? "ções" : ""} acabando
            </span>
          </div>
        )}
        {validadeAlerts > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5">
            <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-400 to-amber-600 animate-pulse" />
            <span className="text-xs font-semibold text-amber-700">
              {validadeAlerts} validade{validadeAlerts > 1 ? "s" : ""} crítica{validadeAlerts > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Barra global */}
        {totalSlots > 0 && (
          <div className="ml-auto flex items-center gap-2 min-w-[160px]">
            <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.round((occupiedSlots / totalSlots) * 100)}%`,
                  background: "linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)",
                }}
              />
            </div>
            <span className="text-xs font-bold text-slate-500 w-10 text-right">
              {Math.round((occupiedSlots / totalSlots) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Legenda de cores */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] font-medium">
        <span className="text-slate-400 uppercase tracking-wider">Legenda:</span>
        <span className="flex items-center gap-1.5 text-blue-600">
          <span className="w-3 h-3 rounded bg-gradient-to-br from-blue-400 to-blue-600" />Normal
        </span>
        <span className="flex items-center gap-1.5 text-orange-600">
          <span className="w-3 h-3 rounded bg-gradient-to-br from-orange-400 to-orange-600" />Ação acabando (&lt;15d)
        </span>
        <span className="flex items-center gap-1.5 text-amber-600">
          <span className="w-3 h-3 rounded bg-gradient-to-br from-amber-400 to-amber-600" />Validade crítica (&lt;60d)
        </span>
        <span className="flex items-center gap-1.5 text-red-600">
          <span className="w-3 h-3 rounded bg-gradient-to-br from-red-500 to-red-700" />Ambos críticos
        </span>
        <span className="text-slate-400 ml-2">· Clique no slot para detalhes</span>
      </div>

      {/* Ruas */}
      <div className="space-y-8">
        {[...grouped.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([rua, predios]) => (
            <RuaSection key={rua} rua={rua} predios={predios} onHover={handleHover} onClick={handleClick} />
          ))}
      </div>

      {/* Tooltip ao hover */}
      {tooltip && !selectedLoc && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 14, top: tooltip.y - 72 }}
        >
          <div
            className="rounded-xl px-3 py-2.5 text-xs space-y-1 min-w-[160px]"
            style={{
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              backdropFilter: "blur(8px)",
            }}
          >
            <p className="font-extrabold text-blue-300 text-[10px] uppercase tracking-wider">{tooltip.loc.rua}</p>
            <p className="text-slate-200 font-semibold">{tooltip.loc.predio}</p>
            <p className="text-slate-400">
              {tooltip.loc.andar} · Apto <strong className="text-slate-300">{tooltip.loc.apartamento}</strong>
            </p>
            {(tooltip.loc._count?.materials ?? 0) > 0 ? (
              <p className="flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 className="h-3 w-3" />
                {tooltip.loc._count!.materials} produto{tooltip.loc._count!.materials !== 1 ? "s" : ""}
              </p>
            ) : (
              <p className="flex items-center gap-1 text-slate-400">
                <Circle className="h-3 w-3" />
                Livre
              </p>
            )}
            {(tooltip.loc.acaoAcabando || tooltip.loc.produtoVencendo) && (
              <div className="pt-1 border-t border-white/10 space-y-0.5">
                {tooltip.loc.acaoAcabando && (
                  <p className="flex items-center gap-1 text-orange-400 font-semibold">
                    <Clock className="h-2.5 w-2.5" /> Ação acabando
                  </p>
                )}
                {tooltip.loc.produtoVencendo && (
                  <p className="flex items-center gap-1 text-amber-400 font-semibold">
                    <AlertTriangle className="h-2.5 w-2.5" /> Validade crítica
                  </p>
                )}
              </div>
            )}
            <p className="text-[9px] text-slate-500 pt-0.5">Clique para detalhes</p>
          </div>
        </div>
      )}

      {/* Modal de detalhes ao clicar */}
      {selectedLoc && (
        <SlotDetailModal loc={selectedLoc} onClose={() => setSelectedLoc(null)} />
      )}
    </div>
  );
}
