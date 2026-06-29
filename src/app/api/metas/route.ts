export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/metas?fornecedorId=123
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fornecedorId = searchParams.get("fornecedorId");

    const metas = await prisma.metaFornecedor.findMany({
      where: fornecedorId ? { fornecedorId: Number(fornecedorId) } : undefined,
      include: { _count: { select: { liberacoes: true } } },
      orderBy: [{ fornecedorNome: "asc" }, { valorMinimo: "asc" }],
    });

    return NextResponse.json({ metas });
  } catch (error: any) {
    console.error("Metas load error:", error);
    return NextResponse.json({ error: "Falha ao carregar metas" }, { status: 500 });
  }
}

// POST /api/metas
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fornecedorId, fornecedorNome, nome, valorMinimo, recompensa, ativo } = body;

    if (!fornecedorId || !fornecedorNome || !nome || valorMinimo == null || !recompensa) {
      return NextResponse.json(
        { error: "fornecedorId, fornecedorNome, nome, valorMinimo e recompensa são obrigatórios" },
        { status: 400 }
      );
    }

    const meta = await prisma.metaFornecedor.create({
      data: {
        fornecedorId: Number(fornecedorId),
        fornecedorNome: String(fornecedorNome),
        nome: String(nome),
        valorMinimo: Number(valorMinimo),
        recompensa: String(recompensa),
        ativo: ativo ?? true,
      },
    });

    return NextResponse.json(meta, { status: 201 });
  } catch (error: any) {
    console.error("Meta creation error:", error);
    return NextResponse.json({ error: error.message || "Falha ao criar meta" }, { status: 500 });
  }
}
