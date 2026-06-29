export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const full = request.nextUrl.searchParams.get("full") === "1";
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: full,
        role: true,
        createdAt: full,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: "Falha ao carregar usuários." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }

    const { hash, salt } = hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        role: role ?? "OPERADOR",
        passwordHash: hash,
        passwordSalt: salt,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    console.error("Users POST error:", error);
    return NextResponse.json({ error: error.message || "Falha ao criar usuário." }, { status: 500 });
  }
}
