"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search, User, Loader2, X } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
};

export function CustomerSelector({
  onSelect,
  selectedCustomer,
  onRemove,
}: {
  onSelect: (customer: Customer) => void;
  selectedCustomer: Customer | null;
  onRemove: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
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
      const response = await fetch(`/api/customers?q=${encodeURIComponent(searchQuery)}&size=10`);
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

  // Abrir o seletor quando receber o evento personalizado
  useEffect(() => {
    const handleOpenSelector = () => setIsOpen(true);
    window.addEventListener('openCustomerSelector', handleOpenSelector);
    return () => window.removeEventListener('openCustomerSelector', handleOpenSelector);
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
        setIsOpen(false);
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
  }, [isOpen, selectedIndex, customers]);

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
    setIsOpen(false);
    setQuery("");
    setCustomers([]);
    setSelectedIndex(null);
  };

  return (
    <div className="space-y-2">
      {selectedCustomer ? (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{selectedCustomer.name}</div>
              <div className="text-sm text-muted-foreground">
                {selectedCustomer.phone || selectedCustomer.email || "Sem contato"}
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onRemove}
            aria-label="Remover cliente"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button 
          variant="outline" 
          className="w-full justify-start text-muted-foreground"
          onClick={() => setIsOpen(true)}
        >
          <User className="mr-2 h-4 w-4" />
          Selecionar cliente (F3)
        </Button>
      )}

      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-background rounded-lg border p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Selecionar cliente</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Busque por nome, telefone ou e-mail</p>
            </div>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Nome, telefone ou e-mail do cliente"
                className="pl-9"
              />
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : customers.length > 0 ? (
              <div 
                ref={listRef}
                className="max-h-60 overflow-y-auto border rounded-md mb-4"
              >
                {customers.map((customer, index) => (
                  <div
                    key={customer.id}
                    className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer ${
                      index === selectedIndex 
                        ? "bg-accent border-primary/30" 
                        : "hover:bg-accent"
                    }`}
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{customer.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {customer.phone || customer.email || "Sem contato"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cliente encontrado
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Digite para buscar clientes
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => {
                  if (selectedIndex !== null && customers[selectedIndex]) {
                    handleSelectCustomer(customers[selectedIndex]);
                  }
                }}
                disabled={selectedIndex === null || !customers[selectedIndex]}
              >
                Selecionar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}