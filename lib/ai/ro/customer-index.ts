// Busca de cadastros da RO: sem acento, por palavras soltas em qualquer ordem, com erro de digitação,
// por telefone (só os dígitos), e-mail e parte do CPF. Puro: recebe a lista de clientes (testado em tests/ro.test.ts).

import { distancia, normalizar, palavras, soDigitos } from './text';

export interface ClienteBase {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  doc: string | null;
  active: boolean;
  phoneIsWhatsapp: boolean;
}

export interface Achado {
  cliente: ClienteBase;
  pontos: number;
  /** "todas": todas as palavras do que foi digitado bateram. "parcial": só algumas. */
  forca: 'todas' | 'parcial';
}

/** Quanto uma palavra digitada combina com uma palavra do nome (0 = nada). */
function pontosPalavra(digitada: string, doNome: string): number {
  if (doNome === digitada) return 3;
  if (doNome.startsWith(digitada) && digitada.length >= 2) return 2.5;
  if (digitada.length >= 3 && doNome.includes(digitada)) return 1.5;
  if (digitada.length >= 4) {
    const max = digitada.length >= 7 ? 2 : 1;
    if (distancia(digitada, doNome, max) <= max) return 1.2;
  }
  return 0;
}

export function buscarClientes(todos: ClienteBase[], consulta: string, limite = 8): { achados: Achado[]; tipo: 'nome' | 'telefone' | 'email' | 'documento' } {
  const bruto = consulta.trim();
  const digitos = soDigitos(bruto);

  // e-mail
  if (bruto.includes('@')) {
    const alvo = bruto.toLowerCase();
    const achados = todos
      .filter((c) => c.email && c.email.toLowerCase().includes(alvo))
      .slice(0, limite)
      .map((cliente) => ({ cliente, pontos: 10, forca: 'todas' as const }));
    return { achados, tipo: 'email' };
  }

  // telefone ou CPF: só números (6 ou mais)
  if (digitos.length >= 6 && digitos.length >= bruto.replace(/[\s().+-]/g, '').length) {
    const cauda = digitos.replace(/^0+/, '').replace(/^55(?=\d{10,11}$)/, '');
    const porTelefone = todos.filter((c) => {
      const d = soDigitos(c.phone ?? '');
      return d.length >= 6 && (d.endsWith(cauda) || d.includes(cauda) || (cauda.length >= 8 && d.endsWith(cauda.slice(-8))));
    });
    if (porTelefone.length > 0) {
      return { achados: porTelefone.slice(0, limite).map((cliente) => ({ cliente, pontos: 10, forca: 'todas' as const })), tipo: 'telefone' };
    }
    const porDoc = todos.filter((c) => c.doc && soDigitos(c.doc).includes(digitos));
    return { achados: porDoc.slice(0, limite).map((cliente) => ({ cliente, pontos: 10, forca: 'todas' as const })), tipo: porDoc.length ? 'documento' : 'telefone' };
  }

  // nome
  const digitadas = palavras(bruto);
  if (digitadas.length === 0) return { achados: [], tipo: 'nome' };

  const achados: Achado[] = [];
  for (const cliente of todos) {
    const doNome = palavras(cliente.name);
    if (doNome.length === 0) continue;
    let soma = 0;
    let bateram = 0;
    for (const d of digitadas) {
      let melhor = 0;
      for (const n of doNome) melhor = Math.max(melhor, pontosPalavra(d, n));
      if (melhor > 0) bateram++;
      soma += melhor;
    }
    if (bateram === 0) continue;
    const todas = bateram === digitadas.length;
    let pontos = soma;
    // o nome começa pelo que foi digitado primeiro: sobe um pouco
    if (pontosPalavra(digitadas[0], doNome[0]) >= 2.5) pontos += 0.8;
    // nome completo igual
    if (normalizar(cliente.name) === digitadas.join(' ')) pontos += 3;
    if (cliente.active) pontos += 0.3;
    achados.push({ cliente, pontos, forca: todas ? 'todas' : 'parcial' });
  }

  achados.sort((x, y) => (x.forca === y.forca ? 0 : x.forca === 'todas' ? -1 : 1) || y.pontos - x.pontos || x.cliente.name.length - y.cliente.name.length);

  // uma palavra só e muita gente: mantém os que começam por ela antes dos que só contêm
  return { achados: achados.slice(0, limite), tipo: 'nome' };
}

/** Existe um único candidato claramente melhor que os outros? */
export function candidatoUnico(achados: Achado[]): ClienteBase | null {
  const fortes = achados.filter((a) => a.forca === 'todas');
  if (fortes.length === 1) return fortes[0].cliente;
  if (fortes.length > 1 && fortes[0].pontos - fortes[1].pontos >= 2.5) return fortes[0].cliente;
  return null;
}
