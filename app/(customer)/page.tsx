import { getCustomerSession } from "@/lib/customer-auth";
import { redirect } from "next/navigation";

/**
 * Entrada da área do cliente (a raiz do site): quem já está logado vai para o Início, quem não
 * está vai para o login. A entrada dos funcionários é /auth/login (e a tela de abertura, /redirect).
 */
export default async function CustomerHome() {
  const session = await getCustomerSession();
  redirect(session ? "/dashboard" : "/login");
}
