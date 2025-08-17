"use client";

import {
    AlertCircle,
    Calendar,
    Check,
    Edit,
    Mail,
    Phone,
    Search,
    Shield,
    Trash2,
    User,
    UserPlus,
    Users,
    X
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "pdv";
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

export default function AdminUsersPage() {
  // Estados de dados
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados do formulário
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "pdv" as User["role"],
    status: "active" as User["status"],
    password: ""
  });

  // Estados de filtros e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<User["role"] | "all">("all");
  const [statusFilter, setStatusFilter] = useState<User["status"] | "all">("all");

  // Estados de confirmação
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Carregar usuários
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/users?q=${searchTerm}&role=${roleFilter}&status=${statusFilter}`
      );
      if (!response.ok) throw new Error('Failed to fetch users');
      const result = await response.json();
      setUsers(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Carregar usuários na montagem e quando filtros mudarem
  useEffect(() => {
    loadUsers();
  }, [searchTerm, roleFilter, statusFilter]);

  // Funções auxiliares
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "pdv",
      status: "active",
      password: ""
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
        role: user.role,
        status: user.status,
        password: ""
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      alert('Nome e email são obrigatórios');
      return;
    }

    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        role: formData.role,
        status: formData.status,
        password: formData.password || undefined
      };
      
      if (editingUser) {
        // Editar usuário existente
        const response = await fetch(`/api/users`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingUser.id, ...userData })
        });
        
        if (!response.ok) throw new Error('Failed to update user');
        const updatedUser = await response.json();
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      } else {
        // Criar novo usuário
        const response = await fetch(`/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
        
        if (!response.ok) throw new Error('Failed to create user');
        const newUser = await response.json();
        setUsers(prev => [...prev, newUser]);
      }
      
      closeForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save user');
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete user');
      setUsers(prev => prev.filter(user => user.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  // Filtros
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.phone && user.phone.includes(searchTerm));
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleInfo = (role: User["role"]) => {
    switch (role) {
      case "admin":
        return { label: "Administrador", color: "bg-red-100 text-red-800 border-red-200", icon: Shield };
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
    <ProtectedRoute allowedRoles={["admin"]}>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </div>

        {/* Barra de Busca e Filtros Compacta */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 shadow-sm">
          {/* Busca Principal */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm border-gray-200 bg-white/80 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
            {searchTerm && (
              <Badge className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5">
                {users.filter(user => 
                  user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (user.phone && user.phone.includes(searchTerm))
                ).length}
              </Badge>
            )}
          </div>

          {/* Filtros e Ações */}
          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as User["role"] | "all")}
              className="px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white/80 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-400"
            >
              <option value="all">Todos os Perfis</option>
              <option value="admin">Administrador</option>
              <option value="pdv">PDV</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as User["status"] | "all")}
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
                setRoleFilter("all");
                setStatusFilter("all");
              }}
              className="h-8 px-3 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Limpar
            </Button>
          </div>
        </div>

        {/* Lista de Usuários */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Usuários do Sistema</CardTitle>
            <CardDescription>
              {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-4 text-gray-600">Carregando usuários...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar usuários</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={loadUsers} className="bg-primary hover:bg-primary/90">
                  Tentar novamente
                </Button>
              </div>
            ) : (
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
                          <p className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Criado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                          </p>
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
            )}
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

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        {editingUser ? "Nova Senha" : "Senha"} {editingUser ? "(opcional)" : "*"}
                      </label>
                      <Input
                        type="password"
                        placeholder={editingUser ? "Deixe em branco para manter a senha atual" : "Digite uma senha"}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20"
                        {...(!editingUser && { required: true })}
                      />
                    </div>
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
    </ProtectedRoute>
  );
}