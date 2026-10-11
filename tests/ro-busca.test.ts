import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buscarClientes, candidatoUnico, nomeParaConversa, resolverUnico, type ClienteBase } from '../lib/ai/ro/customer-index';
import { comPersonalidade } from '../lib/ai/ro/personalidade';
import { concorda, dataBR, distancia, esperaHumana, plural } from '../lib/ai/ro/text';

const c = (id: string, name: string, phone: string | null = null, extra: Partial<ClienteBase> = {}): ClienteBase => ({ id, name, phone, email: null, doc: null, active: true, phoneIsWhatsapp: true, ...extra });

const clientes: ClienteBase[] = [
  c('1', 'Maria Souza QA', '(55) 99111-2222'),
  c('2', 'Mariangela', '(55) 99111-3333'),
  c('3', 'Marcos Aurélio Marques Neto', '(55) 99111-4444', { email: 'marcos@gmail.com' }),
  c('4', 'Paulo Vicente Vieira', '(55) 99111-5555'),
  c('5', 'Antônio Pinto Soares Filho', '(55) 99111-6666'),
  c('6', 'Ingrid Oliveira de Albuquerque', '(55) 99118-7442'),
  c('7', 'Sheila', '(55) 99111-7777'),
  c('8', 'Ohanna', '(55) 99111-8888'),
  c('9', 'Ademir', '(55) 99111-9999'),
  c('10', 'Edi', '(55) 99630-5849'),
  c('11', 'Edilson Luciano Becher Costa', '(55) 99100-1111', { email: 'becherluciano@gmail.com' }),
  c('12', 'Luiz Antônio', '(55) 99100-2222'),
  c('13', 'Luiza Albuquerque', '(55) 99100-3333'),
  c('14', 'Angela Maciel', '(55) 99192-8021'),
  c('15', 'Angela Rodrigues Maciel', '(55) 99192-8021'),
  c('16', 'Dani', '(55) 99100-4444'),
  c('17', 'Nara', '(55) 99100-5555'),
  c('18', 'Rose', '(55) 99100-6666'),
  c('19', 'Bruna Oliveira', '(55) 99100-7777', { email: 'bruna17567@gmail.com' }),
  c('20', 'Marta Lima', '(55) 99100-8888'),
  c('21', 'Marcelo Oss', '(55) 99100-9999'),
  c('22', 'Mauro Dias', '(55) 99200-1111'),
  c('23', 'Mirian Alves', '(55) 99200-2222'),
  c('24', 'Moacir Antônio', null, { active: false }),
  c('25', 'João da Silva', '11 98888-0001', { doc: '123.456.789-09' }),
];
const busca = (q: string) => buscarClientes(clientes, q);
const nomes = (q: string) => busca(q).achados.map((a) => a.cliente.name);
const unico = (q: string) => resolverUnico(busca(q).achados);

describe('distância de edição', () => {
  it('trocar duas letras vizinhas conta como um erro só', () => {
    assert.equal(distancia('ingird', 'ingrid'), 1);
    assert.equal(distancia('shiela', 'sheila'), 1);
    assert.equal(distancia('ohnana', 'ohanna'), 1);
    assert.equal(distancia('admeir', 'ademir'), 1);
  });
  it('continua medindo inserir, apagar e trocar uma letra', () => {
    assert.equal(distancia('dai', 'dani'), 1);
    assert.equal(distancia('anjela', 'angela'), 1);
    assert.ok(distancia('maria', 'fernando') > 2);
    assert.ok(distancia('abcdef', 'badcfe') > 1);
  });
});

describe('busca: semelhança de letras não vira "Achei"', () => {
  it('palavras do negócio e nomes que não existem só sugerem, nunca acham', () => {
    for (const q of ['marmita', 'viandas', 'beto', 'paula', 'filha', 'marilia', 'normal']) {
      assert.equal(unico(q), null, `${q} virou único`);
    }
    assert.ok(nomes('paula').includes('Paulo Vicente Vieira'), 'ainda sugere o parecido');
    assert.ok(!busca('beto').achados.some((a) => a.forte));
  });
  it('troca de letras vizinhas e falta de letra em nome curto aparecem como sugestão', () => {
    assert.ok(nomes('ingird').includes('Ingrid Oliveira de Albuquerque'));
    assert.ok(nomes('shiela').includes('Sheila'));
    assert.ok(nomes('ohnana').includes('Ohanna'));
    assert.ok(nomes('admeir').includes('Ademir'));
    assert.ok(nomes('dai').includes('Dani'));
    assert.ok(nomes('naa').includes('Nara'));
    assert.ok(nomes('roe').includes('Rose'));
  });
  it('um erro de uma letra no começo do nome ainda acha (luis -> Luiz, Luiza)', () => {
    assert.deepEqual(nomes('luis').sort(), ['Luiz Antônio', 'Luiza Albuquerque']);
  });
});

describe('busca: telefone, final do telefone e e-mail', () => {
  it('últimos números do telefone, com ou sem palavras em volta', () => {
    for (const q of ['8021', 'termina em 8021', 'final 8021', 'telefone final 8021']) {
      assert.deepEqual(nomes(q).sort(), ['Angela Maciel', 'Angela Rodrigues Maciel'], q);
      assert.equal(busca(q).tipo, 'telefone_final');
    }
    assert.deepEqual(nomes('5849'), ['Edi']);
  });
  it('só zeros ou número que ninguém tem não acha ninguém', () => {
    assert.equal(busca('00000000').total, 0);
    assert.equal(busca('000').total, 0);
    assert.equal(busca('99999999999').total, 0);
  });
  it('telefone inteiro continua achando com máscara, 55 e sem DDD', () => {
    assert.equal(nomes('55 99118-7442')[0], 'Ingrid Oliveira de Albuquerque');
    assert.equal(nomes('991187442')[0], 'Ingrid Oliveira de Albuquerque');
    assert.equal(nomes('(11) 98888-0001')[0], 'João da Silva');
    assert.equal(nomes('456.789')[0], 'João da Silva');
  });
  it('pedaço de e-mail sem "@", com números ou só o provedor', () => {
    assert.deepEqual(nomes('bruna17567'), ['Bruna Oliveira']);
    assert.equal(busca('bruna17567').tipo, 'email');
    assert.deepEqual(nomes('becherluciano'), ['Edilson Luciano Becher Costa']);
    assert.equal(busca('gmail').total, 3);
    assert.deepEqual(nomes('bruna17567@gmail'), ['Bruna Oliveira']);
  });
});

describe('busca: quantos achou e quem mais existe', () => {
  it('informa o total real quando mostra menos', () => {
    const r = buscarClientes(clientes, 'ma', 3);
    assert.equal(r.achados.length, 3);
    assert.ok(r.total > 3);
  });
  it('nome completo igual não esconde outro cadastro que começa igual', () => {
    const edi = unico('edi');
    assert.equal(edi?.cliente.name, 'Edi');
    assert.deepEqual(edi?.tambem.map((x) => x.name), ['Edilson Luciano Becher Costa']);
    const angela = unico('angela maciel');
    assert.equal(angela?.cliente.name, 'Angela Maciel');
    assert.deepEqual(angela?.tambem.map((x) => x.name), ['Angela Rodrigues Maciel']);
  });
  it('só dá "único" quando há um candidato claro', () => {
    assert.equal(candidatoUnico(busca('ingrid albuquerque').achados)?.id, '6');
    assert.equal(candidatoUnico(busca('angela').achados), null);
    assert.equal(candidatoUnico(busca('maria').achados), null);
  });
  it('homônimos exatos não têm "único" (o botão leva o id)', () => {
    const dois = [...clientes, c('26', 'Ingrid Oliveira de Albuquerque', '(55) 99000-0000', { active: false })];
    assert.equal(resolverUnico(buscarClientes(dois, 'Ingrid Oliveira de Albuquerque').achados), null);
  });
});

describe('nome na conversa', () => {
  it('só o primeiro nome, ou mais quando outro cliente tem o mesmo primeiro nome', () => {
    assert.equal(nomeParaConversa(clientes[5], clientes), 'Ingrid');
    assert.equal(nomeParaConversa(clientes[13], clientes), 'Angela Maciel');
    assert.equal(nomeParaConversa(clientes[14], clientes), 'Angela Rodrigues Maciel');
    const lista = [c('a', 'Silvia Cristina Serafini'), c('b', 'Silvia Marise Flores Becker')];
    assert.equal(nomeParaConversa(lista[0], lista), 'Silvia Serafini');
    assert.equal(nomeParaConversa(lista[1], lista), 'Silvia Becker');
  });
});

describe('texto: plural, datas e espera', () => {
  it('concorda o plural', () => {
    assert.equal(plural(1, 'unidade', 'unidades'), '1 unidade');
    assert.equal(plural(0, 'cliente', 'clientes'), '0 clientes');
    assert.equal(concorda(1, 'combina', 'combinam'), 'combina');
    assert.equal(concorda(2, 'combina', 'combinam'), 'combinam');
  });
  it('data e tempo em linguagem de gente', () => {
    assert.equal(dataBR('2026-10-05'), '05/10/2026');
    assert.equal(esperaHumana(30), 'daqui a um minuto');
    assert.equal(esperaHumana(300), 'daqui a alguns minutos');
    assert.equal(esperaHumana(1200), 'daqui a uns 20 minutos');
    assert.equal(esperaHumana(3 * 3600), 'daqui a cerca de 3 horas');
    assert.equal(esperaHumana(740 * 60), 'daqui a cerca de 12 horas');
    assert.equal(esperaHumana(20 * 3600), 'amanhã');
    assert.doesNotMatch(esperaHumana(740 * 60), /\d+ minutos/);
  });
});

describe('toque de humor', () => {
  const cheia = { mensagem: '18 clientes devem na ficha.', blocos: [{ tipo: 'metricas' as const, itens: [] }] };
  it('abre com a frase divertida só quando há dados e não é pergunta', () => {
    assert.match(comPersonalidade(cheia, 'divertida', 'clientes_devendo', 0.1), /^(Pronto|Olha|Aqui|Separei)/);
    assert.equal(comPersonalidade(cheia, 'direta', 'clientes_devendo', 0.1), cheia.mensagem);
  });
  it('nunca em escolha, resultado vazio ou busca de cliente', () => {
    const escolha = { mensagem: 'Tem 2 clientes que combinam com **luciano**. Qual deles?', blocos: [{ tipo: 'opcoes' as const, itens: [] }] };
    assert.equal(comPersonalidade(escolha, 'divertida', 'ficha_cliente', 0.1), escolha.mensagem);
    const vazio = { mensagem: 'Nenhuma venda registrada hoje (11/10).', blocos: [] };
    assert.equal(comPersonalidade(vazio, 'divertida', 'vendas', 0.1), vazio.mensagem);
    const achei = { mensagem: 'Achei: **Maria**.', blocos: [{ tipo: 'clientes' as const, itens: [] }] };
    assert.equal(comPersonalidade(achei, 'divertida', 'buscar_cliente', 0.1), achei.mensagem);
    const parcial = { mensagem: 'Não achei ninguém que tenha tudo o que você escreveu, mas estes combinam. É algum deles?', blocos: [{ tipo: 'clientes' as const, itens: [] }] };
    assert.equal(comPersonalidade(parcial, 'divertida', 'clientes_top', 0.1), parcial.mensagem);
  });
});
