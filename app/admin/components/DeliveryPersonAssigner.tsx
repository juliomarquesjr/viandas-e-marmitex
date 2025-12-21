"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Loader2, User, UserPlus, UserMinus } from "lucide-react";
import { useToast } from "@/app/components/Toast";

interface DeliveryPersonAssignerProps {
  preOrderId: string;
  currentDeliveryPersonId?: string | null;
  currentDeliveryPersonName?: string | null;
  onUpdate?: () => void;
}

interface DeliveryPerson {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function DeliveryPersonAssigner({
  preOrderId,
  currentDeliveryPersonId,
  currentDeliveryPersonName,
  onUpdate,
}: DeliveryPersonAssignerProps) {
  const { showToast } = useToast();
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>(currentDeliveryPersonId || "");
  const [loading, setLoading] = useState(false);
  const [loadingPersons, setLoadingPersons] = useState(true);

  // Carregar lista de entregadores disponíveis
  useEffect(() => {
    const loadDeliveryPersons = async () => {
      try {
        setLoadingPersons(true);
        // Buscar todos os usuários e filtrar por role 'delivery' ou 'admin'
        const response = await fetch("/api/users?role=all");
        if (response.ok) {
          const result = await response.json();
          // A API retorna { data: [...], pagination: {...} }
          const users = result.data || result;
          // Filtrar usuários com role 'delivery' ou 'admin' (admin também pode ser entregador)
          const filtered = users.filter((user: any) => 
            (user.role === 'delivery' || user.role === 'admin') && user.active !== false
          );
          setDeliveryPersons(filtered);
        }
      } catch (err) {
        console.error("Erro ao carregar entregadores:", err);
        showToast("Erro ao carregar lista de entregadores", "error");
      } finally {
        setLoadingPersons(false);
      }
    };

    loadDeliveryPersons();
  }, []);

  const handleAssign = async () => {
    if (!selectedPersonId) {
      showToast("Selecione um entregador", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/pre-orders/${preOrderId}/delivery/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deliveryPersonId: selectedPersonId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atribuir entregador");
      }

      showToast("Entregador atribuído com sucesso!", "success");
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao atribuir entregador:", error);
      showToast(
        error instanceof Error ? error.message : "Erro ao atribuir entregador",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pre-orders/${preOrderId}/delivery/assign`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao remover entregador");
      }

      showToast("Entregador removido com sucesso!", "success");
      setSelectedPersonId("");
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao remover entregador:", error);
      showToast(
        error instanceof Error ? error.message : "Erro ao remover entregador",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Atribuir Entregador
        </CardTitle>
        <CardDescription>
          Selecione um entregador para esta entrega
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentDeliveryPersonId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Entregador Atual
                  </p>
                  <p className="text-sm text-blue-700">
                    {currentDeliveryPersonName || "Entregador atribuído"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={loading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <UserMinus className="h-4 w-4 mr-1" />
                Remover
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Selecionar Entregador</label>
          {loadingPersons ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select
              value={selectedPersonId}
              onValueChange={setSelectedPersonId}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um entregador" />
              </SelectTrigger>
              <SelectContent>
                {deliveryPersons.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum entregador disponível
                  </SelectItem>
                ) : (
                  deliveryPersons.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} ({person.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button
          onClick={handleAssign}
          disabled={loading || !selectedPersonId || selectedPersonId === currentDeliveryPersonId}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              {currentDeliveryPersonId ? "Alterar Entregador" : "Atribuir Entregador"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

