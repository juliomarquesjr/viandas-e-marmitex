"use client";

import { BarChart3, PieChart, TrendingUp } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";

export default function AdminReportsPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm max-w-xl w-full">
        <CardContent className="p-8 text-center">
          {/* Ícone Principal */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <BarChart3 className="h-10 w-10 text-white" />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Sistema de Relatórios em Manutenção
          </h1>
          
          {/* Descrição */}
          <p className="text-slate-600 mb-6">
            Estamos desenvolvendo um sistema completo de analytics e relatórios.
          </p>

          {/* Recursos Futuros */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center gap-2 text-sm text-purple-600">
              <TrendingUp className="h-4 w-4" />
              <span>Dashboards interativos</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-indigo-600">
              <PieChart className="h-4 w-4" />
              <span>Análises avançadas</span>
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


