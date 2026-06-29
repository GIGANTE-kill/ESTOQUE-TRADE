/**
 * POST /api/upload
 *
 * Recebe um arquivo via multipart/form-data e o salva em public/uploads/.
 * Retorna a URL pública relativa ao servidor (/uploads/<filename>).
 *
 * Campos aceitos no form:
 *   - file: File  — o arquivo a ser salvo
 *   - prefix?: string — prefixo opcional para o nome (ex: "produto", "docassinado")
 *
 * Limitações: max 5 MB, formatos image/* e application/pdf.
 * Em produção, substituir por upload direto ao S3/Supabase Storage.
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const prefix = (formData.get("prefix") as string | null) || "upload";

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Arquivo muito grande. Máximo: 5 MB." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Use imagem ou PDF." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Falha no upload do arquivo." }, { status: 500 });
  }
}
