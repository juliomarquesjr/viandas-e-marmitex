import { authOptions } from '@/lib/auth';
import { del, put } from '@vercel/blob';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

// Function to generate hash-based filename for facial images
function generateHashedFilename(originalName: string, fileBuffer: Buffer): string {
  const timestamp = Date.now().toString();
  const contentHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
  const timeHash = crypto.createHash('md5').update(timestamp).digest('hex').substring(0, 8);
  
  // Use facial-login directory prefix
  const hashedName = `facial-login/face_${contentHash.substring(0, 16)}_${timeHash}.webp`;
  
  return hashedName;
}

// Function to optimize image using Sharp
async function optimizeImage(fileBuffer: Buffer, maxWidth: number = 800, maxHeight: number = 800): Promise<Buffer> {
  try {
    const optimizedBuffer = await sharp(fileBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toBuffer();
    
    return optimizedBuffer;
  } catch (error) {
    console.error('Error optimizing image:', error);
    return fileBuffer;
  }
}

export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
      const formData = await request.formData() as unknown as FormData;
      
      const file = formData.get('file') as File;
      const oldImageUrl = formData.get('oldImageUrl') as string;
      const userId = formData.get('userId') as string;

      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
      }

      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ 
          error: `Tipo de arquivo não suportado: ${file.type}. Use JPEG, PNG, WebP ou GIF.` 
        }, { status: 400 });
      }

      // Validar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ 
          error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo permitido: 5MB.` 
        }, { status: 400 });
      }

      // Verificar se a variável de ambiente está configurada
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ 
          error: 'Serviço de upload não configurado. Contate o administrador.' 
        }, { status: 500 });
      }

      // Convert file to buffer for hashing and optimization
      const arrayBuffer = await file.arrayBuffer();
      const originalBuffer = Buffer.from(arrayBuffer);
      
      // Optimize the image
      const optimizedBuffer = await optimizeImage(originalBuffer);

      // Generate hashed filename with facial-login directory
      const hashedFilename = generateHashedFilename(file.name, originalBuffer);

      // Upload optimized buffer directly to Vercel Blob
      const blob = await put(hashedFilename, optimizedBuffer, {
        access: 'public',
        contentType: 'image/webp'
      });

      // Delete old image if it exists and upload was successful
      if (oldImageUrl && oldImageUrl.trim()) {
        try {
          // Verificar se a URL é válida do Vercel Blob
          if (oldImageUrl.includes('blob.vercel-storage.com')) {
            await del(oldImageUrl);
          }
        } catch (deleteError) {
          console.warn('Aviso: Não foi possível deletar a imagem antiga:', deleteError);
        }
      }

      return NextResponse.json({ url: blob.url });
    } catch (formError: any) {
      console.error('Erro ao processar formData:', formError);
      
      if (formError.message && formError.message.includes('BLOB_READ_WRITE_TOKEN')) {
        return NextResponse.json({ 
          error: 'Serviço de upload não configurado corretamente.' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Erro ao processar o arquivo: ' + (formError.message || 'Erro desconhecido') 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Erro no upload:', error);
    return NextResponse.json({ 
      error: 'Falha no upload: ' + (error.message || 'Erro desconhecido') 
    }, { status: 500 });
  }
}

