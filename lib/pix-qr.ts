/**
 * O PIX que vai impresso no papel.
 *
 * Quem recebe o dinheiro é o estabelecimento, e a chave sai das configurações —
 * nunca do pedido ou do cliente. Toda tela e todo papel que mostram um QR leem
 * daqui: se cada um resolvesse a chave por conta própria, o QR do balcão
 * poderia apontar para uma conta diferente do QR do fechamento, e o cliente
 * pagaria no lugar errado sem ninguém notar.
 *
 * Valores são sempre em centavos, como no resto do sistema.
 */

/** Chave PIX e identificação do recebedor, lidas das configurações. */
export type PixSettings = {
  key: string;
  merchantName: string;
  city: string;
};

/** O QR pronto para desenhar, junto do "copia e cola" equivalente. */
export type PixCharge = {
  /** Imagem do QR code em data URL (ou URL do fallback externo). */
  qrCodeUrl: string;
  /** O mesmo conteúdo do QR em texto, para quem precisa colar no banco. */
  payload: string;
};

export type ConfigEntry = { key: string; value: string | null };

const CEP = /^\d{5}-?\d{3}$/;

/**
 * Lê a chave PIX das configurações: a chave configurada e, na falta dela, o
 * celular do estabelecimento.
 */
export function readPixSettings(configs: ConfigEntry[]): PixSettings | null {
  const value = (key: string) => configs.find((config) => config.key === key)?.value?.trim() ?? "";

  const configured = value("payment_pix_key");
  const mobile = value("contact_phone_mobile");
  const key = configured || mobile.replace(/\D/g, "");
  if (!key) return null;

  const city = value("contact_address_city");

  return {
    key,
    merchantName: (value("branding_system_title") || "PIX").replace(/\s+/g, " ").slice(0, 25),
    // A cidade tem 15 caracteres no padrão do BR Code, e CEP no lugar da
    // cidade quebra a leitura em alguns bancos.
    city: city && !CEP.test(city) ? city.replace(/\s+/g, " ").slice(0, 15) : "BR",
  };
}

/** As configurações que as páginas de impressão podem ler sem ser admin. */
export async function fetchPublicConfigs(): Promise<ConfigEntry[]> {
  const response = await fetch("/api/config/public");
  if (!response.ok) return [];
  const configs = await response.json();
  return Array.isArray(configs) ? configs : [];
}

/**
 * Pede ao servidor o QR de um valor já fechado.
 *
 * Devolve `null` em qualquer tropeço — rede, chave inválida, valor zerado. O
 * papel sai sem QR, que é melhor que sair com um QR que não paga nada.
 */
export async function requestPixCharge(
  valorCents: number,
  settings: PixSettings,
): Promise<PixCharge | null> {
  if (!Number.isFinite(valorCents) || valorCents <= 0) return null;

  try {
    const response = await fetch("/api/pix/generate-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chavePix: settings.key,
        valorCents: Math.round(valorCents),
        nomeBeneficiario: settings.merchantName,
        cidade: settings.city,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.qrCodeUrl) return null;

    return { qrCodeUrl: data.qrCodeUrl, payload: data.payload ?? "" };
  } catch (error) {
    console.error("Erro ao gerar QR code PIX:", error);
    return null;
  }
}

/**
 * O caminho completo para uma página de impressão: lê as configurações e já
 * devolve o QR do valor, ou `null` quando não há chave nem valor a cobrar.
 */
export async function loadPixCharge(
  valorCents: number,
  configs?: ConfigEntry[],
): Promise<{ settings: PixSettings; charge: PixCharge } | null> {
  if (!Number.isFinite(valorCents) || valorCents <= 0) return null;

  const settings = readPixSettings(configs ?? (await fetchPublicConfigs()));
  if (!settings) return null;

  const charge = await requestPixCharge(valorCents, settings);
  if (!charge) return null;

  return { settings, charge };
}
