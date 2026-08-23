"use client";

import { BrandBackdrop } from "@/app/components/BrandBackdrop";
import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  forgetLogin,
  migrateLegacyDesktopLogin,
  profileFirstName,
  profileInitials,
  profileLabel,
  rememberLogin,
  type RecentLogin,
} from "@/lib/auth/recent-logins";
import { Eye, EyeOff, ScanFace } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthPanelFooter } from "../components/AuthPanelFooter";
import { AuthThemeToggle } from "../components/AuthThemeToggle";
import { FacialLogin } from "../components/FacialLogin";
import { ProfileList } from "../components/ProfileList";

type LoginView = "credentials" | "facial";

export default function LoginPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const [profiles, setProfiles] = useState<RecentLogin[]>([]);
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const [manualActive, setManualActive] = useState(false);
  const [view, setView] = useState<LoginView>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);

  const activeProfile =
    !manualActive && activeEmail
      ? profiles.find((profile) => profile.email === activeEmail) ?? null
      : null;

  useEffect(() => {
    if (status === "authenticated") {
      router.push(session?.user?.role === "pdv" ? "/pdv" : "/admin");
    }
  }, [status, session, router]);

  // Perfis vêm do armazenamento local deste dispositivo, não do servidor.
  useEffect(() => {
    const storedProfiles = migrateLegacyDesktopLogin();

    setProfiles(storedProfiles);

    if (storedProfiles.length > 0) {
      setActiveEmail(storedProfiles[0].email);
      // `autoFocus` não pega aqui: os perfis chegam depois da primeira renderização.
      window.requestAnimationFrame(() => passwordRef.current?.focus());
    } else {
      setManualActive(true);
    }
  }, []);

  const handleSelectProfile = useCallback((selectedEmail: string) => {
    setManualActive(false);
    setActiveEmail(selectedEmail);
    setPassword("");
    setShowPassword(false);
    window.requestAnimationFrame(() => passwordRef.current?.focus());
  }, []);

  const handleSelectManual = useCallback(() => {
    setManualActive(true);
    setActiveEmail(null);
    setEmail("");
    setPassword("");
    setShowPassword(false);
  }, []);

  const handleForgetProfile = useCallback(
    (forgottenEmail: string) => {
      const remaining = forgetLogin(forgottenEmail);
      setProfiles(remaining);

      if (activeEmail !== forgottenEmail) {
        return;
      }

      if (remaining.length > 0) {
        setActiveEmail(remaining[0].email);
      } else {
        setActiveEmail(null);
        setManualActive(true);
      }
    },
    [activeEmail]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const targetEmail = manualActive ? email.trim() : activeProfile?.email ?? "";

    if (!targetEmail) {
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: targetEmail,
        password,
        redirect: false,
      });

      if (result?.error) {
        showToast(
          "Credenciais inválidas. Verifique seu e-mail e senha.",
          "error",
          "Acesso negado"
        );
        setPassword("");
        setLoading(false);
        passwordRef.current?.focus();
        return;
      }

      const sessionResponse = await fetch("/api/auth/session");
      const sessionData = await sessionResponse.json();
      const user = sessionData?.user;

      rememberLogin({
        email: user?.email ?? targetEmail,
        name: user?.name ?? null,
        role: user?.role ?? null,
        image: user?.image ?? null,
        method: "password",
      });

      let redirectUrl = callbackUrl;
      if (user?.role === "pdv") {
        redirectUrl = "/pdv";
      } else if (!redirectUrl || redirectUrl === "/auth/login") {
        redirectUrl = "/admin";
      }

      window.location.href = redirectUrl;
    } catch {
      showToast(
        "Ocorreu um erro ao fazer login. Tente novamente.",
        "error",
        "Erro de autenticação"
      );
      setLoading(false);
    }
  };

  if (status === "authenticated") {
    return null;
  }

  const hasProfiles = profiles.length > 0;
  const isFacial = view === "facial";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <BrandBackdrop />

      <div className="absolute right-6 top-6 z-20">
        <AuthThemeToggle />
      </div>

      {/* Painel dividido: lista de perfis à esquerda, autenticação à direita. */}
      <div
        className={`relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-[var(--auth-panel-shadow)] transition-[height] duration-300 md:flex-row ${
          hasProfiles ? "max-w-[900px]" : "max-w-[460px]"
        } ${isFacial ? "md:h-[620px]" : "md:h-[560px]"}`}
      >
        {hasProfiles ? (
          <aside className="flex shrink-0 flex-col border-b border-[color:var(--border)] bg-[color:var(--auth-aside-bg)] md:w-[340px] md:border-b-0 md:border-r">
            <div className="flex h-[76px] shrink-0 items-center gap-[11px] border-b border-[color:var(--border)] px-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary">
                <Image
                  src="/img/icon.png"
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-full"
                  priority
                />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-[color:var(--foreground)]">
                  Comida Caseira
                </span>
                <span className="text-[11px] text-[color:var(--auth-fg-subtle)]">
                  Sistema de gestão
                </span>
              </span>
            </div>

            <ProfileList
              profiles={profiles}
              activeEmail={activeEmail}
              manualActive={manualActive}
              onSelect={handleSelectProfile}
              onSelectManual={handleSelectManual}
              onForget={handleForgetProfile}
            />
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-grow flex-col">
          <div className="flex flex-grow flex-col justify-center px-8 py-8 sm:px-11">
            {isFacial ? (
              <FacialLogin
                profile={activeProfile}
                onCancel={() => setView("credentials")}
              />
            ) : (
              <>
                {activeProfile ? (
                  <div className="flex items-center gap-3.5">
                    {activeProfile.image ? (
                      <Image
                        src={activeProfile.image}
                        alt=""
                        width={52}
                        height={52}
                        className="h-[52px] w-[52px] shrink-0 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-primary text-[17px] font-semibold text-white">
                        {profileInitials(activeProfile)}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-xl font-semibold tracking-tight text-[color:var(--foreground)]">
                        {profileLabel(activeProfile)}
                      </span>
                      <span className="truncate text-[13px] text-[color:var(--muted-foreground)]">
                        {activeProfile.email}
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {!hasProfiles ? (
                      <span className="mb-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-primary">
                        <Image
                          src="/img/icon.png"
                          alt=""
                          width={28}
                          height={28}
                          className="rounded-full"
                          priority
                        />
                      </span>
                    ) : null}
                    <span className="text-xl font-semibold tracking-tight text-[color:var(--foreground)]">
                      {hasProfiles ? "Entrar com outro e-mail" : "Entrar no sistema"}
                    </span>
                    <span className="text-[13px] text-[color:var(--muted-foreground)]">
                      Informe e-mail e senha para continuar.
                    </span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-8 flex flex-col">
                  {manualActive ? (
                    <div className="mb-4 flex flex-col gap-1.5">
                      <label htmlFor="email" className="text-sm font-medium text-[color:var(--foreground)]">
                        E-mail
                      </label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="username"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        inputSize="lg"
                        className="border-[color:var(--auth-field-border)] bg-[color:var(--auth-field-bg)] text-[color:var(--foreground)] hover:border-[color:var(--border-dark)]"
                        required
                        autoFocus
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="password" className="text-sm font-medium text-[color:var(--foreground)]">
                      Senha
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        ref={passwordRef}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Digite sua senha"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        inputSize="lg"
                        className="pr-12 border-[color:var(--auth-field-border)] bg-[color:var(--auth-field-bg)] text-[color:var(--foreground)] hover:border-[color:var(--border-dark)]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute right-3 top-6 -translate-y-1/2 rounded-md p-1 text-[color:var(--muted-foreground)] transition-colors duration-150 hover:text-[color:var(--foreground)]"
                      >
                        {showPassword ? (
                          <EyeOff className="h-[18px] w-[18px]" />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" size="lg" className="mt-4" loading={loading}>
                    {loading
                      ? "Entrando..."
                      : activeProfile
                        ? `Entrar como ${profileFirstName(activeProfile)}`
                        : "Entrar"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2.5 h-11"
                    onClick={() => setView("facial")}
                    leftIcon={<ScanFace className="h-[18px] w-[18px]" />}
                  >
                    Entrar pelo rosto
                  </Button>
                </form>
              </>
            )}
          </div>

          <AuthPanelFooter />
        </div>
      </div>
    </div>
  );
}
