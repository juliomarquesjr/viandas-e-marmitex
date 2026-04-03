import Image from "next/image";
import { Receipt, Package, Wallet, Trash2 } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { DataTable, Column } from "../../../components/data-display/DataTable";
import { cn } from "@/lib/utils";
import { Order } from "../types";
import { OrderDetailsModal } from "./OrderDetailsModal";
import { useState } from "react";

interface PurchaseHistoryProps {
  orders: Order[];
  filteredOrders: Order[];
  orderFilter: string;
  customStartDate: string;
  customEndDate: string;
  currentPage: number;
  itemsPerPage: number;
  onFilterChange: (filter: string) => void;
  onCustomStartDateChange: (date: string) => void;
  onCustomEndDateChange: (date: string) => void;
  onPageChange: (page: number) => void;
  onOpenDeleteDialog: (orderId: string) => void;
  formatCurrency: (cents: number) => string;
  formatDate: (date: string) => string;
  getStatusInfo: (status: string) => { label: string; color: string };
  getPaymentMethodIcon: (method: string | null) => React.ElementType | null;
  getPaymentMethodLabel: (method: string | null) => string;
}

// Cores determinísticas baseadas no nome do produto
const PRODUCT_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function getProductColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PRODUCT_COLORS[Math.abs(hash) % PRODUCT_COLORS.length];
}

function getProductInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface ProductAvatarsProps {
  items: Order["items"];
}

function ProductAvatars({ items }: ProductAvatarsProps) {
  const MAX_SHOWN = 3;
  const shown = items.slice(0, MAX_SHOWN);
  const extra = items.length - MAX_SHOWN;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((item, i) => (
          <div key={i} className="relative shrink-0" style={{ zIndex: MAX_SHOWN - i }}>
            {item.product.imageUrl ? (
              <div
                className="h-7 w-7 rounded-full ring-2 ring-white overflow-hidden bg-slate-100"
                title={item.product.name}
              >
                <Image
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div
                className={cn(
                  "h-7 w-7 rounded-full ring-2 ring-white flex items-center justify-center",
                  getProductColor(item.product.name)
                )}
                title={item.product.name}
              >
                <span className="text-[9px] font-bold text-white leading-none">
                  {getProductInitials(item.product.name)}
                </span>
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-slate-700 text-white text-[8px] font-bold flex items-center justify-center ring-1 ring-white leading-none">
              {item.weightKg && Number(item.weightKg) > 0
                ? `${Number(item.weightKg).toFixed(1)}`
                : item.quantity}
            </span>
          </div>
        ))}
        {extra > 0 && (
          <div
            className="h-7 w-7 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center"
            style={{ zIndex: 0 }}
          >
            <span className="text-[9px] font-bold text-slate-600">+{extra}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PurchaseHistory({
  orders,
  filteredOrders,
  orderFilter,
  customStartDate,
  customEndDate,
  currentPage,
  itemsPerPage,
  onFilterChange,
  onCustomStartDateChange,
  onCustomEndDateChange,
  onPageChange,
  onOpenDeleteDialog,
  formatCurrency,
  formatDate,
  getStatusInfo,
  getPaymentMethodIcon,
  getPaymentMethodLabel,
}: PurchaseHistoryProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const totalOrders = orders.filter(
    (o) => !(o.type === "ficha_payment" || o.paymentMethod === "ficha_payment")
  ).length;

  const columns: Column<Order>[] = [
    {
      key: "id",
      header: "Pedido",
      render: (_, order) => (
        <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
          #{order.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "items",
      header: "Itens",
      render: (_, order) => {
        const isFichaPayment =
          order.type === "ficha_payment" || order.paymentMethod === "ficha_payment";

        if (isFichaPayment) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
              <Wallet className="h-3 w-3" />
              Entrada de Valores
            </span>
          );
        }

        return (
          <div className="flex items-center gap-3">
            {order.items.length > 0 && <ProductAvatars items={order.items} />}
            <div className="min-w-0">
              <p className="text-slate-700 font-medium text-xs mb-0.5">
                {order.items.length} item{order.items.length !== 1 ? "s" : ""}
              </p>
              <div className="space-y-0.5">
                {order.items.slice(0, 2).map((item, idx) => (
                  <p key={idx} className="text-[11px] text-slate-400 truncate">
                    {item.weightKg && Number(item.weightKg) > 0
                      ? `${Number(item.weightKg).toFixed(3)} kg × ${item.product.name}`
                      : `${item.quantity}× ${item.product.name}`}
                  </p>
                ))}
                {order.items.length > 2 && (
                  <p className="text-[11px] text-slate-400 italic">
                    +{order.items.length - 2} mais...
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "totalCents",
      header: "Valor",
      render: (_, order) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">
            {formatCurrency(order.totalCents)}
          </p>
          {order.discountCents > 0 && (
            <p className="text-[11px] text-red-500">
              -{formatCurrency(order.discountCents)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "paymentMethod",
      header: "Pagamento",
      align: "center",
      render: (_, order) => {
        const Icon = getPaymentMethodIcon(order.paymentMethod);
        const label = getPaymentMethodLabel(order.paymentMethod);
        return Icon ? (
          <div className="flex flex-col items-center gap-0.5">
            <Icon className="h-5 w-5 text-slate-400" />
            <span className="text-[10px] text-slate-400 leading-tight">{label}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-500">{label}</span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (_, order) => {
        const statusInfo = getStatusInfo(order.status);
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium",
              statusInfo.color
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {statusInfo.label}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Data",
      render: (_, order) => (
        <p className="text-[11px] text-slate-500 whitespace-nowrap">
          {formatDate(order.createdAt)}
        </p>
      ),
    },
  ];

  return (
    <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-slate-400" />
              Histórico de Compras
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              Exibindo {filteredOrders.length} de {totalOrders} registro
              {totalOrders !== 1 ? "s" : ""}
              {orderFilter !== "all" && (
                <span className="text-primary ml-2">
                  •{" "}
                  {orderFilter === "current-month"
                    ? "Mês Atual"
                    : orderFilter === "previous-month"
                    ? "Mês Anterior"
                    : "Personalizado"}
                </span>
              )}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={orderFilter}
              onChange={(e) => onFilterChange(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">Todos os Pedidos</option>
              <option value="current-month">Mês Atual</option>
              <option value="previous-month">Mês Anterior</option>
              <option value="custom">Personalizado</option>
            </select>

            {orderFilter === "custom" && (
              <>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => onCustomStartDateChange(e.target.value)}
                  className="w-36 text-sm"
                />
                <span className="text-slate-400 text-sm">até</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => onCustomEndDateChange(e.target.value)}
                  className="w-36 text-sm"
                />
              </>
            )}

            {orderFilter !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFilterChange("all")}
                className="text-xs"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <DataTable<Order>
          data={filteredOrders}
          columns={columns}
          rowKey="id"
          className="border-0 shadow-none rounded-none"
          onRowClick={(order) => setSelectedOrder(order)}
          emptyComponent={
            <div className="flex flex-col items-center gap-2 text-slate-500 py-4">
              <Package className="h-12 w-12 text-slate-200" />
              <h3 className="text-sm font-semibold text-slate-600">
                {orders.length === 0
                  ? "Nenhuma compra registrada"
                  : "Nenhuma compra encontrada"}
              </h3>
              <p className="text-xs text-slate-400">
                {orders.length === 0
                  ? "Este cliente ainda não realizou nenhuma compra."
                  : "Nenhuma compra encontrada para o período selecionado."}
              </p>
            </div>
          }
          pagination={{
            page: currentPage,
            pageSize: itemsPerPage,
            total: filteredOrders.length,
            onPageChange,
          }}
          rowActions={(order) => (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenDeleteDialog(order.id)}
              className="h-7 w-7 text-slate-300 hover:text-red-600 hover:bg-red-50"
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        />
      </CardContent>

      {/* Modal de Detalhes do Pedido */}
      <OrderDetailsModal
        open={selectedOrder !== null}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </Card>
  );
}
