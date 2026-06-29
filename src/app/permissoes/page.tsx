"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  UserPlus, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, X,
  Tag, Shield, ShieldOff, Check, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMINISTRADOR" | "GESTOR" | "OPERADOR";
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  imageUrl: string | null;
}

const roleLabel: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  GESTOR: "Gestor",
  OPERADOR: "Operador",
};

const roleColor: Record<string, string> = {
  ADMINISTRADOR: "bg-red-50 text-red-700 border-red-100",
  GESTOR: "bg-blue-50 text-blue-700 border-blue-100",
  OPERADOR: "bg-slate-50 text-slate-600 border-slate-200",
};

// ─── Modal de Restrição de Categorias ──────────────────────────────────────
function CategoriasModal({
  user,
  isOpen,
  onClose,
}: {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !user) return;
    setSaved(false);
    setError("");
    setLoading(true);

    Promise.all([
      fetch("/api/categories", { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/users/${user.id}/categorias`, { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([cats, perms]) => {
        if (Array.isArray(cats)) setCategories(cats);
        if (perms?.categoryIds) {
          setSelected(new Set(perms.categoryIds as string[]));
        } else {
          setSelected(new Set());
        }
      })
      .catch(() => setError("Falha ao carregar dados."))
      .finally(() => setLoading(false));
  }, [isOpen, user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${user.id}/categorias`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar.");
      }
      setSaved(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleCategory(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(categories.map((c) => c.id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  if (!isOpen || !user) return null;

  const hasRestriction = selected.size > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-blue-600" />
              Restrição de Categorias
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Definindo acesso para <span className="font-semibold text-slate-700">{user.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Aviso sobre modelo */}
        <div className="px-6 py-3 bg-blue-50/60 border-b border-blue-100/60 shrink-0">
          <p className="text-xs text-blue-700 leading-relaxed">
            {hasRestriction ? (
              <>
                <span className="font-semibold">Restrição ativa:</span> este usuário verá apenas as{" "}
                <span className="font-semibold">{selected.size} categorias</span> selecionadas.
              </>
            ) : (
              <>
                <span className="font-semibold">Sem restrição:</span> este usuário vê todas as categorias. Marque categorias para restringir o acesso.
              </>
            )}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          ) : saved ? (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Permissões salvas!</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {selected.size === 0
                    ? "Sem restrições — o usuário verá todas as categorias."
                    : `O usuário verá apenas ${selected.size} categoria(s) selecionada(s).`}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Categorias ({categories.length})
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Selecionar tudo
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={clearAll}
                    className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                  >
                    Limpar tudo
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {categories.map((cat) => {
                  const isChecked = selected.has(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left",
                        isChecked
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-100 bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-white"
                      )}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-all",
                          isChecked
                            ? "border-blue-600 bg-blue-600"
                            : "border-slate-300 bg-white"
                        )}
                      >
                        {isChecked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-sm font-medium flex-1 truncate">{cat.name}</span>
                      {isChecked && (
                        <span className="text-[10px] font-semibold text-blue-500 shrink-0">PERMITIDA</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!saved && !loading && !error && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 gap-3">
            <div className="flex items-center gap-2">
              {hasRestriction ? (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                  <Lock className="h-3.5 w-3.5" />
                  {selected.size} de {categories.length} visíveis
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Shield className="h-3.5 w-3.5" />
                  Acesso total
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="h-9 px-4 rounded-xl text-xs border-slate-200"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="h-9 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
              >
                {saving ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...</>
                ) : (
                  <><CheckCircle2 className="h-3.5 w-3.5" /> Salvar</>
                )}
              </Button>
            </div>
          </div>
        )}
        {saved && (
          <div className="px-6 py-4 border-t border-slate-100 shrink-0">
            <Button
              onClick={onClose}
              className="w-full h-9 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              Fechar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal de Novo Usuário ───────────────────────────────────────────────────
function NovoUsuarioModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMINISTRADOR" | "GESTOR" | "OPERADOR">("OPERADOR");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function reset() {
    setName(""); setEmail(""); setPassword("");
    setRole("OPERADOR"); setError(""); setDone(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao criar usuário.");
      }
      setDone(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-600" />
              Novo Usuário
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Crie um acesso para o sistema</p>
          </div>
          <button
            onClick={() => { reset(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Usuário criado!</p>
                <p className="text-xs text-emerald-600 mt-1">
                  <strong>{name}</strong> pode acessar o sistema com o e-mail e senha cadastrados.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { reset(); }} variant="outline" className="flex-1 h-9 rounded-xl text-xs">
                Criar outro
              </Button>
              <Button onClick={() => { reset(); onClose(); }} className="flex-1 h-9 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white">
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Nome completo *</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="Ex: Ana Paula Silva"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">E-mail *</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="usuario@empresa.com.br"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Senha *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Perfil de acesso *</label>
              <select
                value={role} onChange={(e) => setRole(e.target.value as typeof role)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
              >
                <option value="OPERADOR">Operador — solicita saídas</option>
                <option value="GESTOR">Gestor — aprova solicitações</option>
                <option value="ADMINISTRADOR">Administrador — acesso total</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}
                disabled={submitting} className="h-9 px-4 rounded-xl text-xs border-slate-200">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}
                className="h-9 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5">
                {submitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Criando...</> : <><UserPlus className="h-3.5 w-3.5" /> Criar Usuário</>}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Card de Usuário ─────────────────────────────────────────────────────────
function UserCard({
  user,
  isAdmin,
  onConfigCategorias,
}: {
  user: User;
  isAdmin: boolean;
  onConfigCategorias: (u: User) => void;
}) {
  const initials = user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex items-center gap-4 group hover:shadow-md transition-shadow">
      <Avatar className="h-11 w-11 border-2 border-slate-100 shrink-0">
        <AvatarFallback className="bg-blue-600 text-white text-sm font-bold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
        <p className="text-xs text-slate-400 truncate">{user.email}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge className={cn("border text-[10px] font-semibold rounded-full", roleColor[user.role])}>
          {roleLabel[user.role]}
        </Badge>
        {isAdmin && user.role !== "ADMINISTRADOR" && (
          <button
            onClick={() => onConfigCategorias(user)}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
            title="Configurar categorias visíveis"
          >
            <Tag className="h-3 w-3" />
            Categorias
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PermissoesPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoriasUser, setCategoriasUser] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isAdmin = me?.role === "ADMINISTRADOR";

  useEffect(() => {
    setLoading(true);
    fetch("/api/users?full=1")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setUsers(data); })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const grouped = {
    ADMINISTRADOR: users.filter((u) => u.role === "ADMINISTRADOR"),
    GESTOR: users.filter((u) => u.role === "GESTOR"),
    OPERADOR: users.filter((u) => u.role === "OPERADOR"),
  };

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-sm px-6">
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">Permissões e Usuários</h1>
            <p className="text-xs text-slate-400 mt-0.5">Gerencie os acessos ao sistema</p>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="h-9 gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-200"
            >
              <UserPlus className="h-4 w-4" />
              Novo Usuário
            </Button>
          )}
        </header>

        <div className="flex-1 p-6 space-y-8">
          {!isAdmin && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-sm flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              Apenas administradores podem criar e gerenciar usuários.
            </div>
          )}

          {/* Info sobre restrição de categorias */}
          {isAdmin && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
              <Tag className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Restrição de Categorias</p>
                <p className="text-xs text-blue-700 mt-1">
                  Passe o mouse sobre um usuário (Gestor ou Operador) e clique em{" "}
                  <span className="font-semibold">Categorias</span> para definir quais categorias ele pode visualizar.
                  Sem restrição = vê tudo. Com categorias selecionadas = vê apenas as marcadas.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-white rounded-2xl border border-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            (["ADMINISTRADOR", "GESTOR", "OPERADOR"] as const).map((role) => (
              grouped[role].length > 0 && (
                <section key={role}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {roleLabel[role]}s — {grouped[role].length}
                    </p>
                    {role === "ADMINISTRADOR" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-500">
                        <Shield className="h-3 w-3" /> Acesso total
                      </span>
                    )}
                    {role === "GESTOR" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-500">
                        <ShieldOff className="h-3 w-3" /> Pode ter restrição de categorias
                      </span>
                    )}
                    {role === "OPERADOR" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        <Lock className="h-3 w-3" /> Pode ter restrição de categorias
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {grouped[role].map((u) => (
                      <UserCard
                        key={u.id}
                        user={u}
                        isAdmin={isAdmin}
                        onConfigCategorias={(u) => setCategoriasUser(u)}
                      />
                    ))}
                  </div>
                </section>
              )
            ))
          )}
        </div>
      </div>

      <NovoUsuarioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      <CategoriasModal
        user={categoriasUser}
        isOpen={!!categoriasUser}
        onClose={() => setCategoriasUser(null)}
      />
    </AppShell>
  );
}
