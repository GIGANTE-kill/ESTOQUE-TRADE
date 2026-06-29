export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/liberacoes?fornecedorId=&status=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fornecedorId = searchParams.get("fornecedorId");
    const status = searchParams.get("status");

    const liberacoes = await prisma.liberacao.findMany({
      where: {
        ...(fornecedorId ? { fornecedorId: Number(fornecedorId) } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: { meta: { select: { nome: true, recompensa: true, valorMinimo: true } } },
      orderBy: { liberadoEm: "desc" },
    });

    return NextResponse.json({ liberacoes, total: liberacoes.length });
  } catch (error: any) {
    console.error("Liberacoes load error:", error);
    return NextResponse.json({ error: "Falha ao carregar liberações" }, { status: 500 });
  }
}
