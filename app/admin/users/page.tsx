"use client";

import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { AnimatedCard } from "@/app/components/ui/animated-card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { motion } from "framer-motion";
import {
    AlertCircle,
    Calendar,
    Camera,
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
    X,
    ScanFace
} from "lucide-react";
import { useEffect, useState } from "react";
import { FacialCaptureModal } from "../components/FacialCaptureModal";

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "pdv";
  status: "active" | "inactive";
  facialImageUrl?: string;
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
  const [facialModalOpen, setFacialModalOpen] = useState(false);
  const [selectedUserForFacial, setSelectedUserForFacial] = useState<User | null>(null);

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
      <div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Usuários</h1>
            <p className="text-muted-foreground">Cadastre, edite e gerencie os usuários do sistema</p>
          </div>
          <Button 
            onClick={() => openForm()}
            className="bg-primary hover:bg-primary/90"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Novo Usuário
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <AnimatedCard delay={0.1}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    Total de Usuários
                  </p>
                  <p className="text-3xl font-bold text-blue-900">{users.length}</p>
                </div>
                <Users className="h-12 w-12 text-blue-600" />
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard delay={0.2}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">
                    Usuários Ativos
                  </p>
                  <p className="text-3xl font-bold text-green-900">
                    {users.filter(u => u.status === "active").length}
                  </p>
                </div>
                <Check className="h-12 w-12 text-green-600" />
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard delay={0.3}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">
                    Usuários Inativos
                  </p>
                  <p className="text-3xl font-bold text-amber-900">
                    {users.filter(u => u.status === "inactive").length}
                  </p>
                </div>
                <X className="h-12 w-12 text-amber-600" />
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard delay={0.4}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">
                    Administradores
                  </p>
                  <p className="text-3xl font-bold text-purple-900">
                    {users.filter(u => u.role === "admin").length}
                  </p>
                </div>
                <Shield className="h-12 w-12 text-purple-600" />
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard delay={0.5}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">
                    Com Reconhecimento Facial
                  </p>
                  <p className="text-3xl font-bold text-indigo-900">
                    {users.filter(u => u.facialImageUrl).length}
                  </p>
                </div>
                <ScanFace className="h-12 w-12 text-indigo-600" />
              </div>
            </CardContent>
          </AnimatedCard>
        </div>

        {/* Barra de Busca e Filtros */}
        <AnimatedCard>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Busca Principal */}
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm"
                />
                {searchTerm && (
                  <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                    {filteredUsers.length}
                  </Badge>
                )}
              </div>

              {/* Filtros e Ações */}
              <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                <div className="relative">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as User["role"] | "all")}
                    className="appearance-none bg-background border border-input rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all w-full md:w-36"
                  >
                    <option value="all">Todos os Perfis</option>
                    <option value="admin">Administrador</option>
                    <option value="pdv">PDV</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as User["status"] | "all")}
                    className="appearance-none bg-background border border-input rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all w-full md:w-32"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                    setStatusFilter("all");
                  }}
                  className="h-9 px-3 text-sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Lista de Usuários */}
        <AnimatedCard>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">Usuários do Sistema</CardTitle>
            <CardDescription>
              {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-4 text-muted-foreground">Carregando usuários...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Erro ao carregar usuários</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={loadUsers} className="bg-primary hover:bg-primary/90">
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-background/60 rounded-xl p-6 border border-border hover:shadow-lg transition-all duration-300"
                  >
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
                            <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
                            <p className="text-muted-foreground flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {user.email}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
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
                        <div className="flex gap-2 flex-wrap">
                          {(() => {
                            const roleInfo = getRoleInfo(user.role);
                            const Icon = roleInfo.icon;
                            return (
                              <Badge className={`${roleInfo.color} border px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5`}>
                                <Icon className="h-3.5 w-3.5" />
                                {roleInfo.label}
                              </Badge>
                            );
                          })()}
                          
                          {(() => {
                            const statusInfo = getStatusInfo(user.status);
                            return (
                              <Badge className={`${statusInfo.color} border px-3 py-1.5 rounded-full text-xs font-medium`}>
                                {statusInfo.label}
                              </Badge>
                            );
                          })()}

                          {user.facialImageUrl && (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 border px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                              <ScanFace className="h-3.5 w-3.5" />
                              Reconhecimento Facial
                            </Badge>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUserForFacial(user);
                              setFacialModalOpen(true);
                            }}
                            className={`h-9 px-3 rounded-lg transition-all duration-300 ${
                              user.facialImageUrl
                                ? "border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300"
                                : "border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                            }`}
                            title={user.facialImageUrl ? "Atualizar foto facial" : "Cadastrar foto facial"}
                          >
                            <Camera className="h-4 w-4 mr-1" />
                            {user.facialImageUrl ? "Atualizar Foto" : "Foto Facial"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openForm(user)}
                            className="h-9 px-3 rounded-lg border-border hover:bg-accent hover:border-ring transition-all duration-300"
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
                  </motion.div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Nenhum usuário encontrado</h3>
                    <p className="text-muted-foreground mb-4">
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
        </AnimatedCard>

        {/* Modal de Formulário */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white shadow-2xl border border-gray-200 rounded-2xl flex flex-col">
              {/* Header com gradiente */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 relative">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
                <div className="relative p-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-orange-600" />
                      {editingUser ? "Editar Usuário" : "Novo Usuário"}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {editingUser ? "Atualize as informações do usuário" : "Preencha os dados para cadastrar um novo usuário"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeForm}
                    className="h-12 w-12 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all hover:scale-105"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              
              {/* Conteúdo scrollável */}
              <div className="flex-1 overflow-y-auto p-6">
                <form id="user-form-modal" onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Nome Completo *</label>
                      <Input
                        placeholder="Digite o nome completo"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">E-mail *</label>
                      <Input
                        type="email"
                        placeholder="usuario@exemplo.com"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Telefone</label>
                      <Input
                        placeholder="(11) 99999-9999"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Perfil *</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as User["role"] }))}
                        className="w-full px-3 py-2 rounded-lg border border-input focus:border-ring focus:ring-ring/20 focus:outline-none"
                        required
                      >
                        <option value="pdv">PDV</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as User["status"] }))}
                        className="w-full px-3 py-2 rounded-lg border border-input focus:border-ring focus:ring-ring/20 focus:outline-none"
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        {editingUser ? "Nova Senha" : "Senha"} {editingUser ? "(opcional)" : "*"}
                      </label>
                      <Input
                        type="password"
                        placeholder={editingUser ? "Deixe em branco para manter a senha atual" : "Digite uma senha"}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="rounded-lg border-input focus:border-ring focus:ring-ring/20"
                        {...(!editingUser && { required: true })}
                      />
                    </div>
                  </div>
                </form>
              </div>
              
              {/* Rodapé */}
              <div className="border-t border-gray-200 p-6 bg-gray-50/50">
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeForm}
                    className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    form="user-form-modal"
                    className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    {editingUser ? "Atualizar Usuário" : "Cadastrar Usuário"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white shadow-2xl border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
              {/* Header com gradiente vermelho */}
              <div className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-gray-200 relative">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
                <div className="relative text-center p-6">
                  <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Confirmar Exclusão</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              
              {/* Rodapé */}
              <div className="border-t border-gray-200 p-6 bg-gray-50/50">
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirm(null)}
                    className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => deleteUser(deleteConfirm)}
                    className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Usuário
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Captura Facial */}
        {facialModalOpen && selectedUserForFacial && (
          <FacialCaptureModal
            isOpen={facialModalOpen}
            onClose={() => {
              setFacialModalOpen(false);
              setSelectedUserForFacial(null);
            }}
            userId={selectedUserForFacial.id}
            userName={selectedUserForFacial.name}
            currentFacialImageUrl={selectedUserForFacial.facialImageUrl}
            onSuccess={() => {
              loadUsers();
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}