"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const enableDemo = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // TODO: integrar com backend real de auth. Por ora, fluxo demo baseado em email
      const role = email.includes("admin") ? "admin" : "pdv";
      if (role === "admin") router.push("/admin");
      else router.push("/pdv");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* fundo claro elegante */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-[#f9fafb] to-white" />
      {/* blobs animados, coerentes com a cor primária */}
      <div className="pointer-events-none absolute -top-28 -right-20 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_center,_#f9c7cf,_transparent_60%)] opacity-70 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -bottom-20 -left-24 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle_at_center,_#c7e9ff,_transparent_60%)] opacity-70 blur-3xl animate-blob animation-delay-2000" />
      <div className="pointer-events-none absolute top-1/3 left-1/3 h-[20rem] w-[20rem] rounded-full bg-[radial-gradient(circle_at_center,_#ffe6c7,_transparent_60%)] opacity-60 blur-3xl animate-blob animation-delay-4000" />

      {/* container */}
      <div className="mx-auto flex min-h-screen max-w-6xl items-center gap-12 px-6">
        {/* coluna de marketing */}
        <div className="hidden flex-1 md:block">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Gestão de Marmitas com agilidade e elegância
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              O Viandas reúne PDV otimizado para balcão e um painel administrativo completo.
              Fluidez, atalhos de teclado e uma experiência pensada para seu dia a dia.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 shadow-sm ring-1 ring-border">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                <span>Interface clara e acessível</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 shadow-sm ring-1 ring-border">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                <span>Atalhos poderosos no PDV</span>
              </div>
            </div>
          </div>
        </div>

        {/* cartão de login com glassmorphism e microinterações */}
        <div className="flex-1">
          <Card className="mx-auto w-full max-w-md backdrop-blur supports-[backdrop-filter]:bg-white/70 transition-transform duration-300 hover:translate-y-[-2px] hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10">
                  <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_0_4px_rgba(234,88,12,0.18)]" />
                </div>
                <div>
                  <CardTitle className="text-foreground">Bem-vindo</CardTitle>
                  <CardDescription>Acesse o sistema Viandas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={onSubmit}>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" disabled={isSubmitting} className="h-11">
                  {isSubmitting ? "Entrando..." : "Entrar"}
                </Button>
                {enableDemo && (
                  <div className="text-xs text-muted-foreground">
                    Dica: use um e-mail contendo "admin" para ir ao painel, ou qualquer outro para ir ao PDV.
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
