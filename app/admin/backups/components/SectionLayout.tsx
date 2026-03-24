export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-8 py-2.5 bg-slate-50/80 border-b border-slate-100">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
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
    <div className="flex items-start gap-8 px-8 py-5 border-b border-slate-100 last:border-0">
      <div className="w-48 flex-shrink-0 pt-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
