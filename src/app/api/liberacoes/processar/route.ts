export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { processarLiberacoes } from "@/lib/liberacao-engine";

// POST /api/liberacoes/processar
// Recalcula sell-out (Oracle) x metas e cria as liberações pendentes.
export async function POST() {
  try {
    const resultado = await processarLiberacoes();
    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error("Processar liberacoes error:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao processar liberações" },
      { status: 500 }
    );
  }
}
