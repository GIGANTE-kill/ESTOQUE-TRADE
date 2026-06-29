export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") || undefined;

    // Verificar permissões de categoria do usuário logado
    let allowedCategoryIds: string[] | undefined;
    try {
      const cookieStore = await cookies();
      const userId = cookieStore.get("session")?.value;
      if (userId) {
        const perms = await prisma.userCategoryPermission.findMany({
          where: { userId },
          select: { categoryId: true },
        });
        if (perms.length > 0) {
          allowedCategoryIds = perms.map((p) => p.categoryId);
        }
      }
    } catch {
      // Se não conseguir ler sessão, continua sem restrição
    }

    // Combinar filtros: categoryId explícito + permissões do usuário
    let whereClause: Record<string, unknown> = {};
    if (categoryId) {
      // Filtro explícito já aplicado — respeitar também a permissão
      if (allowedCategoryIds && !allowedCategoryIds.includes(categoryId)) {
        // Usuário não tem acesso a essa categoria
        return NextResponse.json([]);
      }
      whereClause = { categoryId };
    } else if (allowedCategoryIds) {
      whereClause = { categoryId: { in: allowedCategoryIds } };
    }

    const materials = await prisma.material.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        category: true,
        localizacao: true,
      },
      orderBy: {
        entryDate: "asc",
      },
    });

    const now = new Date();
    const formattedMaterials = materials.map((m) => {
      const entryDateObj = new Date(m.entryDate);
      const diffTime = Math.abs(now.getTime() - entryDateObj.getTime());
      const daysInStock = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Dias restantes da ação
      let diasRestantesAcao: number | null = null;
      if (m.periodoAcaoFim) {
        const diff = m.periodoAcaoFim.getTime() - now.getTime();
        diasRestantesAcao = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }

      // Dias até a validade do produto
      let diasParaVencer: number | null = null;
      if (m.dataValidade) {
        const diff = m.dataValidade.getTime() - now.getTime();
        diasParaVencer = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }

      return {
        id: m.id,
        name: m.name,
        sku: m.sku || "-",
        category: m.category.name,
        categoryId: m.categoryId,
        quantity: m.quantity,
        photoUrl: m.photoUrl || null,
        entryDate: entryDateObj.toLocaleDateString("pt-BR"),
        daysInStock,
        status: m.status,
        fornecedor: m.fornecedor || null,
        nomeAcao: m.nomeAcao || null,
        periodoAcaoInicio: m.periodoAcaoInicio ? m.periodoAcaoInicio.toISOString().split("T")[0] : null,
        periodoAcaoFim: m.periodoAcaoFim ? m.periodoAcaoFim.toISOString().split("T")[0] : null,
        diasRestantesAcao,
        dataValidade: m.dataValidade ? m.dataValidade.toISOString().split("T")[0] : null,
        diasParaVencer,
        produtoAlvo: m.produtoAlvo,
        bloqueado: m.bloqueado,
        localizacaoId: m.localizacaoId || null,
        localizacao: m.localizacao
          ? {
              id: m.localizacao.id,
              rua: m.localizacao.rua,
              predio: m.localizacao.predio,
              andar: m.localizacao.andar,
              apartamento: m.localizacao.apartamento,
            }
          : null,
      };
    });

    return NextResponse.json(formattedMaterials);
  } catch (error: any) {
    console.error("Materials load error:", error);
    return NextResponse.json({ error: "Failed to load materials" }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name, sku, categoryName, quantity, entryDate,
      status, fornecedor, nomeAcao, periodoAcaoInicio,
      periodoAcaoFim, dataValidade, photoUrl, localizacaoId,
    } = body;

    if (!name || !categoryName) {
      return NextResponse.json({ error: "Nome e Categoria são obrigatórios" }, { status: 400 });
    }

    // 1. Find or create the category
    let category = await prisma.category.findUnique({
      where: { name: categoryName },
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: categoryName },
      });
    }

    // 2. Create the material
    const newMaterial = await prisma.material.create({
      data: {
        name,
        sku: sku || null,
        categoryId: category.id,
        quantity: parseInt(quantity) || 0,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        status: status || "DISPONIVEL",
        fornecedor: fornecedor || null,
        nomeAcao: nomeAcao || null,
        periodoAcaoInicio: periodoAcaoInicio ? new Date(periodoAcaoInicio) : null,
        periodoAcaoFim: periodoAcaoFim ? new Date(periodoAcaoFim) : null,
        dataValidade: dataValidade ? new Date(dataValidade) : null,
        photoUrl: photoUrl || null,
        localizacaoId: localizacaoId || null,
      },
      include: {
        category: true,
        localizacao: true,
      },
    });

    return NextResponse.json(newMaterial, { status: 201 });
  } catch (error: any) {
    console.error("Material creation error:", error);
    return NextResponse.json({ error: error.message || "Failed to create material" }, { status: 500 });
  }
}
