// Busca, na hora, o arquivo de uma mensagem da conversa (servidor). Nada é gravado: a Evolution é a fonte.

import prisma from '@/lib/prisma';
import { EvolutionError, fetchMedia, instanceName } from '@/lib/evolution';
import { classifyMedia, decodeBase64Media, isMediaMessageType, MAX_MEDIA_BYTES, safeFileName } from '@/lib/whatsapp-media';

export interface MediaFile {
  data: Buffer;
  contentType: string;
  inline: boolean;
  fileName: string;
}

export class MediaError extends Error {
  constructor(
    public status: 404 | 413 | 502 | 503,
    message: string
  ) {
    super(message);
  }
}

// Guarda por poucos minutos só para o vídeo/áudio poder pedir pedaços (Range) sem buscar tudo de novo na Evolution.
const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 6;
const cache = new Map<string, { at: number; file: MediaFile }>();

function remember(id: string, file: MediaFile) {
  const now = Date.now();
  for (const [key, entry] of cache) if (now - entry.at > TTL_MS) cache.delete(key);
  while (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(id, { at: now, file });
}

export async function loadMedia(messageId: string): Promise<MediaFile> {
  const hit = cache.get(messageId);
  if (hit && Date.now() - hit.at <= TTL_MS) return hit.file;

  const row = await prisma.whatsAppMessage.findUnique({ where: { id: messageId }, select: { externalId: true, type: true, body: true } });
  if (!row || !row.externalId || !isMediaMessageType(row.type)) throw new MediaError(404, 'Este arquivo não está disponível.');

  let media;
  try {
    media = await fetchMedia(instanceName(), row.externalId);
  } catch (error) {
    if (error instanceof EvolutionError) {
      if (error.code === 'not_configured') throw new MediaError(503, 'O WhatsApp não está configurado neste ambiente.');
      if (error.code === 'unreachable' || error.code === 'server' || error.code === 'unauthorized') throw new MediaError(502, 'Não deu para buscar o arquivo no WhatsApp agora.');
      throw new MediaError(404, 'O arquivo não está mais disponível no WhatsApp.');
    }
    throw error;
  }

  const data = decodeBase64Media(media.base64);
  if (data.length === 0) throw new MediaError(404, 'O arquivo veio vazio.');
  if (data.length > MAX_MEDIA_BYTES) throw new MediaError(413, 'Arquivo grande demais para abrir aqui. Veja no celular do estabelecimento.');

  const { contentType, inline } = classifyMedia(media.mimetype, row.type);
  const file: MediaFile = { data, contentType, inline, fileName: safeFileName(media.fileName ?? row.body, `arquivo-${row.type}`) };
  remember(messageId, file);
  return file;
}
