export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const marcadores = await prisma.marcador.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(marcadores);
  } catch (error: any) {
    return NextResponse.json({ error: "Falha ao carregar marcadores." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, color } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }
    const marcador = await prisma.marcador.create({
      data: { name: name.trim(), color: color || "#6366f1" },
    });
    return NextResponse.json(marcador, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Já existe um marcador com esse nome." }, { status: 409 });
    }
    return NextResponse.json({ error: "Falha ao criar marcador." }, { status: 500 });
  }
}
