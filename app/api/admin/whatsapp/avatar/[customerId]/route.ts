import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/staff-session';
import { loadAvatar } from '@/lib/whatsapp-avatar-service';

// GET - A foto de perfil do WhatsApp do cliente (usada na lista de conversas quando o cadastro não tem foto).
// Só administrador: foto de cliente é dado pessoal. 404 quando o contato não tem foto ou a escondeu.
export async function GET(_request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { customerId } = await params;
  try {
    const file = await loadAvatar(customerId);
    if (!file) return new Response(null, { status: 404, headers: { 'Cache-Control': 'private, max-age=3600' } });
    return new Response(new Uint8Array(file.data), {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Content-Length': String(file.data.length),
        'Cache-Control': 'private, max-age=21600',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    console.error('Error loading whatsapp avatar:', error);
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'private, max-age=60' } });
  }
}
