// Troca de variáveis, validação dos textos e máscaras. Puro: sem banco e sem rede.

import { MESSAGE_LIMITS, type MessageChannel, type MessageTypeDef } from './registry';

const VARIABLE_RE = /\{([a-z_]+)\}/g;

/** Substitui {variável} pelo valor. Variável sem valor informado fica como está. */
export function renderTemplate(text: string, values: Record<string, string>): string {
  return text.replace(VARIABLE_RE, (match, key: string) => (key in values ? values[key] : match));
}

export function usedVariables(text: string): string[] {
  return [...new Set([...text.matchAll(VARIABLE_RE)].map((m) => m[1]))];
}

export interface TemplateInput {
  enabled: boolean;
  subject: string | null;
  body: string;
}

export type TemplateValidation = { ok: true; value: TemplateInput } | { ok: false; error: string };

/** Valida o texto que o administrador escreveu: tamanho, variáveis que existem e as obrigatórias. */
export function validateTemplate(type: MessageTypeDef, channel: MessageChannel, raw: unknown): TemplateValidation {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Texto inválido.' };
  const input = raw as Record<string, unknown>;
  const body = typeof input.body === 'string' ? input.body.replace(/\r\n/g, '\n').trim() : '';
  const subject = typeof input.subject === 'string' ? input.subject.replace(/\s+/g, ' ').trim() : '';
  const max = channel === 'whatsapp' ? MESSAGE_LIMITS.BODY_WHATSAPP : MESSAGE_LIMITS.BODY_EMAIL;

  if (!body) return { ok: false, error: 'Escreva o texto da mensagem.' };
  if (body.length > max) return { ok: false, error: `O texto pode ter até ${max} caracteres.` };
  if (channel === 'email') {
    if (!subject) return { ok: false, error: 'Escreva o assunto do e-mail.' };
    if (subject.length > MESSAGE_LIMITS.SUBJECT) return { ok: false, error: `O assunto pode ter até ${MESSAGE_LIMITS.SUBJECT} caracteres.` };
  }

  const allowed = new Set(type.variables.map((v) => v.key));
  const unknown = usedVariables(`${subject}\n${body}`).filter((v) => !allowed.has(v));
  if (unknown.length > 0) {
    return { ok: false, error: `Variável desconhecida: ${unknown.map((v) => `{${v}}`).join(', ')}. Use só as que aparecem abaixo do texto.` };
  }
  const missing = type.required.filter((v) => !usedVariables(body).includes(v));
  if (missing.length > 0) {
    return { ok: false, error: `O texto precisa ter ${missing.map((v) => `{${v}}`).join(' e ')}, senão a mensagem perde o sentido.` };
  }
  return { ok: true, value: { enabled: input.enabled !== false, subject: channel === 'email' ? subject : null, body } };
}

/** "5562999998888" → "+55 (62) 9••••-8888" */
export function maskPhone(number: string): string {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(number);
  if (!m) return number.length > 4 ? `${'•'.repeat(number.length - 4)}${number.slice(-4)}` : number;
  return `+55 (${m[1]}) ${m[2][0]}${'•'.repeat(m[2].length - 1)}-${m[3]}`;
}

/** "maria.souza@email.com" → "m•••@email.com" */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '•••';
  return `${user[0] ?? ''}•••@${domain}`;
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Texto simples do modelo → HTML de e-mail (parágrafos, quebras de linha e links clicáveis). */
export function emailBodyToHtml(text: string, storeName: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => {
      const html = escapeHtml(p).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#2563eb;word-break:break-all;">$1</a>');
      return `<p style="margin:0 0 16px;">${html}</p>`;
    })
    .join('');
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;"><div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#2563eb;color:#ffffff;padding:18px 24px;font-size:18px;font-weight:bold;">${escapeHtml(storeName)}</div><div style="padding:24px;line-height:1.6;font-size:15px;">${paragraphs}</div></div></body></html>`;
}
