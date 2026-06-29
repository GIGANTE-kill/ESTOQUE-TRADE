export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(SESSION_COOKIE)?.value;

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        categoryPermissions: { select: { categoryId: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
    }

    // categoryPermissions: null = sem restrição (vê tudo), array com IDs = só essas categorias
    const categoryPermissions =
      user.categoryPermissions.length > 0
        ? user.categoryPermissions.map((p) => p.categoryId)
        : null;

    return NextResponse.json({ ...user, categoryPermissions, categoryPermissions_raw: undefined });
  } catch (error: any) {
    console.error("Auth/me error:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
