"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import "../auth/auth.css";
import { AuthScene } from "../components/AuthScene";

// Mesmo valor de lib/customer-password-reset.ts, que não pode vir para o
// navegador (importa o Prisma). A API valida de novo.
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
    if (loading) return;
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

  const links = (
    <div className="c-llinks">
      {!done && (
        <Link href="/customer/forgot-password" className="c-link">
          Solicitar novo link
        </Link>
      )}
      <Link href="/customer/login" className={done ? "c-link" : "c-link is-quiet"}>
        Ir para o login
      </Link>
    </div>
  );

  if (!token) {
    return (
      <div className="c-linner">
        <h1>Nova senha</h1>
        <p className="c-alert" role="alert">
          Link inválido. Solicite uma nova redefinição de senha.
        </p>
        {links}
      </div>
    );
  }

  if (done) {
    return (
      <div className="c-linner">
        <h1>Nova senha</h1>
        <p className="c-alert is-ok" role="status">
          Senha atualizada com sucesso. Você já pode entrar com a nova senha.
        </p>
        {links}
      </div>
    );
  }

  return (
    <form className="c-linner" onSubmit={handleSubmit}>
      <h1>Nova senha</h1>
      <p className="c-lsub">Escolha uma nova senha para sua conta.</p>

      {error && (
        <p className="c-alert" role="alert">
          {error}
        </p>
      )}

      <div className="c-field">
        <label htmlFor="reset-password">Nova senha</label>
        <div className="c-inwrap">
          <span className="c-lead" aria-hidden="true">
            <Lock size={20} />
          </span>
          <input
            id="reset-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            aria-describedby="reset-password-hint"
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
        <span id="reset-password-hint" className="c-field-hint">
          Mínimo de {MIN_PASSWORD_LENGTH} caracteres.
        </span>
      </div>

      <div className="c-field">
        <label htmlFor="reset-confirm">Confirmar senha</label>
        <div className="c-inwrap">
          <span className="c-lead" aria-hidden="true">
            <Lock size={20} />
          </span>
          <input
            id="reset-confirm"
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      <button type="submit" className="c-btn is-cta" aria-busy={loading} aria-live="polite">
        {loading ? (
          <>
            <span className="c-spin" aria-hidden="true" />
            Salvando…
          </>
        ) : (
          "Redefinir senha"
        )}
      </button>

      {links}
    </form>
  );
}

export default function CustomerResetPasswordPage() {
  return (
    <div className="c-auth">
      <AuthScene title="Quase lá!" subtitle="Crie uma senha nova e volte para a sua conta." />
      <div className="c-lform">
        {/* useSearchParams pede um Suspense; o painel fica fora dele e já aparece no primeiro carregamento */}
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
