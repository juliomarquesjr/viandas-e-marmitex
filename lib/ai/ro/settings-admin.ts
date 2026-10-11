// Grava as configurações da RO. Usado só por /api/admin/ro/settings (tela de configurações, administrador):
// a conversa da RO nunca importa este arquivo (garantido por tests/ro-somente-leitura.test.ts).

import prisma from '@/lib/prisma';
import { lerConfiguracoes } from './settings';
import { aplicarPedido, CHAVES_RO as CHAVES, type ConfiguracoesPedidas, type RoConfiguracoes } from './settings-tipos';

/** Grava só o que mudou. O pedido já deve ter passado por `validarPedido`. */
export async function salvarConfiguracoes(pedido: ConfiguracoesPedidas): Promise<RoConfiguracoes> {
  const atual = await lerConfiguracoes();
  const novo = aplicarPedido(atual, pedido);
  const pares: [string, string][] = [];
  if (novo.ligada !== atual.ligada) pares.push([CHAVES.ligada, String(novo.ligada)]);
  if (novo.tom !== atual.tom) pares.push([CHAVES.tom, novo.tom]);
  if (novo.limiteDiario !== atual.limiteDiario) pares.push([CHAVES.limiteDiario, String(novo.limiteDiario)]);
  if (novo.posicao !== atual.posicao) {
    pares.push([CHAVES.posicao, novo.posicao]);
    pares.push([CHAVES.mostrarBotao, String(novo.mostrarBotao)]);
  }
  await Promise.all(pares.map(([key, value]) => prisma.systemConfig.upsert({ where: { key }, update: { value }, create: { key, value, type: 'text', category: 'ro' } })));
  return novo;
}
