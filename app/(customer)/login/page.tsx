"use client";

import { Check, Eye, EyeOff, Lock, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { maskLoginPhone } from "@/lib/customer-login-id";
import "../components/auth.css";
import { AuthScene } from "../components/AuthScene";
import { cx } from "../components/kit";

type Status = "idle" | "loading" | "ok";
type Mode = "phone" | "email";

const MODE_KEY = "customer-login-mode";

export default function CustomerLoginPage() {
  // O cliente entra com o telefone (com máscara) ou com o e-mail; lembramos a última escolha neste aparelho
  const [mode, setMode] = useState<Mode>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  // Trava síncrona: o estado do React só muda no próximo render, e um duplo
  // clique (ou Enter + clique) chegaria aqui duas vezes.
  const busy = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MODE_KEY);
      if (saved === "phone" || saved === "email") setMode(saved);
    } catch {
      // sem armazenamento: fica no padrão
    }
  }, []);

  const chooseMode = (next: Mode) => {
    setMode(next);
    setError("");
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      // a escolha vale só até recarregar
    }
    window.setTimeout(() => document.getElementById("login-identifier")?.focus(), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current) return;
    const identifier = mode === "phone" ? phone : email.trim();
    if (mode === "phone" && phone.replace(/\D/g, "").length < 10) {
      setError("Digite o telefone com DDD, por exemplo (55) 99999-9999.");
      return;
    }
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
        setError(result.error || (mode === "phone" ? "Telefone ou senha incorretos. Confira o DDD e a senha." : "E-mail ou senha incorretos. Confira os dados."));
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
          <p className="c-lsub">Entre com o telefone ou o e-mail cadastrado.</p>

          {error && (
            <p className="c-alert" role="alert">
              {error}
            </p>
          )}

          <div className="c-seg" role="tablist" aria-label="Entrar com">
            {(["phone", "email"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={cx("c-seg-btn", mode === m && "is-on")}
                onClick={() => chooseMode(m)}
              >
                {m === "phone" ? <Phone size={16} aria-hidden="true" /> : <Mail size={16} aria-hidden="true" />}
                {m === "phone" ? "Telefone" : "E-mail"}
              </button>
            ))}
          </div>

          <div className="c-field">
            <label htmlFor="login-identifier">{mode === "phone" ? "Telefone com DDD" : "E-mail"}</label>
            <div className="c-inwrap">
              <span className="c-lead" aria-hidden="true">
                {mode === "phone" ? <Phone size={20} /> : <Mail size={20} />}
              </span>
              {mode === "phone" ? (
                <input
                  key="phone"
                  id="login-identifier"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(maskLoginPhone(e.target.value))}
                  placeholder="(55) 99999-9999"
                  autoComplete="tel-national"
                  inputMode="numeric"
                  maxLength={15}
                  required
                />
              ) : (
                <input
                  key="email"
                  id="login-identifier"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  required
                />
              )}
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
