// Animação da RO. O GSAP faz a coreografia (rosto, cabeça, adereços e os "laços" de cada estado). Cada mão tem um
// alvo: uma mola leva a mão até lá (chega, passa um pouquinho e acomoda) e o cotovelo sai de uma conta de
// cinemática inversa (IK), como em um boneco com esqueleto. Quem pede "mude de expressão" é o componente.

import gsap from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";

import { BOCAS, ESTADOS, SOBRANCELHAS, type EstadoDaRo, type RoEstado } from "./estados";

gsap.registerPlugin(MorphSVGPlugin);

const L1 = 107;
const L2 = 90;
const OMBRO: [number, number] = [300, 415];
const PI = Math.PI;
const POSE_PROPS = "--giro,--cy,--lean,--ox,--oy,--chapeu,--salto,--sx,--sy";

type Mao = { x: number; y: number; pd: number };

interface Braco {
  so: SVGPathElement; sw: SVGPathElement; sh: SVGPathElement; fo: SVGPathElement; fs: SVGPathElement; co: SVGPathElement; cw: SVGPathElement; cf: SVGPathElement;
  ombro: SVGCircleElement; mao: SVGGElement;
  base: [number, number]; lado: number; sdAlvo: number; off: Mao;
  x: number; y: number; vx: number; vy: number; w: number; vw: number; sd: number; vsd: number; pd: number; vpd: number;
}

interface Laco {
  /** Movimentos da cabeça, dos olhos e do chapéu. */
  cab: (tl: gsap.core.Timeline, svg: SVGSVGElement) => void;
  /** Duração (s) de uma volta do movimento das mãos. */
  dur: number;
  /** Move os alvos das mãos (deslocamentos em px e giro do punho em graus) para a fase p (0 a 2π). */
  mao: (p: number, d: Mao, e: Mao) => void;
}

const sino = (tl: gsap.core.Timeline, svg: SVGSVGElement, alvo: gsap.TweenVars, dur: number, pos = 0.6) => tl.to(svg, { ...alvo, duration: dur, ease: "sine.inOut", repeat: -1, yoyo: true }, pos);

const LACOS: Partial<Record<RoEstado, Laco>> = {
  ola: { cab: (tl, svg) => { sino(tl, svg, { "--giro": "1deg" }, 0.7, 0.7); }, dur: 0.68, mao: (p, d) => { d.x = 18 * Math.sin(p); d.y = -6 * Math.cos(2 * p); d.pd = 24 * Math.sin(p - 1); } },
  aguardando: {
    cab: (tl, svg) => {
      const olha = gsap.timeline({ repeat: -1, repeatDelay: 1.4 });
      olha.to(svg, { "--ox": "-6px", duration: 0.35, ease: "power2.out" }).to(svg, { "--ox": "0px", duration: 0.4, ease: "power2.inOut" }, "+=1.1")
        .to(svg, { "--ox": "6px", "--oy": "1px", duration: 0.35, ease: "power2.out" }, "+=1.6").to(svg, { "--ox": "0px", "--oy": "0px", duration: 0.4, ease: "power2.inOut" }, "+=0.9")
        .to(svg, { "--chapeu": "3deg", "--giro": "2deg", duration: 0.5, ease: "sine.inOut" }, "+=0.6").to(svg, { "--chapeu": "0deg", "--giro": "0deg", duration: 0.9, ease: "elastic.out(1,.4)" });
      tl.add(olha, 0.8);
    },
    dur: 4.2,
    mao: (p, d, e) => { d.y = 2.5 * Math.sin(p); e.y = 2.5 * Math.sin(p + 0.8); d.pd = 3 * Math.sin(p - 1); e.pd = -3 * Math.sin(p - 1.6); },
  },
  ouvindo: { cab: (tl, svg) => { sino(tl, svg, { "--cy": "6px" }, 1.1, 0.7); sino(tl, svg, { "--oy": "9px" }, 1.4, 0.7); }, dur: 2.4, mao: (p, d) => { d.y = 3 * Math.sin(p); d.pd = 6 * Math.sin(p + 1); } },
  pensando: { cab: (tl, svg) => { sino(tl, svg, { "--ox": "-6px", "--oy": "-7px" }, 1.4, 0.7); sino(tl, svg, { "--giro": "-1deg" }, 1.1, 0.7); }, dur: 1.15, mao: (p, d) => { d.x = 13 * Math.cos(p); d.y = 6 * Math.sin(p); d.pd = 14 * Math.sin(p + 0.5); } },
  procurando: { cab: (tl, svg) => { sino(tl, svg, { "--ox": "-7px" }, 0.8); sino(tl, svg, { "--giro": "8deg" }, 1.3); }, dur: 2.6, mao: (p, d) => { d.x = 16 * Math.sin(p); d.y = -9 * Math.sin(p * 2 + 0.6); d.pd = 12 * Math.sin(p - 0.4); } },
  calculando: { cab: (tl, svg) => { sino(tl, svg, { "--cy": "3px", "--giro": "-6deg" }, 0.7); sino(tl, svg, { "--ox": "-2px" }, 0.9); }, dur: 1.2, mao: (p, d) => { d.y = -9 * Math.max(0, Math.sin(p)); d.pd = 16 * Math.sin(p); } },
  conferindo: { cab: (tl, svg) => { sino(tl, svg, { "--oy": "4px" }, 0.8); }, dur: 2.2, mao: (p, d) => { d.y = 8 * Math.sin(p); d.x = 4 * Math.sin(p * 2); d.pd = 5 * Math.sin(p); } },
  demorando: { cab: (tl, svg) => { sino(tl, svg, { "--cy": "5px", "--giro": "-7deg" }, 1.3); sino(tl, svg, { "--ox": "-6px" }, 1.6); }, dur: 0.5, mao: (p, d) => { d.x = -10 * Math.sin(p); d.y = 3 * Math.cos(2 * p); d.pd = 16 * Math.sin(p - 0.7); } },
  feliz: {
    cab: (tl, svg) => {
      const pulo = gsap.timeline({ repeat: -1, repeatDelay: 0.3 });
      pulo.to(svg, { "--sy": 0.9, "--sx": 1.06, "--salto": "5px", duration: 0.14, ease: "power2.out" })
        .to(svg, { "--sy": 1.06, "--sx": 0.96, "--salto": "-30px", duration: 0.24, ease: "power2.out" })
        .to(svg, { "--sy": 1, "--sx": 1, duration: 0.1 }, ">")
        .to(svg, { "--salto": "0px", duration: 0.24, ease: "power2.in" })
        .to(svg, { "--sy": 0.88, "--sx": 1.08, duration: 0.07, ease: "power1.out" })
        .to(svg, { "--sy": 1, "--sx": 1, duration: 0.5, ease: "elastic.out(1,.35)" });
      tl.add(pulo, 0.35);
      sino(tl, svg, { "--chapeu": "-9deg" }, 0.32, 0.5);
    },
    dur: 1.59,
    mao: (p, d, e) => { const sobe = -22 * Math.max(0, Math.sin(p - 0.4)); d.y = sobe; e.y = sobe; d.pd = 18 * Math.sin(p * 3); e.pd = -18 * Math.sin(p * 3); },
  },
  confusa: {
    cab: (tl, svg) => { sino(tl, svg, { "--giro": "-4deg" }, 1.2); sino(tl, svg, { "--ox": "-6px" }, 1); },
    dur: 2.4,
    mao: (p, d, e) => { const s = 0.5 - 0.5 * Math.cos(p); d.y = -12 * s; e.y = -12 * s; d.x = 5 * Math.sin(p); e.x = 5 * Math.sin(p); d.pd = 10 * Math.sin(p + 1); e.pd = -10 * Math.sin(p + 1); },
  },
  preocupada: {
    cab: (tl, svg) => { tl.to(svg, { "--giro": "-1.5deg", duration: 0.09, ease: "none", repeat: -1, yoyo: true }, 0.6); },
    dur: 0.42,
    mao: (p, d, e) => { d.x = 6 * Math.sin(p); e.x = -6 * Math.sin(p); d.y = 2 * Math.cos(p); e.y = -2 * Math.cos(p); d.pd = 14 * Math.sin(p); e.pd = 14 * Math.sin(p + PI); },
  },
  descansando: { cab: (tl, svg) => { sino(tl, svg, { "--cy": "9px", "--giro": "11deg" }, 2.4, 0.8); sino(tl, svg, { "--chapeu": "14deg" }, 2.4, 0.8); }, dur: 5.5, mao: (p, d, e) => { d.y = 3 * Math.sin(p); e.y = 3 * Math.sin(p + 0.5); d.pd = 4 * Math.sin(p); e.pd = -4 * Math.sin(p + 0.5); } },
  recusando: {
    cab: (tl, svg) => {
      const nao = gsap.timeline({ repeat: -1, repeatDelay: 0.9 });
      nao.to(svg, { "--giro": "-6deg", duration: 0.14, ease: "power2.out" }).to(svg, { "--giro": "6deg", duration: 0.26, ease: "sine.inOut" })
        .to(svg, { "--giro": "-6deg", duration: 0.26, ease: "sine.inOut" }).to(svg, { "--giro": "0deg", duration: 0.3, ease: "back.out(2)" });
      tl.add(nao, 0.5);
    },
    dur: 0.55,
    mao: (p, d) => { d.x = 7 * Math.sin(p); d.pd = 24 * Math.sin(p - 0.6); },
  },
};

const f1 = (n: number) => n.toFixed(1);

function fk(od: number, cd: number) {
  const a1 = (od * PI) / 180;
  const a2 = ((od + cd) * PI) / 180;
  const E: [number, number] = [OMBRO[0] - L1 * Math.sin(a1), OMBRO[1] + L1 * Math.cos(a1)];
  return { E, W: [E[0] - L2 * Math.sin(a2), E[1] + L2 * Math.cos(a2)] as [number, number] };
}

function criarBraco(g: SVGGElement | null): Braco | null {
  if (!g) return null;
  const q = <T extends Element>(s: string) => g.querySelector(s) as unknown as T;
  return {
    so: q(".a-so"), sw: q(".a-sw"), sh: q(".a-sh"), fo: q(".a-fo"), fs: q(".a-fs"), co: q(".a-co"), cw: q(".a-cw"), cf: q(".a-cf"), ombro: q(".a-ombro"), mao: q(".mao"),
    base: [OMBRO[0], OMBRO[1] + 190], lado: 1, sdAlvo: 0, off: { x: 0, y: 0, pd: 0 },
    x: 0, y: 0, vx: 0, vy: 0, w: 1, vw: 0, sd: 0, vsd: 0, pd: 0, vpd: 0,
  };
}

function ajustarBraco(a: Braco, od: number, cd: number) {
  const p = fk(od, cd);
  a.base = p.W;
  const th = Math.atan2(p.W[1] - OMBRO[1], p.W[0] - OMBRO[0]);
  const fi = Math.atan2(p.E[1] - OMBRO[1], p.E[0] - OMBRO[0]);
  const dif = Math.atan2(Math.sin(fi - th), Math.cos(fi - th));
  a.lado = dif >= 0 ? 1 : -1;
  a.sdAlvo = od < -10 ? (Math.max(od, -70) / 70) * 9 : 0;
}

function mola(o: Record<string, number>, k: string, alvo: number, v: string, dt: number, kk: number, cc: number) {
  const acc = -kk * (o[k] - alvo) - cc * o[v];
  o[v] += acc * dt;
  o[k] += o[v] * dt;
}

function desenharBraco(a: Braco) {
  const S: [number, number] = [OMBRO[0], OMBRO[1] + a.sd];
  const dx = a.x - S[0];
  const dy = a.y - S[1];
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const dm = Math.min(Math.max(d, 30), L1 + L2 - 0.5);
  const th = Math.atan2(dy, dx);
  const W: [number, number] = [S[0] + Math.cos(th) * dm, S[1] + Math.sin(th) * dm];
  const cosA = (L1 * L1 + dm * dm - L2 * L2) / (2 * L1 * dm);
  const A = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const ang = th + a.w * A;
  const E: [number, number] = [S[0] + L1 * Math.cos(ang), S[1] + L1 * Math.sin(ang)];
  const vx = W[0] - E[0];
  const vy = W[1] - E[1];
  const vl = Math.sqrt(vx * vx + vy * vy) || 1;
  const ux = vx / vl;
  const uy = vy / vl;
  const P = (p: [number, number]) => `${f1(p[0])} ${f1(p[1])}`;
  const at = (t: number): [number, number] => [E[0] + ux * t, E[1] + uy * t];
  const manga = `M${P(S)} L${P(E)} L${P(at(12))}`;
  a.so.setAttribute("d", manga);
  a.sw.setAttribute("d", manga);
  const sx = E[0] - S[0];
  const sy = E[1] - S[1];
  const sl = Math.sqrt(sx * sx + sy * sy) || 1;
  let nx = -sy / sl;
  let ny = sx / sl;
  if (ny < -0.01 || (Math.abs(ny) <= 0.01 && nx < 0)) { nx = -nx; ny = -ny; }
  a.sh.setAttribute("d", `M${P([S[0] + nx * 13, S[1] + ny * 13])} L${P([E[0] + nx * 12, E[1] + ny * 12])}`);
  const punho = `M${P(at(3))} L${P(at(27))}`;
  a.co.setAttribute("d", punho);
  a.cw.setAttribute("d", punho);
  const cm = at(15);
  a.cf.setAttribute("d", `M${P([cm[0] - uy * 21, cm[1] + ux * 21])} L${P([cm[0] + uy * 21, cm[1] - ux * 21])}`);
  const antebraco = `M${P(at(22))} L${P(W)}`;
  a.fo.setAttribute("d", antebraco);
  a.fs.setAttribute("d", antebraco);
  a.ombro.setAttribute("cx", f1(S[0]));
  a.ombro.setAttribute("cy", f1(S[1] + 3));
  const rot = (Math.atan2(-ux, uy) * 180) / PI + a.pd;
  a.mao.setAttribute("transform", `translate(${P(W)}) rotate(${f1(rot)})`);
}

export interface PersonagemAnimado {
  ir: (nome: RoEstado) => void;
  destruir: () => void;
}

/** Liga a animação a um desenho já montado. `reduzir` = pessoa pediu menos movimento: as expressões trocam sem animar. */
export function animarPersonagem(svg: SVGSVGElement, reduzir: boolean): PersonagemAnimado {
  const q = <T extends Element>(s: string) => svg.querySelector(s) as unknown as T | null;
  const boca = q<SVGPathElement>(".boca");
  const lingua = q<SVGPathElement>(".lingua");
  const sl = q<SVGPathElement>(".sl");
  const sr = q<SVGPathElement>(".sr");
  const bracos = { d: criarBraco(q<SVGGElement>(".braco.d")), e: criarBraco(q<SVGGElement>(".braco.e")) };
  const props = Array.from(svg.querySelectorAll<SVGGElement>(".p"));
  const P = { ph: 0 };
  const tempos: number[] = [];
  const extras: gsap.core.Animation[] = [];
  let tl: gsap.core.Timeline | null = null;
  let ativos: SVGGElement[] = [];
  let vivo = true;

  gsap.set(props, { autoAlpha: 0 });

  let tick: ((t: number, ms: number) => void) | null = null;
  if (bracos.d && bracos.e) {
    const par = [bracos.d, bracos.e];
    par.forEach((a) => { ajustarBraco(a, 4, 6); a.x = a.base[0]; a.y = a.base[1]; a.w = a.lado; a.sd = 0; desenharBraco(a); });
    tick = (_t, ms) => {
      if (!vivo) return;
      const dt = Math.min((ms || 16) / 1000, 0.05) / 2;
      par.forEach((a) => {
        const alvoX = a.base[0] + a.off.x;
        const alvoY = a.base[1] + a.off.y;
        if (reduzir) { a.x = alvoX; a.y = alvoY; a.w = a.lado; a.sd = a.sdAlvo; a.pd = a.off.pd; } else {
          const o = a as unknown as Record<string, number>;
          for (let i = 0; i < 2; i++) {
            mola(o, "x", alvoX, "vx", dt, 150, 15);
            mola(o, "y", alvoY, "vy", dt, 150, 15);
            mola(o, "w", a.lado, "vw", dt, 70, 11);
            mola(o, "sd", a.sdAlvo, "vsd", dt, 120, 14);
            mola(o, "pd", a.off.pd, "vpd", dt, 210, 11);
          }
        }
        desenharBraco(a);
      });
    };
    gsap.ticker.add(tick);
  }

  if (!reduzir) {
    extras.push(gsap.to(svg, { "--resp": "3.5px", duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
    const piscar = () => {
      if (!vivo) return;
      extras.push(gsap.timeline({ delay: gsap.utils.random(2.2, 5.4), onComplete: piscar }).to(svg, { "--pisca": 0.08, duration: 0.07 }).to(svg, { "--pisca": 1, duration: 0.12 }));
    };
    piscar();
  }

  const forma = (el: SVGPathElement | null, d: string, dur: number) => {
    if (!el) return;
    if (reduzir) el.setAttribute("d", d);
    else gsap.to(el, { morphSVG: { shape: d }, duration: dur, ease: "back.out(1.8)", overwrite: "auto" });
  };

  const ir = (nome: RoEstado) => {
    if (!vivo) return;
    const e: EstadoDaRo = ESTADOS[nome];
    tl?.kill();
    gsap.killTweensOf(svg, POSE_PROPS);
    svg.setAttribute("data-estado", nome);
    const dur = reduzir ? 0 : 0.75;

    const trocaOlhos = () => svg.setAttribute("data-olhos", e.olhos);
    if (svg.getAttribute("data-olhos") !== e.olhos && !reduzir) {
      extras.push(gsap.timeline().to(svg, { "--pisca": 0.08, duration: 0.06 }).call(trocaOlhos).to(svg, { "--pisca": 1, duration: 0.1 }));
    } else trocaOlhos();

    const b = BOCAS[e.boca];
    forma(boca, b.d, 0.45);
    if (boca) gsap.to(boca, { fill: b.cheia ? "rgba(196,69,47,1)" : "rgba(196,69,47,0)", duration: reduzir ? 0 : 0.3 });
    if (lingua) gsap.to(lingua, { opacity: b.lingua ? 1 : 0, "--lingua": `${b.ly ?? 0}px`, duration: reduzir ? 0 : 0.3 });
    forma(sl, SOBRANCELHAS[e.sobr][0], 0.5);
    forma(sr, SOBRANCELHAS[e.sobr][1], 0.5);

    const doEstado = (p: SVGGElement) => e.ad.some((c) => p.classList.contains(c));
    props.forEach((p) => {
      const vai = doEstado(p);
      const ja = ativos.includes(p);
      gsap.killTweensOf(p); // uma entrada atrasada do estado anterior não pode ressuscitar um adereço que já saiu
      if (vai && ja) gsap.set(p, { autoAlpha: 1, scale: 1 });
      if (vai && !ja) gsap.fromTo(p, { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 50%" }, { autoAlpha: 1, scale: 1, duration: reduzir ? 0 : 0.55, ease: "back.out(2.4)", delay: reduzir ? 0 : 0.25 });
      if (!vai && ja) gsap.to(p, { autoAlpha: 0, scale: 0.6, duration: reduzir ? 0 : 0.25 });
    });
    ativos = props.filter(doEstado);

    /* braços: troca o alvo (a mola leva a mão até lá); o braço de cima sai primeiro e a mão chega por último */
    if (bracos.d && bracos.e) {
      ([["d", e.od, e.cd], ["e", e.oe, e.ce]] as const).forEach(([k, od, cd], i) => {
        const a = bracos[k] as Braco;
        a.off.x = 0; a.off.y = 0; a.off.pd = 0;
        if (reduzir) ajustarBraco(a, od, cd);
        else tempos.push(window.setTimeout(() => { if (vivo) ajustarBraco(a, od, cd); }, 40 * i));
      });
    }
    tl = gsap.timeline();
    tl.to(svg, { "--giro": `${e.giro ?? 0}deg`, "--cy": `${e.cy ?? 0}px`, "--lean": `${e.lean ?? 0}deg`, duration: dur, ease: "elastic.out(1,.55)" }, 0);
    tl.to(svg, { "--ox": `${e.ox ?? 0}px`, "--oy": `${e.oy ?? 0}px`, duration: dur * 0.6, ease: "power2.out" }, 0);
    tl.to(svg, { "--chapeu": `${e.chapeu ?? 0}deg`, "--salto": "0px", "--sx": 1, "--sy": 1, duration: dur * 1.2, ease: "elastic.out(1,.35)" }, 0.05);
    const laco = LACOS[nome];
    if (!reduzir && laco) {
      laco.cab(tl, svg);
      if (bracos.d && bracos.e) {
        const { d, e: esq } = bracos;
        P.ph = 0;
        tl.to(P, { ph: PI * 2, duration: laco.dur, ease: "none", repeat: -1, onUpdate: () => laco.mao(P.ph, d.off, esq.off) }, 0.45);
      }
    }
  };

  const destruir = () => {
    vivo = false;
    if (tick) gsap.ticker.remove(tick);
    tempos.forEach((t) => window.clearTimeout(t));
    tl?.kill();
    extras.forEach((a) => a.kill());
    gsap.killTweensOf(svg);
    gsap.killTweensOf(svg.querySelectorAll("*"));
    gsap.killTweensOf(P);
  };

  return { ir, destruir };
}
