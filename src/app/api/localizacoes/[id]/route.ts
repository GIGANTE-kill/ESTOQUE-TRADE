export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH — edita uma localização
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rua, predio, andar, apartamento } = body;

    if (!rua || !predio || !andar || !apartamento) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios: Rua, Prédio, Andar, Apartamento" },
        { status: 400 }
      );
    }

    const localizacao = await prisma.localizacao.update({
      where: { id },
      data: { rua, predio, andar, apartamento },
    });

    return NextResponse.json(localizacao);
  } catch (error: any) {
    console.error("Localizacao update error:", error);
    return NextResponse.json({ error: error.message || "Falha ao atualizar localização" }, { status: 500 });
  }
}

// DELETE — remove localização (somente se sem produtos vinculados)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verifica se há produtos vinculados
    const count = await prisma.material.count({ where: { localizacaoId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir: ${count} produto(s) vinculado(s) a este endereço.` },
        { status: 409 }
      );
    }

    await prisma.localizacao.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Localizacao delete error:", error);
    return NextResponse.json({ error: error.message || "Falha ao excluir localização" }, { status: 500 });
  }
}
