import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ESTADOS } from '../app/admin/components/ro/personagem/estados';
import { estadoDaResposta, estadoDoCarregamento } from '../app/admin/components/ro/personagem/humor';

describe('expressão da RO enquanto trabalha', () => {
  it('contas, ficha e busca têm cada uma o seu trabalho', () => {
    assert.equal(estadoDoCarregamento('vendas do mês passado', 1), 'calculando');
    assert.equal(estadoDoCarregamento('quanto gastei esta semana', 0), 'calculando');
    assert.equal(estadoDoCarregamento('quem está devendo?', 2), 'conferindo');
    assert.equal(estadoDoCarregamento('saldo da ingrid', 2), 'conferindo');
    assert.equal(estadoDoCarregamento('telefone da dona maria', 1), 'procurando');
    assert.equal(estadoDoCarregamento('ingrid', 1), 'procurando');
    assert.equal(estadoDoCarregamento('compare o cardápio de hoje com o de ontem e me explique a diferença', 1), 'pensando');
  });
  it('depois de 6 segundos continua procurando e depois de 20 está demorando', () => {
    assert.equal(estadoDoCarregamento('compare o cardápio de hoje com o de ontem e me explique a diferença', 7), 'procurando');
    assert.equal(estadoDoCarregamento('vendas de hoje', 21), 'demorando');
  });
});

describe('expressão da RO depois da resposta', () => {
  it('resposta normal deixa a RO feliz', () => {
    assert.equal(estadoDaResposta({ content: '18 clientes devem na ficha, somando R$ 5.671,63.' }), 'feliz');
  });
  it('não achar nada deixa a RO confusa, mas achar parecidos não', () => {
    assert.equal(estadoDaResposta({ content: 'Não achei ninguém com "zeca".', blocos: [] }), 'confusa');
    assert.equal(estadoDaResposta({ content: 'Nenhuma venda registrada hoje (11/10).' }), 'confusa');
    assert.equal(estadoDaResposta({ content: 'Não achei ingird. Será que é esta pessoa?', blocos: [{ tipo: 'clientes', itens: [{ id: '1', nome: 'Ingrid' } as never] }] }), 'feliz');
  });
  it('pedido de alterar algo é recusa', () => {
    assert.equal(estadoDaResposta({ content: 'Isso eu não faço: a RO só consulta, não altera nada no sistema.' }), 'recusando');
  });
  it('erro de cota e de limite deixam a RO descansando; outros erros, preocupada', () => {
    assert.equal(estadoDaResposta({ content: 'x', erro: { codigo: 'cota', mensagem: 'x' } }), 'descansando');
    assert.equal(estadoDaResposta({ content: 'x', erro: { codigo: 'limite', mensagem: 'x' } }), 'descansando');
    assert.equal(estadoDaResposta({ content: 'x', erro: { codigo: 'interno', mensagem: 'x' } }), 'preocupada');
    assert.equal(estadoDaResposta({ content: 'x', erro: { codigo: 'ocupada', mensagem: 'x' } }), 'preocupada');
    assert.equal(estadoDaResposta({ content: 'x', erro: { codigo: 'desligada', mensagem: 'x' } }), null);
  });
  it('quando a pessoa para a busca a RO só volta a esperar', () => {
    assert.equal(estadoDaResposta({ content: 'Parei.', parada: true }), null);
  });
});

describe('expressões', () => {
  it('toda expressão tem fala, status e adereços coerentes', () => {
    for (const [nome, e] of Object.entries(ESTADOS)) {
      assert.ok(e.fala.length > 3 && e.status.length > 3 && e.rotulo.length > 2, nome);
      for (const ad of e.ad) assert.match(ad, /^p-[a-z-]+$/, nome);
    }
  });
});
