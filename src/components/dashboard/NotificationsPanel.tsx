"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, FileText, ChevronRight, X, CheckCircle2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  tipo?: "ASSINATURA" | "LIBERACAO";
  material: string;
  quantity?: number;
  operator?: string;
  fornecedor?: string;
  valor?: number;
  createdAt: string;
  movementId?: string;
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `há ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Fetch count on mount (to show badge before opening)
  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setTotal(data.total ?? 0);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch full list on open
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setNotifications(data.notifications ?? []);
          setTotal(data.total ?? 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <Button
        variant="ghost"
        size="icon"
        id="btn-notifications"
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100"
        aria-label="Abrir notificações"
      >
        <Bell className="h-4.5 w-4.5" style={{ width: "1.125rem", height: "1.125rem" }} />
      </Button>

      {/* Badge */}
      {total > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white pointer-events-none">
          {total > 99 ? "99+" : total}
        </span>
      )}

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60 overflow-hidden"
          style={{ animation: "notifSlideIn 0.18s ease" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-800">Notificações</span>
              {total > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                  {total}
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center">
                <div className="mx-auto h-5 w-5 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
                <p className="text-xs text-slate-400 mt-2">Carregando…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <p className="text-sm font-medium text-slate-700">Tudo em dia!</p>
                <p className="text-xs text-slate-400">Nenhuma saída pendente de assinatura.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {notifications.map((n) => {
                  const isLiberacao = n.tipo === "LIBERACAO";
                  return (
                  <li key={n.id} className="group">
                    <button
                      className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-3 ${isLiberacao ? "hover:bg-emerald-50" : "hover:bg-amber-50"}`}
                      onClick={() => {
                        setOpen(false);
                        router.push(isLiberacao ? "/metas" : "/saidas");
                      }}
                    >
                      <span className={`mt-0.5 flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center ${isLiberacao ? "bg-emerald-100" : "bg-amber-100"}`}>
                        {isLiberacao
                          ? <Gift className="h-3.5 w-3.5 text-emerald-600" />
                          : <FileText className="h-3.5 w-3.5 text-amber-600" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {n.material}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {isLiberacao
                            ? `${n.fornecedor} · ${brl(n.valor ?? 0)}`
                            : `${n.quantity} un · ${n.operator}`}
                        </p>
                        <p className={`text-[10px] font-medium mt-0.5 ${isLiberacao ? "text-emerald-600" : "text-amber-600"}`}>
                          {isLiberacao ? "🎁 Meta atingida — recompensa liberada" : "⏳ Aguardando assinatura"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
                        <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </div>
                    </button>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2.5">
              <button
                className="w-full text-center text-xs text-blue-600 font-medium hover:text-blue-700 hover:underline py-0.5"
                onClick={() => {
                  setOpen(false);
                  router.push("/saidas");
                }}
              >
                Ver todas as saídas pendentes →
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
