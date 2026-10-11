// Expressões da RO e o que cada uma muda no desenho. A escolha de qual usar fica em humor.ts.

export type RoEstado =
  | "ola"
  | "aguardando"
  | "ouvindo"
  | "pensando"
  | "procurando"
  | "calculando"
  | "conferindo"
  | "demorando"
  | "feliz"
  | "confusa"
  | "preocupada"
  | "descansando"
  | "recusando";

export type RoOlhos = "aberto" | "feliz" | "fechado";
export type RoBoca = "aberta" | "grande" | "sorriso" | "o" | "reta" | "treme" | "triste" | "torta";
export type RoSobrancelha = "neutra" | "alta" | "preocupada" | "confusa" | "firme";

export interface BocaForma {
  d: string;
  cheia: boolean;
  lingua: boolean;
  /** Deslocamento da língua (px) para boca bem aberta. */
  ly?: number;
}

export const BOCAS: Record<RoBoca, BocaForma> = {
  aberta: { d: "M190 298 Q210 295 230 298 Q228 322 210 322 Q192 322 190 298 Z", cheia: true, lingua: true, ly: 0 },
  grande: { d: "M184 294 Q210 290 236 294 Q234 332 210 334 Q186 332 184 294 Z", cheia: true, lingua: true, ly: 9 },
  sorriso: { d: "M192 302 Q210 318 228 302", cheia: false, lingua: false },
  o: { d: "M202 310 a8 10 0 1 0 16 0 a8 10 0 1 0 -16 0 Z", cheia: true, lingua: false },
  reta: { d: "M196 310 Q210 310 224 310", cheia: false, lingua: false },
  treme: { d: "M190 314 Q200 304 210 314 Q220 324 230 314", cheia: false, lingua: false },
  triste: { d: "M194 318 Q210 302 226 318", cheia: false, lingua: false },
  torta: { d: "M196 312 Q212 306 228 300", cheia: false, lingua: false },
};

export const SOBRANCELHAS: Record<RoSobrancelha, [string, string]> = {
  neutra: ["M160 224 Q178 213 196 223", "M224 223 Q242 213 260 224"],
  alta: ["M160 214 Q178 201 196 212", "M224 212 Q242 201 260 214"],
  preocupada: ["M158 228 Q176 220 196 208", "M224 208 Q244 220 262 228"],
  confusa: ["M160 212 Q178 199 196 210", "M226 228 Q244 217 262 214"],
  firme: ["M160 222 Q178 221 196 220", "M224 220 Q242 221 260 222"],
};

export interface EstadoDaRo {
  /** Nome curto da expressão (cabeçalho do balão de fala). */
  rotulo: string;
  /** O que a RO "diz" no balão ao lado dela. */
  fala: string;
  /** Texto de status, sob o nome dela no cabeçalho. */
  status: string;
  olhos: RoOlhos;
  boca: RoBoca;
  sobr: RoSobrancelha;
  /** Pose dos braços em graus (od/cd: braço direito, oe/ce: esquerdo): ombro e cotovelo. */
  od: number;
  cd: number;
  oe: number;
  ce: number;
  giro?: number;
  cy?: number;
  lean?: number;
  ox?: number;
  oy?: number;
  chapeu?: number;
  /** Adereços que aparecem neste estado (classes .p-* do desenho). */
  ad: string[];
  /** Clima do fundo atrás dela (cor do brilho). */
  clima: "calmo" | "bom" | "ruim";
}

export const ESTADOS: Record<RoEstado, EstadoDaRo> = {
  ola: { rotulo: "Dizendo oi", fala: "Oi! Eu sou a RO. Pergunte sobre clientes, vendas e fichas.", status: "Pronta para ajudar", olhos: "aberto", boca: "aberta", sobr: "alta", od: -26, cd: -138, oe: 4, ce: 6, giro: 4, lean: 2, clima: "bom", ad: ["p-brilhos-leves"] },
  aguardando: { rotulo: "Esperando", fala: "Pode perguntar. Eu espero.", status: "Pronta para ajudar", olhos: "aberto", boca: "sorriso", sobr: "neutra", od: 4, cd: 6, oe: 4, ce: 6, giro: 0, clima: "calmo", ad: [] },
  ouvindo: { rotulo: "Lendo você", fala: "Estou lendo…", status: "Lendo sua pergunta", olhos: "aberto", boca: "sorriso", sobr: "alta", od: 48, cd: 138, oe: 14, ce: 78, giro: -3, cy: 3, oy: 7, lean: 3, clima: "calmo", ad: [] },
  pensando: { rotulo: "Pensando", fala: "Deixa eu ver isso pra você…", status: "Pensando…", olhos: "aberto", boca: "torta", sobr: "confusa", od: 57, cd: -45, oe: 6, ce: 8, giro: -4, ox: 6, oy: -5, lean: -2, clima: "calmo", ad: ["p-bolha", "p-panela", "p-colher"] },
  procurando: { rotulo: "Procurando", fala: "Procurando nos cadastros…", status: "Procurando…", olhos: "aberto", boca: "o", sobr: "alta", od: -20, cd: -140, oe: 4, ce: 6, giro: 4, lean: 2, clima: "calmo", ad: ["p-lupa"] },
  calculando: { rotulo: "Fazendo contas", fala: "Fazendo as contas…", status: "Calculando…", olhos: "aberto", boca: "torta", sobr: "neutra", od: -14, cd: -128, oe: 4, ce: 6, giro: -3, ox: 5, oy: -6, clima: "calmo", ad: ["p-moedas", "p-moeda-mao"] },
  conferindo: { rotulo: "Conferindo a ficha", fala: "Conferindo a ficha…", status: "Conferindo a ficha…", olhos: "aberto", boca: "sorriso", sobr: "neutra", od: -25, cd: -115, oe: 4, ce: 6, giro: 3, ox: 6, lean: 2, clima: "calmo", ad: ["p-ficha"] },
  demorando: { rotulo: "Demorando", fala: "Está demorando mais que o normal…", status: "Demorando um pouco", olhos: "aberto", boca: "treme", sobr: "preocupada", od: -26, cd: -138, oe: 4, ce: 6, giro: -4, ox: 6, oy: -4, lean: -2, clima: "ruim", ad: ["p-suor", "p-relogio"] },
  feliz: { rotulo: "Achou", fala: "Achei! Olha aí.", status: "Pronta para ajudar", olhos: "feliz", boca: "grande", sobr: "alta", od: -30, cd: -128, oe: -30, ce: -128, giro: 0, clima: "bom", ad: ["p-brilhos"] },
  confusa: { rotulo: "Não achou", fala: "Não achei. Será que o nome é outro?", status: "Não achei", olhos: "aberto", boca: "torta", sobr: "confusa", od: -14, cd: -110, oe: -14, ce: -110, giro: 7, lean: 2, clima: "ruim", ad: ["p-duvida"] },
  preocupada: { rotulo: "Com problema", fala: "Ops, deu problema aqui. Tenta de novo?", status: "Com um problema", olhos: "aberto", boca: "treme", sobr: "preocupada", od: 30, cd: 120, oe: 30, ce: 120, giro: -3, cy: 3, lean: -2, clima: "ruim", ad: ["p-suor"] },
  descansando: { rotulo: "Descansando", fala: "Estou descansando um pouco. Perguntas simples eu ainda faço!", status: "Descansando", olhos: "fechado", boca: "o", sobr: "neutra", od: 2, cd: 4, oe: 2, ce: 4, giro: 9, chapeu: 8, cy: 4, lean: 3, clima: "calmo", ad: ["p-zzz"] },
  recusando: { rotulo: "Só consulto", fala: "Isso eu não faço. Eu só consulto.", status: "Só consulto", olhos: "aberto", boca: "sorriso", sobr: "firme", od: -20, cd: -152, oe: 4, ce: 6, giro: 0, lean: -1, clima: "calmo", ad: [] },
};
