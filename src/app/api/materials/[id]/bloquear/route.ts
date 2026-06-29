import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * PATCH /api/materials/[id]/bloquear
 * Alterna o campo `bloqueado` do material.
 * Requer role ADMINISTRADOR ou GESTOR.
 */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("session")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== "ADMINISTRADOR" && user.role !== "GESTOR")) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await params;

    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) {
      return NextResponse.json({ error: "Material não encontrado" }, { status: 404 });
    }

    const updated = await prisma.material.update({
      where: { id },
      data: { bloqueado: !material.bloqueado },
    });

    return NextResponse.json({ id: updated.id, bloqueado: updated.bloqueado });
  } catch (error: any) {
    console.error("Bloquear material error:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao alterar bloqueio do material" },
      { status: 500 }
    );
  }
}
