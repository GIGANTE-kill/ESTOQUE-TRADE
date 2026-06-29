export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const movements = await prisma.movement.findMany({
      include: {
        material: true,
        user: true,
        document: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedMovements = movements.map((m) => {
      const createdDateObj = new Date(m.createdAt);
      return {
        id: m.id,
        material: m.material.name,
        materialId: m.materialId,
        type: m.type,
        quantity: m.quantity,
        date: createdDateObj.toLocaleDateString("pt-BR"),
        time: createdDateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        user: m.user.name,
        documentId: m.document?.id ?? null,
        documentStatus: m.document ? (m.document.status === "ASSINADO" ? "Assinado" : "Pendente") : "-",
        signedDocUrl: m.document?.signedDocUrl ?? null,
        notes: m.notes || "",
      };
    });

    return NextResponse.json(formattedMovements);
  } catch (error: any) {
    console.error("Movements load error:", error);
    return NextResponse.json({ error: "Failed to load movements" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { materialId, type, quantity, notes, userId } = body;

    if (!materialId || !type || !quantity) {
      return NextResponse.json({ error: "Material, Tipo e Quantidade são obrigatórios" }, { status: 400 });
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      return NextResponse.json({ error: "Quantidade deve ser maior que zero" }, { status: 400 });
    }

    // 1. Fetch default user if not provided
    let finalUserId = userId;
    if (!finalUserId) {
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) {
        return NextResponse.json({ error: "Nenhum usuário cadastrado no banco" }, { status: 400 });
      }
      finalUserId = defaultUser.id;
    }

    // 2. Fetch the material
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return NextResponse.json({ error: "Material não encontrado" }, { status: 404 });
    }

    // 3. Process quantities
    let newQuantity = material.quantity;
    if (type === "ENTRADA") {
      newQuantity += qty;
    } else if (type === "SAIDA") {
      if (material.quantity < qty) {
        return NextResponse.json({ error: "Quantidade insuficiente em estoque" }, { status: 400 });
      }
      newQuantity -= qty;
    } else {
      return NextResponse.json({ error: "Tipo de movimentação inválido" }, { status: 400 });
    }

    // Determine new status
    let status: "DISPONIVEL" | "ESGOTADO" | "RESERVADO" = "DISPONIVEL";
    if (newQuantity === 0) {
      status = "ESGOTADO";
    }

    // 4. Perform transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update Material stock
      await tx.material.update({
        where: { id: materialId },
        data: {
          quantity: newQuantity,
          status,
        },
      });

      // Create Movement record
      const movement = await tx.movement.create({
        data: {
          type,
          quantity: qty,
          materialId,
          userId: finalUserId,
          notes: notes || null,
        },
      });

      // If exit (SAIDA), automatically create a pending Document
      let documentId: string | null = null;
      if (type === "SAIDA") {
        const doc = await tx.document.create({
          data: {
            movementId: movement.id,
            status: "AGUARDANDO",
          },
        });
        documentId = doc.id;
      }

      return { ...movement, documentId };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Movement creation error:", error);
    return NextResponse.json({ error: error.message || "Failed to create movement" }, { status: 500 });
  }
}
