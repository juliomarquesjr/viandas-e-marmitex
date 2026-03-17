import { useState, useEffect, useMemo } from "react";
import { Order } from "../types";

export function useCustomerOrders(orders: Order[]) {
  const [orderFilter, setOrderFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [filteredStats, setFilteredStats] = useState({
    pendingAmount: 0,
    totalOrders: 0,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [paginatedOrders, setPaginatedOrders] = useState<Order[]>([]);

  const filterOrdersByPeriod = useMemo(() => {
    return (ordersList: Order[], filterType: string) => {
      if (filterType === "all") return ordersList;

      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (filterType) {
        case "current-month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        case "previous-month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        case "custom":
          if (!customStartDate || !customEndDate) return ordersList;
          startDate = new Date(customStartDate + "T00:00:00.000");
          endDate = new Date(customEndDate + "T23:59:59.999");
          break;
        default:
          return ordersList;
      }

      return ordersList.filter((order) => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt);
        const orderTime = orderDate.getTime();
        const startTime = startDate.getTime();
        const endTime = endDate.getTime();
        return orderTime >= startTime && orderTime <= endTime;
      });
    };
  }, [customStartDate, customEndDate]);

  const handleFilterChange = (newFilter: string) => {
    setOrderFilter(newFilter);
    if (newFilter !== "custom") {
      setCustomStartDate("");
      setCustomEndDate("");
    }
  };

  useEffect(() => {
    const filtered = filterOrdersByPeriod(orders, orderFilter);
    setFilteredOrders(filtered);
    setCurrentPage(1);

    const pendingAmount = filtered
      .filter((order) => order.status === "pending")
      .reduce((sum, order) => sum + order.totalCents, 0);

    const totalOrders = filtered.filter(order =>
      !(order.type === "ficha_payment" || order.paymentMethod === "ficha_payment")
    ).length;

    setFilteredStats({
      pendingAmount,
      totalOrders,
    });
  }, [orders, orderFilter, customStartDate, customEndDate, filterOrdersByPeriod]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filteredOrders.slice(startIndex, endIndex);
    setPaginatedOrders(paginated);
  }, [filteredOrders, currentPage, itemsPerPage]);

  return {
    orderFilter,
    customStartDate,
    customEndDate,
    filteredOrders,
    filteredStats,
    currentPage,
    itemsPerPage,
    paginatedOrders,
    handleFilterChange,
    setCustomStartDate,
    setCustomEndDate,
    setCurrentPage,
  };
}
