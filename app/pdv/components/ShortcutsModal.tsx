"use client";

import {
  Calculator,
  Keyboard,
  ScanBarcode,
  Search,
  ShoppingCart,
  SquareStack,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Kbd } from "../../components/ui/kbd";

type Shortcut = {
  /** Cada combo é uma alternativa: [["Ctrl","K"]] ou [["+"],["="]]. */
  combos: string[][];
  label: string;
  note?: string;
};

type Group = {
  title: string;
  icon: ReactNode;
  hint?: string;
  items: Shortcut[];
};

const GROUPS: Group[] = [
  {
    title: "Venda",
    icon: <SquareStack className="h-4 w-4" />,
    hint: "Funcionam em qualquer lugar da tela do PDV",
    items: [
      { combos: [["F1"]], label: "Abrir esta ajuda" },
      {
        combos: [["Ctrl", "K"]],
        label: "Focar a busca de produtos",
        note: "⌘ K no Mac",
      },
      {
        combos: [["F2"]],
        label: "Abrir o pagamento",
        note: "exige itens no carrinho",
      },
      { combos: [["F3"]], label: "Selecionar cliente" },
      {
        combos: [["F4"]],
        label: "Aplicar desconto",
        note: "exige itens no carrinho",
      },
      {
        combos: [["F9"]],
        label: "Iniciar nova venda",
        note: "pede confirmação se houver itens",
      },
    ],
  },
  {
    title: "Itens do carrinho",
    icon: <ShoppingCart className="h-4 w-4" />,
    hint: "Agem sobre o item destacado na lista",
    items: [
      { combos: [["↑"], ["↓"]], label: "Navegar entre os itens" },
      {
        combos: [["+"], ["="]],
        label: "Aumentar a quantidade",
        note: "respeita o estoque",
      },
      {
        combos: [["−"], ["_"]],
        label: "Diminuir a quantidade",
        note: "mínimo de 1",
      },
      {
        combos: [["Delete"]],
        label: "Remover o item",
        note: "pede confirmação",
      },
    ],
  },
  {
    title: "Busca de produtos",
    icon: <Search className="h-4 w-4" />,
    hint: "A leitura de 13 dígitos do leitor entra sozinha, sem Enter",
    items: [
      {
        combos: [["Enter"]],
        label: "Adicionar quando a busca tem um resultado só",
      },
      { combos: [["Esc"]], label: "Limpar a busca" },
    ],
  },
  {
    title: "Seleção de cliente",
    icon: <Users className="h-4 w-4" />,
    hint: "Dentro da janela aberta pelo F3",
    items: [
      { combos: [["↑"], ["↓"]], label: "Navegar na lista" },
      { combos: [["Enter"]], label: "Selecionar o cliente em destaque" },
      { combos: [["Alt", "1"]], label: "Filtrar por todos os campos" },
      { combos: [["Alt", "2"]], label: "Filtrar por nome" },
      { combos: [["Alt", "3"]], label: "Filtrar por telefone" },
      { combos: [["Alt", "4"]], label: "Filtrar por e-mail" },
      { combos: [["Alt", "5"]], label: "Filtrar por código de barras" },
    ],
  },
  {
    title: "Calculadora",
    icon: <Calculator className="h-4 w-4" />,
    hint: "Com a calculadora aberta, os demais atalhos ficam suspensos",
    items: [
      {
        combos: [["0"], ["9"]],
        label: "Dígitos",
        note: "teclado normal ou numérico",
      },
      { combos: [[","], ["."]], label: "Separador decimal" },
      { combos: [["+"], ["−"], ["*"], ["/"]], label: "Operações" },
      { combos: [["Enter"], ["="]], label: "Calcular o resultado" },
      { combos: [["Backspace"]], label: "Apagar o último dígito" },
      { combos: [["Esc"]], label: "Limpar a conta" },
    ],
  },
  {
    title: "Janelas",
    icon: <ScanBarcode className="h-4 w-4" />,
    items: [
      { combos: [["Esc"]], label: "Fechar a janela aberta" },
      { combos: [["Enter"]], label: "Confirmar", note: "desconto e peso" },
    ],
  },
];

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            <span
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl"
              style={{
                background: "var(--modal-header-icon-bg)",
                boxShadow: "inset 0 0 0 1px var(--modal-header-icon-ring)",
              }}
            >
              <Keyboard className="h-[18px] w-[18px] text-primary" />
            </span>
            Atalhos do teclado
          </DialogTitle>
          <DialogDescription>
            Tudo que dá para fazer sem tirar a mão do teclado. Abra esta janela
            a qualquer momento com{" "}
            <Kbd className="h-5 min-w-5 text-[10px]">F1</Kbd>.
          </DialogDescription>
        </DialogHeader>

        <ShortcutsContent />
      </DialogContent>
    </Dialog>
  );
}

/** Separado da casca do diálogo para poder ser renderizado e inspecionado fora dele. */
export function ShortcutsContent() {
  return (
    <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
      <div className="columns-1 gap-4 md:columns-2">
        {GROUPS.map((group) => (
          <section
            key={group.title}
            className="mb-4 break-inside-avoid rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <header className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                {group.icon}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold leading-tight text-slate-900">
                  {group.title}
                </h3>
                {group.hint && (
                  <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">
                    {group.hint}
                  </p>
                )}
              </div>
            </header>

            <dl className="mt-1 divide-y divide-slate-50">
              {group.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-3 py-2"
                >
                  <dt className="min-w-0 flex-1">
                    <span className="block text-[12.5px] leading-snug text-slate-700">
                      {item.label}
                    </span>
                    {item.note && (
                      <span className="mt-0.5 block text-[10.5px] leading-snug text-slate-400">
                        {item.note}
                      </span>
                    )}
                  </dt>
                  <dd className="flex flex-shrink-0 flex-wrap items-center justify-end gap-1 pt-0.5">
                    {item.combos.map((combo, ci) => (
                      <span key={ci} className="flex items-center gap-1">
                        {ci > 0 && (
                          <span className="px-0.5 text-[10px] text-slate-400">
                            ou
                          </span>
                        )}
                        {combo.map((key, ki) => (
                          <span key={ki} className="flex items-center gap-1">
                            {ki > 0 && (
                              <span className="text-[10px] text-slate-400">
                                +
                              </span>
                            )}
                            <Kbd className="h-6 min-w-6 px-1.5 text-[11px]">
                              {key}
                            </Kbd>
                          </span>
                        ))}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
