import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, imageUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const conflict = await prisma.category.findFirst({
      where: { name: name.trim(), NOT: { id } },
    });
    if (conflict) {
      return NextResponse.json({ error: "Já existe uma categoria com esse nome" }, { status: 409 });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { name: name.trim(), imageUrl: imageUrl ?? undefined },
      include: { _count: { select: { materials: true } } },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Category update error:", error);
    return NextResponse.json({ error: error.message || "Falha ao atualizar categoria" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const count = await prisma.material.count({ where: { categoryId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir: ${count} material(is) vinculado(s) a esta categoria.` },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Category delete error:", error);
    return NextResponse.json({ error: error.message || "Falha ao excluir categoria" }, { status: 500 });
  }
}
