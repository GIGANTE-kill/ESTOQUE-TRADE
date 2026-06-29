export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/metas/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nome, valorMinimo, recompensa, ativo } = body;

    const meta = await prisma.metaFornecedor.update({
      where: { id },
      data: {
        ...(nome != null ? { nome: String(nome) } : {}),
        ...(valorMinimo != null ? { valorMinimo: Number(valorMinimo) } : {}),
        ...(recompensa != null ? { recompensa: String(recompensa) } : {}),
        ...(ativo != null ? { ativo: Boolean(ativo) } : {}),
      },
    });

    return NextResponse.json(meta);
  } catch (error: any) {
    console.error("Meta update error:", error);
    return NextResponse.json({ error: error.message || "Falha ao atualizar meta" }, { status: 500 });
  }
}

// DELETE /api/metas/:id  (cascata apaga liberações da meta)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.metaFornecedor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Meta delete error:", error);
    return NextResponse.json({ error: error.message || "Falha ao excluir meta" }, { status: 500 });
  }
}
