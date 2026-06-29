/**
 * /entradas — Redirecionamento
 *
 * Entrada de material = cadastrar novo item no Estoque.
 * Esta rota foi unificada com /estoque conforme decisão de produto:
 * o botão "Novo Material" no Estoque já representa a entrada de itens.
 */

import { redirect } from "next/navigation";

export default function EntradasPage() {
  redirect("/estoque");
}
