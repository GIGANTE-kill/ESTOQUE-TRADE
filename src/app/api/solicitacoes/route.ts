/**
 * /api/solicitacoes
 *
 * GET  — Lista todas as solicitações (para admins: todas; para outros: apenas as próprias).
 *         Query param: ?status=PENDENTE|APROVADA|REJEITADA  (opcional)
 *
 * POST — Cria uma nova solicitação de saída.
 *         Body: { materialId, solicitanteId, quantity, justificativa, notes? }
 *
 * Regra de negócio:
 *   - Solicitações ficam em status PENDENTE até um ADMINISTRADOR aprovar ou rejeitar.
 *   - A aprovação efetiva a saída do estoque (cria Movement + Document).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "PENDENTE" | "APROVADA" | "REJEITADA" | null;

    const solicitacoes = await prisma.solicitacao.findMany({
      where: status ? { status } : undefined,
      include: {
        material: { select: { id: true, name: true, quantity: true, photoUrl: true, fornecedor: true, nomeAcao: true } },
        solicitante: { select: { id: true, name: true, role: true } },
        aprovador: { select: { id: true, name: true } },
        marcador: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = solicitacoes.map((s) => ({
      id: s.id,
      material: s.material.name,
      materialId: s.material.id,
      materialPhotoUrl: s.material.photoUrl,
      estoqueAtual: s.material.quantity,
      solicitante: s.solicitante.name,
      solicitanteId: s.solicitante.id,
      quantity: s.quantity,
      justificativa: s.justificativa,
      status: s.status,
      marcador: s.marcador ?? null,
      aprovador: s.aprovador?.name ?? null,
      aprovadoEm: s.aprovadoEm
        ? new Date(s.aprovadoEm).toLocaleString("pt-BR")
        : null,
      fornecedor: s.material.fornecedor ?? null,
      nomeAcao: s.material.nomeAcao ?? null,
      signedDocUrl: s.signedDocUrl,
      notes: s.notes,
      motivoRejeicao: s.motivoRejeicao ?? null,
      codCli: s.codCli ?? null,
      clienteNome: s.clienteNome ?? null,
      createdAt: new Date(s.createdAt).toLocaleString("pt-BR"),
      createdAtRaw: s.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Solicitacoes GET error:", error);
    return NextResponse.json({ error: "Falha ao carregar solicitações." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materialId, solicitanteId, quantity, justificativa, notes, marcadorId, codCli, clienteNome } = body;

    if (!materialId || !solicitanteId || !quantity || !justificativa || !marcadorId) {
      return NextResponse.json(
        { error: "materialId, solicitanteId, quantity, justificativa e marcadorId são obrigatórios." },
        { status: 400 }
      );
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      return NextResponse.json({ error: "Quantidade deve ser maior que zero." }, { status: 400 });
    }

    // Garante que o material existe
    const material = await prisma.material.findUnique({ where: { id: materialId } });
    if (!material) {
      return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });
    }

    // Bloqueia solicitação se o produto estiver bloqueado
    if (material.bloqueado) {
      return NextResponse.json(
        { error: "Este produto está bloqueado e não pode ser solicitado. Contate o administrador." },
        { status: 409 }
      );
    }

    // Garante que o solicitante existe
    const user = await prisma.user.findUnique({ where: { id: solicitanteId } });
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const nova = await prisma.solicitacao.create({
      data: {
        materialId,
        solicitanteId,
        quantity: qty,
        justificativa,
        marcadorId: marcadorId || null,
        notes: notes || null,
        codCli: codCli || null,
        clienteNome: clienteNome || null,
        status: "PENDENTE",
      },
      include: {
        material: { select: { name: true } },
        solicitante: { select: { name: true } },
      },
    });

    return NextResponse.json(nova, { status: 201 });
  } catch (error: any) {
    console.error("Solicitacoes POST error:", error);
    return NextResponse.json({ error: error.message || "Falha ao criar solicitação." }, { status: 500 });
  }
}
