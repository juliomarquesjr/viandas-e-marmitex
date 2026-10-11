// Busca de cadastros da RO: sem acento, por palavras soltas em qualquer ordem, com erro de digitação (inclusive letras
// trocadas de lugar), por telefone (inteiro ou só o final), e-mail (inteiro ou um pedaço) e parte do CPF.
// Puro: recebe a lista de clientes (testado em tests/ro.test.ts).

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
  /** Todas as palavras bateram de verdade (iguais ou o começo do nome), não só por semelhança de letras. */
  forte: boolean;
}

export type TipoBusca = 'nome' | 'telefone' | 'telefone_final' | 'email' | 'documento';

export interface ResultadoBusca {
  /** Os melhores, já cortados em `limite`. */
  achados: Achado[];
  tipo: TipoBusca;
  /** Quantos combinaram no total, antes de cortar. */
  total: number;
}

interface PontoPalavra {
  pontos: number;
  forte: boolean;
}

const NADA: PontoPalavra = { pontos: 0, forte: false };

/** Quanto uma palavra digitada combina com uma palavra do nome (0 = nada). */
function pontosPalavra(digitada: string, doNome: string): PontoPalavra {
  if (doNome === digitada) return { pontos: 3, forte: true };
  if (digitada.length >= 2 && doNome.startsWith(digitada)) return { pontos: 2.5, forte: true };
  if (digitada.length >= 3 && doNome.includes(digitada)) return { pontos: 1.5, forte: digitada.length >= 5 };
  if (digitada.length >= 4) {
    const max = digitada.length >= 9 ? 2 : 1;
    if (distancia(digitada, doNome, max) <= max) return { pontos: 1.2, forte: false };
    // escreveu o começo do nome com uma letra errada (luis -> luiza)
    if (doNome.length > digitada.length && distancia(digitada, doNome.slice(0, digitada.length), 1) <= 1) return { pontos: 1.1, forte: false };
  } else if (digitada.length === 3 && doNome.length <= 5 && distancia(digitada, doNome, 1) <= 1) {
    // falta ou sobra uma letra em nome curto (dai -> Dani)
    return { pontos: 1, forte: false };
  }
  return NADA;
}

const PALAVRAS_DE_TELEFONE = /\b(termina|terminado|terminando|final|finais|ultimos|digitos|em|com|telefone|fone|celular|numero|whatsapp|zap|cpf|do|da|de|no)\b/gi;

const aCliente = (cliente: ClienteBase): Achado => ({ cliente, pontos: 10, forca: 'todas', forte: true });

export function buscarClientes(todos: ClienteBase[], consulta: string, limite = 8): ResultadoBusca {
  const bruto = consulta.trim();
  const cortar = (lista: Achado[], tipo: TipoBusca): ResultadoBusca => ({ achados: lista.slice(0, limite), tipo, total: lista.length });

  // e-mail inteiro ou parte dele (com "@")
  if (bruto.includes('@')) {
    const alvo = bruto.toLowerCase();
    return cortar(todos.filter((c) => c.email && c.email.toLowerCase().includes(alvo)).map(aCliente), 'email');
  }

  // telefone ou CPF: só números (pode vir com "termina em", "final", "telefone")
  const semPalavras = bruto.replace(PALAVRAS_DE_TELEFONE, ' ').trim();
  if (semPalavras && /^[\d\s().+-]+$/.test(semPalavras)) {
    const digitos = soDigitos(semPalavras);
    if (digitos.length >= 6) {
      const cauda = digitos.replace(/^0+/, '').replace(/^55(?=\d{10,11}$)/, '');
      if (cauda.length >= 3) {
        const porTelefone = todos.filter((c) => {
          const d = soDigitos(c.phone ?? '');
          return d.length >= 6 && (d.endsWith(cauda) || d.includes(cauda) || (cauda.length >= 8 && d.endsWith(cauda.slice(-8))));
        });
        if (porTelefone.length > 0) return cortar(porTelefone.map(aCliente), 'telefone');
        const porDoc = todos.filter((c) => c.doc && soDigitos(c.doc).includes(digitos));
        return cortar(porDoc.map(aCliente), porDoc.length ? 'documento' : 'telefone');
      }
      return cortar([], 'telefone');
    }
    // 3 a 5 números: o final do telefone ("8021", "termina em 8021")
    if (digitos.length >= 3 && !/^0+$/.test(digitos)) {
      const terminam = todos.filter((c) => soDigitos(c.phone ?? '').endsWith(digitos));
      const meio = terminam.length === 0 && digitos.length === 5 ? todos.filter((c) => soDigitos(c.phone ?? '').includes(digitos)) : [];
      return cortar([...terminam, ...meio].map(aCliente), 'telefone_final');
    }
    return cortar([], 'telefone_final');
  }

  // nome
  const digitadas = palavras(bruto);
  if (digitadas.length === 0) return cortar([], 'nome');

  const achados: Achado[] = [];
  const normaisDigitadas = digitadas.join(' ');
  for (const cliente of todos) {
    const doNome = palavras(cliente.name);
    if (doNome.length === 0) continue;
    let soma = 0;
    let bateram = 0;
    let fortes = 0;
    for (const d of digitadas) {
      let melhor = NADA;
      for (const n of doNome) {
        const p = pontosPalavra(d, n);
        if (p.pontos > melhor.pontos) melhor = p;
      }
      if (melhor.pontos > 0) bateram++;
      if (melhor.forte) fortes++;
      soma += melhor.pontos;
    }
    if (bateram === 0) continue;
    const todas = bateram === digitadas.length;
    let pontos = soma;
    // o nome começa pelo que foi digitado primeiro: sobe um pouco
    if (pontosPalavra(digitadas[0], doNome[0]).pontos >= 2.5) pontos += 0.8;
    // nome completo igual
    if (doNome.join(' ') === normaisDigitadas) pontos += 3;
    if (cliente.active) pontos += 0.3;
    achados.push({ cliente, pontos, forca: todas ? 'todas' : 'parcial', forte: todas && fortes === digitadas.length });
  }

  // sem nada de verdade parecido com um nome, o texto pode ser um pedaço do e-mail ("bruna17567", "gmail")
  const compacto = bruto.toLowerCase().replace(/\s+/g, '');
  if (!achados.some((a) => a.forte) && compacto.length >= 4) {
    const porEmail = todos.filter((c) => c.email && c.email.toLowerCase().includes(compacto));
    if (porEmail.length > 0) return cortar(porEmail.map(aCliente), 'email');
  }

  achados.sort(
    (x, y) =>
      Number(y.forte) - Number(x.forte) ||
      (x.forca === y.forca ? 0 : x.forca === 'todas' ? -1 : 1) ||
      y.pontos - x.pontos ||
      x.cliente.name.length - y.cliente.name.length,
  );
  return cortar(achados, 'nome');
}

/** Existe um único candidato claramente melhor que os outros? Devolve também quem mais começa igual ("Também tem"). */
export function resolverUnico(achados: Achado[]): { cliente: ClienteBase; tambem: ClienteBase[] } | null {
  const fortes = achados.filter((a) => a.forte);
  if (fortes.length === 0) return null;
  if (fortes.length === 1 || fortes[0].pontos - fortes[1].pontos >= 2.5) {
    return { cliente: fortes[0].cliente, tambem: fortes.slice(1, 4).map((a) => a.cliente) };
  }
  return null;
}

export function candidatoUnico(achados: Achado[]): ClienteBase | null {
  return resolverUnico(achados)?.cliente ?? null;
}

/** Nome para a conversa: só o primeiro nome, ou mais quando outro cliente tem o mesmo primeiro nome. */
export function nomeParaConversa(cliente: Pick<ClienteBase, 'id' | 'name'>, todos: Pick<ClienteBase, 'id' | 'name'>[]): string {
  const partes = cliente.name.trim().split(/\s+/);
  const primeiro = partes[0] || cliente.name;
  const chave = normalizar(primeiro);
  const iguais = todos.filter((c) => c.id !== cliente.id && normalizar(c.name.trim().split(/\s+/)[0] ?? '') === chave);
  if (iguais.length === 0) return primeiro;
  if (partes.length >= 2) {
    const curto = `${primeiro} ${partes[partes.length - 1]}`;
    const ainda = iguais.some((c) => {
      const p = c.name.trim().split(/\s+/);
      return normalizar(`${p[0]} ${p[p.length - 1]}`) === normalizar(curto);
    });
    return ainda ? cliente.name : curto;
  }
  return cliente.name;
}
