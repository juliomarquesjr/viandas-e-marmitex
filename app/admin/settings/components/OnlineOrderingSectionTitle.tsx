"use client";

export function OnlineOrderingSectionTitle({
  icon: Icon,
  title,
  id,
  children,
}: {
  icon: React.ElementType;
  title: string;
  id?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <div>
        <h3 id={id} className="text-base font-semibold text-[color:var(--foreground)]">
          {title}
        </h3>
        {children && <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">{children}</p>}
      </div>
    </div>
  );
}
