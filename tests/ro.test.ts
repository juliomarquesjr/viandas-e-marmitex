import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buscarClientes, candidatoUnico, type ClienteBase } from '../lib/ai/ro/customer-index';
import { resolverPeriodo } from '../lib/ai/ro/periods';
import { rotearRapido } from '../lib/ai/ro/router';
import { interpretar } from '../lib/ai/ro/settings-tipos';
import { brl, distancia, formatarTelefone, normalizar, palavras } from '../lib/ai/ro/text';

const c = (id: string, name: string, phone: string | null = null, extra: Partial<ClienteBase> = {}): ClienteBase => ({ id, name, phone, email: null, doc: null, active: true, phoneIsWhatsapp: true, ...extra });
const clientes: ClienteBase[] = [
  c('1', 'Antônio Pinto Soares Filho', '(55) 99191-1111'),
  c('2', 'Ingrid Oliveira de Albuquerque', '55999990000', { email: 'ingrid@exemplo.com' }),
  c('3', 'Angela Maciel', '(55) 99192-8021'),
  c('4', 'Angela Rodrigues Maciel', '55 3222-1234'),
  c('5', 'Mariangela', null),
  c('6', 'João da Silva', '11 98888-0001', { doc: '123.456.789-09' }),
  c('7', 'Luiz Antônio'),
  c('8', 'Moacir Antônio', null, { active: false }),
];
const nomes = (consulta: string) => buscarClientes(clientes, consulta).achados.map((a) => a.cliente.name);

describe('texto da RO', () => {
  it('normaliza acento, caixa e pontuação', () => {
    assert.equal(normalizar('  Antônio, Pinto-Soares!! '), 'antonio pinto soares');
    assert.deepEqual(palavras('Ingrid de Albuquerque'), ['ingrid', 'albuquerque']);
  });
  it('mede a distância de edição', () => {
    assert.equal(distancia('angela', 'angela'), 0);
    assert.equal(distancia('anjela', 'angela'), 1);
    assert.ok(distancia('maria', 'fernando') > 2);
  });
  it('formata telefone e dinheiro', () => {
    assert.equal(formatarTelefone('55999990000'), '(55) 99999-0000');
    assert.equal(formatarTelefone('(55) 3222-1234'), '(55) 3222-1234');
    assert.equal(formatarTelefone(null), null);
    assert.ok(brl(12345).includes('123,45'));
  });
});

describe('busca de cadastros', () => {
  it('acha sem acento e sem o nome completo', () => {
    assert.equal(nomes('antonio pinto soares')[0], 'Antônio Pinto Soares Filho');
    assert.equal(nomes('ingrid albuquerque')[0], 'Ingrid Oliveira de Albuquerque');
    assert.equal(nomes('pinto')[0], 'Antônio Pinto Soares Filho');
  });
  it('acha por palavras em qualquer ordem e com erro de digitação', () => {
    assert.equal(nomes('albuquerque ingrid')[0], 'Ingrid Oliveira de Albuquerque');
    assert.equal(nomes('anjela maciel')[0], 'Angela Maciel');
  });
  it('um primeiro nome traz todos os parecidos, quem começa por ele primeiro', () => {
    const r = nomes('angela');
    assert.deepEqual(r.slice(0, 2).sort(), ['Angela Maciel', 'Angela Rodrigues Maciel']);
    assert.ok(r.includes('Mariangela'));
  });
  it('acha por telefone, com ou sem máscara, DDD e 55', () => {
    assert.equal(nomes('55 99192-8021')[0], 'Angela Maciel');
    assert.equal(nomes('991928021')[0], 'Angela Maciel');
    assert.equal(nomes('(11) 98888-0001')[0], 'João da Silva');
    assert.equal(nomes('3222 1234')[0], 'Angela Rodrigues Maciel');
  });
  it('acha por e-mail e por parte do CPF', () => {
    assert.equal(nomes('ingrid@exemplo.com')[0], 'Ingrid Oliveira de Albuquerque');
    assert.equal(nomes('456.789')[0], 'João da Silva');
  });
  it('não inventa: nome sem nada parecido volta vazio', () => {
    assert.deepEqual(nomes('zzzzzz'), []);
    assert.deepEqual(nomes('   '), []);
  });
  it('só dá "único" quando há um candidato claro', () => {
    assert.equal(candidatoUnico(buscarClientes(clientes, 'ingrid albuquerque').achados)?.id, '2');
    assert.equal(candidatoUnico(buscarClientes(clientes, 'angela').achados), null);
    assert.equal(candidatoUnico(buscarClientes(clientes, 'angela maciel').achados)?.id, '3');
  });
  it('inativo aparece, mas depois do ativo de mesmo peso', () => {
    const r = nomes('antonio');
    assert.ok(r.includes('Moacir Antônio'));
    assert.ok(r.indexOf('Moacir Antônio') > r.indexOf('Luiz Antônio'));
  });
});

describe('períodos (dia de Brasília)', () => {
  const hoje = '2026-10-14'; // quarta
  it('hoje e ontem', () => {
    assert.equal(resolverPeriodo('hoje', hoje).de, '2026-10-14');
    assert.equal(resolverPeriodo('ontem', hoje).ate, '2026-10-13');
  });
  it('semana de segunda a domingo', () => {
    const r = resolverPeriodo('esta_semana', hoje);
    assert.equal(r.de, '2026-10-12');
    assert.equal(r.ate, '2026-10-14');
    const p = resolverPeriodo('semana_passada', hoje);
    assert.equal(p.de, '2026-10-05');
    assert.equal(p.ate, '2026-10-11');
  });
  it('mês e mês passado, inclusive na virada de ano', () => {
    assert.equal(resolverPeriodo('este_mes', hoje).de, '2026-10-01');
    const m = resolverPeriodo('mes_passado', hoje);
    assert.equal(m.de, '2026-09-01');
    assert.equal(m.ate, '2026-09-30');
    const j = resolverPeriodo('mes_passado', '2027-01-10');
    assert.equal(j.de, '2026-12-01');
    assert.equal(j.ate, '2026-12-31');
  });
  it('intervalo com datas e com data inválida', () => {
    const r = resolverPeriodo('intervalo', hoje, '2026-10-03', '2026-10-01');
    assert.equal(r.de, '2026-10-01');
    assert.equal(r.ate, '2026-10-03');
    assert.equal(r.dias, 3);
    assert.equal(resolverPeriodo('intervalo', hoje, '2026-02-30', '2026-03-01').de, '2026-03-01');
    assert.equal(resolverPeriodo('qualquer', hoje).de, hoje);
  });
  it('o dia começa às 00h de Brasília (03h UTC) e acaba às 23h59', () => {
    const r = resolverPeriodo('hoje', hoje);
    assert.equal(r.inicio.toISOString(), '2026-10-14T03:00:00.000Z');
    assert.equal(r.fim.toISOString(), '2026-10-15T02:59:59.999Z');
  });
});

describe('atalhos sem IA', () => {
  const ferr = (t: string) => rotearRapido(t)?.ferramenta ?? null;
  it('perguntas comuns e curtas', () => {
    assert.equal(ferr('quem está devendo?'), 'clientes_devendo');
    assert.equal(ferr('clientes que devem'), 'clientes_devendo');
    assert.equal(ferr('vendas de hoje'), 'vendas');
    assert.equal(rotearRapido('quanto vendi esta semana?')?.args.periodo, 'esta_semana');
    assert.equal(rotearRapido('vendas do mês passado')?.args.periodo, 'mes_passado');
    assert.equal(ferr('produtos mais vendidos do mês'), 'produtos_mais_vendidos');
    assert.equal(ferr('pedidos em aberto'), 'pedidos_em_aberto');
    assert.equal(ferr('despesas do mês'), 'despesas');
    assert.equal(ferr('qual o lucro do mês?'), 'lucro');
    assert.equal(ferr('cardápio de hoje'), 'cardapio');
    assert.equal(ferr('mensagens do whatsapp não lidas'), 'whatsapp_nao_lidas');
    assert.equal(rotearRapido('quem sumiu há 45 dias?')?.args.dias, 45);
    assert.equal(ferr('quem mais comprou este mês'), 'clientes_top');
    assert.equal(ferr('ajuda'), 'ajuda');
  });
  it('nome solto, telefone e e-mail viram busca de cliente', () => {
    assert.equal(ferr('angela'), 'buscar_cliente');
    assert.equal(rotearRapido('procure a Ingrid Albuquerque')?.args.consulta, 'ingrid albuquerque');
    assert.equal(rotearRapido('telefone do antonio pinto')?.args.consulta, 'antonio pinto');
    assert.equal(ferr('55 99192-8021'), 'buscar_cliente');
    assert.equal(ferr('ingrid@exemplo.com'), 'buscar_cliente');
  });
  it('ficha e saldo de uma pessoa', () => {
    assert.equal(ferr('ficha da ingrid'), 'ficha_cliente');
    assert.equal(rotearRapido('quanto a maria deve?')?.args.consulta, 'maria');
    assert.equal(ferr('saldo do joao silva'), 'ficha_cliente');
  });
  it('conversa fiada tem resposta pronta', () => {
    assert.ok(rotearRapido('oi, tudo bem?')?.fixo);
    assert.ok(rotearRapido('obrigada')?.fixo?.includes('Por nada'));
  });
  it('o que é complexo ou depende de contexto vai para a IA', () => {
    assert.equal(ferr('e o telefone dela?'), null);
    assert.equal(ferr('compare as vendas desta semana com a passada'), null);
    assert.equal(ferr('quantos pedidos a maria fez no mês passado?'), null);
    assert.equal(ferr('vendas por dia da semana passada'), null);
    assert.equal(ferr('quanto vendemos de marmita de frango em outubro?'), null);
    // pedido de escrita: recusa curta, sem IA e sem procurar ninguém
    assert.match(rotearRapido('cadastre o cliente joao 11999990000')?.fixo ?? '', /só consulta/);
  });
});

describe('configurações da RO', () => {
  it('usa o padrão quando não há nada salvo ou o valor é inválido', () => {
    assert.deepEqual(interpretar({}), { ligada: true, tom: 'divertida', limiteDiario: 150, posicao: 'flutuante', mostrarBotao: true });
    assert.equal(interpretar({ ro_show_button: 'false' }).posicao, 'nenhum');
    assert.equal(interpretar({ ro_placement: 'cabecalho', ro_show_button: 'true' }).posicao, 'cabecalho');
    assert.equal(interpretar({ ro_placement: 'cabecalho' }).mostrarBotao, true);
    assert.equal(interpretar({ ro_placement: 'qualquer' }).posicao, 'flutuante');
    assert.equal(interpretar({ ro_daily_limit: '5' }).limiteDiario, 150);
    assert.equal(interpretar({ ro_daily_limit: '500' }).limiteDiario, 500);
    assert.equal(interpretar({ ro_enabled: 'false' }).ligada, false);
    assert.equal(interpretar({ ro_tone: 'direta' }).tom, 'direta');
    assert.equal(interpretar({ ro_tone: 'qualquer' }).tom, 'divertida');
  });
});
