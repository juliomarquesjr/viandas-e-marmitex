"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { DeliveryStatusBadge } from "@/app/components/DeliveryStatusBadge";
import { Loader2, Save, User } from "lucide-react";
import { useToast } from "@/app/components/Toast";

type DeliveryStatus = 
  | "pending" 
  | "preparing" 
  | "out_for_delivery" 
  | "in_transit" 
  | "delivered" 
  | "cancelled";

interface DeliveryStatusUpdaterProps {
  preOrderId: string;
  currentStatus: DeliveryStatus;
  deliveryPersonId?: string | null;
  estimatedDeliveryTime?: Date | string | null;
  onUpdate?: () => void;
}

export function DeliveryStatusUpdater({
  preOrderId,
  currentStatus,
  deliveryPersonId,
  estimatedDeliveryTime,
  onUpdate,
}: DeliveryStatusUpdaterProps) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<DeliveryStatus>(currentStatus);
  const [estimatedTime, setEstimatedTime] = useState<string>(
    estimatedDeliveryTime
      ? new Date(estimatedDeliveryTime).toISOString().slice(0, 16)
      : ""
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const updateData: any = {
        status,
      };

      if (estimatedTime) {
        updateData.estimatedDeliveryTime = new Date(estimatedTime).toISOString();
      }

      const response = await fetch(`/api/pre-orders/${preOrderId}/delivery`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar status");
      }

      showToast("Status atualizado com sucesso!", "success");
      onUpdate?.();
    } catch (error) {
      console.error("Error updating status:", error);
      showToast("Erro ao atualizar status. Tente novamente.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Atualizar Status de Entrega</span>
          <DeliveryStatusBadge status={currentStatus} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as DeliveryStatus)}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="preparing">Preparando</SelectItem>
              <SelectItem value="out_for_delivery">Saiu para Entrega</SelectItem>
              <SelectItem value="in_transit">Em Trânsito</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimatedTime">Tempo Estimado de Entrega</Label>
          <Input
            id="estimatedTime"
            type="datetime-local"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
          />
        </div>

        {deliveryPersonId && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Entregador atribuído</span>
          </div>
        )}

        <Button
          onClick={handleUpdate}
          disabled={isUpdating || status === currentStatus}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Atualizando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Atualizar Status
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

