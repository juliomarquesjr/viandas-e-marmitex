// O número de WhatsApp é de um cliente só (servidor).
//
// Vale entre clientes ativos com o telefone marcado como WhatsApp. O número é comparado pelo DDD + últimos
// 8 dígitos, como no login: máscara, "+55", zero na frente e o nono dígito não permitem repetir o número.
// Cliente inativo não prende o número (ele pode ser usado por outro cadastro).

import prisma from '@/lib/prisma';
import { parseLoginIdentifier, storedPhoneMatches } from '@/lib/customer-login-id';

export interface WhatsappConflict {
  id: string;
  name: string;
}

/** Outro cliente ativo já usa este número como WhatsApp? `exceptId` é o próprio cliente, na edição. */
export async function findWhatsappConflict(phone: string | null | undefined, exceptId?: string): Promise<WhatsappConflict | null> {
  const login = parseLoginIdentifier(phone ?? '');
  if (!login || login.kind !== 'phone') return null; // não é um celular com DDD: não há como comparar
  const rows = await prisma.$queryRaw<{ id: string; name: string; phone: string }[]>`
    SELECT id, name, phone FROM "Customer"
    WHERE active = true AND "phoneIsWhatsapp" = true AND phone IS NOT NULL
      AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) = ${login.tail}
      AND (${exceptId ?? null}::text IS NULL OR id <> ${exceptId ?? null}::text)`;
  const hit = rows.find((row) => storedPhoneMatches(row.phone, login));
  return hit ? { id: hit.id, name: hit.name } : null;
}

export const WHATSAPP_TAKEN_STAFF = (name: string) => `Este número de WhatsApp já está cadastrado para ${name}.`;
/** Para o próprio cliente: não diz de quem é o outro cadastro. */
export const WHATSAPP_TAKEN_CUSTOMER = 'Este número de WhatsApp já está em uso em outro cadastro.';
