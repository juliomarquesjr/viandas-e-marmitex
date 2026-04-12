export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/60 px-8 py-2.5">
      <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--muted-foreground)]">
        {children}
      </span>
    </div>
  );
}

export function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-8 border-b border-[color:var(--border)] px-8 py-5 last:border-0">
      <div className="w-48 flex-shrink-0 pt-1">
        <p className="text-sm font-medium text-[color:var(--foreground)]">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--muted-foreground)]">{description}</p>
        )}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
