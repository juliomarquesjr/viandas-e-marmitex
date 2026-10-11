import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classificar, decidir, DECLARACOES, instrucao, MAPA_DE_TELAS, MODELOS_PADRAO, RoErroIa, segundosDe, type ClienteDaIa } from '../lib/ai/ro/gemini';
import { aplicarPedido, interpretar, RO_PADRAO, validarPedido } from '../lib/ai/ro/settings-tipos';

describe('Gemini: modelos e erros', () => {
  it('o padrão são os modelos 3.5 (o 2.5-flash-lite deixou de existir)', () => {
    assert.equal(MODELOS_PADRAO, 'gemini-3.5-flash,gemini-3.5-flash-lite');
  });
  it('modelo que não existe (404) é reconhecido para pular para o próximo', () => {
    const e = Object.assign(new Error('[404 Not Found] This model models/gemini-2.5-flash-lite is no longer available to new users'), { status: 404 });
    const c = classificar(e);
    assert.equal(c.semModelo, true);
    assert.equal(c.cota, false);
    assert.equal(classificar(new Error('models/x is not found for API version v1beta')).semModelo, true);
  });
  it('cota (429), serviço ocupado (503) e demora', () => {
    assert.equal(classificar(Object.assign(new Error('Quota exceeded'), { status: 429 })).cota, true);
    assert.equal(classificar(new Error('[503 Service Unavailable] The model is overloaded')).ocupado, true);
    assert.equal(classificar(Object.assign(new Error('Request aborted when fetching'), { name: 'GoogleGenerativeAIAbortError' })).demora, true);
  });
  it('lê o tempo de espera em segundos, horas e minutos', () => {
    assert.equal(segundosDe('Please retry in 33.2s.'), 34);
    assert.equal(segundosDe('Please retry in 12h20m.'), 12 * 3600 + 20 * 60);
    assert.equal(segundosDe('{"retryDelay":"45s"}'), 45);
    assert.equal(segundosDe('sem tempo'), undefined);
  });
  it('cota diária sem tempo informado descansa por horas, não por segundos', () => {
    const c = classificar(Object.assign(new Error('GenerateRequestsPerDayPerProjectPerModel-FreeTier quota exceeded'), { status: 429 }));
    assert.ok((c.segundos ?? 0) >= 3600);
  });
});

describe('Gemini: instruções e ferramentas', () => {
  const texto = instrucao('2026-10-11', 'direta');
  it('o mapa de telas só tem telas do menu do sistema', () => {
    for (const tela of ['Dashboard', 'Produtos', 'Cardápios', 'Clientes', 'Vendas', 'Pré-Pedidos', 'Entregas', 'Despesas', 'Lucros', 'Conversas', 'Usuários', 'Backups', 'Configurações']) assert.ok(MAPA_DE_TELAS.includes(tela), tela);
    for (const inventada of ['Marketing', 'Fechamento de Caixa', 'Extrato da Ficha']) assert.ok(!texto.includes(inventada), inventada);
    assert.ok(texto.includes(MAPA_DE_TELAS));
  });
  it('manda esclarecer quando há vários clientes e avisar o que não consegue', () => {
    assert.match(texto, /Nunca escolha o primeiro/);
    assert.match(texto, /UMA frase curta/);
    assert.match(texto, /ano de hoje/);
  });
  it('as ferramentas têm os parâmetros novos', () => {
    const por = (nome: string) => DECLARACOES.find((d) => d.name === nome);
    const props = (nome: string) => Object.keys((por(nome)?.parameters as { properties: object }).properties);
    assert.ok(props('buscar_cliente').includes('cliente_id'));
    assert.ok(props('vendas').includes('forma') && props('vendas').includes('cliente'));
    assert.ok(props('clientes_devendo').includes('valor_minimo'));
    assert.ok(props('produtos_mais_vendidos').includes('produto') && props('produtos_mais_vendidos').includes('dia_da_semana'));
    assert.ok(por('clientes_credito'));
  });
});

describe('configurações: só entra o que é válido', () => {
  it('limite fora de 10 a 1000, texto ou decimal volta com o motivo', () => {
    for (const v of [5, 5000, 50.5, '50', -1, null, 1e999]) {
      const r = validarPedido({ limiteDiario: v });
      assert.equal(r.ok, false, String(v));
      assert.match(r.ok ? '' : r.erro, /10 a 1000/);
    }
    assert.equal(validarPedido({ limiteDiario: 10 }).ok, true);
    assert.equal(validarPedido({ limiteDiario: 1000 }).ok, true);
  });
  it('tom, posição e liga/desliga inválidos são recusados; corpo vazio também', () => {
    assert.equal(validarPedido({ tom: 'x' }).ok, false);
    assert.equal(validarPedido({ posicao: 'meio' }).ok, false);
    assert.equal(validarPedido({ ligada: 'false' }).ok, false);
    assert.equal(validarPedido({}).ok, false);
    assert.equal(validarPedido(null).ok, false);
    assert.equal(validarPedido([]).ok, false);
    assert.equal(validarPedido({ campoQualquer: 1 }).ok, false);
  });
  it('campos desconhecidos junto de um válido são ignorados', () => {
    const r = validarPedido({ tom: 'direta', password: 'x', __proto__: { a: 1 } });
    assert.equal(r.ok && Object.keys(r.valores).join(), 'tom');
  });
  it('aplica sobre o que já está salvo, inclusive o antigo "mostrar botão"', () => {
    const base = { ...RO_PADRAO, posicao: 'cabecalho' as const };
    assert.equal(aplicarPedido(base, { tom: 'direta' }).posicao, 'cabecalho');
    assert.equal(aplicarPedido(base, { mostrarBotao: false }).posicao, 'nenhum');
    assert.equal(aplicarPedido({ ...base, posicao: 'nenhum', mostrarBotao: false }, { mostrarBotao: true }).posicao, 'flutuante');
    assert.equal(aplicarPedido(base, { mostrarBotao: true }).posicao, 'cabecalho');
    assert.deepEqual(aplicarPedido(base, { posicao: 'nenhum' }), { ...base, posicao: 'nenhum', mostrarBotao: false });
  });
  it('ler o que está salvo continua igual', () => {
    assert.equal(interpretar({ ro_placement: 'cabecalho' }).posicao, 'cabecalho');
    assert.equal(interpretar({ ro_daily_limit: '5' }).limiteDiario, 150);
  });
});


describe('Gemini: troca de modelo e erro certo', () => {
  const pergunta = { historico: [], mensagem: 'oi', hoje: '2026-10-11', tom: 'direta' as const };
  const resposta = (nome: string) => ({ response: { functionCalls: () => [{ name: 'ajuda', args: {} }], text: () => `ok de ${nome}` } });
  const falha = (status: number, texto: string) => Object.assign(new Error(texto), { status });
  /** Cliente de mentira: cada modelo responde (ou falha) como combinado. */
  const clienteQue = (comportamento: Record<string, () => unknown>): ClienteDaIa => ({
    getGenerativeModel: (m) => ({
      generateContent: async () => {
        const resultado = comportamento[(m as { model: string }).model]();
        if (resultado instanceof Error) throw resultado;
        return resultado as never;
      },
    }),
  });

  it('modelo que não existe (404) é pulado e o seguinte responde', async () => {
    const api = clienteQue({ velho: () => falha(404, 'models/velho is no longer available to new users'), novo: () => resposta('novo') });
    const r = await decidir(pergunta, { api, modelos: ['velho', 'novo'] });
    assert.equal(r.modelo, 'novo');
    assert.equal(r.chamadas[0].nome, 'ajuda');
  });
  it('cota num modelo e 404 no outro devolve erro de cota (não 502)', async () => {
    const api = clienteQue({ a: () => falha(429, 'GenerateRequestsPerDayPerProjectPerModel-FreeTier. Please retry in 12h20m'), b: () => falha(404, 'no longer available') });
    await assert.rejects(decidir(pergunta, { api, modelos: ['a', 'b'] }), (e: unknown) => {
      assert.ok(e instanceof RoErroIa);
      assert.equal(e.erro.codigo, 'cota');
      assert.equal(e.status, 429);
      assert.ok((e.erro.tentarEm ?? 0) >= 12 * 3600);
      assert.doesNotMatch(e.erro.mensagem, /minutos|cota|inteligência|Gemini/i);
      assert.match(e.erro.mensagem, /daqui a cerca de 12 horas|amanhã/);
      return true;
    });
  });
  it('todos os modelos inexistentes: erro simples e não de cota', async () => {
    const api = clienteQue({ 'a-inexistente-1': () => falha(404, 'x'), 'b-inexistente-2': () => falha(404, 'y') });
    await assert.rejects(decidir(pergunta, { api, modelos: ['a-inexistente-1', 'b-inexistente-2'] }), (e: unknown) => e instanceof RoErroIa && e.erro.codigo === 'ia');
  });
  it('serviço ocupado em todos: erro de "ocupada" com tempo', async () => {
    const api = clienteQue({ c: () => falha(503, 'The model is overloaded') });
    await assert.rejects(decidir(pergunta, { api, modelos: ['c'] }), (e: unknown) => e instanceof RoErroIa && e.erro.codigo === 'ocupada' && e.status === 503);
  });
  it('demora vira aviso amigável (e não tenta o próximo modelo)', async () => {
    let chamadas = 0;
    const api = clienteQue({ 'd-lento': () => { chamadas++; return Object.assign(new Error('Request aborted when fetching'), { name: 'GoogleGenerativeAIAbortError' }); }, 'e-bom': () => resposta('e') });
    await assert.rejects(decidir(pergunta, { api, modelos: ['d-lento', 'e-bom'] }), (e: unknown) => e instanceof RoErroIa && e.erro.codigo === 'ocupada' && e.status === 504 && /demorando/.test(e.erro.mensagem));
    assert.equal(chamadas, 1);
  });
  it('modelo em descanso por cota não é chamado de novo logo em seguida', async () => {
    let chamadas = 0;
    const api = clienteQue({ 'f-cota': () => { chamadas++; return falha(429, 'quota exceeded. retry in 40s'); } });
    await assert.rejects(decidir(pergunta, { api, modelos: ['f-cota'] }));
    await assert.rejects(decidir(pergunta, { api, modelos: ['f-cota'] }), (e: unknown) => e instanceof RoErroIa && e.erro.codigo === 'cota');
    assert.equal(chamadas, 1);
  });
});
