"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ArrowUpCircle,
  Shield,
  BarChart3,
  ChevronRight,
  ClipboardList,
  LogOut,
  Tag,
  MapPin,
  Trophy,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    fetch("/api/solicitacoes?status=PENDENTE")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPendingCount(data.length); })
      .catch(() => { });
  }, [pathname]);

  const navGroups = [
    {
      label: "Principal",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null },
      ],
    },
    {
      label: "Operacional",
      items: [
        { href: "/estoque", label: "Estoque", icon: Package, badge: null },
        {
          href: "/solicitacoes",
          label: "Solicitações",
          icon: ClipboardList,
          badge: pendingCount > 0 ? String(pendingCount) : null,
        },
      ],
    },
    ...(user?.role !== "OPERADOR"
      ? [{
        label: "Gestão",
        items: [
          { href: "/permissoes", label: "Permissões", icon: Shield, badge: null },
          { href: "/relatorios", label: "Relatórios", icon: BarChart3, badge: null },
          { href: "/metas", label: "Metas & Ações", icon: Trophy, badge: null },
          { href: "/saidas", label: "Histórico de Saídas", icon: ArrowUpCircle, badge: null },
          { href: "/gestao", label: "Endereço", icon: MapPin, badge: null },
          ...(user?.role === "ADMINISTRADOR"
            ? [{ href: "/categorias", label: "Categorias", icon: Tag, badge: null }]
            : []),
        ],
      }]
      : []),
  ];

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?";

  const roleLabel: Record<string, string> = {
    ADMINISTRADOR: "Administrador",
    GESTOR: "Gestor",
    OPERADOR: "Operador",
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-slate-100 shadow-sm">
      {/* ── Logo ── */}
      <div className="flex h-16 items-center gap-2.5 px-6 border-b border-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-200">
          <Package className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold text-slate-900 tracking-tight">AÇÃO TRADE</span>
          <span className="text-xs font-semibold text-blue-600 tracking-widest uppercase">Estoque</span>
        </div>
      </div>

      {/* ── Navegação ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <Icon
                        className={cn(
                          "shrink-0 transition-colors",
                          isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"
                        )}
                        style={{ width: "1.125rem", height: "1.125rem" }}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge className="h-5 min-w-[1.25rem] bg-red-100 text-red-600 border-0 text-[10px] font-bold px-1.5 rounded-full">
                          {item.badge}
                        </Badge>
                      )}
                      {isActive && (
                        <ChevronRight className="h-3.5 w-3.5 text-blue-400 opacity-70" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Perfil do usuário ── */}
      <div className="border-t border-slate-100 p-3 space-y-1">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
          <Avatar className="h-9 w-9 border-2 border-blue-100">
            <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {user?.name ?? "Carregando..."}
            </p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
              {user ? (roleLabel[user.role] ?? user.role) : ""}
            </p>
          </div>
          <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0 ring-2 ring-white" />
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
