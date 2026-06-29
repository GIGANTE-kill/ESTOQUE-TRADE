/**
 * uploadFile
 *
 * Envia um File para /api/upload e retorna a URL pública resultante.
 * Usado em qualquer componente que precise fazer upload (foto produto, doc assinado).
 *
 * @param file   - O arquivo a ser enviado
 * @param prefix - Prefixo para o nome gerado (ex: "produto", "docassinado")
 * @returns URL pública do arquivo (ex: "/uploads/produto_17xxx_abc.jpg")
 * @throws Error com mensagem amigável em caso de falha
 */
export async function uploadFile(file: File, prefix = "upload"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("prefix", prefix);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Falha no upload do arquivo.");
  }

  return data.url as string;
}
