import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/staff-session';
import { loadMedia, MediaError } from '@/lib/whatsapp-media-service';
import { parseRange } from '@/lib/whatsapp-media';

// GET - O arquivo (foto, áudio, vídeo, documento) de uma mensagem da conversa, buscado na Evolution na hora.
// Só administrador: foto de cliente é dado pessoal. Aceita Range para o vídeo e o áudio poderem avançar.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  try {
    const file = await loadMedia(id);
    const size = file.data.length;
    const range = parseRange(request.headers.get('range'), size);
    const headers: Record<string, string> = {
      'Content-Type': file.contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Content-Disposition': `${file.inline ? 'inline' : 'attachment'}; filename="${file.fileName}"`,
    };
    if (range === 'invalid') return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } });
    if (range) {
      const part = file.data.subarray(range.start, range.end + 1);
      return new Response(new Uint8Array(part), {
        status: 206,
        headers: { ...headers, 'Content-Length': String(part.length), 'Content-Range': `bytes ${range.start}-${range.end}/${size}` },
      });
    }
    return new Response(new Uint8Array(file.data), { status: 200, headers: { ...headers, 'Content-Length': String(size) } });
  } catch (error) {
    if (error instanceof MediaError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Error loading whatsapp media:', error);
    return NextResponse.json({ error: 'Erro ao buscar o arquivo' }, { status: 500 });
  }
}
