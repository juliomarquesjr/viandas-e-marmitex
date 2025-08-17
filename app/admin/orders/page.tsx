"use client";

import { Clock, Receipt, Zap } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";

export default function AdminOrdersPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm max-w-xl w-full">
        <CardContent className="p-8 text-center">
          {/* Ícone Principal */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <Receipt className="h-10 w-10 text-white" />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Sistema de Vendas em Manutenção
          </h1>
          
          {/* Descrição */}
          <p className="text-slate-600 mb-6">
            Estamos trabalhando para trazer uma experiência completa de gestão de vendas.
          </p>

          {/* Recursos Futuros */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
              <Clock className="h-4 w-4" />
              <span>Rastreamento em tempo real</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
              <Zap className="h-4 w-4" />
              <span>Relatórios avançados</span>
            </div>
          </div>

          {/* Status */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 text-amber-700">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Em desenvolvimento - Próximas semanas</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


