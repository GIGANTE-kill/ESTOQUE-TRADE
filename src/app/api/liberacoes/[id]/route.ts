export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/liberacoes/:id  — atualiza status, comprovante ou notas
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, comprovanteUrl, notes } = body;

    const liberacao = await prisma.liberacao.update({
      where: { id },
      data: {
        ...(status != null ? { status: status as any } : {}),
        ...(comprovanteUrl != null ? { comprovanteUrl: String(comprovanteUrl) } : {}),
        ...(notes != null ? { notes: String(notes) } : {}),
        ...(status === "ENTREGUE" ? { entregueEm: new Date() } : {}),
      },
    });

    return NextResponse.json(liberacao);
  } catch (error: any) {
    console.error("Liberacao update error:", error);
    return NextResponse.json({ error: error.message || "Falha ao atualizar liberação" }, { status: 500 });
  }
}
