import { isSafeLocalName, localUploadDir } from '@/lib/image-storage';
import { promises as fs } from 'fs';
import path from 'path';

// GET - Serve imagens do armazenamento local de desenvolvimento (ver lib/image-storage.ts).
// Fora de desenvolvimento não há arquivos aqui: com o token do Blob, as URLs apontam para o Blob.
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  // Só nomes gerados pelo sistema, sem barras nem ".."
  if (!isSafeLocalName(name) || !name.endsWith('.webp')) {
    return new Response('Não encontrado', { status: 404 });
  }

  try {
    const file = await fs.readFile(path.join(localUploadDir(), name));
    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': 'image/webp',
        // O nome muda a cada envio, então pode ser guardado para sempre
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Não encontrado', { status: 404 });
  }
}
