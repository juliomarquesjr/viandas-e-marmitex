// Grava as configurações da RO. Usado só por /api/admin/ro/settings (tela de configurações, administrador):
// a conversa da RO nunca importa este arquivo (garantido por tests/ro-somente-leitura.test.ts).

import prisma from '@/lib/prisma';
import { lerConfiguracoes } from './settings';
import { CHAVES_RO as CHAVES, RO_LIMITE_DIARIO, type RoConfiguracoes } from './settings-tipos';

export async function salvarConfiguracoes(parcial: Partial<RoConfiguracoes>): Promise<RoConfiguracoes> {
  const atual = await lerConfiguracoes();
  const novo: RoConfiguracoes = {
    ligada: typeof parcial.ligada === 'boolean' ? parcial.ligada : atual.ligada,
    tom: parcial.tom === 'direta' || parcial.tom === 'divertida' ? parcial.tom : atual.tom,
    limiteDiario:
      typeof parcial.limiteDiario === 'number' && Number.isInteger(parcial.limiteDiario) && parcial.limiteDiario >= RO_LIMITE_DIARIO.MIN && parcial.limiteDiario <= RO_LIMITE_DIARIO.MAX
        ? parcial.limiteDiario
        : atual.limiteDiario,
    mostrarBotao: typeof parcial.mostrarBotao === 'boolean' ? parcial.mostrarBotao : atual.mostrarBotao,
  };
  const pares: [string, string][] = [
    [CHAVES.ligada, String(novo.ligada)],
    [CHAVES.tom, novo.tom],
    [CHAVES.limiteDiario, String(novo.limiteDiario)],
    [CHAVES.mostrarBotao, String(novo.mostrarBotao)],
  ];
  await Promise.all(pares.map(([key, value]) => prisma.systemConfig.upsert({ where: { key }, update: { value }, create: { key, value, type: 'text', category: 'ro' } })));
  return novo;
}
