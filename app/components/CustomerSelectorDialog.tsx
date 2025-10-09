import {
  Barcode,
  Check,
  Mail,
  MapPin,
  Phone,
  Search,
  User,
  X
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardFooter } from "./ui/card";
import { Input } from "./ui/input";

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

export function CustomerSelectorDialog({
  isOpen,
  onOpenChange,
  onSelect,
  selectedCustomer,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customer: Customer) => void;
  selectedCustomer: Customer | null;
}) {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchCustomers = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setCustomers([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/customers?q=${encodeURIComponent(searchQuery)}&size=20`);
      if (!response.ok) throw new Error("Failed to fetch customers");
      const result = await response.json();
      setCustomers(result.data);
      setSelectedIndex(result.data.length > 0 ? 0 : null);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
      setSelectedIndex(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCustomers(query);
      // Foco no input quando o modal abre
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      setQuery("");
      setCustomers([]);
      setSelectedIndex(null);
    }
  }, [query, isOpen, fetchCustomers]);

  // Manipular teclas de atalho
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => {
          if (customers.length === 0) return null;
          const next = prev === null ? 0 : Math.min(prev + 1, customers.length - 1);
          scrollToIndex(next);
          return next;
        });
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => {
          if (customers.length === 0) return null;
          const next = prev === null ? 0 : Math.max(prev - 1, 0);
          scrollToIndex(next);
          return next;
        });
        return;
      }

      if (e.key === "Enter" && selectedIndex !== null && customers[selectedIndex]) {
        e.preventDefault();
        handleSelectCustomer(customers[selectedIndex]);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, customers, onOpenChange]);

  const scrollToIndex = (index: number) => {
    if (listRef.current) {
      const element = listRef.current.children[index] as HTMLElement;
      if (element) {
        element.scrollIntoView({ block: "nearest" });
      }
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onSelect(customer);
    onOpenChange(false);
    setQuery("");
    setCustomers([]);
    setSelectedIndex(null);
  };

  const formatAddress = (address?: Customer['address']) => {
    if (!address) return "Endereço não informado";
    
    const parts = [
      address.street && `${address.street}${address.number ? `, ${address.number}` : ''}`,
      address.complement,
      address.neighborhood,
      address.city && address.state && `${address.city}/${address.state}`,
      address.zipCode
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(", ") : "Endereço não informado";
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={() => onOpenChange(false)}
    >
      <div 
        className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-0 w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <User className="h-5 w-5 text-orange-600" />
                  Selecionar Cliente
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Busque por nome, telefone, e-mail ou código de barras
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label="Fechar"
                className="h-12 w-12 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all hover:scale-105"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Seção de Busca */}
        <div className="border-b border-gray-200 p-6 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Nome, telefone, e-mail ou código de barras do cliente"
              className="pl-10 pr-4 py-3 h-12 text-base rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
                <p className="mt-4 text-sm font-semibold text-orange-600">Buscando clientes...</p>
              </div>
            </div>
          ) : customers.length > 0 ? (
            <div 
              ref={listRef}
              className="overflow-y-auto flex-1 p-6 space-y-3"
            >
              {customers.map((customer, index) => (
                <Card 
                  key={customer.id}
                  className={`cursor-pointer transition-all rounded-xl ${
                    index === selectedIndex 
                      ? "border-orange-500 ring-2 ring-orange-500/20 shadow-md" 
                      : "hover:border-orange-300 hover:shadow-sm"
                  }`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <div 
                    className="p-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectCustomer(customer);
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-6 w-6 text-orange-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-base truncate">{customer.name}</h4>
                          {selectedCustomer?.id === customer.id && (
                            <span className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              <Check className="h-3 w-3" />
                              Selecionado
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{customer.phone || "Telefone não informado"}</span>
                          </div>
                          
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                          )}
                          
                          {customer.barcode && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Barcode className="h-4 w-4" />
                              <span>{customer.barcode}</span>
                            </div>
                          )}
                          
                          <div className="flex items-start gap-2 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span className="truncate">{formatAddress(customer.address)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <CardFooter className="p-4 pt-0">
                    <Button 
                      className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-sm hover:shadow-md transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCustomer(customer);
                      }}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Selecionar cliente
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum cliente encontrado</h3>
              <p className="text-sm text-gray-600">
                Não encontramos nenhum cliente com os termos da busca "{query}"
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Busque por clientes</h3>
              <p className="text-sm text-gray-600">
                Digite o nome, telefone, e-mail ou código de barras do cliente para começar a busca
              </p>
            </div>
          )}
        </div>
        
        {/* Rodapé */}
        <div className="border-t border-gray-200 p-6 bg-gray-50/50">
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all"
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}