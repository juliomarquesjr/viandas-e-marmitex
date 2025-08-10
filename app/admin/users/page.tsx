"use client";

import { useState } from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Shield,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Filter,
  Plus,
  X,
  Check,
  AlertCircle
} from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: "admin" | "pdv" | "manager";
  status: "active" | "inactive";
  createdAt: string;
  lastLogin?: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "João Silva",
      email: "joao@viandas.com",
      phone: "(11) 99999-9999",
      address: "Rua das Flores, 123 - São Paulo/SP",
      role: "admin",
      status: "active",
      createdAt: "2024-01-15",
      lastLogin: "2024-12-19 14:30"
    },
    {
      id: "2",
      name: "Maria Santos",
      email: "maria@viandas.com",
      phone: "(11) 88888-8888",
      address: "Av. Paulista, 456 - São Paulo/SP",
      role: "pdv",
      status: "active",
      createdAt: "2024-02-20",
      lastLogin: "2024-12-19 10:15"
    },
    {
      id: "3",
      name: "Pedro Costa",
      email: "pedro@viandas.com",
      phone: "(11) 77777-7777",
      address: "Rua Augusta, 789 - São Paulo/SP",
      role: "manager",
      status: "inactive",
      createdAt: "2024-03-10",
      lastLogin: "2024-12-15 16:45"
    }
  ]);

  // Estados do formulário
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    role: "pdv" as User["role"],
    status: "active" as User["status"]
  });

  // Estados de filtros e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<User["role"] | "all">("all");
  const [statusFilter, setStatusFilter] = useState<User["status"] | "all">("all");

  // Estados de confirmação
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Funções auxiliares
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      role: "pdv",
      status: "active"
    });
    setEditingUser(null);
  };

  const openForm = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        role: user.role,
        status: user.status
      });
    } else {
      resetForm();
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) return;

    if (editingUser) {
      // Editar usuário existente
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...formData, updatedAt: new Date().toISOString() }
          : user
      ));
    } else {
      // Criar novo usuário
      const newUser: User = {
        id: Math.random().toString(36).slice(2, 8),
        ...formData,
        createdAt: new Date().toISOString()
      };
      setUsers(prev => [...prev, newUser]);
    }
    
    closeForm();
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(user => user.id !== id));
    setDeleteConfirm(null);
  };

  // Filtros
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleInfo = (role: User["role"]) => {
    switch (role) {
      case "admin":
        return { label: "Administrador", color: "bg-red-100 text-red-800 border-red-200", icon: Shield };
      case "manager":
        return { label: "Gerente", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Shield };
      case "pdv":
        return { label: "PDV", color: "bg-green-100 text-green-800 border-green-200", icon: User };
      default:
        return { label: "Usuário", color: "bg-gray-100 text-gray-800 border-gray-200", icon: User };
    }
  };

  const getStatusInfo = (status: User["status"]) => {
    return status === "active" 
      ? { label: "Ativo", color: "bg-green-100 text-green-800 border-green-200" }
      : { label: "Inativo", color: "bg-red-100 text-red-800 border-red-200" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Usuários</h1>
          <p className="text-gray-600 mt-2">Cadastre, edite e gerencie os usuários do sistema</p>
        </div>
        <Button 
          onClick={() => openForm()}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total de Usuários</p>
                <p className="text-3xl font-bold text-blue-900">{users.length}</p>
              </div>
              <Users className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Usuários Ativos</p>
                <p className="text-3xl font-bold text-green-900">
                  {users.filter(u => u.status === "active").length}
                </p>
              </div>
              <Check className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Administradores</p>
                <p className="text-3xl font-bold text-purple-900">
                  {users.filter(u => u.role === "admin").length}
                </p>
              </div>
              <Shield className="h-12 w-12 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">PDV</p>
                <p className="text-3xl font-bold text-orange-900">
                  {users.filter(u => u.role === "pdv").length}
                </p>
              </div>
              <User className="h-12 w-12 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 rounded-xl border-white/30 bg-white/50 focus:bg-white focus:border-primary/50"
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as User["role"] | "all")}
                className="px-4 py-3 rounded-xl border border-white/30 bg-white/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              >
                <option value="all">Todos os Perfis</option>
                <option value="admin">Administrador</option>
                <option value="manager">Gerente</option>
                <option value="pdv">PDV</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as User["status"] | "all")}
                className="px-4 py-3 rounded-xl border border-white/30 bg-white/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuários */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">Usuários do Sistema</CardTitle>
          <CardDescription>
            {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white/60 rounded-xl p-6 border border-white/30 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Informações do usuário */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                        <p className="text-gray-600 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      {user.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {user.phone}
                        </p>
                      )}
                      {user.address && (
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {user.address}
                        </p>
                      )}
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Criado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                      {user.lastLogin && (
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Último login: {new Date(user.lastLogin).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status e Perfil */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="flex gap-2">
                      {(() => {
                        const roleInfo = getRoleInfo(user.role);
                        const Icon = roleInfo.icon;
                        return (
                          <Badge className={`${roleInfo.color} border px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1`}>
                            <Icon className="h-3 w-3" />
                            {roleInfo.label}
                          </Badge>
                        );
                      })()}
                      
                      {(() => {
                        const statusInfo = getStatusInfo(user.status);
                        return (
                          <Badge className={`${statusInfo.color} border px-3 py-1 rounded-full text-xs font-medium`}>
                            {statusInfo.label}
                          </Badge>
                        );
                      })()}
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openForm(user)}
                        className="h-9 px-3 rounded-lg border-white/30 hover:bg-white/50 hover:border-primary/50 transition-all duration-300"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirm(user.id)}
                        className="h-9 px-3 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-300"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || roleFilter !== "all" || statusFilter !== "all" 
                    ? "Tente ajustar os filtros de busca" 
                    : "Comece cadastrando o primeiro usuário do sistema"
                  }
                </p>
                {!searchTerm && roleFilter === "all" && statusFilter === "all" && (
                  <Button onClick={() => openForm()} className="bg-primary hover:bg-primary/90">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Cadastrar Usuário
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
                    {editingUser ? "Editar Usuário" : "Novo Usuário"}
                  </CardTitle>
                  <CardDescription>
                    {editingUser ? "Atualize as informações do usuário" : "Preencha os dados para cadastrar um novo usuário"}
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
                    <label className="text-sm font-medium text-gray-700">Nome Completo *</label>
                    <Input
                      placeholder="Digite o nome completo"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">E-mail *</label>
                    <Input
                      type="email"
                      placeholder="usuario@exemplo.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Telefone</label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Perfil *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as User["role"] }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:ring-primary/20 focus:outline-none"
                      required
                    >
                      <option value="pdv">PDV</option>
                      <option value="manager">Gerente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as User["status"] }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:ring-primary/20 focus:outline-none"
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Endereço</label>
                  <Input
                    placeholder="Rua, número, bairro, cidade/estado"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                  />
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
                    {editingUser ? "Atualizar" : "Cadastrar"}
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
                Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.
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
                  onClick={() => deleteUser(deleteConfirm)}
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


