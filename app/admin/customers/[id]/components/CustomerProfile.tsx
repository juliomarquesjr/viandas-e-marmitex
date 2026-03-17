import { Calendar, Download, Phone, MapPin, Barcode as BarcodeIcon, User } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { cn } from "@/lib/utils";
import { Customer } from "../types";

interface CustomerProfileProps {
  customer: Customer;
  downloadBarcode: () => void;
}

export function CustomerProfile({ customer, downloadBarcode }: CustomerProfileProps) {
  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardContent className="p-0">
        {/* Faixa de avatar + nome */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 px-6 py-5 border-b border-slate-100">
          <div className="relative shrink-0">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow">
              <User className="h-7 w-7 text-white" />
            </div>
            <span
              className={cn(
                "absolute -bottom-1 -right-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-2 ring-white",
                customer.active
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-400 text-white"
              )}
            >
              {customer.active ? "Ativo" : "Inativo"}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900 truncate">{customer.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Cliente desde {new Date(customer.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>

          {/* Mini-ações rápidas no cabeçalho */}
          <div className="flex items-center gap-2 shrink-0">
            {customer.barcode && (
              <Button variant="outline" size="sm" onClick={downloadBarcode} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Código de Barras
              </Button>
            )}
          </div>
        </div>

        {/* Grid de informações */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Contato */}
          <div className="px-6 py-4 space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> Contato
            </p>
            <p className="text-sm font-medium text-slate-900">{customer.phone}</p>
            {customer.email ? (
              <p className="text-xs text-slate-500 truncate" title={customer.email}>{customer.email}</p>
            ) : (
              <p className="text-xs text-slate-400 italic">Sem email</p>
            )}
            {customer.doc && (
              <p className="text-xs text-slate-500">Doc: {customer.doc}</p>
            )}
          </div>

          {/* Endereço */}
          <div className="px-6 py-4 space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Endereço
            </p>
            {customer.address?.street ? (
              <div className="text-sm text-slate-700 space-y-0.5">
                <p className="font-medium">
                  {customer.address.street}
                  {customer.address.number ? `, ${customer.address.number}` : ""}
                  {customer.address.complement ? ` - ${customer.address.complement}` : ""}
                </p>
                {(customer.address.neighborhood || customer.address.city) && (
                  <p className="text-slate-500 text-xs">
                    {[customer.address.neighborhood, customer.address.city, customer.address.state].filter(Boolean).join(", ")}
                  </p>
                )}
                {customer.address.zip && (
                  <p className="text-slate-400 text-xs">CEP: {customer.address.zip}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Sem endereço cadastrado</p>
            )}
          </div>

          {/* Identificação */}
          <div className="px-6 py-4 space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BarcodeIcon className="h-3 w-3" /> Identificação
            </p>
            {customer.barcode ? (
              <p className="text-sm font-mono text-slate-800 bg-slate-50 rounded px-2 py-1 border border-slate-200 inline-block">
                {customer.barcode}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">Sem código de barras</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
