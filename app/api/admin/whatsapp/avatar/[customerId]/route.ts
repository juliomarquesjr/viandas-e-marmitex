import crypto from 'crypto';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { isStorageConfigured, storeImage } from '@/lib/image-storage';
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

// POST - Guarda a foto do WhatsApp do cliente como foto de cadastro e devolve a URL.
// Só grava o arquivo: quem põe a URL no cadastro é o formulário, quando o administrador salva (e é aí que a foto
// antiga é apagada). Não recebe nada do cliente além do id: a imagem é a mesma que a prévia mostrou (vem do servidor).
export async function POST(_request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { customerId } = await params;
  try {
    if (!isStorageConfigured()) {
      return NextResponse.json({ error: 'Serviço de upload não configurado. Contate o administrador.' }, { status: 500 });
    }
    const file = await loadAvatar(customerId);
    if (!file) {
      return NextResponse.json({ error: 'Esta pessoa não tem foto no WhatsApp (ou a manteve escondida).' }, { status: 404 });
    }
    const optimized = await sharp(file.data)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    const hash = crypto.createHash('md5').update(file.data).digest('hex').slice(0, 16);
    const stamp = crypto.createHash('md5').update(String(Date.now())).digest('hex').slice(0, 8);
    const url = await storeImage(optimized, `customer_${hash}_${stamp}.webp`);
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error saving whatsapp avatar:', error);
    return NextResponse.json({ error: 'Não foi possível guardar a foto agora. Tente de novo.' }, { status: 500 });
  }
}
