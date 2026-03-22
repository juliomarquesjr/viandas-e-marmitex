import { Package, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CustomerSelectorDialog } from "./CustomerSelectorDialog";

type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  barcode?: string;
  imageUrl?: string;
};

export function CustomerSelector({
  onSelect,
  selectedCustomer,
  onRemove,
  presetProductsLoaded,
}: {
  onSelect: (customer: Customer) => void;
  selectedCustomer: Customer | null;
  onRemove: () => void;
  presetProductsLoaded?: boolean;
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