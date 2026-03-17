import { useState, useCallback } from "react";
import { Customer, Order } from "../types";

export function useCustomerData(customerId: string) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    pendingAmount: 0,
    totalOrders: 0,
    balanceAmount: 0, // Saldo devedor
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateStats = useCallback((ordersData: Order[], balanceCents: number) => {
    const pendingAmount = ordersData
      .filter((order) => order.status === "pending")
      .reduce((sum, order) => sum + order.totalCents, 0);

    const totalOrders = ordersData.length;

    setStats({
      pendingAmount,
      totalOrders,
      balanceAmount: balanceCents,
    });
  }, []);

  const loadCustomer = useCallback(async () => {
    if (!customerId) return;
    
    try {
      setLoading(true);

      const customerResponse = await fetch(`/api/customers/${customerId}`);
      if (!customerResponse.ok) throw new Error("Failed to fetch customer");
      const customerData = await customerResponse.json();
      setCustomer(customerData);

      const ordersResponse = await fetch(`/api/orders?customerId=${customerId}&size=1000`);
      if (!ordersResponse.ok) throw new Error("Failed to fetch orders");
      const ordersData = await ordersResponse.json();

      const fichaPaymentsResponse = await fetch(`/api/ficha-payments?customerId=${customerId}`);
      if (!fichaPaymentsResponse.ok) throw new Error("Failed to fetch ficha payments");
      const fichaPaymentsData = await fichaPaymentsResponse.json();

      const allTransactions = [
        ...ordersData.data,
        ...fichaPaymentsData.fichaPayments.map((payment: any) => ({
          ...payment,
          items: [],
          subtotalCents: payment.totalCents,
          discountCents: 0,
          deliveryFeeCents: 0,
          status: 'confirmed',
          type: 'ficha_payment'
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setOrders(allTransactions);
      calculateStats(ordersData.data, fichaPaymentsData.balanceCents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [customerId, calculateStats]);

  return {
    customer,
    orders,
    setOrders,
    stats,
    loading,
    error,
    loadCustomer,
    calculateStats,
  };
}
