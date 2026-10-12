import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/staff-session';
import { parsePeriod, prepareClosing, sendClosing, validatePdfBase64 } from '@/lib/messages/closing-send';
import { isMessageChannel, type MessageChannel } from '@/lib/messages/registry';

const NO_STORE = { 'Cache-Control': 'no-store' };
type Ctx = { params: Promise<{ id: string }> };

const select = { id: true, name: true, email: true, phone: true, phoneIsWhatsapp: true } as const;

// GET ?startDate=AAAA-MM-DD&endDate=AAAA-MM-DD&includeLink=1 - quem pode receber o fechamento, o saldo e o texto de cada canal
export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const url = new URL(request.url);
  const period = parsePeriod(url.searchParams.get('startDate'), url.searchParams.get('endDate'));
  if (!period) return NextResponse.json({ error: 'Período inválido.' }, { status: 400, headers: NO_STORE });
  try {
    const customer = await prisma.customer.findUnique({ where: { id }, select });
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404, headers: NO_STORE });
    const prepared = await prepareClosing(customer, period, url.searchParams.get('includeLink') !== '0');
    return NextResponse.json({ name: customer.name, ...prepared }, { headers: NO_STORE });
  } catch (error) {
    console.error('Error preparing closing send:', error);
    return NextResponse.json({ error: 'Erro ao preparar o envio do fechamento' }, { status: 500, headers: NO_STORE });
  }
}

// POST { startDate, endDate, includeLink, channels: ["whatsapp","email"], pdfBase64 } - envia o PDF do fechamento
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const period = parsePeriod(body?.startDate, body?.endDate);
  if (!period) return NextResponse.json({ error: 'Período inválido.' }, { status: 400, headers: NO_STORE });

  const channels = Array.isArray(body?.channels) ? [...new Set(body.channels.filter(isMessageChannel))] : [];
  if (channels.length === 0) return NextResponse.json({ error: 'Escolha por onde enviar.' }, { status: 400, headers: NO_STORE });

  const pdf = validatePdfBase64(body?.pdfBase64);
  if (!pdf.ok) return NextResponse.json({ error: pdf.error }, { status: pdf.status, headers: NO_STORE });

  try {
    const customer = await prisma.customer.findUnique({ where: { id }, select });
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404, headers: NO_STORE });
    const results = await sendClosing(customer, {
      period,
      channels: channels as MessageChannel[],
      includeLink: body?.includeLink !== false,
      pdfBase64: body?.pdfBase64 as string,
    });
    return NextResponse.json({ results }, { headers: NO_STORE });
  } catch (error) {
    console.error('Error sending closing report:', error);
    return NextResponse.json({ error: 'Erro ao enviar o fechamento' }, { status: 500, headers: NO_STORE });
  }
}
