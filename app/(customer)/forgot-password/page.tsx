"use client";

import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import "../components/auth.css";
import { AuthScene } from "../components/AuthScene";

export default function CustomerForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/customer/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Não foi possível processar o pedido. Tente novamente.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const backLink = (
    <div className="c-llinks">
      <Link href="/login" className="c-link">
        <ArrowLeft size={18} aria-hidden="true" />
        Voltar para o login
      </Link>
    </div>
  );

  return (
    <div className="c-auth">
      <AuthScene title="Esqueceu a senha?" subtitle="A gente te ajuda a voltar." />

      <div className="c-lform">
        {sent ? (
          <div className="c-linner">
            <h1>Confira seu email</h1>
            <p className="c-alert is-ok" role="status">
              Se o email estiver cadastrado, você receberá em instantes um link para redefinir a senha. O link vale por 60
              minutos. Confira também a caixa de spam.
            </p>
            {backLink}
          </div>
        ) : (
          <form className="c-linner" onSubmit={handleSubmit}>
            <h1>Esqueci minha senha</h1>
            <p className="c-lsub">Informe o email cadastrado e enviamos um link para você criar uma senha nova.</p>

            {error && (
              <p className="c-alert" role="alert">
                {error}
              </p>
            )}

            <div className="c-field">
              <label htmlFor="forgot-email">Email</label>
              <div className="c-inwrap">
                <span className="c-lead" aria-hidden="true">
                  <Mail size={20} />
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  required
                />
              </div>
            </div>

            <button type="submit" className="c-btn is-cta" aria-busy={loading} aria-live="polite">
              {loading ? (
                <>
                  <span className="c-spin" aria-hidden="true" />
                  Enviando…
                </>
              ) : (
                "Enviar link de redefinição"
              )}
            </button>

            {backLink}
          </form>
        )}
      </div>
    </div>
  );
}
