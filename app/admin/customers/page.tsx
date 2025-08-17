"use client";

import {
  AlertCircle,
  Check,
  Edit,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  X
} from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  doc?: string; // CPF/CNPJ
  address_json?: string; // Endereço em formato JSON
  created_at: string;
  active: boolean;
};

export default function AdminCustomersPage() {
  // Dados simulados de clientes
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: "1",
      name: "João Silva",
      phone: "(11) 99999-9999",
      email: "joao.silva@email.com",
      doc: "123.456.789-00",
      address_json: JSON.stringify({
        street: "Rua das Flores",
        number: "123",
        complement: "Apto 101",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        zip: "01001-000"
      }),
      created_at: "2024-01-15",
      active: true
    },
    {
      id: "2",
      name: "Maria Oliveira",
      phone: "(21) 98888-8888",
      email: "maria.oliveira@email.com",
      doc: "987.654.321-00",
      address_json: JSON.stringify({
        street: "Av. Brasil",
        number: "456",
        neighborhood: "Jardim América",
        city: "Rio de Janeiro",
        state: "RJ",
        zip: "20001-000"
      }),
      created_at: "2024-02-20",
      active: true
    },
    {
      id: "3",
      name: "Carlos Santos",
      phone: "(31) 97777-7777",
      email: "carlos.santos@email.com",
      doc: "456.789.123-00",
      address_json: JSON.stringify({
        street: "Rua da Praça",
        number: "789",
        neighborhood: "Savassi",
        city: "Belo Horizonte",
        state: "MG",
        zip: "30110-000"
      }),
      created_at: "2024-03-10",
      active: false
    },
    {
      id: "4",
      name: "Ana Costa",
      phone: "(51) 96666-6666",
      email: "ana.costa@email.com",
      doc: "321.654.987-00",
      address_json: JSON.stringify({
        street: "Rua dos Andradas",
        number: "101",
        complement: "Sala 501",
        neighborhood: "Centro",
        city: "Porto Alegre",
        state: "RS",
        zip: "90010-000"
      }),
      created_at: "2024-03-15",
      active: true
    }
  ]);

  // Estados do formulário
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    doc: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip: "",
    active: true
  });

  // Estados de filtros e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Estados de confirmação
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Funções auxiliares
  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      doc: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zip: "",
      active: true
    });
  };

  const openForm = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      try {
        const address = customer.address_json ? JSON.parse(customer.address_json) : {};
        setFormData({
          name: customer.name,
          phone: customer.phone,
          email: customer.email || "",
          doc: customer.doc || "",
          street: address.street || "",
          number: address.number || "",
          complement: address.complement || "",
          neighborhood: address.neighborhood || "",
          city: address.city || "",
          state: address.state || "",
          zip: address.zip || "",
          active: customer.active
        });
      } catch (e) {
        // Se houver erro ao parsear o endereço, usa valores vazios
        setFormData({
          name: customer.name,
          phone: customer.phone,
          email: customer.email || "",
          doc: customer.doc || "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
          zip: "",
          active: customer.active
        });
      }
    } else {
      setEditingCustomer(null);
      resetForm();
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.name.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }
    
    if (!formData.phone.trim()) {
      alert('Por favor, informe o telefone do cliente.');
      return;
    }
    
    // Monta o objeto de endereço
    const address = {
      street: formData.street,
      number: formData.number,
      complement: formData.complement,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
      zip: formData.zip
    };
    
    const address_json = JSON.stringify(address);
    
    if (editingCustomer) {
      // Editar cliente existente
      setCustomers(prev => prev.map(c => 
        c.id === editingCustomer.id 
          ? {
              ...c,
              name: formData.name,
              phone: formData.phone,
              email: formData.email || undefined,
              doc: formData.doc || undefined,
              address_json,
              active: formData.active
            }
          : c
      ));
    } else {
      // Criar novo cliente
      const newCustomer: Customer = {
        id: Date.now().toString(),
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        doc: formData.doc || undefined,
        address_json,
        created_at: new Date().toISOString().split('T')[0],
        active: formData.active
      };
      setCustomers(prev => [...prev, newCustomer]);
    }
    
    closeForm();
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    setDeleteConfirm(null);
  };

  const getStatusInfo = (active: boolean) => {
    return active 
      ? { label: "Ativo", color: "bg-green-100 text-green-700 border-green-200" }
      : { label: "Inativo", color: "bg-red-100 text-red-700 border-red-200" };
  };

  // Filtros
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.doc && customer.doc.includes(searchTerm));
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && customer.active) ||
      (statusFilter === "inactive" && !customer.active);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Clientes</h1>
          <p className="text-gray-600">Cadastre e gerencie os clientes do estabelecimento</p>
        </div>
        <Button onClick={() => openForm()} className="bg-primary hover:bg-primary/90">
          <Plus className="h-5 w-5 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total</p>
                <p className="text-3xl font-bold text-blue-900">{customers.length}</p>
              </div>
              <User className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Ativos</p>
                <p className="text-3xl font-bold text-green-900">
                  {customers.filter(c => c.active).length}
                </p>
              </div>
              <Check className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Inativos</p>
                <p className="text-3xl font-bold text-orange-900">
                  {customers.filter(c => !c.active).length}
                </p>
              </div>
              <X className="h-12 w-12 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Com Email</p>
                <p className="text-3xl font-bold text-purple-900">
                  {customers.filter(c => c.email).length}
                </p>
              </div>
              <User className="h-12 w-12 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Busca e Filtros Compacta */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 shadow-sm">
        {/* Busca Principal */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 text-sm border-gray-200 bg-white/80 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />
          {searchTerm && (
            <Badge className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5">
              {filteredCustomers.length}
            </Badge>
          )}
        </div>

        {/* Filtros e Ações */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className="px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white/80 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-400"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
            }}
            className="h-8 px-3 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Limpar
          </Button>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">Lista de Clientes</CardTitle>
          <CardDescription>
            {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''} encontrado{filteredCustomers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Contato</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Documento</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-xs text-gray-500">
                            Cadastrado em {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <Phone className="h-4 w-4" />
                          {customer.phone}
                        </div>
                        {customer.email && (
                          <div className="text-sm text-gray-600 truncate max-w-xs">
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-700">
                        {customer.doc || "-"}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {(() => {
                        const statusInfo = getStatusInfo(customer.active);
                        return (
                          <Badge className={`${statusInfo.color} border px-3 py-1 rounded-full text-xs font-medium`}>
                            {statusInfo.label}
                          </Badge>
                        );
                      })()}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openForm(customer)}
                          className="h-8 px-3 rounded-lg border-gray-200 hover:bg-gray-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(customer.id)}
                          className="h-8 px-3 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cliente encontrado</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== "all"
                    ? "Tente ajustar os filtros de busca" 
                    : "Comece cadastrando o primeiro cliente"
                  }
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Button onClick={() => openForm()} className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Cliente
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Formulário */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl border-0">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold">
                    {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
                  </CardTitle>
                  <CardDescription>
                    {editingCustomer ? "Atualize as informações do cliente" : "Preencha os dados para cadastrar um novo cliente"}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeForm}
                  className="h-8 w-8 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Nome *</label>
                    <Input
                      placeholder="Nome completo"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Telefone *</label>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <Input
                      type="email"
                      placeholder="cliente@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Documento (CPF/CNPJ)</label>
                    <Input
                      placeholder="000.000.000-00"
                      value={formData.doc}
                      onChange={(e) => setFormData(prev => ({ ...prev, doc: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">CEP</label>
                    <Input
                      placeholder="00000-000"
                      value={formData.zip}
                      onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Estado</label>
                    <Input
                      placeholder="UF"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Cidade</label>
                    <Input
                      placeholder="Cidade"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Bairro</label>
                    <Input
                      placeholder="Bairro"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Rua</label>
                    <Input
                      placeholder="Nome da rua"
                      value={formData.street}
                      onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Número</label>
                    <Input
                      placeholder="Número"
                      value={formData.number}
                      onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Complemento</label>
                    <Input
                      placeholder="Complemento"
                      value={formData.complement}
                      onChange={(e) => setFormData(prev => ({ ...prev, complement: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                        className="peer h-6 w-11 rounded-full border-2 border-gray-300 bg-gray-200 transition-colors checked:border-primary checked:bg-primary focus:outline-none focus:ring-0"
                      />
                      <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Cliente ativo</span>
                  </label>
                </div>

                {/* Separator */}
                <div className="border-t border-gray-200 my-6"></div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeForm}
                    className="px-6 py-2 rounded-lg border-gray-200 hover:bg-gray-50"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 px-6 py-2 rounded-lg"
                  >
                    {editingCustomer ? "Atualizar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white shadow-2xl border-0">
            <CardHeader className="text-center border-b border-gray-200">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900">Confirmar Exclusão</CardTitle>
              <CardDescription>
                Tem certeza que deseja remover este cliente? Esta ação não pode ser desfeita.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-6 py-2 rounded-lg border-gray-200 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => deleteCustomer(deleteConfirm)}
                  className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}