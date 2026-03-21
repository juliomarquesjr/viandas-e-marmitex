"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import RedirectPage from "./redirect/page";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona automaticamente para a página de login após um delay
    const timer = setTimeout(() => {
      router.push("/auth/login");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  // Mostra a nova tela de redirecionamento elegante
  return <RedirectPage />;
}
