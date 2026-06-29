export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      include: {
        movement: {
          include: {
            material: true,
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedDocs = documents.map((doc) => {
      const signedDate = doc.signedAt ? new Date(doc.signedAt).toLocaleDateString("pt-BR") : "-";
      return {
        id: doc.id,
        material: doc.movement.material.name,
        quantity: doc.movement.quantity,
        operator: doc.movement.user.name,
        date: new Date(doc.createdAt).toLocaleDateString("pt-BR"),
        status: doc.status,
        signedBy: doc.signedBy || "-",
        signedAt: signedDate,
      };
    });

    return NextResponse.json(formattedDocs);
  } catch (error: any) {
    console.error("Documents load error:", error);
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, signedBy, status } = body;

    if (!id) {
      return NextResponse.json({ error: "ID do documento é obrigatório" }, { status: 400 });
    }

    const doc = await prisma.document.findUnique({
      where: { id },
    });

    if (!doc) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    const updatedDoc = await prisma.document.update({
      where: { id },
      data: {
        status: status || "ASSINADO",
        signedBy: signedBy || "Carlos Administrador",
        signedAt: status === "ASSINADO" ? new Date() : null,
      },
    });

    return NextResponse.json(updatedDoc);
  } catch (error: any) {
    console.error("Document update error:", error);
    return NextResponse.json({ error: error.message || "Failed to update document" }, { status: 500 });
  }
}
