import { useState, useCallback } from "react";
import { SavedBudgetSummary } from "../types";

export function useCustomerBudgets(customerId: string) {
  const [budgets, setBudgets] = useState<SavedBudgetSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBudgets = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/budgets`);
      if (!res.ok) throw new Error("Falha ao buscar orçamentos");
      const data = await res.json();
      setBudgets(data.data ?? []);
    } catch {
      // silencioso - não é caminho crítico
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const deleteBudget = useCallback(
    async (budgetId: string): Promise<boolean> => {
      try {
        const res = await fetch(
          `/api/customers/${customerId}/budgets/${budgetId}`,
          { method: "DELETE" }
        );
        if (!res.ok) return false;
        setBudgets((prev) => prev.filter((b) => b.id !== budgetId));
        return true;
      } catch {
        return false;
      }
    },
    [customerId]
  );

  return { budgets, loading, loadBudgets, deleteBudget };
}
