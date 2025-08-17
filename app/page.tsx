"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona automaticamente para a página de login
    router.push("/auth/login");
  }, [router]);

  // Enquanto redireciona, mostra uma mensagem simples
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-lg text-gray-600">Redirecionando para o login...</p>
      </div>
    </div>
  );
}
