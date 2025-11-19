import { authOptions } from '@/lib/auth';
import { del, put } from '@vercel/blob';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

// Function to generate hash-based filename
function generateHashedFilename(originalName: string, fileBuffer: Buffer): string {
  // Get file extension
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  
  // Generate hash from file content and timestamp
  const timestamp = Date.now().toString();
  const contentHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
  const timeHash = crypto.createHash('md5').update(timestamp).digest('hex').substring(0, 8);
  
  // Combine hashes to create unique filename
  const hashedName = `product_${contentHash.substring(0, 16)}_${timeHash}.webp`; // Always use WebP for optimization
  
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
      .webp({ quality: 85 }) // Convert to WebP with 85% quality
      .toBuffer();
    
    return optimizedBuffer;
  } catch (error) {
    console.error('Error optimizing image:', error);
    // Fallback: return original buffer
    return fileBuffer;
  }
}

export async function POST(request: Request) {
  console.log('Recebendo requisição de upload');
  
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    console.log('Sessão:', session);
    
    if (!session || session.user.role !== 'admin') {
      console.log('Upload não autorizado:', session?.user.role);
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
      console.log('Lendo formData');
      const formData = await request.formData() as unknown as FormData;
      console.log('FormData recebido:', [...formData.entries()]);
      
      const file = formData.get('file') as File;
      const oldImageUrl = formData.get('oldImageUrl') as string;
      console.log('Arquivo recebido:', file?.name, file?.size, file?.type);
      console.log('URL da imagem antiga:', oldImageUrl);

      if (!file) {
        console.log('Nenhum arquivo enviado');
        return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
      }

      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        console.log('Tipo de arquivo não suportado:', file.type);
        return NextResponse.json({ 
          error: `Tipo de arquivo não suportado: ${file.type}. Use JPEG, PNG, WebP ou GIF.` 
        }, { status: 400 });
      }

      // Validar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.log('Arquivo muito grande:', file.size);
        return NextResponse.json({ 
          error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo permitido: 5MB.` 
        }, { status: 400 });
      }

      // Verificar se a variável de ambiente está configurada
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.log('Token do Vercel Blob não configurado');
        return NextResponse.json({ 
          error: 'Serviço de upload não configurado. Contate o administrador.' 
        }, { status: 500 });
      }

      // Convert file to buffer for hashing and optimization
      const arrayBuffer = await file.arrayBuffer();
      const originalBuffer = Buffer.from(arrayBuffer);
      
      // Optimize the image
      console.log('Optimizing image...');
      const optimizedBuffer = await optimizeImage(originalBuffer);
      console.log(`Image optimized: ${originalBuffer.length} bytes -> ${optimizedBuffer.length} bytes`);
      
      // Generate hashed filename
      const hashedFilename = generateHashedFilename(file.name, originalBuffer);
      console.log('Generated filename:', hashedFilename);

      // Upload optimized buffer directly to Vercel Blob
      console.log('Iniciando upload para Vercel Blob');
      const blob = await put(hashedFilename, optimizedBuffer, {
        access: 'public',
        contentType: 'image/webp'
      });
      console.log('Upload concluído:', blob.url);

      // Delete old image if it exists and upload was successful
      if (oldImageUrl && oldImageUrl.trim()) {
        try {
          console.log('Deletando imagem antiga:', oldImageUrl);
          
          // Verificar se a URL é válida do Vercel Blob
          if (oldImageUrl.includes('blob.vercel-storage.com')) {
            await del(oldImageUrl);
            console.log('Imagem antiga deletada com sucesso do Vercel Blob');
          } else {
            console.warn('URL da imagem antiga não é do Vercel Blob, pulando remoção:', oldImageUrl);
          }
        } catch (deleteError) {
          console.warn('Aviso: Não foi possível deletar a imagem antiga:', deleteError);
          // Don't fail the upload if old image deletion fails
        }
      }

      return NextResponse.json({ url: blob.url });
    } catch (formError: any) {
      console.error('Erro ao processar formData:', formError);
      console.error('Stack trace:', formError.stack);
      
      // Verificar se é um erro específico do Vercel Blob
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
    console.error('Stack trace:', error.stack);
    return NextResponse.json({ 
      error: 'Falha no upload: ' + (error.message || 'Erro desconhecido') 
    }, { status: 500 });
  }
}

// DELETE - Remove image from Vercel Blob storage
export async function DELETE(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL da imagem é obrigatória' }, { status: 400 });
    }

    try {
      console.log('Deletando imagem:', imageUrl);
      
      // Verificar se a URL é válida do Vercel Blob
      if (!imageUrl.includes('blob.vercel-storage.com')) {
        console.warn('URL não é do Vercel Blob:', imageUrl);
        return NextResponse.json({ 
          error: 'URL da imagem não é válida para remoção' 
        }, { status: 400 });
      }
      
      await del(imageUrl);
      console.log('Imagem deletada com sucesso do Vercel Blob');
      return NextResponse.json({ message: 'Imagem deletada com sucesso' });
    } catch (deleteError) {
      console.error('Erro ao deletar imagem:', deleteError);
      return NextResponse.json({ 
        error: 'Não foi possível deletar a imagem: ' + (deleteError instanceof Error ? deleteError.message : 'Erro desconhecido')
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Erro na requisição DELETE:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}