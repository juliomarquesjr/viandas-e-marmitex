"use client";

import { Check, Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import "../components/auth.css";
import { AuthScene } from "../components/AuthScene";
import { cx } from "../components/kit";

type Status = "idle" | "loading" | "ok";

export default function CustomerLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  // Trava síncrona: o estado do React só muda no próximo render, e um duplo
  // clique (ou Enter + clique) chegaria aqui duas vezes.
  const busy = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setStatus("loading");
    setError("");

    try {
      // Obter CSRF token primeiro
      const csrfResponse = await fetch("/api/auth/customer/csrf");
      const { csrfToken } = await csrfResponse.json();

      // Fazer login via API
      const formData = new URLSearchParams();
      formData.append("identifier", identifier);
      formData.append("password", password);
      formData.append("redirect", "false");
      formData.append("json", "true");
      formData.append("csrfToken", csrfToken);

      const response = await fetch("/api/auth/customer/callback/CustomerCredentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
        credentials: "include",
      });

      const result = await response.json();

      if (result.error || !response.ok) {
        setError(result.error || "Credenciais inválidas. Verifique seu email/telefone e senha.");
        setStatus("idle");
        busy.current = false;
      } else {
        // Login bem-sucedido: mostra o "Tudo certo!" por um instante e segue
        setStatus("ok");
        window.setTimeout(() => {
          window.location.href = "/dashboard";
        }, 600);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Ocorreu um erro ao fazer login. Tente novamente.");
      setStatus("idle");
      busy.current = false;
    }
  };

  return (
    <div className="c-auth">
      <AuthScene />

      <form className="c-lform" onSubmit={handleSubmit}>
        <div className="c-linner">
          <h1>Olá! Que bom te ver.</h1>
          <p className="c-lsub">Entre com o email ou o telefone cadastrado.</p>

          {error && (
            <p className="c-alert" role="alert">
              {error}
            </p>
          )}

          <div className="c-field">
            <label htmlFor="login-identifier">Email ou telefone</label>
            <div className="c-inwrap">
              <span className="c-lead" aria-hidden="true">
                <Mail size={20} />
              </span>
              <input
                id="login-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                required
              />
            </div>
          </div>

          <div className="c-field">
            <label htmlFor="login-password">Senha</label>
            <div className="c-inwrap">
              <span className="c-lead" aria-hidden="true">
                <Lock size={20} />
              </span>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="c-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="c-lrow">
            <Link href="/forgot-password" className="c-link">
              Esqueci minha senha
            </Link>
          </div>

          <button
            type="submit"
            className={cx("c-btn is-cta", status === "ok" && "is-ok")}
            aria-busy={status !== "idle"}
            aria-live="polite"
          >
            {status === "loading" ? (
              <>
                <span className="c-spin" aria-hidden="true" />
                Entrando…
              </>
            ) : status === "ok" ? (
              <>
                <Check size={20} aria-hidden="true" />
                Tudo certo!
              </>
            ) : (
              "Entrar"
            )}
          </button>

          <p className="c-lhelp">Ainda não tem acesso? Peça ao estabelecimento.</p>
        </div>
      </form>
    </div>
  );
}
