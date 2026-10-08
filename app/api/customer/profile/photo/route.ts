import { getCustomerSession } from '@/lib/customer-auth';
import { isStorageConfigured, removeStoredImage, storeImage } from '@/lib/image-storage';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

// A tela já manda a foto recortada e reduzida; o limite só barra arquivos absurdos
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_INPUT_PIXELS = 50_000_000;
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp', 'gif'];
const AVATAR_SIZE = 512;

// POST - O cliente troca a própria foto. Corpo: multipart com o campo "file".
//
// A foto é a mesma que o admin vê no cadastro do cliente (Customer.imageUrl): trocar aqui
// troca lá, e o contrário também. A foto antiga vem sempre do banco, nunca de uma URL
// enviada pelo navegador, para ninguém conseguir apagar a imagem de outra pessoa.
export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!isStorageConfigured()) {
      return NextResponse.json({ error: 'O envio de fotos não está disponível agora.' }, { status: 503 });
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Escolha uma foto para enviar.' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'A foto está vazia.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'A foto é grande demais. O máximo é 5 MB.' }, { status: 413 });
    }

    const input = Buffer.from(await file.arrayBuffer());

    // O tipo declarado pelo navegador não vale: o que decide é o conteúdo do arquivo
    let optimized: Buffer;
    try {
      const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' });
      const meta = await image.metadata();
      if (!meta.format || !ALLOWED_FORMATS.includes(meta.format)) {
        return NextResponse.json({ error: 'Use uma foto JPEG, PNG, WebP ou GIF.' }, { status: 415 });
      }
      optimized = await image
        .rotate() // respeita a orientação gravada pelo celular
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'attention' })
        .webp({ quality: 85 }) // metadados (inclusive localização) ficam de fora
        .toBuffer();
    } catch {
      return NextResponse.json({ error: 'Não foi possível ler essa foto. Tente outra.' }, { status: 400 });
    }

    const customerId = session.user.customerId;
    const stamp = crypto.createHash('sha1').update(optimized).update(String(Date.now())).digest('hex').slice(0, 24);
    const filename = `customer_${stamp}.webp`;

    const current = await prisma.customer.findUnique({ where: { id: customerId }, select: { imageUrl: true } });
    const imageUrl = await storeImage(optimized, filename);

    await prisma.customer.update({ where: { id: customerId }, data: { imageUrl } });
    // Só depois de a nova estar salva é que a antiga some
    await removeStoredImage(current?.imageUrl);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading customer photo:', error);
    return NextResponse.json({ error: 'Não foi possível salvar a foto agora. Tente de novo.' }, { status: 500 });
  }
}

// DELETE - O cliente tira a própria foto; volta a aparecer com as iniciais.
export async function DELETE() {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const customerId = session.user.customerId;
    const current = await prisma.customer.findUnique({ where: { id: customerId }, select: { imageUrl: true } });

    await prisma.customer.update({ where: { id: customerId }, data: { imageUrl: null } });
    await removeStoredImage(current?.imageUrl);

    return NextResponse.json({ imageUrl: null });
  } catch (error) {
    console.error('Error removing customer photo:', error);
    return NextResponse.json({ error: 'Não foi possível remover a foto agora. Tente de novo.' }, { status: 500 });
  }
}
