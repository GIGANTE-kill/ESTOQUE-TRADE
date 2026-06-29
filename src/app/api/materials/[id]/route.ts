import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const body = await req.json();
    const {
      name, sku, categoryName, quantity, status,
      fornecedor, nomeAcao, periodoAcaoInicio, periodoAcaoFim,
      dataValidade, photoUrl, localizacaoId, produtoAlvo,
    } = body;

    // Resolve category by name if provided
    let categoryId: string | undefined;
    if (categoryName) {
      let cat = await prisma.category.findFirst({
        where: { name: { equals: categoryName, mode: "insensitive" } },
      });
      if (!cat) {
        cat = await prisma.category.create({
          data: { name: categoryName },
        });
      }
      categoryId = cat.id;
    }

    const qty = quantity !== undefined ? parseInt(quantity, 10) : undefined;
    const resolvedStatus = status || (qty === 0 ? "ESGOTADO" : "DISPONIVEL");

    const updated = await prisma.material.update({
      where: { id },
      data: {
        ...(name               !== undefined && { name }),
        ...(sku                !== undefined && { sku: sku || null }),
        ...(categoryId                       && { categoryId }),
        ...(qty                !== undefined && { quantity: qty }),
        ...(status             !== undefined && { status: resolvedStatus as any }),
        ...(fornecedor         !== undefined && { fornecedor: fornecedor || null }),
        ...(nomeAcao           !== undefined && { nomeAcao: nomeAcao || null }),
        ...(periodoAcaoInicio  !== undefined && { periodoAcaoInicio: periodoAcaoInicio ? new Date(periodoAcaoInicio) : null }),
        ...(periodoAcaoFim     !== undefined && { periodoAcaoFim: periodoAcaoFim ? new Date(periodoAcaoFim) : null }),
        ...(dataValidade       !== undefined && { dataValidade: dataValidade ? new Date(dataValidade) : null }),
        ...(photoUrl           !== undefined && { photoUrl: photoUrl || null }),
        ...(localizacaoId      !== undefined && { localizacaoId: localizacaoId || null }),
        ...(produtoAlvo        !== undefined && { produtoAlvo: Boolean(produtoAlvo) }),
      },
      include: { category: true, localizacao: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Material patch error:", error);
    return NextResponse.json({ error: error.message || "Falha ao atualizar material" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verifica se é admin
    const cookieStore = await cookies();
    const userId = cookieStore.get("session")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await params;

    // Exclui movimentos e documentos vinculados antes de excluir o material
    const movements = await prisma.movement.findMany({ where: { materialId: id }, select: { id: true } });
    const movementIds = movements.map((m) => m.id);

    if (movementIds.length > 0) {
      await prisma.document.deleteMany({ where: { movementId: { in: movementIds } } });
      await prisma.movement.deleteMany({ where: { materialId: id } });
    }

    await prisma.solicitacao.deleteMany({ where: { materialId: id } });
    await prisma.material.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Material delete error:", error);
    return NextResponse.json({ error: error.message || "Falha ao excluir material" }, { status: 500 });
  }
}
