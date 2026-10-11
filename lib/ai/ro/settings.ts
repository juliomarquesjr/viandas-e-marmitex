// Configurações da RO, guardadas em SystemConfig (categoria "ro"): não precisam de migration.
// Este arquivo só LÊ. Quem grava é settings-admin.ts, usado apenas pela tela de configurações (nunca pela conversa da RO).

import prisma from '@/lib/prisma';
import { CHAVES_RO, interpretar, RO_PADRAO, type RoConfiguracoes } from './settings-tipos';

export async function lerConfiguracoes(): Promise<RoConfiguracoes> {
  try {
    const linhas = await prisma.systemConfig.findMany({ where: { key: { in: Object.values(CHAVES_RO) } } });
    return interpretar(Object.fromEntries(linhas.map((l) => [l.key, l.value])));
  } catch {
    return RO_PADRAO;
  }
}
