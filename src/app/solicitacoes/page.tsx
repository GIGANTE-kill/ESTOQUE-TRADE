"use client";

import { useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SolicitacaoModal } from "@/components/dashboard/SolicitacaoModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, XCircle, FileText, Clock,
  Loader2, ImagePlus, RefreshCw, Trash2, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/upload-helper";
import { useAuth } from "@/lib/AuthContext";
import Image from "next/image";
import { Lightbox } from "@/components/ui/Lightbox";
import { toast } from "sonner";

interface MarcadorObj {
  id: string;
  name: string;
  color: string;
}

interface Solicitacao {
  id: string;
  material: string;
  materialId: string;
  materialPhotoUrl: string | null;
  estoqueAtual: number;
  solicitante: string;
  solicitanteId: string;
  quantity: number;
  justificativa: string;
  status: "PENDENTE" | "APROVADA" | "REJEITADA";
  marcador: MarcadorObj | null;
  aprovador: string | null;
  aprovadoEm: string | null;
  motivoRejeicao: string | null;
  codCli: string | null;
  clienteNome: string | null;
  signedDocUrl: string | null;
  notes: string | null;
  createdAt: string;
  createdAtRaw: string;
}

function MarcadorBadge({ marcador }: { marcador: MarcadorObj | null }) {
  if (!marcador) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{
        backgroundColor: marcador.color + "18",
        color: marcador.color,
        borderColor: marcador.color + "33",
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: marcador.color }} />
      {marcador.name}
    </span>
  );
}

function StatusBadge({ status }: { status: Solicitacao["status"] }) {
  const map = {
    PENDENTE: { label: "Pendente", className: "bg-amber-50 text-amber-700 border-amber-100" },
    APROVADA: { label: "Aprovada", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    REJEITADA: { label: "Rejeitada", className: "bg-red-50 text-red-600 border-red-100" },
  };
  const { label, className } = map[status];
  return (
    <Badge className={cn("border text-[10px] font-semibold uppercase tracking-wide rounded-full", className)}>
      {label}
    </Badge>
  );
}

function StatsPanel({ solicitacoes }: { solicitacoes: Solicitacao[] }) {
  const approved = solicitacoes.filter((s) => s.status === "APROVADA");
  if (approved.length === 0) return null;

  const byMarcador: Record<string, { marcador: MarcadorObj; qty: number; units: number }> = {};
  for (const s of approved) {
    if (!s.marcador) continue;
    const key = s.marcador.id;
    if (!byMarcador[key]) byMarcador[key] = { marcador: s.marcador, qty: 0, units: 0 };
    byMarcador[key].qty++;
    byMarcador[key].units += s.quantity;
  }

  const items = Object.values(byMarcador).sort((a, b) => b.qty - a.qty);
  if (items.length === 0) return null;
  const total = approved.length;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-4">
      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Motivos de Saída Aprovadas</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map(({ marcador, qty, units }) => {
          const pct = Math.round((qty / total) * 100);
          return (
            <div key={marcador.id} className="space-y-2">
              <MarcadorBadge marcador={marcador} />
              <div>
                <span className="text-2xl font-bold text-slate-900">{qty}</span>
                <span className="text-xs text-slate-400 ml-1">sol.</span>
              </div>
              <div className="text-[10px] text-slate-400">{units} unid. · {pct}%</div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: marcador.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SolicitacaoCard({
  sol,
  onRefresh,
  currentUserId,
  currentUserRole,
}: {
  sol: Solicitacao;
  onRefresh: () => void;
  currentUserId: string;
  currentUserRole: string;
}) {
  const [loadingAction, setLoadingAction] = useState<"APROVAR" | "REJEITAR" | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [pendingDocUrl, setPendingDocUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoLightboxOpen, setPhotoLightboxOpen] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUploadPendingDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const url = await uploadFile(file, "docassinado");
      setPendingDocUrl(url);
      toast.success("Documento carregado com sucesso.");
    } catch (err: any) {
      toast.error(err.message || "Falha ao fazer upload do documento.");
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleAction(action: "APROVAR" | "REJEITAR") {
    if (action === "APROVAR" && !pendingDocUrl) {
      toast.warning("Insira o documento assinado antes de aprovar.");
      return;
    }
    if (action === "REJEITAR" && !showRejectForm) {
      setShowRejectForm(true);
      return;
    }
    setLoadingAction(action);
    try {
      const res = await fetch(`/api/solicitacoes/${sol.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          aprovadorId: currentUserId,
          signedDocUrl: action === "APROVAR" ? pendingDocUrl : undefined,
          motivoRejeicao: action === "REJEITAR" ? motivoRejeicao.trim() || null : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Erro ao ${action.toLowerCase()} solicitação.`);
      }
      toast.success(action === "APROVAR" ? "Solicitação aprovada!" : "Solicitação rejeitada.");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingAction(null);
      setShowRejectForm(false);
    }
  }

  function handleDelete() {
    const wasApproved = sol.status === "APROVADA";
    toast(`Cancelar esta solicitação${wasApproved ? " e estornar o estoque" : ""}?`, {
      action: {
        label: "Confirmar",
        onClick: async () => {
          setDeleting(true);
          try {
            const res = await fetch(`/api/solicitacoes/${sol.id}`, { method: "DELETE" });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "Erro ao excluir solicitação.");
            }
            toast.success(
              wasApproved ? "Solicitação cancelada e estoque estornado." : "Solicitação excluída."
            );
            onRefresh();
          } catch (err: any) {
            toast.error(err.message);
          } finally {
            setDeleting(false);
          }
        },
      },
      cancel: { label: "Não", onClick: () => {} },
    });
  }

  function handleGerarPDF() {
    const html = `
      <html><head><title>Termo de Saída</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .sub { font-size: 12px; color: #666; margin-bottom: 32px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
        td, th { border: 1px solid #ddd; padding: 8px 12px; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; text-align: left; }
        .linha { border-top: 1px solid #333; width: 260px; margin-top: 56px; padding-top: 6px; font-size: 12px; }
      </style></head><body>
      <h1>TERMO DE RESPONSABILIDADE DE SAÍDA</h1>
      <div class="sub">CD São Roque / Promotoria — Ação Trade Estoque</div>
      <table>
        <tr><th>Campo</th><th>Valor</th></tr>
        <tr><td>Material</td><td>${sol.material}</td></tr>
        <tr><td>Quantidade</td><td>${sol.quantity} un.</td></tr>
        <tr><td>Solicitante</td><td>${sol.solicitante}</td></tr>
        <tr><td>Justificativa</td><td>${sol.justificativa}</td></tr>
        <tr><td>Data da Solicitação</td><td>${sol.createdAt}</td></tr>
        <tr><td>Nº Solicitação</td><td>${sol.id}</td></tr>
      </table>
      <p style="font-size:13px">
        Declaro que recebi os materiais acima listados e me responsabilizo pela guarda,
        uso adequado e devolução ou comprovação de utilização conforme as normas da empresa.
      </p>
      <div class="linha">${sol.solicitante}</div>
      <div class="linha">Assinatura</div>
      </body></html>
    `;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={() => sol.materialPhotoUrl && setPhotoLightboxOpen(true)}
            className={cn("h-12 w-12 shrink-0 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center", sol.materialPhotoUrl && "cursor-pointer hover:opacity-80 transition-opacity")}
          >
            {sol.materialPhotoUrl ? (
              <Image src={sol.materialPhotoUrl} alt={sol.material} width={48} height={48} className="object-cover w-full h-full" />
            ) : (
              <span className="text-[10px] text-slate-400 font-medium text-center px-1 leading-tight">
                {sol.material.substring(0, 3).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{sol.material}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Solicitado por <span className="font-medium text-slate-600">{sol.solicitante}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={sol.status} />
          {currentUserRole === "ADMINISTRADOR" && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Cancelar solicitação"
              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Detalhes */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Qtd. Solicitada</p>
          <p className="text-base font-bold text-slate-900">{sol.quantity} <span className="text-xs font-normal text-slate-400">un.</span></p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Estoque Atual</p>
          <p className={cn("text-base font-bold", sol.estoqueAtual < sol.quantity ? "text-red-500" : "text-slate-900")}>
            {sol.estoqueAtual} <span className="text-xs font-normal text-slate-400">un.</span>
          </p>
        </div>
      </div>

      {/* Marcador */}
      {sol.marcador && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Motivo:</span>
          <MarcadorBadge marcador={sol.marcador} />
        </div>
      )}

      {/* Justificativa */}
      <div className="bg-slate-50 rounded-xl p-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Justificativa</p>
        <p className="text-xs text-slate-700 leading-relaxed">{sol.justificativa}</p>
      </div>

      {/* Timestamp */}
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <Clock className="h-3 w-3" />
        <span>Solicitado em {sol.createdAt}</span>
        {sol.aprovadoEm && (
          <><span>·</span><span>Processado em {sol.aprovadoEm}</span></>
        )}
      </div>

      {/* ── PENDENTE: upload do doc + ações ── */}
      {sol.status === "PENDENTE" && (
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
              Documento Assinado <span className="text-red-400">*</span>
            </p>
            {pendingDocUrl ? (
              <div className="relative h-24 rounded-xl overflow-hidden border border-blue-100 bg-blue-50">
                <Image src={pendingDocUrl} alt="Documento" fill className="object-cover cursor-pointer hover:opacity-90" onClick={() => setLightboxOpen(true)} />
                <button
                  type="button"
                  onClick={() => setPendingDocUrl(null)}
                  className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-slate-500 hover:text-red-500 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                </button>
                <div className="absolute bottom-1 right-1 bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Pronto
                </div>
              </div>
            ) : (
              <>
                <label
                  htmlFor={`doc-pending-${sol.id}`}
                  className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all gap-2 text-slate-400 hover:text-blue-500"
                >
                  {uploadingDoc ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /><span className="text-xs">Carregando...</span></>
                  ) : (
                    <><ImagePlus className="h-4 w-4" /><span className="text-xs">Inserir foto do documento assinado</span></>
                  )}
                </label>
                <input
                  id={`doc-pending-${sol.id}`}
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadPendingDoc}
                  disabled={uploadingDoc}
                />
              </>
            )}
          </div>

          {/* Formulário de motivo de rejeição */}
          {showRejectForm && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-red-500 font-semibold">Motivo da Rejeição</p>
              <textarea
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                placeholder="Descreva o motivo para o solicitante..."
                rows={3}
                className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                autoFocus
              />
              <p className="text-[10px] text-red-400">O motivo ficará visível para o solicitante.</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              onClick={handleGerarPDF}
              variant="outline"
              size="sm"
              className="flex-1 h-8 rounded-xl text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              Gerar Termo
            </Button>
            <Button
              onClick={() => handleAction("REJEITAR")}
              disabled={!!loadingAction}
              variant="outline"
              size="sm"
              className="h-8 rounded-xl text-xs border-red-100 text-red-600 hover:bg-red-50 gap-1.5"
            >
              {loadingAction === "REJEITAR" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Rejeitar
            </Button>
            <Button
              onClick={() => handleAction("APROVAR")}
              disabled={!!loadingAction || sol.estoqueAtual < sol.quantity || !pendingDocUrl}
              size="sm"
              title={!pendingDocUrl ? "Insira o documento assinado para aprovar" : undefined}
              className={cn(
                "h-8 rounded-xl text-xs text-white gap-1.5 shadow-sm",
                pendingDocUrl
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                  : "bg-slate-300 cursor-not-allowed"
              )}
            >
              {loadingAction === "APROVAR" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Aprovar
            </Button>
          </div>
        </div>
      )}

      {/* ── APROVADA: exibe documento (congelado) ── */}
      {sol.status === "APROVADA" && (
        <div className="pt-1 border-t border-slate-100 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Documento Assinado
          </p>
          {sol.signedDocUrl ? (
            <div
              onClick={() => setLightboxOpen(true)}
              className="relative rounded-xl overflow-hidden border border-emerald-100 bg-emerald-50 cursor-pointer hover:opacity-90 transition-opacity"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sol.signedDocUrl} alt="Doc assinado" className="w-full max-h-64 object-contain" />
              <div className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Assinado
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic">Documento não anexado.</p>
          )}
          <p className="text-[10px] text-slate-400 italic">
            Registro congelado — aprovado por {sol.aprovador ?? "Administrador"}.
          </p>
        </div>
      )}

      {/* ── REJEITADA ── */}
      {sol.status === "REJEITADA" && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-red-600 text-xs">
            <XCircle className="h-4 w-4 shrink-0" />
            Rejeitada por <strong className="ml-0.5">{sol.aprovador ?? "Administrador"}</strong>
          </div>
          {sol.motivoRejeicao && (
            <p className="text-xs text-red-700 bg-red-100 rounded-lg px-3 py-2 leading-relaxed">
              <span className="font-semibold">Motivo: </span>{sol.motivoRejeicao}
            </p>
          )}
        </div>
      )}

      <Lightbox
        isOpen={lightboxOpen}
        imageUrl={sol.status === "APROVADA" ? sol.signedDocUrl : pendingDocUrl}
        onClose={() => setLightboxOpen(false)}
      />
      <Lightbox
        isOpen={photoLightboxOpen}
        imageUrl={sol.materialPhotoUrl}
        onClose={() => setPhotoLightboxOpen(false)}
      />
    </div>
  );
}

export default function SolicitacoesPage() {
  const { user } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"TODAS" | "PENDENTE" | "APROVADA" | "REJEITADA">("TODAS");
  const [refreshKey, setRefreshKey] = useState(0);

  // Pré-preenchimento via query params (vindo de Inteligência de Ações)
  // Lido no cliente via useEffect para evitar problemas de hidratação.
  const [novaModalOpen, setNovaModalOpen] = useState(false);
  const [prefilledMaterialId, setPrefilledMaterialId] = useState<string | undefined>();
  const [prefilledClienteNome, setPrefilledClienteNome] = useState<string | undefined>();
  const [prefilledCodCli, setPrefilledCodCli] = useState<string | undefined>();
  const [prefilledJustificativa, setPrefilledJustificativa] = useState<string | undefined>();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const mid = params.get("materialId") ?? undefined;
    if (mid) {
      setPrefilledMaterialId(mid);
      setPrefilledClienteNome(params.get("clienteNome") ?? undefined);
      setPrefilledCodCli(params.get("codCli") ?? undefined);
      setPrefilledJustificativa(params.get("justificativa") ?? undefined);
      setNovaModalOpen(true);
    }
  }, []);

  const preselectedMaterial = prefilledMaterialId
    ? { id: prefilledMaterialId, name: prefilledClienteNome ?? "", quantity: 0 }
    : undefined;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = filter === "TODAS" ? "/api/solicitacoes" : `/api/solicitacoes?status=${filter}`;
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { if (!cancelled && Array.isArray(data)) setSolicitacoes(data); })
      .catch(() => { if (!cancelled) setSolicitacoes([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, refreshKey]);

  const pendingCount = solicitacoes.filter((s) => s.status === "PENDENTE").length;

  const tabs: { key: typeof filter; label: string }[] = [
    { key: "TODAS", label: "Todas" },
    { key: "PENDENTE", label: "Pendentes" },
    { key: "APROVADA", label: "Aprovadas" },
    { key: "REJEITADA", label: "Rejeitadas" },
  ];

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-sm px-6">
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">
              Solicitações de Saída
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Gerencie e aprove as solicitações de retirada de materiais
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setNovaModalOpen(true)}
              className="h-9 gap-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Nova Solicitação
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="h-9 gap-2 text-sm border-slate-200 text-slate-600 rounded-xl hover:border-slate-300"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </header>

        <div className="flex-1 p-6 space-y-5">
          {(filter === "TODAS" || filter === "APROVADA") && (
            <StatsPanel solicitacoes={solicitacoes} />
          )}

          <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1 shadow-sm w-fit">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                  filter === key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                )}
              >
                {label}
                {key === "PENDENTE" && pendingCount > 0 && (
                  <span className="ml-1.5 bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-white rounded-2xl border border-slate-100 animate-pulse" />
              ))}
            </div>
          ) : solicitacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-slate-400">
              <CheckCircle2 className="h-10 w-10 mb-3 text-slate-200" />
              <p className="text-sm font-medium">Nenhuma solicitação encontrada</p>
              <p className="text-xs mt-1">
                {filter === "PENDENTE" ? "Sem solicitações aguardando aprovação." : "Sem registros para este filtro."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {solicitacoes.map((sol) => (
                <SolicitacaoCard
                  key={sol.id}
                  sol={sol}
                  onRefresh={() => setRefreshKey((k) => k + 1)}
                  currentUserId={user?.id ?? ""}
                  currentUserRole={user?.role ?? ""}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <SolicitacaoModal
        isOpen={novaModalOpen}
        onClose={() => setNovaModalOpen(false)}
        preselectedMaterial={preselectedMaterial}
        prefilledJustificativa={prefilledJustificativa}
        prefilledCodCli={prefilledCodCli}
        prefilledClienteNome={prefilledClienteNome}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </AppShell>
  );
}
