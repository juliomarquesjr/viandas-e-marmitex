import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/staff-session';
import { ensureFresh } from '@/lib/whatsapp-service';
import {
  createAndStorePassword,
  loadContact,
  matchesStoredPassword,
  parseChannels,
  passwordOptions,
  sendPasswordMessage,
} from '@/lib/messages/customer-password';

const NO_STORE = { 'Cache-Control': 'no-store' };
type Ctx = { params: Promise<{ id: string }> };

// GET - O que o cliente tem (WhatsApp/e-mail) e o que está funcionando agora
export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireStaff();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  try {
    const customer = await loadContact(id);
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    await ensureFresh();
    return NextResponse.json({ name: customer.name, options: await passwordOptions(customer) }, { headers: NO_STORE });
  } catch (error) {
    console.error('Error loading password options:', error);
    return NextResponse.json({ error: 'Erro ao verificar os canais de envio' }, { status: 500 });
  }
}

// POST { channels, password? } - Gera uma senha nova e avisa o cliente.
// Com `password`, só reenvia a senha já gravada (ex.: "tentar de novo" depois de uma falha).
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireStaff();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) ?? {};
  const channels = parseChannels(body.channels);
  try {
    const customer = await loadContact(id);
    if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

    let password: string;
    if (typeof body.password === 'string' && body.password) {
      if (!(await matchesStoredPassword(id, body.password))) {
        return NextResponse.json({ error: 'Esta senha não é mais a atual do cliente. Gere uma nova.' }, { status: 409 });
      }
      password = body.password;
    } else {
      password = await createAndStorePassword(id);
    }
    const results = await sendPasswordMessage(customer, password, channels);
    return NextResponse.json({ password, results }, { headers: NO_STORE });
  } catch (error) {
    console.error('Error sending customer password:', error);
    return NextResponse.json({ error: 'Erro ao gerar a senha' }, { status: 500 });
  }
}
