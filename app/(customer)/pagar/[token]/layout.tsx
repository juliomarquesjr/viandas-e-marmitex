import type { Metadata } from "next";

// O endereço carrega o código de acesso: fora dos buscadores e sem repassar o endereço a outros sites.
export const metadata: Metadata = {
  title: "Pagar com PIX",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
