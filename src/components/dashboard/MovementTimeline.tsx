import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ArrowUpCircle, ArrowDownCircle, Activity } from "lucide-react";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "bg-blue-500", "bg-violet-500", "bg-emerald-500",
    "bg-amber-500", "bg-rose-500", "bg-teal-500",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export function MovementTimeline({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/movements")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMovements(data.slice(0, 5));
        }
      })
      .catch((err) => console.error("Error loading timeline:", err))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const list = movements.length > 0
    ? movements.map(m => ({
        id: m.id,
        materialName: m.material,
        type: m.type,
        quantity: m.quantity,
        timeAgo: `${m.date} ${m.time}`,
        docStatus: m.documentStatus === "Assinado" ? "ASSINADO" as const : "AGUARDANDO" as const,
        user: m.user
      }))
    : [];

  return (
    <Card className="border-0 rounded-2xl shadow-sm bg-white">
      <CardHeader className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Movimentações Recentes
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Últimas entradas e saídas</p>
          </div>
          <Badge className="bg-blue-50 text-blue-700 border-blue-100 border text-[10px] font-semibold rounded-full">
            {loading ? "Carregando..." : "Tempo Real"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        {list.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-slate-400">
            <Activity className="h-8 w-8 opacity-30" />
            <p className="text-xs">Nenhuma movimentação recente registrada</p>
          </div>
        ) : (
        <div className="relative">
          {/* Linha vertical da timeline */}
          <div className="absolute left-[18px] top-2 bottom-2 w-px bg-slate-100" />

          <div className="space-y-4">
            {list.map((mov, idx) => (
              <div key={mov.id} className="relative flex gap-3 animate-slide-up" style={{ animationDelay: `${idx * 60}ms` }}>
                {/* Ícone de tipo */}
                <div className={cn(
                  "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm",
                  mov.type === "ENTRADA" ? "bg-emerald-100" : "bg-blue-100"
                )}>
                  {mov.type === "ENTRADA" ? (
                    <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ArrowUpCircle className="h-4 w-4 text-blue-600" />
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {mov.materialName}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <span className={cn(
                          "font-semibold",
                          mov.type === "ENTRADA" ? "text-emerald-600" : "text-blue-600"
                        )}>
                          {mov.type === "ENTRADA" ? "+": "-"}{mov.quantity} un
                        </span>
                        · {mov.timeAgo}
                      </p>
                    </div>

                    {/* Badge de status do documento */}
                    <Badge
                      className={cn(
                        "shrink-0 border text-[10px] font-semibold rounded-full px-2 py-0.5",
                        mov.docStatus === "ASSINADO"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-amber-50 text-amber-700 border-amber-100"
                      )}
                    >
                      {mov.docStatus === "ASSINADO" ? "✓ Assinado" : "⏳ Aguardando"}
                    </Badge>
                  </div>

                  {/* Usuário */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className={cn("text-[8px] font-bold text-white", avatarColor(mov.user))}>
                        {getInitials(mov.user)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-slate-500">{mov.user}</span>
                    <span className="text-[10px] text-slate-300">·</span>
                    <span className="text-[10px] text-slate-400 font-mono">{mov.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Ver todos */}
        <button className="mt-4 w-full text-xs font-semibold text-blue-600 hover:text-blue-700 py-2 rounded-xl hover:bg-blue-50 transition-colors">
          Ver todas as movimentações →
        </button>
      </CardContent>
    </Card>
  );
}
