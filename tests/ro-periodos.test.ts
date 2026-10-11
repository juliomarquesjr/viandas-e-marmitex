import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dateStringSP } from '../lib/date-range';
import { lerDia, limitesDeDespesa, periodoDosArgs, resolverPeriodo, type PeriodoResolvido } from '../lib/ai/ro/periods';

const HOJE = '2026-10-11'; // domingo
const ok = (r: PeriodoResolvido | { erro: string }): PeriodoResolvido => {
  assert.ok(!('erro' in r), 'erro' in r ? r.erro : '');
  return r as PeriodoResolvido;
};
const erro = (r: PeriodoResolvido | { erro: string }) => ('erro' in r ? r.erro : null);

describe('despesas: a data é um dia puro (00:00 UTC), não um instante de Brasília', () => {
  const dentro = (despesa: string, p: PeriodoResolvido) => {
    const { inicio, fim } = limitesDeDespesa(p);
    const t = new Date(despesa).getTime();
    return t >= inicio.getTime() && t <= fim.getTime();
  };
  it('despesa do primeiro e do último dia entra no mês certo (out/2025: 01/10 e 31/10)', () => {
    const outubro = ok(periodoDosArgs({ periodo: 'intervalo', de: '2025-10-01', ate: '2025-10-31' }, HOJE, 'este_mes'));
    assert.ok(dentro('2025-10-01T00:00:00.000Z', outubro));
    assert.ok(dentro('2025-10-31T00:00:00.000Z', outubro));
    assert.ok(!dentro('2025-09-30T00:00:00.000Z', outubro));
    assert.ok(!dentro('2025-11-01T00:00:00.000Z', outubro));
  });
  it('despesa de 31/12/2025 aparece em 31/12/2025 e não em 30/12', () => {
    const fim = ok(periodoDosArgs({ periodo: 'intervalo', de: '2025-12-31', ate: '2025-12-31' }, HOJE, 'este_mes'));
    const antes = ok(periodoDosArgs({ periodo: 'intervalo', de: '2025-12-30', ate: '2025-12-30' }, HOJE, 'este_mes'));
    assert.ok(dentro('2025-12-31T00:00:00.000Z', fim));
    assert.ok(!dentro('2025-12-31T00:00:00.000Z', antes));
    const virada = ok(periodoDosArgs({ de: '2025-12-31', ate: '2026-01-01' }, HOJE, 'este_mes'));
    assert.ok(dentro('2025-12-31T00:00:00.000Z', virada));
  });
  it('o corte de instantes de Brasília (usado nas vendas) errava a despesa: fica documentado', () => {
    const dia = ok(periodoDosArgs({ periodo: 'intervalo', de: '2025-12-31', ate: '2025-12-31' }, HOJE, 'este_mes'));
    const antigo = new Date('2025-12-31T00:00:00.000Z').getTime() >= dia.inicio.getTime();
    assert.equal(antigo, false, 'a despesa de 31/12 às 00:00Z fica antes das 03:00Z do dia 31 em Brasília');
  });
  it('os limites vão de 00:00:00 do primeiro dia a 23:59:59.999 do último, em UTC', () => {
    const l = limitesDeDespesa({ de: '2026-10-01', ate: '2026-10-11' });
    assert.equal(l.inicio.toISOString(), '2026-10-01T00:00:00.000Z');
    assert.equal(l.fim.toISOString(), '2026-10-11T23:59:59.999Z');
  });
});

describe('vendas: a virada do dia é à meia-noite de Brasília', () => {
  it('pedido de 2026-10-01T01:30:00Z é de 30/09 às 22h30 em Brasília', () => {
    const pedido = new Date('2026-10-01T01:30:00Z');
    assert.equal(dateStringSP(pedido), '2026-09-30');
    const noDia30 = resolverPeriodo('hoje', '2026-09-30');
    const noDia1 = resolverPeriodo('hoje', '2026-10-01');
    assert.ok(pedido >= noDia30.inicio && pedido <= noDia30.fim);
    assert.ok(!(pedido >= noDia1.inicio && pedido <= noDia1.fim));
    const setembro = resolverPeriodo('mes_passado', '2026-10-05');
    assert.ok(pedido >= setembro.inicio && pedido <= setembro.fim, 'conta em setembro');
  });
  it('servidor em UTC não muda o dia de Brasília', () => {
    assert.equal(dateStringSP(new Date('2026-10-12T02:59:59Z')), '2026-10-11');
    assert.equal(dateStringSP(new Date('2026-10-12T03:00:00Z')), '2026-10-12');
  });
});

describe('períodos: datas inválidas, incompletas e novos nomes', () => {
  it('data que não existe volta como pedido de data, não como outro período', () => {
    assert.match(erro(periodoDosArgs({ periodo: 'intervalo', de: '2025-11-01', ate: '2025-11-31' }, HOJE, 'hoje')) ?? '', /Não entendi a data 2025-11-31/);
    assert.match(erro(periodoDosArgs({ de: '31/11/2025', ate: '2025-12-05' }, HOJE, 'hoje')) ?? '', /dia, o mês e o ano/);
    assert.match(erro(periodoDosArgs({ de: '0000-01-01', ate: '9999-12-31' }, HOJE, 'hoje')) ?? '', /Não entendi a data/);
  });
  it('de e ate sem "periodo" valem como intervalo', () => {
    const p = ok(periodoDosArgs({ de: '2025-11-01', ate: '2025-11-30' }, HOJE, 'este_mes'));
    assert.equal(p.de, '2025-11-01');
    assert.equal(p.ate, '2025-11-30');
    assert.equal(p.dias, 30);
  });
  it('só "de" vai até hoje; só "ate" vem desde o começo', () => {
    const desde = ok(periodoDosArgs({ de: '2026-09-15' }, HOJE, 'hoje'));
    assert.equal(desde.de, '2026-09-15');
    assert.equal(desde.ate, HOJE);
    assert.match(desde.rotulo, /^desde 15\/09\/2026/);
    const ate = ok(periodoDosArgs({ ate: '2025-12-31' }, HOJE, 'hoje'));
    assert.equal(ate.ate, '2025-12-31');
    assert.match(ate.rotulo, /^até 31\/12\/2025/);
  });
  it('aceita dia/mês/ano e AAAAMMDD', () => {
    assert.equal(lerDia('15/11/2025'), '2025-11-15');
    assert.equal(lerDia('20251101'), '2025-11-01');
    assert.equal(lerDia('2025-11-01T10:00:00Z'), '2025-11-01');
    assert.equal(lerDia(''), null);
    assert.equal(lerDia('1900-01-01'), 'invalida');
    assert.equal(lerDia('2026-02-30'), 'invalida');
  });
  it('período com nome manda mais que as datas; nome desconhecido pede ajuste', () => {
    assert.equal(ok(periodoDosArgs({ periodo: 'ontem', de: '2020-01-01' }, HOJE, 'hoje')).de, '2026-10-10');
    assert.match(erro(periodoDosArgs({ periodo: 'foo' }, HOJE, 'hoje')) ?? '', /Não entendi o período/);
    assert.match(erro(periodoDosArgs({ periodo: 'intervalo' }, HOJE, 'hoje')) ?? '', /De que dia a que dia/);
    assert.equal(ok(periodoDosArgs({}, HOJE, 'este_mes')).de, '2026-10-01');
  });
  it('ano passado', () => {
    const p = resolverPeriodo('ano_passado', HOJE);
    assert.equal(p.de, '2025-01-01');
    assert.equal(p.ate, '2025-12-31');
    assert.equal(p.rotulo, 'em 2025');
  });
  it('rótulos úteis em segunda-feira e no dia 1º', () => {
    assert.equal(resolverPeriodo('esta_semana', '2026-10-12').rotulo, 'nesta semana (só hoje, 12/10)');
    assert.equal(resolverPeriodo('este_mes', '2026-10-01').rotulo, 'neste mês (só hoje, 01/10)');
    assert.equal(resolverPeriodo('esta_semana', '2026-10-14').rotulo, 'nesta semana (12/10 a 14/10)');
  });
});
