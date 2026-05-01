import { generateBackupContent, formatBytes } from '@/lib/backup/generate';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(req: Request) {
  let client: Client | null = null;

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem criar backups.' },
        { status: 403 }
      );
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json({ error: 'DATABASE_URL não configurada' }, { status: 500 });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `backup-viandas-${dateStr}_${timeStr}.sql`;

    console.log('[BACKUP] Iniciando backup do banco de dados...');
    const startTime = Date.now();

    client = new Client({ connectionString: databaseUrl });
    await client.connect();

    const backupContent = await generateBackupContent(client);

    if (!backupContent || backupContent.length === 0) {
      return NextResponse.json({ error: 'Backup vazio ou inválido' }, { status: 500 });
    }

    const sizeBytes = Buffer.byteLength(backupContent, 'utf8');
    const elapsedTime = Date.now() - startTime;
    console.log(`[BACKUP] Backup criado com sucesso: ${formatBytes(sizeBytes)} em ${elapsedTime}ms`);

    return new NextResponse(backupContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': sizeBytes.toString(),
      },
    });
  } catch (error: any) {
    console.error('[BACKUP] Erro inesperado:', error);
    return NextResponse.json(
      { error: `Erro ao criar backup: ${error.message}` },
      { status: 500 }
    );
  } finally {
    if (client) {
      try { await client.end(); } catch { /* ignorar */ }
    }
  }
}
