"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { useToast } from "@/app/components/Toast";
import { motion } from "framer-motion";
import { BarChart3, Camera, Eye, EyeOff, Mail, Receipt, Shield, Truck } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FacialLogin } from "../components/FacialLogin";

const DESKTOP_LOGIN_STORAGE_KEY = "auth:desktop-saved-login";

const features = [
  {
    icon: Receipt,
    title: "Gest\u00e3o completa de pedidos",
    description: "Controle todos os pedidos em tempo real, do recebimento \u00e0 entrega.",
  },
  {
    icon: BarChart3,
    title: "Controle financeiro integrado",
    description: "Relat\u00f3rios de vendas, despesas e lucros sempre atualizados.",
  },
  {
    icon: Truck,
    title: "Entregas e pr\u00e9-vendas",
    description: "Organize rotas, pr\u00e9-vendas e pagamentos em um \u00fanico lugar.",
  },
];

export default function LoginPage() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<"traditional" | "facial">("traditional");
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role === "pdv") {
        router.push("/pdv");
      } else {
        router.push("/admin");
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const syncDesktopMode = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    syncDesktopMode(mediaQuery);
    mediaQuery.addEventListener("change", syncDesktopMode);

    return () => {
      mediaQuery.removeEventListener("change", syncDesktopMode);
    };
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setRememberLogin(false);
      return;
    }

    const rawSavedLogin = window.localStorage.getItem(DESKTOP_LOGIN_STORAGE_KEY);
    if (!rawSavedLogin) {
      return;
    }

    try {
      const savedLogin = JSON.parse(rawSavedLogin) as { email?: string; password?: string };
      setEmail(savedLogin.email ?? "");
      setPassword(savedLogin.password ?? "");
      setRememberLogin(Boolean(savedLogin.email || savedLogin.password));
    } catch {
      window.localStorage.removeItem(DESKTOP_LOGIN_STORAGE_KEY);
    }
  }, [isDesktop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isDesktop && rememberLogin) {
        window.localStorage.setItem(
          DESKTOP_LOGIN_STORAGE_KEY,
          JSON.stringify({ email, password })
        );
      } else {
        window.localStorage.removeItem(DESKTOP_LOGIN_STORAGE_KEY);
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        showToast("Credenciais inv\u00e1lidas. Verifique seu email e senha.", "error", "Acesso negado");
      } else {
        const sessionResponse = await fetch("/api/auth/session");
        const sessionData = await sessionResponse.json();

        let redirectUrl = callbackUrl;
        if (sessionData?.user?.role === "pdv") {
          redirectUrl = "/pdv";
        } else if (!redirectUrl || redirectUrl === "/auth/login") {
          redirectUrl = "/admin";
        }

        window.location.href = redirectUrl;
      }
    } catch (err) {
      showToast("Ocorreu um erro ao fazer login. Tente novamente.", "error", "Erro de autentica\u00e7\u00e3o");
    } finally {
      setLoading(false);
    }
  };

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* PAINEL ESQUERDO (brand) */}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="hidden lg:flex lg:w-[58%] relative flex-col items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)",
        }}
      >
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-[0.07] animate-blob"
          style={{
            background:
              "radial-gradient(circle, var(--auth-brand-glow-1-from), var(--auth-brand-glow-1-to))",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[480px] h-[480px] rounded-full opacity-[0.06] animate-blob animation-delay-4000"
          style={{
            background:
              "radial-gradient(circle, var(--auth-brand-glow-2-from), var(--auth-brand-glow-2-to))",
          }}
        />
        <div
          className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-[0.05] animate-blob animation-delay-2000"
          style={{
            background:
              "radial-gradient(circle, var(--auth-brand-glow-3-from), var(--auth-brand-glow-3-to))",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-lg w-full">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="mb-8"
          >
            <div className="relative inline-block">
              <div
                className="absolute inset-0 rounded-full blur-2xl opacity-40"
                style={{
                  background:
                    "radial-gradient(circle, var(--auth-brand-logo-halo-from), var(--auth-brand-logo-halo-to))",
                }}
              />
              <Image
                src="/img/icon.png"
                alt="Comida Caseira"
                width={112}
                height={112}
                className="relative rounded-full shadow-2xl"
                priority
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <h1
              className="text-4xl font-extrabold tracking-tight mb-3"
              style={{
                background: `linear-gradient(90deg, #ffffff 0%, var(--auth-brand-title-mid) 55%, var(--auth-brand-title-end) 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Comida Caseira
            </h1>
            <p className="text-white/60 text-base italic font-medium tracking-wide">
              {"Sabor que aquece o cora\u00e7\u00e3o"}
            </p>
          </motion.div>

          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="my-8 w-full h-px"
            style={{
              background: "linear-gradient(90deg, transparent, var(--auth-brand-divider), transparent)",
            }}
          />

          <div className="space-y-5 w-full text-left">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                className="flex items-start gap-4"
              >
                <div
                  className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: "var(--auth-brand-feature-bg)",
                    border: "1px solid var(--auth-brand-feature-border)",
                  }}
                >
                  <feature.icon className="h-5 w-5 text-sky-300" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-snug">{feature.title}</p>
                  <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1 }}
            className="mt-10 flex items-center gap-2 text-white/30 text-xs"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>{"Sistema seguro e confi\u00e1vel"}</span>
          </motion.div>
        </div>
      </motion.div>

      {/* PAINEL DIREITO (formulario) */}
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/90 px-4 sm:px-6 py-12"
      >
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <Image
              src="/img/icon.png"
              alt="Comida Caseira"
              width={64}
              height={64}
              className="rounded-full shadow-lg mb-3"
              priority
            />
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Comida Caseira</h2>
            <p className="text-slate-500 text-sm mt-1">{"Sistema de gest\u00e3o"}</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white/95 shadow-xl shadow-slate-200/50 backdrop-blur-sm p-6 sm:p-8">
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="mb-6"
            >
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
                Bem-vindo de volta!
              </h2>
              <p className="text-slate-500 text-sm mt-1.5">
                {"Fa\u00e7a login para gerenciar seu restaurante"}
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.32 }}
              className="flex gap-1.5 p-1 bg-slate-100/80 rounded-xl mb-6 ring-1 ring-slate-200/80"
            >
              <button
                type="button"
                onClick={() => setLoginMode("traditional")}
                className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginMode === "traditional"
                    ? "bg-white text-blue-600 shadow-md shadow-slate-200/60 border border-slate-200/90"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">Email / Senha</span>
              </button>
              <button
                type="button"
                onClick={() => setLoginMode("facial")}
                className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginMode === "facial"
                    ? "bg-white text-blue-600 shadow-md shadow-slate-200/60 border border-slate-200/90"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Camera className="h-4 w-4 shrink-0" />
                Reconhecimento Facial
              </button>
            </motion.div>

            {loginMode === "facial" ? (
              <FacialLogin onCancel={() => setLoginMode("traditional")} />
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="space-y-5">
                  <motion.div
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.38 }}
                    className="space-y-1.5"
                  >
                    <label
                      htmlFor="email"
                      className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white text-slate-900 placeholder:text-slate-400"
                      required
                    />
                  </motion.div>

                  <motion.div
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.44 }}
                    className="space-y-1.5"
                  >
                    <label
                      htmlFor="password"
                      className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Senha
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Digite sua senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 pr-12 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white text-slate-900"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-150 p-1 rounded-lg"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </motion.div>

                  {isDesktop ? (
                    <motion.label
                      initial={{ y: 12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.47 }}
                      className="hidden lg:flex items-center gap-2.5 select-none text-sm text-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={rememberLogin}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setRememberLogin(checked);

                          if (!checked) {
                            window.localStorage.removeItem(DESKTOP_LOGIN_STORAGE_KEY);
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Manter email e senha salvos neste computador</span>
                    </motion.label>
                  ) : null}

                  <motion.div
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                  >
                    <Button
                      type="submit"
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-sm"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2.5">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Entrando...
                        </div>
                      ) : (
                        "Entrar no Sistema"
                      )}
                    </Button>
                  </motion.div>
                </div>
              </form>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="mt-6 text-center space-y-1.5"
          >
            <p className="text-[11px] sm:text-xs text-slate-400">
              {"D\u00favidas? Contate o administrador do sistema"}
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-slate-400">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Sistema online
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
