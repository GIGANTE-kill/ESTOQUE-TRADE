export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST — cria múltiplas localizações de uma vez
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { localizacoes } = body as {
      localizacoes: { rua: string; predio: string; andar: string; apartamento: string }[];
    };

    if (!Array.isArray(localizacoes) || localizacoes.length === 0) {
      return NextResponse.json({ error: "Envie um array de localizações" }, { status: 400 });
    }

    // Valida cada item
    for (const loc of localizacoes) {
      if (!loc.rua || !loc.predio || !loc.andar || !loc.apartamento) {
        return NextResponse.json(
          { error: "Todos os campos são obrigatórios em cada localização" },
          { status: 400 }
        );
      }
    }

    const created = await prisma.localizacao.createMany({
      data: localizacoes,
      skipDuplicates: true,
    });

    return NextResponse.json({ created: created.count }, { status: 201 });
  } catch (error: any) {
    console.error("Batch create error:", error);
    return NextResponse.json({ error: error.message || "Falha ao criar localizações em lote" }, { status: 500 });
  }
}
