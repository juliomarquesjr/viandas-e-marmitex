"use client";

import { Camera, Eye, EyeOff, Lock, LogOut, MapPin, MessageCircle, Palette, Pencil, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CustomerAvatar } from "../components/Avatar";
import { ErrorState, Toast, ThemeChoice } from "../components/kit";
import { ProfilePhotoSheet } from "../components/perfil/ProfilePhotoSheet";
import { setMustChangePassword, useCustomerAvatar } from "../lib/avatar-store";
import type { CustomerAddress, CustomerProfile } from "../lib/types";
import { useCustomerData } from "../lib/useCustomerData";
import {
  digitsOf,
  displayCep,
  displayDoc,
  displayPhone,
  maskCep,
  maskDoc,
  maskPhone,
  sameDigits,
  UFS,
} from "./masks";
import "./profile.css";

// Mesmos limites de lib/customer-password-reset.ts (que importa o Prisma e
// não pode vir para o navegador). A API valida de novo.
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

const SECTIONS = [
  { id: "dados", label: "Dados", title: "Seus dados", Icon: User },
  { id: "endereco", label: "Endereço", title: "Endereço de entrega", Icon: MapPin },
  { id: "seguranca", label: "Segurança", title: "Trocar senha", Icon: Lock },
  { id: "aparencia", label: "Aparência", title: "Aparência", Icon: Palette },
] as const;
type Section = (typeof SECTIONS)[number]["id"];

type Address = Required<{ [K in keyof CustomerAddress]: string }>;

interface Draft {
  name: string;
  phone: string;
  phoneIsWhatsapp: boolean;
  email: string;
  doc: string;
  address: Address;
}

function addressOf(profile: CustomerProfile): CustomerAddress {
  return profile.address && typeof profile.address === "object" ? profile.address : {};
}

function toDraft(profile: CustomerProfile): Draft {
  const a = addressOf(profile);
  return {
    name: profile.name ?? "",
    phone: displayPhone(profile.phone),
    phoneIsWhatsapp: profile.phoneIsWhatsapp === true,
    email: profile.email ?? "",
    doc: displayDoc(profile.doc),
    address: {
      street: a.street ?? "",
      number: a.number ?? "",
      complement: a.complement ?? "",
      neighborhood: a.neighborhood ?? "",
      city: a.city ?? "",
      state: a.state ?? "",
      zip: displayCep(a.zip),
    },
  };
}

const NO_CONNECTION = "Sem conexão. Confira a internet e tente de novo.";

// Mesmo ponto de corte do layout de computador (profile.css)
const DESKTOP_QUERY = "(min-width: 860px)";
const subscribeDesktop = (listener: () => void) => {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
};
const isDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;

/* ------------------------------------------------------------ campos */

function Info({ label, value, whatsapp }: { label: string; value?: string | null; whatsapp?: boolean }) {
  const text = value?.trim();
  return (
    <dl className="c-dl">
      <dt>{label}</dt>
      <dd>
        {text ? text : "—"}
        {text && whatsapp && (
          <span className="c-tagwa">
            <MessageCircle size={12} aria-hidden="true" />
            WhatsApp
          </span>
        )}
      </dd>
    </dl>
  );
}

function SelectField({
  id,
  label,
  value,
  onValue,
  options,
  placeholder,
  ...rest
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id" | "value" | "onChange"> & {
  id: string;
  label: string;
  value: string;
  onValue: (value: string) => void;
  options: readonly string[];
  placeholder: string;
}) {
  // um valor antigo fora da lista continua aparecendo, para não sumir sem o cliente perceber
  const list = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <div className="c-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onValue(e.target.value)} {...rest}>
        <option value="">{placeholder}</option>
        {list.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "value" | "onChange"> & {
  id: string;
  label: string;
  value: string;
  onValue: (value: string) => void;
};

function Field({ id, label, value, onValue, ...rest }: InputProps) {
  return (
    <div className="c-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} onChange={(e) => onValue(e.target.value)} {...rest} />
    </div>
  );
}

/* ------------------------------------------------------------ tela */

function ProfileSkeleton() {
  return (
    <div className="c-pskel" aria-busy="true" aria-label="Carregando">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span className="c-skel" style={{ width: 88, height: 88, borderRadius: "50%", flex: "none" }} />
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="c-skel" style={{ height: 22, width: "60%" }} />
          <span className="c-skel" style={{ height: 14, width: "40%" }} />
        </span>
      </div>
      <span className="c-skel" style={{ height: 44, width: "100%", borderRadius: 999 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="c-skel" style={{ height: 12, width: 90 }} />
          <span className="c-skel" style={{ height: 18, width: `${70 - i * 10}%` }} />
        </span>
      ))}
    </div>
  );
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const { data, error: loadError, loading, reload } = useCustomerData<CustomerProfile>("/api/customer/profile");
  // Depois de salvar, a tela usa o que a API devolveu, sem buscar de novo.
  const [saved, setSaved] = useState<CustomerProfile | null>(null);
  const profile = saved ?? data;

  const forced = profile?.mustChangePassword === true;
  const [section, setSection] = useState<Section>("dados");
  // Senha criada pelo estabelecimento (ou link com ?aba=seguranca): abre direto em Segurança
  useEffect(() => {
    if (forced || new URLSearchParams(window.location.search).get("aba") === "seguranca") setSection("seguranca");
  }, [forced]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const busy = useRef(false);

  const { imageUrl } = useCustomerAvatar();
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, () => false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const cameraRef = useRef<HTMLButtonElement>(null);
  const openPhoto = useCallback(() => setPhotoOpen(true), []);
  const closePhoto = useCallback(() => {
    setPhotoOpen(false);
    // o Sheet devolve o foco a quem estava focado; ao tocar no avatar não era o botão
    window.requestAnimationFrame(() => cameraRef.current?.focus({ preventScroll: true }));
  }, []);

  if (!profile && (loading || !loadError)) return <ProfileSkeleton />;
  if (!profile) {
    return (
      <div className="c-page">
        <ErrorState message={loadError ?? "Não foi possível carregar agora."} onRetry={reload} />
      </div>
    );
  }

  const address = addressOf(profile);
  const form = draft ?? toDraft(profile);
  const setField = (patch: Partial<Omit<Draft, "address">>) => setDraft({ ...form, ...patch });
  const setAddr = (patch: Partial<Address>) => setDraft({ ...form, address: { ...form.address, ...patch } });

  const startEditing = () => {
    setDraft(toDraft(profile));
    setDataError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(null);
    setDataError(null);
    setEditing(false);
  };

  const clearPassword = () => {
    setNewPassword("");
    setConfirmPassword("");
    setPwError(null);
  };

  /** PUT no perfil; devolve a mensagem de erro, ou null quando deu certo. */
  const put = async (body: Record<string, unknown>): Promise<{ error: string | null; customer?: CustomerProfile }> => {
    try {
      const response = await fetch("/api/customer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status === 401) {
        window.location.href = "/login";
        return { error: null };
      }
      const json = await response.json().catch(() => null);
      if (!response.ok) return { error: json?.error || "Não foi possível salvar agora. Tente de novo." };
      return { error: null, customer: json?.customer };
    } catch {
      return { error: NO_CONNECTION };
    }
  };

  const saveProfile = async () => {
    if (busy.current) return;
    const name = form.name.trim();
    const email = form.email.trim();
    const phoneChanged = !sameDigits(form.phone, profile.phone);
    const phoneDigits = digitsOf(form.phone);

    if (!name) return setDataError("Informe o seu nome.");
    if (phoneChanged && phoneDigits.length !== 10 && phoneDigits.length !== 11) {
      return setDataError("Confira o telefone: DDD e número, com 10 ou 11 dígitos.");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setDataError("Confira o email.");

    const a = form.address;
    const body = {
      name,
      // Telefone sem formatação: é assim que o login por telefone encontra o cliente.
      // Se não mudou, nem vai: a API mantém o que está salvo.
      phone: phoneChanged ? phoneDigits : undefined,
      phoneIsWhatsapp: form.phoneIsWhatsapp,
      email: email || null,
      doc: profile.doc && sameDigits(form.doc, profile.doc) ? profile.doc : form.doc.trim() || null,
      address: {
        street: a.street.trim(),
        number: a.number.trim(),
        complement: a.complement.trim(),
        neighborhood: a.neighborhood.trim(),
        city: a.city.trim(),
        state: a.state.trim().toUpperCase(),
        zip: address.zip && sameDigits(a.zip, address.zip) ? address.zip : a.zip.trim(),
      },
    };

    busy.current = true;
    setSaving(true);
    setDataError(null);
    const result = await put(body);
    busy.current = false;
    setSaving(false);

    if (result.error) return setDataError(result.error);
    if (result.customer) setSaved(result.customer);
    setDraft(null);
    setEditing(false);
    setToast("Alterações salvas");
  };

  const changePassword = async () => {
    if (busy.current) return;
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return setPwError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }
    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      return setPwError(`A senha pode ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`);
    }
    if (newPassword !== confirmPassword) return setPwError("As duas senhas não são iguais.");

    busy.current = true;
    setSaving(true);
    setPwError(null);
    const result = await put({ password: newPassword });
    busy.current = false;
    setSaving(false);

    if (result.error) return setPwError(result.error);
    clearPassword();
    setShowPassword(false);
    setMustChangePassword(false);
    if (result.customer) setSaved(result.customer);
    setToast("Senha alterada");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (section === "seguranca") void changePassword();
    else if (editing) void saveProfile();
  };

  const logout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const isSecurity = section === "seguranca";
  const showSavebar = isSecurity || editing;
  const canEdit = !editing && (section === "dados" || section === "endereco");

  const tabs = SECTIONS.map((s) => (
    <button key={s.id} type="button" className="c-chip" aria-pressed={section === s.id} onClick={() => setSection(s.id)}>
      <s.Icon size={20} aria-hidden="true" />
      <span>{s.label}</span>
    </button>
  ));

  let body: React.ReactNode;
  if (section === "dados") {
    body = editing ? (
      <>
        <div className="c-fields2">
          <Field id="pf-name" label="Nome" value={form.name} onValue={(v) => setField({ name: v })} autoComplete="name" autoCapitalize="words" />
          <Field
            id="pf-phone"
            label="Telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onValue={(v) => setField({ phone: maskPhone(v) })}
          />
        </div>
        <div className="c-wa">
          <MessageCircle size={22} aria-hidden="true" />
          <span className="c-wa-t">
            <strong id="pf-wa-l">Este número é WhatsApp</strong>
            <small>Assim o estabelecimento pode te avisar por ele.</small>
          </span>
          <button
            type="button"
            className="c-switch"
            role="switch"
            aria-checked={form.phoneIsWhatsapp}
            aria-labelledby="pf-wa-l"
            onClick={() => setField({ phoneIsWhatsapp: !form.phoneIsWhatsapp })}
          />
        </div>
        <Field
          id="pf-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={form.email}
          onValue={(v) => setField({ email: v })}
        />
        <Field
          id="pf-doc"
          label="CPF ou CNPJ"
          inputMode="numeric"
          autoComplete="off"
          value={form.doc}
          onValue={(v) => setField({ doc: maskDoc(v) })}
        />
      </>
    ) : (
      <>
        <div className="c-fields2">
          <Info label="Nome" value={profile.name} />
          <Info label="Telefone" value={displayPhone(profile.phone)} whatsapp={profile.phoneIsWhatsapp === true} />
        </div>
        <Info label="Email" value={profile.email} />
        <Info label="CPF ou CNPJ" value={displayDoc(profile.doc)} />
      </>
    );
  } else if (section === "endereco") {
    const a = form.address;
    body = editing ? (
      <>
        <div className="c-fields-street">
          <Field id="pf-street" label="Rua" autoComplete="address-line1" value={a.street} onValue={(v) => setAddr({ street: v })} />
          <Field id="pf-number" label="Número" autoComplete="off" value={a.number} onValue={(v) => setAddr({ number: v })} />
        </div>
        <Field
          id="pf-complement"
          label="Complemento"
          autoComplete="address-line2"
          value={a.complement}
          onValue={(v) => setAddr({ complement: v })}
        />
        <div className="c-fields2">
          <Field
            id="pf-neighborhood"
            label="Bairro"
            autoComplete="address-level3"
            value={a.neighborhood}
            onValue={(v) => setAddr({ neighborhood: v })}
          />
          <Field
            id="pf-zip"
            label="CEP"
            inputMode="numeric"
            autoComplete="postal-code"
            value={a.zip}
            onValue={(v) => setAddr({ zip: maskCep(v) })}
          />
        </div>
        <div className="c-fields2">
          <Field id="pf-city" label="Cidade" autoComplete="address-level2" value={a.city} onValue={(v) => setAddr({ city: v })} />
          <SelectField
            id="pf-state"
            label="Estado"
            autoComplete="address-level1"
            placeholder="Selecione"
            options={UFS}
            value={a.state.toUpperCase()}
            onValue={(v) => setAddr({ state: v })}
          />
        </div>
      </>
    ) : (
      <>
        <div className="c-fields-street">
          <Info label="Rua" value={address.street} />
          <Info label="Número" value={address.number} />
        </div>
        <Info label="Complemento" value={address.complement} />
        <div className="c-fields2">
          <Info label="Bairro" value={address.neighborhood} />
          <Info label="CEP" value={displayCep(address.zip)} />
        </div>
        <div className="c-fields2">
          <Info label="Cidade" value={address.city} />
          <Info label="Estado" value={address.state?.toUpperCase()} />
        </div>
      </>
    );
  } else if (section === "seguranca") {
    const type = showPassword ? "text" : "password";
    body = (
      <>
        <div className="c-field">
          <label htmlFor="pf-newpw">Nova senha</label>
          <div className="c-inwrap">
            <input
              id="pf-newpw"
              type={type}
              autoComplete="new-password"
              aria-describedby="pf-newpw-hint"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
          <span id="pf-newpw-hint" className="c-field-hint">
            Mínimo de {MIN_PASSWORD_LENGTH} caracteres.
          </span>
        </div>
        <div className="c-field">
          <label htmlFor="pf-confirmpw">Confirmar nova senha</label>
          <input
            id="pf-confirmpw"
            type={type}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {pwError && (
          <p className="c-alert" role="alert">
            {pwError}
          </p>
        )}
        <div className="c-pout">
          <button type="button" className="c-btn is-ghost" onClick={logout}>
            <LogOut size={18} aria-hidden="true" />
            Sair da conta
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <div>
          <h2 className="c-psec-t">Tema do aplicativo</h2>
          <p className="c-psec-p">A escolha é salva neste aparelho.</p>
        </div>
        <ThemeChoice />
      </>
    );
  }

  const sectionTitle = SECTIONS.find((s) => s.id === section)?.title ?? "";

  return (
    <div className="c-profile">
      <header className="c-phead">
        <div className="c-pavatar">
          {/* tocar na foto também abre a folha; para teclado e leitor de tela vale o botão da câmera */}
          <span className="c-pavatar-pic" onClick={openPhoto}>
            <CustomerAvatar name={profile.name} imageUrl={imageUrl} size={desktop ? 96 : 64} />
          </span>
          <button ref={cameraRef} type="button" className="c-pavatar-cam" aria-label="Alterar foto do perfil" onClick={openPhoto}>
            <Camera size={20} aria-hidden="true" />
          </button>
        </div>
        <div>
          <h1>{profile.name}</h1>
          <small>{profile.email || displayPhone(profile.phone)}</small>
        </div>
      </header>

      <div className="c-pbody">
        <div className="c-ptabs" role="group" aria-label="Seção do perfil">
          {tabs}
        </div>
        <nav className="c-pnav" aria-label="Seção do perfil">
          {tabs}
        </nav>

        <form className="c-pmain" noValidate onSubmit={onSubmit}>
          <div className="c-pform" key={section}>
            {(section === "dados" || section === "endereco") && (
              <div className="c-psec-head">
                <h2 className="c-psec-t">{sectionTitle}</h2>
                {canEdit && (
                  <button type="button" className="c-btn is-ghost c-psec-edit" onClick={startEditing}>
                    <Pencil size={16} aria-hidden="true" />
                    Editar
                  </button>
                )}
              </div>
            )}
            {section === "seguranca" && <h2 className="c-sr">{sectionTitle}</h2>}
            {section === "seguranca" && forced && (
              <p className="c-alert is-warn" role="status">
                Sua senha foi criada pelo estabelecimento. Escolha uma senha só sua para continuar.
              </p>
            )}
            {body}
            {dataError && editing && !isSecurity && (
              <p className="c-alert" role="alert">
                {dataError}
              </p>
            )}
          </div>

          {showSavebar && (
            <div className="c-savebar">
              <button
                type="button"
                className="c-btn is-ghost"
                onClick={isSecurity ? clearPassword : cancelEditing}
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="submit" className="c-btn is-primary" aria-busy={saving}>
                {saving && <span className="c-spin" aria-hidden="true" />}
                {isSecurity ? (saving ? "Trocando…" : "Trocar senha") : saving ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          )}
        </form>
      </div>

      <ProfilePhotoSheet open={photoOpen} onClose={closePhoto} name={profile.name} onToast={setToast} />
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
