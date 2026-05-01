import { getVersionMetadata } from '@/lib/version-metadata';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Status público da versão em execução (sem dados sensíveis).
 * Útil para suporte e validação pós-deploy.
 */
export async function GET() {
  const body = getVersionMetadata();
  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
