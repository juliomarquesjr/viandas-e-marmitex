"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { 
  TrendingUp, 
  Users, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  CalendarDays, 
  CreditCard, 
  Wallet, 
  QrCode, 
  ClipboardList, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  Target,
  Zap,
  Star,
  BarChart3,
  PieChart,
  Clock,
  Eye,
  Download,
  RefreshCw,
  Settings,
  Bell,
  Search
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

const baseSalesData = [
  { day: "Seg", vendas: 3200, pedidos: 18 },
  { day: "Ter", vendas: 4100, pedidos: 22 },
  { day: "Qua", vendas: 3800, pedidos: 20 },
  { day: "Qui", vendas: 5200, pedidos: 27 },
  { day: "Sex", vendas: 6100, pedidos: 30 },
  { day: "Sáb", vendas: 4800, pedidos: 24 },
  { day: "Dom", vendas: 2900, pedidos: 15 },
];

const paymentsData = [
  { name: "Dinheiro", value: 24, color: "#fb923c", icon: "💵" },
  { name: "Cartão", value: 38, color: "#60a5fa", icon: "💳" },
  { name: "PIX", value: 28, color: "#34d399", icon: "📱" },
  { name: "Ficha", value: 10, color: "#a78bfa", icon: "🎫" },
];

const hourlyData = Array.from({ length: 12 }).map((_, i) => ({
  hour: `${(i * 2).toString().padStart(2, "0")}:00`,
  balcão: Math.round(200 + Math.random() * 400),
  delivery: Math.round(150 + Math.random() * 300),
}));

const topProducts = [
  { id: 1, name: "Prato Executivo", sales: 1200, growth: 15, image: "🍽️" },
  { id: 2, name: "Sobremesa Especial", sales: 980, growth: 8, image: "🍰" },
  { id: 3, name: "Bebida Premium", sales: 850, growth: -3, image: "🥤" },
  { id: 4, name: "Entrada Gourmet", sales: 720, growth: 22, image: "🥗" },
  { id: 5, name: "Prato Vegetariano", sales: 680, growth: 12, image: "🥬" },
];

const recentActivities = [
  { id: 1, type: "order", message: "Novo pedido #1234 recebido", time: "2 min atrás", status: "pending" },
  { id: 2, type: "payment", message: "Pagamento confirmado #1230", time: "5 min atrás", status: "success" },
  { id: 3, type: "customer", message: "Novo cliente cadastrado", time: "12 min atrás", status: "info" },
  { id: 4, type: "product", message: "Produto 'Sobremesa Especial' sem estoque", time: "18 min atrás", status: "warning" },
];

export default function AdminHome() {
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("7d");
  const salesData = useMemo(() => {
    const factor = period === "today" ? 0.4 : period === "7d" ? 1 : 3.2;
    return baseSalesData.map((d) => ({ ...d, vendas: Math.round(d.vendas * factor), pedidos: Math.round(d.pedidos * factor) }));
  }, [period]);

  const totalSales = salesData.reduce((a, b) => a + b.vendas, 0);
  const totalOrders = salesData.reduce((a, b) => a + b.pedidos, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6">
      {/* Header da Dashboard */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
              Dashboard Administrativa
            </h1>
            <p className="text-slate-600 mt-2">Bem-vindo de volta! Aqui está o resumo do seu negócio.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros de Período */}
      <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">Período de análise:</span>
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                {[
                  { key: "today", label: "Hoje" },
                  { key: "7d", label: "7 dias" },
                  { key: "30d", label: "30 dias" }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      period === key
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                    onClick={() => setPeriod(key as typeof period)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Badge variant="outline" className="gap-2">
              <Eye className="h-3 w-3" />
              Dados em tempo real
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas Principais */}
      <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-white/20">
                <DollarSign className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +12%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl font-bold mb-1">
              R$ {totalSales.toLocaleString("pt-BR")}
            </CardTitle>
            <CardDescription className="text-orange-100">
              Vendas no período selecionado
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-white/20">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +8%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl font-bold mb-1">
              {totalOrders}
            </CardTitle>
            <CardDescription className="text-blue-100">
              Pedidos realizados
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-white/20">
                <Users className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +21
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl font-bold mb-1">
              1,204
            </CardTitle>
            <CardDescription className="text-emerald-100">
              Clientes cadastrados
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-white/20">
                <Package className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                8 sem estoque
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl font-bold mb-1">
              142
            </CardTitle>
            <CardDescription className="text-purple-100">
              Produtos ativos
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Principais */}
      <div className="grid gap-6 mb-8 xl:grid-cols-3">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-100">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Evolução de Vendas</CardTitle>
                  <CardDescription>Desempenho semanal das vendas</CardDescription>
                </div>
              </div>
              <Badge variant="outline">R$ {totalSales.toLocaleString("pt-BR")}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="vendas" 
                    stroke="#f97316" 
                    strokeWidth={3} 
                    dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                    fill="url(#salesGradient)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <PieChart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Métodos de Pagamento</CardTitle>
                <CardDescription>Distribuição por forma de pagamento</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie 
                    data={paymentsData} 
                    dataKey="value" 
                    nameKey="name" 
                    outerRadius={80} 
                    innerRadius={40}
                    paddingAngle={2}
                  >
                    {paymentsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {paymentsData.map((payment, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{payment.icon}</span>
                    <span className="text-slate-600">{payment.name}</span>
                  </div>
                  <span className="font-medium">{payment.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Área e Top Produtos */}
      <div className="grid gap-6 mb-8 xl:grid-cols-3">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm xl:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-100">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Vendas por Hora</CardTitle>
                <CardDescription>Comparativo: Balcão vs Delivery</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balcaoGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="deliveryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balcão" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    fill="url(#balcaoGradient)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="delivery" 
                    stroke="#60a5fa" 
                    strokeWidth={2}
                    fill="url(#deliveryGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Star className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Top Produtos</CardTitle>
                <CardDescription>Mais vendidos este período</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="text-2xl">{product.image}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{product.name}</div>
                    <div className="text-sm text-slate-500">
                      R$ {product.sales.toLocaleString("pt-BR")} em vendas
                    </div>
                  </div>
                  <Badge 
                    variant={product.growth > 0 ? "default" : "outline"}
                    className={product.growth > 0 ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}
                  >
                    {product.growth > 0 ? "+" : ""}{product.growth}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Atividades Recentes e Acesso Rápido */}
      <div className="grid gap-6 mb-8 md:grid-cols-2">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-slate-100">
                <Activity className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Atividades Recentes</CardTitle>
                <CardDescription>Últimas ações do sistema</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'warning' ? 'bg-yellow-500' :
                    activity.status === 'info' ? 'bg-blue-500' : 'bg-slate-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-900">{activity.message}</div>
                    <div className="text-xs text-slate-500 mt-1">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Acesso Rápido</CardTitle>
                <CardDescription>Navegue rapidamente pelas funcionalidades</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { href: "/admin/products", label: "Gerenciar Produtos", icon: Package, color: "from-orange-500 to-orange-600" },
                { href: "/admin/orders", label: "Pedidos & Vendas", icon: ShoppingCart, color: "from-blue-500 to-blue-600" },
                { href: "/admin/customers", label: "Clientes", icon: Users, color: "from-emerald-500 to-emerald-600" },
                { href: "/admin/users", label: "Usuários", icon: Users, color: "from-purple-500 to-purple-600" },
                { href: "/admin/reports", label: "Relatórios", icon: BarChart3, color: "from-indigo-500 to-indigo-600" },
                { href: "/admin/reports", label: "Financeiro", icon: DollarSign, color: "from-green-500 to-green-600" },
              ].map((item, index) => (
                <Link key={index} href={item.href}>
                  <div className={`p-4 rounded-lg bg-gradient-to-br ${item.color} text-white hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl`}>
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer da Dashboard */}
      <div className="text-center text-sm text-slate-500 py-6">
        <p>Dashboard atualizada em tempo real • Última atualização: {new Date().toLocaleTimeString("pt-BR")}</p>
      </div>
    </div>
  );
}


