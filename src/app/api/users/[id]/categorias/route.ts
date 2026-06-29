export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * GET /api/users/[id]/categorias
 * Retorna a lista de categoryIds permitidas para o usuário.
 * Array vazio = sem restrição (vê tudo).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionUserId = cookieStore.get("session")?.value;
    if (!sessionUserId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const sessionUser = await prisma.user.findUnique({ where: { id: sessionUserId } });
    if (!sessionUser || sessionUser.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await params;

    const perms = await prisma.userCategoryPermission.findMany({
      where: { userId: id },
      select: { categoryId: true },
    });

    return NextResponse.json({ categoryIds: perms.map((p) => p.categoryId) });
  } catch (error: any) {
    console.error("GET /api/users/[id]/categorias error:", error);
    return NextResponse.json({ error: "Falha ao carregar permissões." }, { status: 500 });
  }
}

/**
 * PUT /api/users/[id]/categorias
 * Substitui completamente a lista de categorias permitidas para o usuário.
 * Body: { categoryIds: string[] }
 * Array vazio = sem restrição (vê tudo).
 * Requer ADMINISTRADOR.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionUserId = cookieStore.get("session")?.value;
    if (!sessionUserId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const sessionUser = await prisma.user.findUnique({ where: { id: sessionUserId } });
    if (!sessionUser || sessionUser.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await params;
    const { categoryIds } = await req.json() as { categoryIds: string[] };

    // Deleta todas as permissões anteriores do usuário
    await prisma.userCategoryPermission.deleteMany({ where: { userId: id } });

    // Recria com as novas
    if (categoryIds && categoryIds.length > 0) {
      await prisma.userCategoryPermission.createMany({
        data: categoryIds.map((categoryId) => ({ userId: id, categoryId })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ ok: true, count: categoryIds?.length ?? 0 });
  } catch (error: any) {
    console.error("PUT /api/users/[id]/categorias error:", error);
    return NextResponse.json({ error: "Falha ao salvar permissões." }, { status: 500 });
  }
}
