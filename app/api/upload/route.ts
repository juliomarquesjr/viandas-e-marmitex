import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
      const formData = await request.formData();
      console.log('FormData recebido:', [...formData.entries()]);
      
      const file = formData.get('file') as File;
      console.log('Arquivo recebido:', file?.name, file?.size, file?.type);

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

      // Fazer upload para o Vercel Blob
      console.log('Iniciando upload para Vercel Blob');
      const blob = await put(file.name, file, {
        access: 'public',
      });
      console.log('Upload concluído:', blob.url);

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