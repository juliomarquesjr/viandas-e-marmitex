"use client";

import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { AlertCircle, ChefHat, Eye, EyeOff, Mail, Utensils } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role === "pdv") {
        router.push("/pdv");
      } else {
        router.push("/admin");
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Credenciais inválidas. Verifique seu email e senha.");
      } else {
        // Get the user's role to redirect appropriately
        const sessionResponse = await fetch("/api/auth/session");
        const sessionData = await sessionResponse.json();
        
        // Determine redirect URL based on user role
        let redirectUrl = callbackUrl;
        if (sessionData?.user?.role === "pdv") {
          // If user is PDV, redirect to PDV even if callbackUrl says otherwise
          redirectUrl = "/pdv";
        } else if (!redirectUrl || redirectUrl === "/auth/login") {
          // Default redirect for admin users
          redirectUrl = "/admin";
        }
        
        // Use window.location for full page redirect to avoid blank page issue
        window.location.href = redirectUrl;
      }
    } catch (err) {
      setError("Ocorreu um erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Don't show the login form if we're checking the session or redirecting
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
      </div>
    );
  }

  // If already authenticated, don't show the login form
  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background com gradiente e padrões */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(245,158,11,0.1),transparent_50%)]" />
      
      {/* Elementos decorativos */}
      <div className="absolute top-10 left-10 opacity-20">
        <Utensils className="h-16 w-16 text-orange-400 rotate-12" />
      </div>
      <div className="absolute bottom-20 right-16 opacity-20">
        <ChefHat className="h-20 w-20 text-amber-400 -rotate-12" />
      </div>
      <div className="absolute top-1/3 right-1/4 opacity-10">
        <Utensils className="h-24 w-24 text-orange-300 rotate-45" />
      </div>
      
      {/* Conteúdo principal */}
      <div className="relative min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo e título */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 relative">
              <div className="h-20 w-20 mx-auto rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-2xl">
                <ChefHat className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-green-400 border-2 border-white shadow-lg" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-2">
              Comida Caseira
            </h1>
            <p className="text-gray-600 text-lg">
              Sabor que aquece o coração
            </p>
          </div>
          
          {/* Card de login */}
          <Card className="backdrop-blur-xl bg-white/80 border-0 shadow-2xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-semibold text-gray-800 mb-2">
                Bem-vindo de volta!
              </CardTitle>
              <CardDescription className="text-gray-600">
                Faça login para gerenciar seu restaurante
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}
                
                {/* Campo de email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-orange-500" />
                    Email
                  </label>
                  <div className="relative group">
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 pl-4 pr-4 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-200 bg-white/70"
                      required
                    />
                  </div>
                </div>
                
                {/* Campo de senha */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <ChefHat className="h-4 w-4 text-orange-500" />
                    Senha
                  </label>
                  <div className="relative group">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pl-4 pr-12 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-200 bg-white/70"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-500 transition-colors duration-200 p-1 rounded-lg hover:bg-orange-50"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Botão de login */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Entrando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ChefHat className="h-5 w-5" />
                      Entrar no Sistema
                    </div>
                  )}
                </Button>
              </form>
              
              {/* Footer */}
              <div className="pt-6 border-t border-gray-200">
                <div className="text-center space-y-3">
                  <p className="text-sm text-gray-500">
                    Dúvidas? Contate o administrador do sistema
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <div className="h-2 w-2 rounded-full bg-green-400"></div>
                    Sistema seguro e confiável
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}