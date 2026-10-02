"use client";

import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const MIN_PASSWORD_LENGTH = 8;

function ResetPasswordForm() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/customer/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Não foi possível redefinir a senha.");
      } else {
        setDone(true);
      }
    } catch {
      setError("Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-12 pl-4 pr-12 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-200 bg-white";

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(245,158,11,0.1),transparent_50%)]" />

      <div className="relative min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md relative z-10">
          <Card className="backdrop-blur-xl bg-white/90 border-0 shadow-2xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-semibold text-gray-800 mb-2">Nova senha</CardTitle>
              <CardDescription className="text-gray-600">Escolha uma nova senha para sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!token ? (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-700">
                    Link inválido. Solicite uma nova redefinição de senha.
                  </AlertDescription>
                </Alert>
              ) : done ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Senha atualizada com sucesso. Você já pode entrar com a nova senha.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-red-700">{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-orange-500" />
                      Nova senha
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo de 8 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputClass}
                        required
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-500 transition-colors duration-200 p-1 rounded-lg hover:bg-orange-50"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirm" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-orange-500" />
                      Confirmar senha
                    </label>
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repita a nova senha"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={loading}
                  >
                    {loading ? "Salvando..." : "Redefinir senha"}
                  </Button>
                </form>
              )}

              <div className="pt-6 border-t border-gray-200 text-center space-y-2">
                {!done && (
                  <Link
                    href="/customer/forgot-password"
                    className="block text-sm font-medium text-orange-700 hover:text-orange-800 hover:underline"
                  >
                    Solicitar novo link
                  </Link>
                )}
                <Link href="/customer/login" className="block text-sm text-gray-600 hover:underline">
                  Ir para o login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CustomerResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
