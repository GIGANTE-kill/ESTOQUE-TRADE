/**
 * /api/solicitacoes/[id]
 *
 * PATCH — Aprova ou rejeita uma solicitação.
 *   Body: {
 *     action: "APROVAR" | "REJEITAR",
 *     aprovadorId: string,
 *     signedDocUrl?: string,  // URL da foto do doc assinado (apenas ao aprovar)
 *     notes?: string,
 *   }
 *
 * Regra de negócio ao APROVAR:
 *   1. Verifica se há estoque suficiente.
 *   2. Cria Movement do tipo SAIDA em transação.
 *   3. Atualiza quantity do Material.
 *   4. Cria Document AGUARDANDO vinculado ao Movement.
 *   5. Atualiza Solicitacao para APROVADA com movementId.
 *
 * Somente usuários com role ADMINISTRADOR ou GESTOR podem aprovar/rejeitar.
 * (A validação de role é feita aqui até implementarmos autenticação completa.)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, aprovadorId, signedDocUrl, notes, motivoRejeicao } = body;

    if (!action || !aprovadorId) {
      return NextResponse.json(
        { error: "action e aprovadorId são obrigatórios." },
        { status: 400 }
      );
    }

    if (action !== "APROVAR" && action !== "REJEITAR") {
      return NextResponse.json({ error: "action deve ser APROVAR ou REJEITAR." }, { status: 400 });
    }

    // Busca o aprovador e valida role
    const aprovador = await prisma.user.findUnique({ where: { id: aprovadorId } });
    if (!aprovador) {
      return NextResponse.json({ error: "Aprovador não encontrado." }, { status: 404 });
    }
    if (aprovador.role !== "ADMINISTRADOR" && aprovador.role !== "GESTOR") {
      return NextResponse.json(
        { error: "Apenas ADMINISTRADOR ou GESTOR podem aprovar solicitações." },
        { status: 403 }
      );
    }

    // Busca a solicitação
    const solicitacao = await prisma.solicitacao.findUnique({
      where: { id },
      include: { material: true },
    });

    if (!solicitacao) {
      return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
    }

    if (solicitacao.status !== "PENDENTE") {
      return NextResponse.json(
        { error: `Solicitação já foi ${solicitacao.status.toLowerCase()}.` },
        { status: 409 }
      );
    }

    if (action === "REJEITAR") {
      const updated = await prisma.solicitacao.update({
        where: { id },
        data: {
          status: "REJEITADA",
          aprovadorId,
          aprovadoEm: new Date(),
          notes: notes || solicitacao.notes,
          motivoRejeicao: motivoRejeicao || null,
        },
      });
      return NextResponse.json(updated);
    }

    // ── APROVAR ──────────────────────────────────────────────
    if (solicitacao.material.quantity < solicitacao.quantity) {
      return NextResponse.json(
        { error: "Estoque insuficiente para aprovar esta solicitação." },
        { status: 400 }
      );
    }

    const novaQuantidade = solicitacao.material.quantity - solicitacao.quantity;
    const novoStatus = novaQuantidade === 0 ? "ESGOTADO" : "DISPONIVEL";

    const result = await prisma.$transaction(async (tx) => {
      // 1. Atualiza estoque
      await tx.material.update({
        where: { id: solicitacao.materialId },
        data: { quantity: novaQuantidade, status: novoStatus },
      });

      // 2. Cria Movement SAIDA
      const movement = await tx.movement.create({
        data: {
          type: "SAIDA",
          quantity: solicitacao.quantity,
          materialId: solicitacao.materialId,
          userId: solicitacao.solicitanteId,
          notes: solicitacao.justificativa,
        },
      });

      // 3. Cria Document pendente de assinatura
      await tx.document.create({
        data: {
          movementId: movement.id,
          status: "AGUARDANDO",
        },
      });

      // 4. Atualiza Solicitacao
      const updatedSol = await tx.solicitacao.update({
        where: { id },
        data: {
          status: "APROVADA",
          aprovadorId,
          aprovadoEm: new Date(),
          movementId: movement.id,
          signedDocUrl: signedDocUrl || null,
          notes: notes || solicitacao.notes,
        },
      });

      return { movement, solicitacao: updatedSol };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Solicitacoes PATCH error:", error);
    return NextResponse.json({ error: error.message || "Falha ao processar solicitação." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jar = await cookies();
    const userId = jar.get("session")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const requester = await prisma.user.findUnique({ where: { id: userId } });
    if (!requester || requester.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Apenas ADMINISTRADOR pode excluir solicitações." }, { status: 403 });
    }

    const sol = await prisma.solicitacao.findUnique({
      where: { id },
      include: { material: true },
    });
    if (!sol) {
      return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
    }

    // Se foi aprovada e gerou movement, estorna o estoque antes de deletar
    if (sol.status === "APROVADA" && sol.movementId) {
      await prisma.$transaction(async (tx) => {
        // Restaura estoque
        await tx.material.update({
          where: { id: sol.materialId },
          data: {
            quantity: { increment: sol.quantity },
            status: "DISPONIVEL",
          },
        });
        // Remove document vinculado ao movement (cascata manual)
        await tx.document.deleteMany({ where: { movementId: sol.movementId! } });
        // Remove movement
        await tx.movement.delete({ where: { id: sol.movementId! } });
        // Remove solicitacao
        await tx.solicitacao.delete({ where: { id } });
      });
    } else {
      await prisma.solicitacao.delete({ where: { id } });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Solicitacoes DELETE error:", error);
    return NextResponse.json({ error: error.message || "Falha ao excluir solicitação." }, { status: 500 });
  }
}
