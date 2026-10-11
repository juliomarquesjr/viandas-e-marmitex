// Desenho da RO (SVG feito à mão, sem nenhum dado de pessoa: o texto é fixo e só mexe em aparência).
// As partes que se mexem têm classes (.a-* nos braços, .boca, .sl/.sr nas sobrancelhas, .p-* nos adereços)
// e quem anima é animacao.ts.

function estrela(x: number, y: number, s: number): string { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path class="brilha" d="M0 -14 L3.4 -3.4 L14 0 L3.4 3.4 L0 14 L-3.4 3.4 L-14 0 L-3.4 -3.4 Z" fill="#ffd84d" stroke="#3a2924" stroke-width="2.4" stroke-linejoin="round"/></g>'; }
function moeda(x: number, y: number): string { return '<g class="flutua"><g transform="translate(' + x + ' ' + y + ')"><circle r="19" fill="#f6c343" stroke="#3a2924" stroke-width="3.5"/><circle r="12.5" fill="none" stroke="#c98f12" stroke-width="2"/><text y="5.5" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="600" font-size="15" fill="#7a5206">R$</text></g></g>'; }
/* O braço é desenhado por código a cada quadro: ombro, cotovelo e punho ligados por um traço contínuo. Assim o cotovelo dobra de verdade e nada se desprende. */
function braco(lado: "d" | "e"): string {
  const dedos = [[312, 646, 306, 676], [321, 648, 317, 684], [331, 648, 333, 684], [341, 646, 346, 676]];
  let mao = '<g class="mao"><g transform="translate(-326 -612)">';
  if (lado === 'd') {
    mao += '<g class="p p-lupa"><g class="lupa"><path d="M326 650 L326 716" stroke="#3a2924" stroke-width="14" stroke-linecap="round"/><path d="M326 650 L326 716" stroke="#a9733f" stroke-width="8" stroke-linecap="round"/><circle cx="326" cy="756" r="38" fill="rgba(190,225,255,.6)" stroke="#3a2924" stroke-width="6"/><path d="M306 744 Q313 730 330 728" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/></g></g>'
      + '<g class="p p-moeda-mao"><g transform="translate(326 694)"><circle class="moeda-gira" r="18" fill="#f6c343" stroke="#3a2924" stroke-width="3.5"/></g></g>'
      + '<g class="p p-colher"><g class="colher"><path d="M326 560 L326 690" stroke="#3a2924" stroke-width="13" stroke-linecap="round"/><path d="M326 560 L326 690" stroke="#c88a4a" stroke-width="7" stroke-linecap="round"/><ellipse cx="326" cy="712" rx="17" ry="22" fill="#c88a4a" stroke="#3a2924" stroke-width="5"/></g></g>';
  }
  mao += '<path d="M343 630 L363 652" stroke="#3a2924" stroke-width="16" stroke-linecap="round"/><path d="M343 630 L363 652" stroke="#f8c9a0" stroke-width="9" stroke-linecap="round"/>';
  dedos.forEach((d) => { mao += '<path d="M' + d[0] + ' ' + d[1] + ' L' + d[2] + ' ' + d[3] + '" stroke="#3a2924" stroke-width="15" stroke-linecap="round"/>'; });
  dedos.forEach((d) => { mao += '<path d="M' + d[0] + ' ' + d[1] + ' L' + d[2] + ' ' + d[3] + '" stroke="#f8c9a0" stroke-width="8.5" stroke-linecap="round"/>'; });
  mao += '<path class="ct pele" d="M309 604 L343 604 C349 624 350 640 344 652 Q326 662 308 652 C302 640 303 624 309 604 Z"/>'
    + '<path class="sem" stroke="#3a2924" stroke-width="2.6" stroke-linecap="round" d="M320 630 Q326 636 332 630" opacity=".55"/></g></g>';
  let tr = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
  let corpo = '<path class="a-fo" ' + tr + ' stroke="#3a2924" stroke-width="40"/><path class="a-fs" ' + tr + ' stroke="#f8c9a0" stroke-width="30"/>'
    + '<path class="a-so" ' + tr + ' stroke="#3a2924" stroke-width="56"/><path class="a-sw" ' + tr + ' stroke="#fffdf6" stroke-width="46"/>'
    + '<path class="a-sh" ' + tr + ' stroke="#e6dccb" stroke-width="9" opacity=".9"/>'
    + '<path class="a-co" ' + tr + ' stroke="#3a2924" stroke-width="66"/><path class="a-cw" ' + tr + ' stroke="#fffdf6" stroke-width="56"/>'
    + '<path class="a-cf" ' + tr + ' stroke="#3a2924" stroke-width="3.4"/>'
    + '<circle class="a-ombro" r="23" fill="#fffdf6"/>'
    + mao;
  return lado === 'd' ? '<g class="braco d">' + corpo + '</g>' : '<g class="braco e" transform="translate(420 0) scale(-1 1)">' + corpo + '</g>';
}
function olho(cx: number, dir: boolean): string {
  return '<g class="pisca' + (dir ? ' dir' : '') + '" data-o="aberto"><g class="olhar"><ellipse cx="' + cx + '" cy="252" rx="11" ry="16" fill="#2b1d1a"/><circle cx="' + (cx + 4) + '" cy="246" r="4.6" fill="#fff"/><circle cx="' + (cx - 4) + '" cy="259" r="2" fill="#fff"/></g></g>';
}
export function desenhoSVG(modo?: "rosto"): string {
  let vb = modo === 'rosto' ? '95 -10 230 380' : '-50 0 520 660';
  let s = '<svg class="ro-pers ' + (modo || '') + '" viewBox="' + vb + '" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false" data-estado="aguardando">';
  s += '<g class="tudo"><g class="inclina"><g class="tronco">';
  /* jaqueta */
  s += '<path class="ct branco" d="M112 440 C118 398 158 382 190 376 L230 376 C262 382 302 398 308 440 L326 720 L94 720 Z"/>';
  s += '<path class="ct sem" d="M232 392 C238 480 240 580 241 720"/>';
  [182, 238].forEach((x) => { [452, 520, 588].forEach((y) => { s += '<circle class="ct verm" cx="' + x + '" cy="' + y + '" r="7.5" style="stroke-width:3"/>'; }); });
  /* cabeça */
  s += '<g class="cabeca">';
  s += '<path class="ct cabelo" d="M124 236 C100 282 104 330 130 352 C142 358 152 352 154 340 L266 340 C268 352 278 358 290 352 C316 330 320 282 296 236 Z"/>';
  s += '<path class="ct pele" d="M191 326 L191 384 Q210 398 229 384 L229 326 Z"/>';
  s += '<path d="M191 338 Q210 358 229 338 L229 326 L191 326 Z" fill="var(--pele-sombra)"/>';
  s += '<circle class="ct pele" cx="129" cy="266" r="19"/><circle class="ct pele" cx="291" cy="266" r="19"/>';
  s += '<path class="sem" stroke="#3a2924" stroke-width="3" stroke-linecap="round" d="M124 258 Q132 262 127 274 M296 258 Q288 262 293 274" opacity=".6"/>';
  s += '<path class="ct pele" d="M128 250 C128 176 166 160 210 160 C254 160 292 176 292 250 C292 314 256 346 210 346 C164 346 128 314 128 250 Z"/>';
  s += '<ellipse cx="156" cy="290" rx="15" ry="9" fill="var(--blush)" opacity=".5"/><ellipse cx="264" cy="290" rx="15" ry="9" fill="var(--blush)" opacity=".5"/>';
  s += '<path class="ct cabelo" d="M130 242 C126 188 160 158 210 156 C262 158 296 190 290 242 C278 216 262 200 240 192 C214 212 176 222 130 242 Z"/>';
  /* sobrancelhas (um caminho por sobrancelha; o GSAP transforma de uma forma na outra) */
  s += '<path class="sl sem" stroke="#3a2924" stroke-width="5" stroke-linecap="round" d="M160 224 Q178 213 196 223"/><path class="sr sem" stroke="#3a2924" stroke-width="5" stroke-linecap="round" d="M224 223 Q242 213 260 224"/>';
  /* olhos */
  s += olho(178, false) + olho(242, true);
  let es = 'class="sem" stroke="#3a2924" stroke-width="5.5" stroke-linecap="round"';
  s += '<g data-o="feliz"><path ' + es + ' d="M164 258 Q178 236 192 258"/><path ' + es + ' d="M228 258 Q242 236 256 258"/></g>';
  s += '<g data-o="fechado"><path ' + es + ' d="M164 250 Q178 262 192 250"/><path ' + es + ' d="M228 250 Q242 262 256 250"/></g>';
  s += '<path class="sem" stroke="#3a2924" stroke-width="3.6" stroke-linecap="round" d="M166 240 L158 235 M254 240 L262 235" data-o="aberto"/>';
  /* nariz e boca */
  s += '<path class="sem" stroke="#3a2924" stroke-width="4" stroke-linecap="round" d="M208 268 Q217 277 209 284"/>';
  s += '<path class="boca" stroke="#3a2924" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" fill="rgba(196,69,47,0)" d="M192 302 Q210 318 228 302"/>';
  s += '<path class="lingua" fill="#f08a6e" opacity="0" d="M199 314 Q210 307 221 314 Q216 320 210 320 Q204 320 199 314 Z"/>';
  /* chapéu */
  s += '<g class="chapeu">';
  s += '<path class="ct branco" d="M138 178 L138 124 Q210 112 282 124 L282 178 Q210 190 138 178 Z"/>';
  s += '<path d="M138 164 Q210 176 282 164 L282 178 Q210 190 138 178 Z" fill="var(--branco-sombra)"/>';
  s += '<path class="ct branco" d="M128 130 C92 122 86 78 124 62 C128 28 176 12 208 36 C236 8 288 20 294 58 C328 68 328 116 288 126 Q210 114 128 130 Z"/>';
  s += '<path class="sem" stroke="#3a2924" stroke-width="3.5" stroke-linecap="round" d="M168 112 Q180 80 206 68 M256 106 Q248 82 234 72"/>';
  s += '</g></g>'; /* cabeça */
  /* lenço */
  s += '<path class="ct verm" d="M198 420 L166 482 Q192 494 213 458 Z"/><path class="ct verm" d="M222 420 L254 482 Q228 494 207 458 Z"/>';
  s += '<path class="ct verm" d="M164 378 Q210 412 256 378 L268 400 Q210 442 152 400 Z"/>';
  s += '<ellipse class="ct verm-esc" cx="210" cy="414" rx="17" ry="14"/>';
  if (modo !== 'rosto') {
    s += '<g class="p p-panela"><path class="ct" fill="#8c93a0" d="M100 626 Q100 706 148 722 L272 722 Q320 706 320 626 Z"/><path class="sem" stroke="#b9bfca" stroke-width="9" stroke-linecap="round" d="M114 646 Q114 694 146 708"/>'
      + '<path class="ct" fill="none" d="M96 640 Q76 640 76 656 Q76 668 96 668 M324 640 Q344 640 344 656 Q344 668 324 668"/>'
      + '<ellipse class="ct" cx="210" cy="626" rx="112" ry="23" fill="#aab1bd"/><ellipse cx="210" cy="629" rx="95" ry="16" fill="#c4452f" stroke="#3a2924" stroke-width="3"/>'
      + '<g><circle class="borbulha" cx="170" cy="631" r="6" fill="#ee7d63"/><circle class="borbulha" cx="236" cy="626" r="7" fill="#ee7d63"/><circle class="borbulha" cx="205" cy="634" r="5" fill="#ee7d63"/></g>'
      + '<g class="vapor"><path d="M160 596 q-10 -14 0 -26 t0 -26"/><path d="M212 592 q-10 -14 0 -26 t0 -26"/><path d="M262 596 q-10 -14 0 -26 t0 -26"/></g></g>';
    s += braco('e') + braco('d');
  }
  s += '</g></g>'; /* tronco e inclina */
  /* adereços */
  if (modo !== 'rosto') {
    s += '<g class="p p-bolha"><circle cx="318" cy="196" r="7" fill="#fffdf6" stroke="#3a2924" stroke-width="3"/><circle cx="338" cy="164" r="11" fill="#fffdf6" stroke="#3a2924" stroke-width="3"/>'
      + '<g><ellipse cx="380" cy="104" rx="62" ry="40" fill="#fffdf6" stroke="#3a2924" stroke-width="4"/><circle class="pt1" cx="352" cy="104" r="7" fill="#3a2924"/><circle class="pt2" cx="380" cy="104" r="7" fill="#3a2924"/><circle class="pt3" cx="408" cy="104" r="7" fill="#3a2924"/></g></g>';
    s += '<g class="p p-suor"><g class="ro-suor"><path d="M312 188 C312 188 296 210 296 224 a16 16 0 0 0 32 0 C328 210 312 188 312 188 Z" fill="#8fd0f5" stroke="#3a2924" stroke-width="4" stroke-linejoin="round"/><path d="M305 222 Q306 230 312 232" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/></g></g>';
    s += '<g class="p p-relogio"><g transform="translate(36 160)"><circle r="30" fill="#fffdf6" stroke="#3a2924" stroke-width="5"/><path class="sem" stroke="#3a2924" stroke-width="3" d="M0 -22 V-18 M22 0 H18 M0 22 V18 M-22 0 H-18"/><path class="sem" stroke="#3a2924" stroke-width="4" stroke-linecap="round" d="M0 0 L9 6"/><g class="ponteiro"><path class="sem" stroke="#b8341f" stroke-width="4" stroke-linecap="round" d="M0 0 L0 -17"/></g></g></g>';
    s += '<g class="p p-brilhos">' + estrela(60, 120, 1.3) + estrela(372, 96, 1.5) + estrela(26, 300, 1) + estrela(398, 276, 1.2) + '</g>';
    s += '<g class="p p-brilhos-leves">' + estrela(352, 120, 1.1) + estrela(60, 90, .9) + '</g>';
    s += '<g class="p p-duvida"><text class="duvida" x="326" y="120" font-family="Fredoka, sans-serif" font-weight="600" font-size="78" fill="#fff" stroke="#3a2924" stroke-width="5" paint-order="stroke">?</text><text class="duvida" x="40" y="168" font-family="Fredoka, sans-serif" font-weight="600" font-size="58" fill="#ffd84d" stroke="#3a2924" stroke-width="5" paint-order="stroke">?</text></g>';
    s += '<g class="p p-zzz"><text class="zz" x="318" y="170" font-family="Fredoka, sans-serif" font-weight="600" font-size="34" fill="#cfe0ff" stroke="#3a2924" stroke-width="4" paint-order="stroke">z</text><text class="zz" x="344" y="128" font-family="Fredoka, sans-serif" font-weight="600" font-size="46" fill="#cfe0ff" stroke="#3a2924" stroke-width="4" paint-order="stroke">z</text><text class="zz" x="378" y="78" font-family="Fredoka, sans-serif" font-weight="600" font-size="60" fill="#cfe0ff" stroke="#3a2924" stroke-width="4" paint-order="stroke">Z</text></g>';
    s += '<g class="p p-moedas">' + moeda(46, 220) + moeda(392, 250) + moeda(30, 360) + '</g>';
    s += '<g class="p p-ficha"><g transform="translate(322 232)"><rect width="118" height="150" rx="12" fill="#fffdf6" stroke="#3a2924" stroke-width="4.5"/><rect x="0" y="0" width="118" height="30" rx="12" fill="#2563eb" stroke="#3a2924" stroke-width="4.5"/><rect x="12" y="10" width="46" height="9" rx="4.5" fill="#fff"/>'
      + [0, 1, 2].map((i) => { let y = 54 + i * 32; return '<path class="tique" fill="none" stroke="#0f8a5f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="M14 ' + y + ' l7 8 l13 -16"/><rect x="46" y="' + (y - 4) + '" width="58" height="9" rx="4.5" fill="#d3d8e1"/>'; }).join('')
      + '</g></g>';
  }
  s += '</g></svg>';
  return s;
}

