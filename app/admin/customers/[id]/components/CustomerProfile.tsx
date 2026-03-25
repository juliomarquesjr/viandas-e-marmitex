import Image from "next/image";
import Link from "next/link";
import { Calendar, Download, Phone, MapPin, Barcode as BarcodeIcon, User, ChevronRight, ArrowLeft, Mail } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { cn } from "@/lib/utils";
import { Customer } from "../types";

interface CustomerProfileProps {
  customer: Customer;
  onBack: () => void;
  downloadBarcode: () => void;
}

export function CustomerProfile({ customer, onBack, downloadBarcode }: CustomerProfileProps) {
  return (
    <Card className="overflow-hidden border-slate-200 shadow-md rounded-xl">
      <CardContent className="p-0">

        {/* Faixa de navegação */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 border-b border-slate-100">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-xs text-slate-400">
            <Link href="/admin" className="hover:text-slate-600 transition-colors">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/admin/customers" className="hover:text-slate-600 transition-colors">Clientes</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600 font-medium truncate max-w-[180px]">{customer.name}</span>
          </nav>
        </div>

        {/* Faixa colorida de destaque */}
        <div className="h-14 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />

        {/* Header principal: avatar sobreposto + nome + info rápida */}
        <div className="flex flex-col sm:flex-row items-start gap-4 px-6 pb-5 border-b border-slate-100">
          {/* Avatar grande com overlap */}
          <div className="shrink-0 -mt-12">
            <div className={cn(
              "h-24 w-24 rounded-full ring-4 ring-white shadow-xl overflow-hidden",
              !customer.imageUrl && "bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center"
            )}>
              {customer.imageUrl ? (
                <div className="relative h-full w-full">
                  <Image
                    src={customer.imageUrl}
                    alt={customer.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              ) : (
                <User className="h-10 w-10 text-white" />
              )}
            </div>
          </div>

          {/* Nome + status + detalhes rápidos */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-900 truncate">{customer.name}</h2>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
                  customer.active
                    ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                )}
              >
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full mr-1",
                  customer.active ? "bg-emerald-500" : "bg-slate-400"
                )} />
                {customer.active ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Cliente desde {new Date(customer.createdAt).toLocaleDateString("pt-BR")}
              </span>
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[180px]">{customer.email}</span>
                </span>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 shrink-0 sm:pt-1">
            {customer.barcode && (
              <Button variant="outline" size="sm" onClick={downloadBarcode} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Código de Barras
              </Button>
            )}
          </div>
        </div>

        {/* Grid de informações detalhadas */}
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
