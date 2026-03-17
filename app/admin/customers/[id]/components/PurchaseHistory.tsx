import { Receipt, Package, Trash2, Wallet } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { cn } from "@/lib/utils";
import { Order } from "../types";

interface PurchaseHistoryProps {
  orders: Order[];
  filteredOrders: Order[];
  paginatedOrders: Order[];
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

export function PurchaseHistory({
  orders,
  filteredOrders,
  paginatedOrders,
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
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  
  const renderPaginationButtons = () => {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((page) => {
        if (totalPages <= 7) return true;
        if (page === 1 || page === totalPages) return true;
        if (page >= currentPage - 1 && page <= currentPage + 1) return true;
        return false;
      })
      .map((page, index, arr) => (
        <div key={page} className="flex items-center">
          {index > 0 && arr[index - 1] !== page - 1 && (
            <span className="px-1 text-slate-400 text-xs">…</span>
          )}
          <Button
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className="h-7 w-7 p-0 text-xs"
          >
            {page}
          </Button>
        </div>
      ));
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-slate-500" />
              Histórico de Compras
            </CardTitle>
            <CardDescription className="mt-0.5">
              Exibindo {paginatedOrders.length} de {filteredOrders.length} registro
              {filteredOrders.length !== 1 ? "s" : ""}
              {filteredOrders.length !==
                orders.filter(
                  (o) =>
                    !(o.type === "ficha_payment" || o.paymentMethod === "ficha_payment")
                ).length &&
                ` (${orders.filter(
                  (o) =>
                    !(o.type === "ficha_payment" || o.paymentMethod === "ficha_payment")
                ).length
                } total)`}
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
        {filteredOrders.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/60">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Pedido
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Itens
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Valor
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Pagamento
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Data
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedOrders.map((order) => {
                    const isFichaPayment =
                      order.type === "ficha_payment" ||
                      order.paymentMethod === "ficha_payment";
                    return (
                      <tr
                        key={order.id}
                        className={cn(
                          "hover:bg-slate-50/70 transition-colors",
                          isFichaPayment ? "bg-emerald-50/40" : ""
                        )}
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            #{order.id.slice(0, 8)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-[260px]">
                          {isFichaPayment ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                <Wallet className="h-3 w-3" />
                                Entrada de Valores
                              </span>
                            </div>
                          ) : (
                            <div>
                              <p className="text-slate-700 font-medium text-xs mb-0.5">
                                {order.items.length} item
                                {order.items.length !== 1 ? "s" : ""}
                              </p>
                              <div className="space-y-0.5">
                                {order.items.map((item, idx) => (
                                  <p
                                    key={idx}
                                    className="text-xs text-slate-400 truncate"
                                  >
                                    {item.weightKg && Number(item.weightKg) > 0
                                      ? `${Number(item.weightKg).toFixed(
                                          3
                                        )} kg × ${item.product.name}`
                                      : `${item.quantity}× ${item.product.name}`}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">
                            {formatCurrency(order.totalCents)}
                          </p>
                          {order.discountCents > 0 && (
                            <p className="text-xs text-red-500">
                              -{formatCurrency(order.discountCents)}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {(() => {
                            const Icon = getPaymentMethodIcon(order.paymentMethod);
                            const label = getPaymentMethodLabel(order.paymentMethod);
                            return Icon ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <Icon className="h-4 w-4 text-slate-500" />
                                <span className="text-[10px] text-slate-400">
                                  {label}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">
                                {label}
                              </span>
                            );
                          })()}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                              getStatusInfo(order.status).color
                            )}
                          >
                            {getStatusInfo(order.status).label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="text-xs text-slate-600 whitespace-nowrap">
                            {formatDate(order.createdAt)}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenDeleteDialog(order.id)}
                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredOrders.length > itemsPerPage && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Página {currentPage} de {totalPages} · {filteredOrders.length}{" "}
                  registros
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="h-7 px-2.5 text-xs"
                  >
                    Anterior
                  </Button>
                  
                  {renderPaginationButtons()}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 px-2.5 text-xs"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              {orders.length === 0
                ? "Nenhuma compra registrada"
                : "Nenhuma compra encontrada"}
            </h3>
            <p className="text-xs text-slate-500">
              {orders.length === 0
                ? "Este cliente ainda não realizou nenhuma compra."
                : "Nenhuma compra encontrada para o período selecionado."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
