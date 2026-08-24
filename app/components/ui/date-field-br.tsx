"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Campo de data no formato brasileiro.
 *
 * `<input type="date">` desenha o formato do **navegador**, não o da página:
 * num Chrome com locale en-US ele mostra `mm/dd/yyyy` mesmo com
 * `<html lang="pt-BR">`. Num campo que define o mês de competência de uma
 * cobrança, trocar dia por mês não é detalhe. Aqui a máscara é nossa e o valor
 * que sai continua em ISO (`YYYY-MM-DD`), como as APIs esperam.
 */

interface DateFieldBRProps {
  /** Valor em ISO (`YYYY-MM-DD`) ou string vazia. */
  value: string;
  onChange: (isoDate: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  /** Limite superior em ISO — datas acima disso são rejeitadas. */
  max?: string;
}

function isoToBR(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function maskBR(digits: string) {
  const clean = digits.slice(0, 8);
  if (clean.length <= 2) return clean;
  if (clean.length <= 4) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
}

/** Só aceita a data quando ela existe de verdade — 31/02 não vira 03/03. */
function brToIso(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || year < 1900) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function DateFieldBR({
  value,
  onChange,
  id,
  disabled,
  className,
  placeholder = "dd/mm/aaaa",
  max,
}: DateFieldBRProps) {
  const [text, setText] = React.useState(() => isoToBR(value));
  const [invalid, setInvalid] = React.useState(false);

  // Só reescreve o texto quando o valor externo muda de verdade; caso contrário
  // o campo apagaria o que a pessoa está digitando a cada tecla.
  React.useEffect(() => {
    setText((current) => (brToIso(current) === value ? current : isoToBR(value)));
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskBR(event.target.value.replace(/\D/g, ""));
    setText(masked);

    if (!masked) {
      setInvalid(false);
      onChange("");
      return;
    }

    if (masked.length < 10) {
      setInvalid(false);
      return;
    }

    const iso = brToIso(masked);
    if (!iso || (max && iso > max)) {
      setInvalid(true);
      return;
    }

    setInvalid(false);
    onChange(iso);
  };

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        disabled={disabled}
        onChange={handleChange}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full rounded-xl border bg-card px-3 py-3 pr-10 text-base text-foreground outline-none transition-all tabular-nums",
          "placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50",
          invalid
            ? "border-red-300 ring-2 ring-red-200"
            : "border-[color:var(--border)] focus:border-primary focus:ring-2 focus:ring-primary/15",
          className
        )}
      />
      <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
      {invalid && (
        <p className="mt-1 text-xs text-red-500">
          {max ? "Data inválida ou no futuro." : "Data inválida."}
        </p>
      )}
    </div>
  );
}
