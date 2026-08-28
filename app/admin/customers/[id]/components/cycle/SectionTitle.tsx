import { cn } from "@/lib/utils";

/**
 * O título de cada bloco da ficha: caixa alta, espaçada e com ícone.
 *
 * Existe um só para que "Consumo de agosto", "Lançamentos de agosto" e
 * "Histórico de ciclos" tenham exatamente o mesmo peso — a leitura da tela
 * depende de os blocos parecerem irmãos, não de cada um ter o seu tamanho.
 */
export function SectionTitle({
  icon: Icon,
  children,
  tone = "info",
  className,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  tone?: keyof typeof TONE_STYLE;
  className?: string;
}) {
  return (
    <h2 className={cn("flex items-center gap-2.5", className)}>
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]"
        style={TONE_STYLE[tone]}
      >
        <Icon className="h-[15px] w-[15px]" />
      </span>
      <span className="text-[14px] font-bold uppercase tracking-[0.09em] text-foreground">
        {children}
      </span>
    </h2>
  );
}

const TONE_STYLE = {
  info: { background: "var(--cycle-aberta-bg)", color: "var(--cycle-aberta-fg)" },
  ok: { background: "var(--cycle-paga-bg)", color: "var(--cycle-paga-fg)" },
  neutral: { background: "var(--cycle-vazio-bg)", color: "var(--cycle-vazio-fg)" },
} as const;
