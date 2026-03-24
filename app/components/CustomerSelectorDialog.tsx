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
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";

export type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  barcode?: string;
  imageUrl?: string;
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
};

type SearchFilter = "all" | "name" | "phone" | "email" | "barcode";

interface CustomerSelectorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customer: Customer) => void;
  selectedCustomer: Customer | null;
}

export function CustomerSelectorDialog({
  isOpen,
  onOpenChange,
  onSelect,
  selectedCustomer,
}: CustomerSelectorDialogProps) {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<SearchFilter>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchCustomers = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setCustomers([]);
      return;
    }

    try {
      setLoading(true);
      const filterParam = activeFilter !== "all" ? `&filter=${activeFilter}` : "";
      const response = await fetch(
        `/api/customers?q=${encodeURIComponent(searchQuery)}&size=20${filterParam}`
      );
      if (!response.ok) throw new Error("Failed to fetch customers");
      const result = await response.json();
      setCustomers(result.data || []);
      setSelectedIndex(result.data?.length > 0 ? 0 : null);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
      setSelectedIndex(null);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    if (isOpen) {
      fetchCustomers(query);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
      setCustomers([]);
      setSelectedIndex(null);
      setActiveFilter("all");
    }
  }, [query, isOpen, fetchCustomers]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (customers.length === 0) return null;
          const next =
            prev === null ? 0 : Math.min(prev + 1, customers.length - 1);
          scrollToIndex(next);
          return next;
        });
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
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

      // Quick filter shortcuts (Alt + 1-5)
      if (e.altKey) {
        if (e.key === "1") setActiveFilter("all");
        if (e.key === "2") setActiveFilter("name");
        if (e.key === "3") setActiveFilter("phone");
        if (e.key === "4") setActiveFilter("email");
        if (e.key === "5") setActiveFilter("barcode");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, customers, onOpenChange]);

  const scrollToIndex = (index: number) => {
    if (listRef.current) {
      const element = listRef.current.children[index] as HTMLElement;
      if (element) {
        element.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onSelect(customer);
    onOpenChange(false);
  };

  const formatAddress = (address?: Customer["address"]) => {
    if (!address) return null;
    
    const parts = [
      address.street && address.number && `${address.street}, ${address.number}`,
      address.neighborhood,
      address.city && address.state && `${address.city}/${address.state}`,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(" - ") : null;
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const filters: { key: SearchFilter; label: string; shortcut: string }[] = [
    { key: "all", label: "Todos", shortcut: "Alt+1" },
    { key: "name", label: "Nome", shortcut: "Alt+2" },
    { key: "phone", label: "Telefone", shortcut: "Alt+3" },
    { key: "email", label: "E-mail", shortcut: "Alt+4" },
    { key: "barcode", label: "Código", shortcut: "Alt+5" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden"
      >
        {/* Header */}
        <DialogHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-slate-200 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-slate-900">
                Selecionar Cliente
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Busque por nome, telefone, e-mail ou código de barras
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search Section */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white">
          {/* Search Input */}
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Digite para buscar clientes..."
              className="pl-12 pr-4 py-6 h-14 text-base rounded-xl border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setQuery("");
                  setCustomers([]);
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => {
                  setActiveFilter(filter.key);
                  setSelectedIndex(0);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeFilter === filter.key
                    ? "bg-primary text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter.label}
                <span
                  className={`text-[10px] ${
                    activeFilter === filter.key
                      ? "text-white/70"
                      : "text-slate-400"
                  }`}
                >
                  {filter.shortcut}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                <p className="mt-4 text-sm font-medium text-slate-600">
                  Buscando clientes...
                </p>
              </div>
            </div>
          ) : customers.length > 0 ? (
            <div
              ref={listRef}
              className="overflow-y-auto flex-1 px-6 py-4"
            >
              <div className="grid grid-cols-2 gap-3">
                {customers.map((customer, index) => {
                  const isSelected = selectedCustomer?.id === customer.id;
                  const address = formatAddress(customer.address);

                  return (
                    <div
                      key={customer.id}
                      ref={(el) => {
                        if (index === selectedIndex && el) {
                          el.scrollIntoView({ block: "nearest", behavior: "smooth" });
                        }
                      }}
                      onClick={() => setSelectedIndex(index)}
                      onDoubleClick={() => handleSelectCustomer(customer)}
                      className={`group relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer ${
                        index === selectedIndex
                          ? "shadow-xl ring-2 ring-primary/30"
                          : "shadow-sm hover:shadow-lg"
                      }`}
                    >
                      {/* Card Content */}
                      <div className="relative bg-white h-full flex flex-col">
                        {/* Header with gradient overlay */}
                        <div className={`relative h-20 overflow-hidden ${
                          index === selectedIndex
                            ? "bg-gradient-to-br from-primary via-primary/90 to-primary/70"
                            : "bg-gradient-to-br from-slate-100 via-slate-50 to-white group-hover:from-primary/20 group-hover:via-primary/10"
                        } transition-all duration-300`}>
                          {/* Decorative circles */}
                          <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10 blur-xl" />
                          <div className="absolute -bottom-2 -left-2 w-10 h-10 rounded-full bg-white/5 blur-lg" />
                          
                          {/* Selected overlay */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[1px]" />
                          )}
                        </div>

                        {/* Avatar - Overlapping header and content */}
                        <div className="relative -mt-10 px-4">
                          <div className={`mx-auto w-20 h-20 rounded-full shadow-lg overflow-hidden transition-all duration-300 ${
                            index === selectedIndex
                              ? "ring-4 ring-emerald-500/30 scale-105"
                              : "ring-4 ring-white group-hover:scale-105"
                          }`}>
                            {customer.imageUrl ? (
                              <img
                                src={customer.imageUrl}
                                alt={customer.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center">
                                <User className="h-10 w-10 text-white/90" />
                              </div>
                            )}
                          </div>
                          
                          {/* Selected badge */}
                          {isSelected && (
                            <div className="absolute top-1 left-1/2 -translate-x-1/2 -mt-1">
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 shadow-md">
                                <Check className="h-3 w-3 text-white" />
                                <span className="text-[9px] font-bold text-white">SELECIONADO</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 px-4 pt-3 pb-2 flex flex-col items-center text-center">
                          {/* Name */}
                          <h4 className="font-bold text-slate-900 text-sm leading-snug mb-2 line-clamp-2 min-h-[2.5rem]">
                            {customer.name}
                          </h4>

                          {/* Divider */}
                          <div className="w-8 h-0.5 rounded-full bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-2.5" />

                          {/* Contact Info */}
                          <div className="flex flex-col items-center gap-1.5 w-full">
                            {formatPhone(customer.phone) && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 w-full justify-center">
                                <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                  <Phone className="h-2.5 w-2.5 text-slate-500 group-hover:text-primary" />
                                </div>
                                <span className="truncate font-medium">{formatPhone(customer.phone)}</span>
                              </div>
                            )}
                            
                            {customer.barcode && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 w-full justify-center">
                                <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                  <Barcode className="h-2.5 w-2.5 text-slate-500 group-hover:text-primary" />
                                </div>
                                <span className="font-mono">{customer.barcode}</span>
                              </div>
                            )}

                            {customer.email && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 w-full justify-center">
                                <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                  <Mail className="h-2.5 w-2.5 text-slate-500 group-hover:text-primary" />
                                </div>
                                <span className="truncate">{customer.email}</span>
                              </div>
                            )}

                            {/* Address */}
                            {address ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 w-full justify-center mt-1">
                                <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors flex-shrink-0">
                                  <MapPin className="h-3 w-3 text-slate-500 group-hover:text-primary" />
                                </div>
                                <span className="truncate">{address}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[10px] text-amber-600 w-full justify-center mt-1">
                                <div className="h-5 w-5 rounded-md bg-amber-50 flex items-center justify-center flex-shrink-0">
                                  <MapPin className="h-2.5 w-2.5 text-amber-500" />
                                </div>
                                <span className="italic">Endereço não cadastrado</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="px-4 pb-4 pt-1">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCustomer(customer);
                            }}
                            className={`w-full h-8 text-xs font-semibold rounded-xl transition-all duration-300 ${
                              isSelected
                                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md"
                                : index === selectedIndex
                                  ? "bg-primary hover:bg-primary/90 text-white shadow-md"
                                  : "bg-slate-100 hover:bg-primary text-slate-700 hover:text-white"
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="h-4 w-4 mr-1.5" />
                                Confirmado
                              </>
                            ) : (
                              <>
                                <User className="h-4 w-4 mr-1.5" />
                                Selecionar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Selection indicator glow */}
                      {index === selectedIndex && (
                        <div className="absolute inset-0 rounded-2xl ring-2 ring-primary/20 pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : query.trim() ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                Nenhum cliente encontrado
              </h3>
              <p className="text-sm text-slate-500 text-center max-w-sm">
                Não encontramos nenhum cliente com os termos da busca{" "}
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                  "{query}"
                </span>
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                Busque por clientes
              </h3>
              <p className="text-sm text-slate-500 text-center max-w-sm">
                Digite o nome, telefone, e-mail ou código de barras para encontrar clientes
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Badge variant="outline" size="sm">
                  <Search className="h-3 w-3 mr-1" />
                  Busca em tempo real
                </Badge>
                <Badge variant="outline" size="sm">
                  <Keyboard className="h-3 w-3 mr-1" />
                  Navegação por teclado
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {customers.length} cliente(s) encontrado(s)
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for keyboard icon
function Keyboard({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 16h.01M10 16h.01M14 16h.01M18 16h.01" />
    </svg>
  );
}
