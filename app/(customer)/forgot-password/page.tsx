"use client";

import { ArrowLeft, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { maskLoginPhone } from "@/lib/customer-login-id";
import "../components/auth.css";
import { AuthScene } from "../components/AuthScene";
import { cx } from "../components/kit";

type Channel = "email" | "whatsapp";

export default function CustomerForgotPasswordPage() {
  const [channel, setChannel] = useState<Channel>("email");
  // O WhatsApp só é oferecido quando o do estabelecimento está conectado (o e-mail sempre)
  const [whatsappOffered, setWhatsappOffered] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/customer/forgot-password", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { whatsapp?: boolean } | null) => setWhatsappOffered(body?.whatsapp === true))
      .catch(() => undefined);
  }, []);

  const chooseChannel = (next: Channel) => {
    setChannel(next);
    setError("");
    window.setTimeout(() => document.getElementById("forgot-identifier")?.focus(), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (channel === "whatsapp" && phone.replace(/\D/g, "").length < 10) {
      setError("Digite o telefone com DDD, por exemplo (55) 99999-9999.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/customer/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(channel === "whatsapp" ? { channel, phone } : { channel, email }),
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
            <h1>{channel === "whatsapp" ? "Confira seu WhatsApp" : "Confira seu email"}</h1>
            <p className="c-alert is-ok" role="status">
              {channel === "whatsapp"
                ? "Se o telefone estiver cadastrado com WhatsApp, você receberá em instantes uma mensagem com o link para redefinir a senha. O link vale por 60 minutos."
                : "Se o email estiver cadastrado, você receberá em instantes um link para redefinir a senha. O link vale por 60 minutos. Confira também a caixa de spam."}
            </p>
            {backLink}
          </div>
        ) : (
          <form className="c-linner" onSubmit={handleSubmit}>
            <h1>Esqueci minha senha</h1>
            <p className="c-lsub">
              {whatsappOffered
                ? "Escolha como receber o link para criar uma senha nova."
                : "Informe o email cadastrado e enviamos um link para você criar uma senha nova."}
            </p>

            {whatsappOffered && (
              <div className="c-seg" role="tablist" aria-label="Receber o link por">
                {(["email", "whatsapp"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={channel === c}
                    className={cx("c-seg-btn", channel === c && "is-on")}
                    onClick={() => chooseChannel(c)}
                  >
                    {c === "email" ? <Mail size={16} aria-hidden="true" /> : <Phone size={16} aria-hidden="true" />}
                    {c === "email" ? "E-mail" : "WhatsApp"}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="c-alert" role="alert">
                {error}
              </p>
            )}

            <div className="c-field">
              <label htmlFor="forgot-identifier">{channel === "whatsapp" ? "Telefone com DDD" : "Email"}</label>
              <div key={channel} className="c-inwrap c-swap">
                <span className="c-lead" aria-hidden="true">
                  {channel === "whatsapp" ? <Phone size={20} /> : <Mail size={20} />}
                </span>
                {channel === "whatsapp" ? (
                  <input
                    key="phone"
                    id="forgot-identifier"
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
                    id="forgot-identifier"
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
                )}
              </div>
            </div>

            <button type="submit" className="c-btn is-cta" aria-busy={loading} aria-live="polite">
              {loading ? (
                <>
                  <span className="c-spin" aria-hidden="true" />
                  Enviando…
                </>
              ) : (
                channel === "whatsapp" ? "Enviar link pelo WhatsApp" : "Enviar link de redefinição"
              )}
            </button>

            {backLink}
          </form>
        )}
      </div>
    </div>
  );
}
