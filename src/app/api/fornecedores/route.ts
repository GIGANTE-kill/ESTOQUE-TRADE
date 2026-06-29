export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listFornecedoresPrincipais } from "@/lib/sellout";

// GET /api/fornecedores?search=uni
// Lista fornecedores principais que puxam faturamento (para o cadastro de metas).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const fornecedores = await listFornecedoresPrincipais(search);
    return NextResponse.json({ fornecedores });
  } catch (error: any) {
    console.error("Fornecedores load error:", error);
    return NextResponse.json(
      { error: "Falha ao carregar fornecedores do Oracle" },
      { status: 500 }
    );
  }
}
