export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { materials: true } },
      },
    });
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("Categories load error:", error);
    return NextResponse.json({ error: "Falha ao carregar categorias" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, imageUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const existing = await prisma.category.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Já existe uma categoria com esse nome" }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: { name: name.trim(), imageUrl: imageUrl || null },
      include: { _count: { select: { materials: true } } },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error("Category create error:", error);
    return NextResponse.json({ error: error.message || "Falha ao criar categoria" }, { status: 500 });
  }
}
