/**
 * PATCH /api/documents/[id]
 *
 * Atualiza um documento de saída.
 * Usado para marcar como assinado e/ou salvar o URL da foto do doc assinado.
 *
 * Body: { signedBy?: string, signedDocUrl?: string, status?: "ASSINADO" | "CANCELADO" }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { signedBy, signedDocUrl, status } = body;

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        status: status || "ASSINADO",
        signedBy: signedBy || doc.signedBy,
        signedDocUrl: signedDocUrl || doc.signedDocUrl,
        signedAt: (status === "ASSINADO" || !status) ? new Date() : doc.signedAt,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Document PATCH error:", error);
    return NextResponse.json({ error: error.message || "Falha ao atualizar documento." }, { status: 500 });
  }
}
