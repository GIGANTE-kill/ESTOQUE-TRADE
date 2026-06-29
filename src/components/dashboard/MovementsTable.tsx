"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search, SlidersHorizontal, ArrowDownRight, ArrowUpRight,
  ImagePlus, CheckCircle2, Loader2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/upload-helper";

// ── Upload inline de documento assinado por linha ───────────────

function DocUploadCell({
  documentId,
  documentStatus,
  signedDocUrl,
  onUploaded,
}: {
  documentId: string | null;
  documentStatus: string;
  signedDocUrl: string | null;
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(documentStatus === "Assinado");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !documentId) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, "docassinado");
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedDocUrl: url, status: "ASSINADO" }),
      });
      setSaved(true);
      onUploaded();
    } catch {
      // silently fail — user can retry
    } finally {
      setUploading(false);
    }
  }

  if (saved || signedDocUrl) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-semibold rounded-full border">
          Assinado
        </Badge>
      </div>
    );
  }

  if (!documentId) {
    return <span className="text-[10px] text-slate-400">—</span>;
  }

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 text-[10px] font-medium text-amber-600 hover:text-blue-600 transition-colors"
        title="Fazer upload do documento assinado"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImagePlus className="h-3.5 w-3.5" />
        )}
        {uploading ? "Salvando..." : "Pendente — upload"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
}

// ── Componente Principal ────────────────────────────────────────

export function MovementsTable({ type, refreshTrigger = 0 }: { type: "ENTRADA" | "SAIDA"; refreshTrigger?: number }) {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [internalRefresh, setInternalRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch("/api/movements")
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setMovements(data); })
      .catch((err) => console.error("Error loading movements:", err))
      .finally(() => setLoading(false));
  }, [refreshTrigger, internalRefresh]);

  const filteredMovements = movements
    .filter((m) => m.type === type)
    .filter((m) => {
      const term = searchTerm.toLowerCase();
      return (
        m.material.toLowerCase().includes(term) ||
        m.id.toLowerCase().includes(term) ||
        m.user.toLowerCase().includes(term)
      );
    });

  return (
    <Card className="border-0 rounded-2xl shadow-sm bg-white">
      <CardHeader className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">
              {type === "ENTRADA" ? "Histórico de Entradas" : "Histórico de Saídas"}
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {loading ? "Carregando..." : `${filteredMovements.length} registros encontrados`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-52 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-300 focus:bg-white transition-all"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs border-slate-200 text-slate-600 rounded-lg"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="pl-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Material</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Data</TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-widest text-slate-400">Qtd</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Usuário</TableHead>
                {type === "SAIDA" && (
                  <TableHead className="pr-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Documento Assinado
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i} className="border-slate-50">
                    <TableCell className="pl-5" colSpan={type === "SAIDA" ? 5 : 4}>
                      <div className="h-5 bg-slate-100 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={type === "SAIDA" ? 5 : 4} className="pl-5 py-10 text-center text-xs text-slate-400">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((mov) => (
                  <TableRow key={mov.id} className="border-slate-50 hover:bg-slate-50/80 transition-colors">
                    <TableCell className="pl-5">
                      <p className="text-sm font-medium text-slate-800">{mov.material}</p>
                      <p className="text-[10px] font-mono text-slate-400">{mov.id.substring(0, 8)}…</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-slate-600">{mov.date}</p>
                      <p className="text-[10px] text-slate-400">{mov.time}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-sm font-bold flex items-center justify-end gap-1",
                        type === "ENTRADA" ? "text-emerald-600" : "text-blue-600"
                      )}>
                        {type === "ENTRADA"
                          ? <ArrowDownRight className="h-3 w-3" />
                          : <ArrowUpRight className="h-3 w-3" />}
                        {mov.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{mov.user}</TableCell>
                    {type === "SAIDA" && (
                      <TableCell className="pr-5">
                        <DocUploadCell
                          documentId={mov.documentId ?? null}
                          documentStatus={mov.documentStatus}
                          signedDocUrl={mov.signedDocUrl ?? null}
                          onUploaded={() => setInternalRefresh((k) => k + 1)}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-50 px-5 py-3">
          <p className="text-xs text-slate-400">
            Mostrando {filteredMovements.length} itens
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
