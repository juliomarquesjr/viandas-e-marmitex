import * as React from "react";

/** Texto da RO em markdown simples: parágrafos, listas com "- " e **negrito** / _itálico_ (puro, testado em tests/ro-painel.test.ts). */
export type Trecho = { texto: string; negrito?: boolean; italico?: boolean };
export type Bloco = { tipo: "p"; trechos: Trecho[] } | { tipo: "ul"; itens: Trecho[][] };

export function parseInline(linha: string): Trecho[] {
  const trechos: Trecho[] = [];
  const re = /\*\*(.+?)\*\*|(?<![A-Za-z0-9])_(.+?)_(?![A-Za-z0-9])/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(linha))) {
    if (m.index > ultimo) trechos.push({ texto: linha.slice(ultimo, m.index) });
    if (m[1] !== undefined) trechos.push({ texto: m[1], negrito: true });
    else trechos.push({ texto: m[2], italico: true });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < linha.length) trechos.push({ texto: linha.slice(ultimo) });
  return trechos.length ? trechos : [{ texto: linha }];
}

export function parseMarkdown(texto: string): Bloco[] {
  const blocos: Bloco[] = [];
  let lista: Trecho[][] | null = null;
  let paragrafo: string[] = [];

  const fecharParagrafo = () => {
    if (paragrafo.length) blocos.push({ tipo: "p", trechos: parseInline(paragrafo.join("\n")) });
    paragrafo = [];
  };
  const fecharLista = () => {
    if (lista) blocos.push({ tipo: "ul", itens: lista });
    lista = null;
  };

  for (const linha of texto.replace(/\r\n/g, "\n").split("\n")) {
    const item = /^\s*(?:[-*•])\s+(.*)$/.exec(linha);
    if (item) {
      fecharParagrafo();
      (lista ??= []).push(parseInline(item[1]));
    } else if (linha.trim() === "") {
      fecharParagrafo();
      fecharLista();
    } else {
      fecharLista();
      paragrafo.push(linha);
    }
  }
  fecharParagrafo();
  fecharLista();
  return blocos;
}

function Inline({ trechos }: { trechos: Trecho[] }) {
  return (
    <>
      {trechos.map((t, i) => (t.negrito ? <strong key={i} className="font-semibold text-[color:var(--foreground)]">{t.texto}</strong> : t.italico ? <em key={i}>{t.texto}</em> : <React.Fragment key={i}>{t.texto}</React.Fragment>))}
    </>
  );
}

export function Markdown({ texto }: { texto: string }) {
  const blocos = React.useMemo(() => parseMarkdown(texto), [texto]);
  return (
    <div className="space-y-2 leading-relaxed">
      {blocos.map((b, i) =>
        b.tipo === "p" ? (
          <p key={i} className="whitespace-pre-line break-words">
            <Inline trechos={b.trechos} />
          </p>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.itens.map((it, j) => (
              <li key={j} className="break-words">
                <Inline trechos={it} />
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
