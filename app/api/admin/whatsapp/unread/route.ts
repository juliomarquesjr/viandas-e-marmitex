import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/staff-session';
import { unreadTotal } from '@/lib/whatsapp-chat-service';

// GET - Quantas conversas têm mensagem nova (o número do menu lateral)
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ count: 0 });
  try {
    return NextResponse.json({ count: await unreadTotal() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
