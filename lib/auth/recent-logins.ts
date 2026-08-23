/**
 * Últimos logins realizados neste dispositivo.
 *
 * Guarda apenas identificação (e-mail, nome, papel e avatar) para montar o
 * seletor de perfis da tela de login. Senha nunca é gravada.
 */

export const RECENT_LOGINS_STORAGE_KEY = "auth:recent-logins";

/** Chave da versão anterior, que salvava e-mail e senha em texto puro. */
const LEGACY_DESKTOP_LOGIN_KEY = "auth:desktop-saved-login";

/**
 * Três perfis mais o ladrilho "Outro e-mail" fecham exatamente a largura útil do
 * painel, sem quebrar para uma segunda linha.
 */
export const MAX_RECENT_LOGINS = 3;

export type LoginMethod = "password" | "facial";

export interface RecentLogin {
  email: string;
  name?: string | null;
  role?: string | null;
  image?: string | null;
  method: LoginMethod;
  lastLoginAt: string;
}

function isRecentLogin(value: unknown): value is RecentLogin {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RecentLogin>;
  return typeof candidate.email === "string" && candidate.email.trim().length > 0;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitize(entry: RecentLogin): RecentLogin {
  return {
    email: entry.email.trim(),
    name: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : null,
    role: typeof entry.role === "string" && entry.role.trim() ? entry.role.trim() : null,
    image: typeof entry.image === "string" && entry.image.trim() ? entry.image : null,
    method: entry.method === "facial" ? "facial" : "password",
    lastLoginAt:
      typeof entry.lastLoginAt === "string" && entry.lastLoginAt
        ? entry.lastLoginAt
        : new Date().toISOString(),
  };
}

function writeRecentLogins(entries: RecentLogin[]): RecentLogin[] {
  const trimmed = entries.slice(0, MAX_RECENT_LOGINS);

  try {
    window.localStorage.setItem(RECENT_LOGINS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Armazenamento indisponível (modo privado, cota cheia): a tela segue
    // funcionando, só não lembra os perfis.
  }

  return trimmed;
}

export function readRecentLogins(): RecentLogin[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(RECENT_LOGINS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed: unknown = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isRecentLogin)
      .map(sanitize)
      .sort((first, second) => second.lastLoginAt.localeCompare(first.lastLoginAt))
      .slice(0, MAX_RECENT_LOGINS);
  } catch {
    return [];
  }
}

/**
 * Registra um login bem-sucedido no topo da lista, substituindo a entrada
 * anterior do mesmo e-mail.
 */
export function rememberLogin(entry: Omit<RecentLogin, "lastLoginAt">): RecentLogin[] {
  if (typeof window === "undefined" || !entry.email?.trim()) {
    return [];
  }

  const normalized = sanitize({ ...entry, lastLoginAt: new Date().toISOString() });
  const others = readRecentLogins().filter(
    (candidate) => normalizeEmail(candidate.email) !== normalizeEmail(normalized.email)
  );

  return writeRecentLogins([normalized, ...others]);
}

export function forgetLogin(email: string): RecentLogin[] {
  if (typeof window === "undefined") {
    return [];
  }

  const remaining = readRecentLogins().filter(
    (candidate) => normalizeEmail(candidate.email) !== normalizeEmail(email)
  );

  return writeRecentLogins(remaining);
}

/**
 * Converte o login salvo pela versão anterior (e-mail + senha em texto puro) em
 * um perfil recente e apaga a chave antiga — a senha não é reaproveitada.
 */
export function migrateLegacyDesktopLogin(): RecentLogin[] {
  if (typeof window === "undefined") {
    return readRecentLogins();
  }

  let legacyEmail: string | null = null;

  try {
    const rawValue = window.localStorage.getItem(LEGACY_DESKTOP_LOGIN_KEY);

    if (rawValue) {
      const parsed = JSON.parse(rawValue) as { email?: unknown };
      legacyEmail = typeof parsed.email === "string" && parsed.email.trim() ? parsed.email : null;
    }
  } catch {
    legacyEmail = null;
  }

  try {
    window.localStorage.removeItem(LEGACY_DESKTOP_LOGIN_KEY);
  } catch {
    // Nada a fazer se o armazenamento estiver indisponível.
  }

  const current = readRecentLogins();

  if (!legacyEmail) {
    return current;
  }

  const alreadyKnown = current.some(
    (candidate) => normalizeEmail(candidate.email) === normalizeEmail(legacyEmail)
  );

  if (alreadyKnown) {
    return current;
  }

  return writeRecentLogins([
    sanitize({
      email: legacyEmail,
      method: "password",
      lastLoginAt: new Date(0).toISOString(),
    }),
    ...current,
  ]);
}

/** Nome exibido no ladrilho: nome cadastrado ou a parte local do e-mail. */
export function profileLabel(entry: RecentLogin): string {
  if (entry.name) {
    return entry.name;
  }

  return entry.email.split("@")[0] ?? entry.email;
}

/** Primeiro nome, para o botão "Entrar como ...". */
export function profileFirstName(entry: RecentLogin): string {
  return profileLabel(entry).split(" ")[0] ?? profileLabel(entry);
}

export function profileInitials(entry: RecentLogin): string {
  const source = profileLabel(entry).trim();
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function roleLabel(role?: string | null): string {
  if (role === "admin") {
    return "Administrador";
  }

  if (role === "pdv") {
    return "PDV";
  }

  return "";
}
