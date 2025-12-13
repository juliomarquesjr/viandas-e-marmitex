"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ReportLoading } from '@/app/components/ReportLoading';

type OrderItem = {
  id: string;
  quantity: number;
  priceCents: number;
  weightKg?: number | null;
  product: {
    id: string;
    name: string;
  };
};

type Order = {
  id: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  paymentMethod: string | null;
  createdAt: string;
  cashReceivedCents?: number;
  changeCents?: number;
  items: OrderItem[];
  customer?: {
    id: string;
    name: string;
    phone?: string;
  } | null;
};

function DailySalesA4Content() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');

  const [orders, setOrders] = useState<Order[]>([]);
  const [systemTitle, setSystemTitle] = useState<string>('COMIDA CASEIRA');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!dateParam) {
        setError('Data não fornecida');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Buscar vendas do dia
        const params = new URLSearchParams({
          startDate: dateParam,
          endDate: dateParam,
          size: '1000',
          page: '1'
        });

        const [ordersResponse, configResponse] = await Promise.all([
          fetch(`/api/orders?${params.toString()}`),
          fetch('/api/config')
        ]);

        if (!ordersResponse.ok) {
          throw new Error('Falha ao carregar vendas');
        }

        const ordersData = await ordersResponse.json();
        setOrders(ordersData.data || []);

        // Processar título do sistema
        if (configResponse.ok) {
          const configs = await configResponse.json();
          const brandingConfigs = configs.filter((config: any) => config.category === 'branding');
          
          const systemTitleConfig = brandingConfigs.find((c: any) => c.key === 'branding_system_title');
          if (systemTitleConfig?.value) {
            setSystemTitle(systemTitleConfig.value.toUpperCase());
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateParam]);

  // Auto print when page loads
  useEffect(() => {
    if (orders.length > 0 && !loading && !error) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [orders, loading, error]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodLabel = (method: string | null) => {
    const methodMap: { [key: string]: string } = {
      'cash': 'Dinheiro',
      'credit': 'Cartão de Crédito',
      'debit': 'Cartão de Débito',
      'pix': 'PIX',
      'invoice': 'Ficha do Cliente'
    };
    return method ? methodMap[method] || method : 'Não informado';
  };

  // Calcular totais
  const totalSales = orders.reduce((sum, order) => sum + order.totalCents, 0);
  const totalOrdersCount = orders.length;
  const totalSubtotal = orders.reduce((sum, order) => sum + order.subtotalCents, 0);
  const totalDiscount = orders.reduce((sum, order) => sum + order.discountCents, 0);
  const totalDeliveryFee = orders.reduce((sum, order) => sum + (order.deliveryFeeCents || 0), 0);

  // Agrupar por método de pagamento
  const paymentMethodsSummary = orders.reduce((acc, order) => {
    const method = getPaymentMethodLabel(order.paymentMethod);
    if (!acc[method]) {
      acc[method] = { count: 0, total: 0 };
    }
    acc[method].count += 1;
    acc[method].total += order.totalCents;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  // Resumo de produtos (quantidade total por produto)
  const productSummary = useMemo(() => {
    const map: Record<string, { productId: string; productName: string; totalQuantity: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        const id = item.product.id;
        if (map[id]) {
          map[id].totalQuantity += item.quantity;
        } else {
          map[id] = { productId: id, productName: item.product.name, totalQuantity: item.quantity };
        }
      }
    }
    return Object.values(map).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [orders]);

  if (loading) {
    return (
      <ReportLoading 
        title="Gerando Relatório de Vendas"
        subtitle="Processando dados do dia..."
      />
    );
  }

  if (error || !dateParam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <div className="text-lg mb-2">Erro ao carregar relatório</div>
          <div className="text-sm">{error || 'Dados não encontrados'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-left mb-3 border-b border-gray-300 pb-2">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          RELATÓRIO DE VENDAS DIÁRIAS
        </h1>
        <div className="text-base text-gray-600 mb-2">
          {systemTitle}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>Data: {formatDate(dateParam)}</span>
          <span>•</span>
          <span>Gerado em: {formatDateTime(new Date().toISOString())}</span>
        </div>
      </div>

      {/* Resumo */}
      <div className="mb-3 avoid-break">
        <h2 className="text-base font-semibold mb-2 text-gray-800 border-b pb-1">
          Resumo Geral
        </h2>
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="text-center border rounded p-2">
            <div className="font-medium text-gray-600">Total de Vendas</div>
            <div className="text-lg font-bold text-blue-600">
              {totalOrdersCount}
            </div>
          </div>
          <div className="text-center border rounded p-2">
            <div className="font-medium text-gray-600">Subtotal</div>
            <div className="text-lg font-bold text-gray-700">
              {formatCurrency(totalSubtotal)}
            </div>
          </div>
          <div className="text-center border rounded p-2">
            <div className="font-medium text-gray-600">Descontos</div>
            <div className="text-lg font-bold text-red-600">
              {formatCurrency(totalDiscount)}
            </div>
          </div>
          <div className="text-center border rounded p-2 bg-green-50">
            <div className="font-medium text-gray-600">Total Recebido</div>
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(totalSales)}
            </div>
          </div>
        </div>
      </div>

      {/* Resumo por Método de Pagamento */}
      {Object.keys(paymentMethodsSummary).length > 0 && (
        <div className="mb-3 avoid-break">
          <h2 className="text-base font-semibold mb-2 text-gray-800 border-b pb-1">
            Resumo por Método de Pagamento
          </h2>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2 font-semibold">Método</th>
                  <th className="text-center p-2 font-semibold">Quantidade</th>
                  <th className="text-right p-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(paymentMethodsSummary).map(([method, data], index) => (
                  <tr key={method} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-2">{method}</td>
                    <td className="p-2 text-center">{data.count}</td>
                    <td className="p-2 text-right font-semibold">{formatCurrency(data.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumo de Produtos */}
      {productSummary.length > 0 && (
        <div className="mb-2 avoid-break">
          <h2 className="text-sm font-semibold mb-1 text-gray-800 border-b pb-1">
            Resumo de Produtos
          </h2>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-2 py-1 font-semibold">Produto</th>
                  <th className="text-right px-2 py-1 font-semibold w-16">Qtde</th>
                </tr>
              </thead>
              <tbody>
                {productSummary.map((p, idx) => (
                  <tr key={p.productId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-2 py-1 truncate">{p.productName}</td>
                    <td className="px-2 py-1 text-right font-semibold">{p.totalQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lista de Vendas */}
      {orders.length > 0 ? (
        <div className="mb-4 avoid-break">
          <h2 className="text-base font-semibold mb-2 text-gray-800 border-b pb-1">
            Detalhamento das Vendas
          </h2>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-1 font-semibold w-20">Data/Hora</th>
                  <th className="text-left p-1 font-semibold w-24">Código</th>
                  <th className="text-left p-1 font-semibold">Cliente</th>
                  <th className="text-left p-1 font-semibold">Itens</th>
                  <th className="text-left p-1 font-semibold w-24">Pagamento</th>
                  <th className="text-right p-1 font-semibold w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr key={order.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-1 text-xs">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="p-1 text-xs font-mono">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="p-1 text-xs">
                      {order.customer ? order.customer.name : 'Venda Avulsa'}
                      {order.customer?.phone && (
                        <div className="text-gray-500 text-xs">{order.customer.phone}</div>
                      )}
                    </td>
                    <td className="p-1 text-xs">
                      <div className="whitespace-normal">
                        {order.items.map(item => 
                          item.weightKg && Number(item.weightKg) > 0
                            ? `${Number(item.weightKg).toFixed(3)} kg × ${item.product.name}`
                            : `${item.quantity}x ${item.product.name}`
                        ).join(', ')}
                      </div>
                      {(order.discountCents > 0 || order.deliveryFeeCents > 0) && (
                        <div className="text-gray-500 text-xs mt-1">
                          {order.discountCents > 0 && (
                            <div>Desc: -{formatCurrency(order.discountCents)}</div>
                          )}
                          {order.deliveryFeeCents > 0 && (
                            <div>Taxa: +{formatCurrency(order.deliveryFeeCents)}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-1 text-xs">
                      {getPaymentMethodLabel(order.paymentMethod)}
                    </td>
                    <td className="p-1 text-xs text-right font-semibold">
                      {formatCurrency(order.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={5} className="p-2 text-right">
                    TOTAL GERAL:
                  </td>
                  <td className="p-2 text-right text-lg">
                    {formatCurrency(totalSales)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="mb-4 text-center py-8 text-gray-500">
          Nenhuma venda encontrada para esta data
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-gray-300 text-center text-xs text-gray-500">
        <div>Gerado em: {formatDateTime(new Date().toISOString())}</div>
        <div className="mt-1">Total de {totalOrdersCount} venda{totalOrdersCount !== 1 ? 's' : ''} registrada{totalOrdersCount !== 1 ? 's' : ''}</div>
      </div>

      {/* Print button for screen view */}
      <div className="no-print mt-6 text-center">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Imprimir Relatório
        </button>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 20px;
          }
          
          .no-print {
            display: none !important;
          }
          
          .avoid-break {
            page-break-inside: avoid;
          }
          
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}

export default function DailySalesA4Page() {
  return (
    <Suspense fallback={
      <ReportLoading 
        title="Carregando Relatório"
        subtitle="Aguarde um momento..."
      />
    }>
      <DailySalesA4Content />
    </Suspense>
  );
}

