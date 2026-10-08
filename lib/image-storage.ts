import { del, put } from '@vercel/blob';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

/**
 * Onde as imagens enviadas ficam guardadas.
 *
 * Em produção é o Vercel Blob. Sem o token do Blob e fora da Vercel (desenvolvimento local e
 * o docker compose), cai num diretório do disco, servido por /api/local-uploads/[name]. Isso
 * existe para dar para testar o envio de fotos sem gravar no Blob de produção; na Vercel o
 * fallback nunca liga, porque lá o disco é só de leitura e a falta do token é um erro.
 */

const BLOB_HOST = 'blob.vercel-storage.com';
const LOCAL_URL_PREFIX = '/api/local-uploads/';

/** Só nomes que o próprio sistema gera: letras minúsculas, números, _ . - (sem barras). */
const SAFE_NAME = /^[a-z0-9][a-z0-9_.-]{0,120}$/;

export function localUploadDir(): string {
  return process.env.LOCAL_UPLOAD_DIR || path.join(os.tmpdir(), 'viandas-uploads');
}

export function isStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) || canUseLocalFallback();
}

function canUseLocalFallback(): boolean {
  return !process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL;
}

export function isSafeLocalName(name: string): boolean {
  return SAFE_NAME.test(name) && !name.includes('..');
}

/** Guarda a imagem e devolve a URL pública. Lança se não houver onde guardar. */
export async function storeImage(buffer: Buffer, filename: string, contentType = 'image/webp'): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(filename, buffer, { access: 'public', contentType });
    return blob.url;
  }

  if (!canUseLocalFallback()) {
    throw new Error('Serviço de upload não configurado.');
  }
  if (!isSafeLocalName(filename)) {
    throw new Error('Nome de arquivo inválido.');
  }

  const dir = localUploadDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);
  return `${LOCAL_URL_PREFIX}${filename}`;
}

/**
 * Apaga uma imagem que o sistema mesmo guardou. Ignora qualquer outra URL (imagem externa,
 * por exemplo) e nunca lança: apagar a antiga não pode derrubar a troca pela nova.
 */
export async function removeStoredImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (url.includes(BLOB_HOST)) {
      if (process.env.BLOB_READ_WRITE_TOKEN) await del(url);
      return;
    }
    if (url.startsWith(LOCAL_URL_PREFIX)) {
      const name = url.slice(LOCAL_URL_PREFIX.length);
      if (isSafeLocalName(name)) await fs.unlink(path.join(localUploadDir(), name));
    }
  } catch {
    // A imagem pode já ter sido apagada; o importante é a nova ter sido gravada.
  }
}
