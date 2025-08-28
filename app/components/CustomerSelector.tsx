import { Package, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CustomerSelectorDialog } from "./CustomerSelectorDialog";
import { Button } from "./ui/button";

type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  barcode?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
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

  // Abrir o seletor quando receber o evento personalizado
  useEffect(() => {
    const handleOpenSelector = () => setIsDialogOpen(true);
    window.addEventListener('openCustomerSelector', handleOpenSelector);
    return () => window.removeEventListener('openCustomerSelector', handleOpenSelector);
  }, []);

  return (
    <div className="space-y-2">
      {selectedCustomer ? (
        <div className="flex items-center justify-between rounded-md border p-4 bg-card">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-base">{selectedCustomer.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {selectedCustomer.phone || selectedCustomer.email || "Sem contato"}
              </div>
              {presetProductsLoaded && (
                <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Produtos do preset carregados
                </div>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onRemove}
            aria-label="Remover cliente"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button 
          variant="outline" 
          className="w-full justify-start text-muted-foreground h-14 text-base"
          onClick={() => setIsDialogOpen(true)}
        >
          <User className="mr-3 h-5 w-5" />
          Selecionar cliente (F3)
        </Button>
      )}

      <CustomerSelectorDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSelect={onSelect}
        selectedCustomer={selectedCustomer}
      />
    </div>
  );
}