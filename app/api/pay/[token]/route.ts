import { getCustomerBalance } from '@/lib/customer-balance';
import { verifyPaymentToken } from '@/lib/payment-link';
import { registerPaymentIntent } from '@/lib/payment-intent-service';
import prisma from '@/lib/prisma';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';

// Página do link de pagamento (sem login): quem tem o link vê o saldo da ficha e avisa de um PIX.
// O código do link é assinado (lib/payment-link.ts): sem ele válido não se descobre nada sobre cliente nenhum.

const NO_STORE = { 'Cache-Control': 'no-store' };
type Ctx = { params: Promise<{ token: string }> };

export interface PayLinkInfo {
  /** Primeiro nome do cliente. */
  name: string;
  /** O que o cliente deve na ficha (0 se estiver em dia ou com crédito). */
  balanceCents: number;
  /** Avisos de PIX que o cliente já fez e o estabelecimento ainda não conferiu. */
  pending: { amountCents: number; createdAt: string }[];
}

const INVALID = { error: 'Este link de pagamento não é válido. Peça um novo ao estabelecimento.', reason: 'invalid' } as const;
const EXPIRED = { error: 'Este link de pagamento venceu. Peça um novo ao estabelecimento.', reason: 'expired' } as const;

function limited(request: Request, scope: string, max: number): NextResponse | null {
  const result = checkRateLimit(`pay:${scope}:${getClientIP(request)}`, max, 60_000);
  if (result.allowed) return null;
  return NextResponse.json({ error: 'Muitas tentativas. Aguarde um minuto e tente de novo.' }, { status: 429, headers: { ...NO_STORE, 'Retry-After': '60' } });
}

// GET - Nome, saldo da ficha e avisos de PIX aguardando conferência
export async function GET(request: Request, { params }: Ctx) {
  const tooMany = limited(request, 'info', 60);
  if (tooMany) return tooMany;
  try {
    const { token } = await params;
    const checked = verifyPaymentToken(token);
    if (!checked.ok) return NextResponse.json(checked.reason === 'expired' ? EXPIRED : INVALID, { status: checked.reason === 'expired' ? 410 : 404, headers: NO_STORE });

    const customer = await prisma.customer.findUnique({ where: { id: checked.customerId }, select: { name: true } });
    if (!customer) return NextResponse.json(INVALID, { status: 404, headers: NO_STORE });

    const [{ balanceCents }, pending] = await Promise.all([
      getCustomerBalance(checked.customerId),
      prisma.paymentIntent.findMany({ where: { customerId: checked.customerId, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 5, select: { amountCents: true, createdAt: true } }),
    ]);
    const info: PayLinkInfo = {
      name: customer.name.trim().split(/\s+/)[0] || customer.name,
      balanceCents: Math.max(0, balanceCents),
      pending: pending.map((p) => ({ amountCents: p.amountCents, createdAt: p.createdAt.toISOString() })),
    };
    return NextResponse.json(info, { headers: NO_STORE });
  } catch (error) {
    console.error('Error loading payment link:', error);
    return NextResponse.json({ error: 'Não foi possível abrir o link agora. Tente de novo.' }, { status: 500, headers: NO_STORE });
  }
}

// POST - "Já paguei": avisa o estabelecimento de um PIX de { amountCents } (o mesmo aviso da área do cliente)
export async function POST(request: Request, { params }: Ctx) {
  const tooMany = limited(request, 'inform', 12);
  if (tooMany) return tooMany;
  try {
    const { token } = await params;
    const checked = verifyPaymentToken(token);
    if (!checked.ok) return NextResponse.json(checked.reason === 'expired' ? EXPIRED : INVALID, { status: checked.reason === 'expired' ? 410 : 404, headers: NO_STORE });

    const body = (await request.json().catch(() => null)) ?? {};
    const result = await registerPaymentIntent(checked.customerId, body.amountCents);
    return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
  } catch (error) {
    console.error('Error informing payment by link:', error);
    return NextResponse.json({ error: 'Não foi possível avisar o estabelecimento agora. Tente de novo.' }, { status: 500, headers: NO_STORE });
  }
}
