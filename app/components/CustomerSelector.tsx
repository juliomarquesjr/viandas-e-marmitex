import { Package, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Customer } from "./CustomerSelectorDialog";
import { CustomerSelectorDialog } from "./CustomerSelectorDialog";

export function CustomerSelector({
  onSelect,
  selectedCustomer,
  onRemove,
  presetProductsLoaded,
  variant = "block",
}: {
  onSelect: (customer: Customer) => void;
  selectedCustomer: Customer | null;
  onRemove: () => void;
  presetProductsLoaded?: boolean;
  /** "chip" é a versão compacta que vive no cabeçalho do carrinho do PDV. */
  variant?: "block" | "chip";
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const handleOpenSelector = () => setIsDialogOpen(true);
    window.addEventListener("openCustomerSelector", handleOpenSelector);
    return () => window.removeEventListener("openCustomerSelector", handleOpenSelector);
  }, []);

  const initials = selectedCustomer?.name
    ?.split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() ?? "";

  if (variant === "chip") {
    return (
      <>
        {selectedCustomer ? (
          <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 py-0.5 pl-0.5 pr-1">
            <button
              onClick={() => setIsDialogOpen(true)}
              title={`${selectedCustomer.name} — trocar cliente`}
              className="flex min-w-0 items-center gap-2 rounded-full pr-1.5 transition-colors hover:bg-blue-100/70"
            >
              <span className="relative flex-shrink-0">
                <span className="grid h-[26px] w-[26px] place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-300 to-primary">
                  {selectedCustomer.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedCustomer.imageUrl}
                      alt={selectedCustomer.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-bold leading-none text-white">
                      {initials}
                    </span>
                  )}
                </span>
                {presetProductsLoaded && (
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-3 w-3 place-items-center rounded-full border-2 border-white bg-green-500">
                    <Package className="h-1.5 w-1.5 text-white" />
                  </span>
                )}
              </span>
              <span className="max-w-[130px] truncate text-[11.5px] font-semibold text-blue-900">
                {selectedCustomer.name}
              </span>
            </button>
            <button
              onClick={onRemove}
              aria-label="Remover cliente"
              className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full text-blue-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11.5px] text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
          >
            <UserRound className="h-3.5 w-3.5" />
            Cliente
            <span className="rounded bg-slate-100 px-1 py-px text-[9px] font-medium text-slate-500">
              F3
            </span>
          </button>
        )}

        <CustomerSelectorDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSelect={onSelect}
          selectedCustomer={selectedCustomer}
        />
      </>
    );
  }

  return (
    <>
      {selectedCustomer ? (
        <button
          onClick={() => setIsDialogOpen(true)}
          className="group w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 hover:border-primary/40 hover:from-primary/8 hover:to-primary/15 transition-all duration-200 shadow-sm hover:shadow-md text-left"
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-primary/30 shadow-sm">
              {selectedCustomer.imageUrl ? (
                <img
                  src={selectedCustomer.imageUrl}
                  alt={selectedCustomer.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-white leading-none">{initials}</span>
                </div>
              )}
            </div>
            {presetProductsLoaded && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white flex items-center justify-center shadow-sm">
                <Package className="h-2 w-2 text-white" />
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate leading-tight">
              {selectedCustomer.name}
            </div>
            <div className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
              {selectedCustomer.phone || selectedCustomer.email || "Sem contato"}
            </div>
          </div>

          {/* Remover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remover cliente"
            className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </button>
      ) : (
        <button
          onClick={() => setIsDialogOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 text-sm"
        >
          <UserRound className="h-4 w-4 flex-shrink-0" />
          <span>Selecionar cliente</span>
          <span className="ml-auto text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">F3</span>
        </button>
      )}

      <CustomerSelectorDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSelect={onSelect}
        selectedCustomer={selectedCustomer}
      />
    </>
  );
}