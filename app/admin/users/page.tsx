"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { useToast } from "../../components/Toast";
import { DeleteConfirmDialog } from "../../components/DeleteConfirmDialog";
import { UserFormDialog } from "../../components/UserFormDialog";
import { PageHeader } from "../components/layout";
import { DataTable, Column } from "../components/data-display";
import { Button } from "../../components/ui/button";
import { Badge, StatusBadge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { FacialCaptureModal } from "../components/FacialCaptureModal";
import {
  Users,
  Plus,
  Mail,
  Phone,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  User,
  ScanFace,
} from "lucide-react";
import { UserStatsCards } from "./components/UserStatsCards";
import { UsersPageSkeleton } from "./components/UsersPageSkeleton";
import { UserGridView } from "./components/UserGridView";
import { UserFilterBar } from "./components/UserFilterBar";

// =============================================================================
// TIPOS
// =============================================================================

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "pdv";
  status: "active" | "inactive";
  imageUrl?: string;
  facialImageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

// =============================================================================
// MENU DE AÇÕES
// =============================================================================

function UserActionsMenu({
  user,
  onEdit,
  onDelete,
  onFacialCapture,
}: {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
  onFacialCapture: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Ações">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        className="w-max max-w-[min(100vw-1.5rem,20rem)] p-1 bg-white text-slate-700 border-slate-200 shadow-lg"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <button
          type="button"
          className="flex items-center w-full whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-sm"
          onClick={() => {
            setOpen(false);
            onFacialCapture();
          }}
        >
          <ScanFace className="h-4 w-4 mr-2 text-slate-400" />
          {user.facialImageUrl ? "Reconhecimento Facial" : "Foto Facial"}
        </button>
        <button
          type="button"
          className="flex items-center w-full whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-sm"
          onClick={() => {
            setOpen(false);
            onEdit();
          }}
        >
          <Edit className="h-4 w-4 mr-2 text-slate-400" />
          Editar
        </button>
        <button
          type="button"
          className="flex items-center w-full whitespace-nowrap px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-sm"
          onClick={() => {
            setOpen(false);
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remover
        </button>
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const { data: session, update: updateSession } = useSession();
  const pageSizeOptions = React.useMemo(() => [10, 25, 50, 100], []);

  // Estados de dados
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Estado de visualização (tabela ou cards)
  const [viewMode, setViewMode] = React.useState<"table" | "grid">(() => {
    if (typeof window === "undefined") return "table";
    return (sessionStorage.getItem("users-view-mode") as "table" | "grid") ?? "table";
  });

  const handleViewModeChange = (mode: "table" | "grid") => {
    setViewMode(mode);
    sessionStorage.setItem("users-view-mode", mode);
  };

  const handleItemsPerPageChange = React.useCallback(
    (size: number) => {
      const defaultPageSize = pageSizeOptions[0];
      const normalizedSize = pageSizeOptions.includes(size) ? size : defaultPageSize;
      setItemsPerPage(normalizedSize);
      setCurrentPage(1);
      sessionStorage.setItem("users-items-per-page", String(normalizedSize));
    },
    [pageSizeOptions]
  );

  // Estados de busca e filtros
  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<"all" | "admin" | "pdv">("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");

  // Estados de paginação
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(() => {
    if (typeof window === "undefined") return 10;
    const defaultPageSize = pageSizeOptions[0];
    const savedValue = Number(sessionStorage.getItem("users-items-per-page"));
    if (Number.isNaN(savedValue)) return defaultPageSize;
    return pageSizeOptions.includes(savedValue) ? savedValue : defaultPageSize;
  });

  // Estados do formulário
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);

  // Estados de confirmação
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [confirmMessage, setConfirmMessage] = React.useState("");
  const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null);
  const [isDeletingUser, setIsDeletingUser] = React.useState(false);

  // Estados de captura facial
  const [facialModalOpen, setFacialModalOpen] = React.useState(false);
  const [selectedUserForFacial, setSelectedUserForFacial] = React.useState<User | null>(null);

  // Debounce da busca
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Carregar usuários
  const loadUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/users", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!response.ok) throw new Error("Falha ao carregar usuários");
      const result = await response.json();
      setUsers(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Funções do formulário
  const openForm = (user?: User) => {
    setEditingUser(user || null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
  };

  const handleFormSubmit = async (e: React.FormEvent, formData: any) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("Por favor, informe o nome do usuário.", "error");
      return;
    }

    if (!formData.email.trim()) {
      showToast("Por favor, informe o e-mail do usuário.", "error");
      return;
    }

    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        role: formData.role,
        status: formData.status,
        password: formData.password || undefined,
        imageUrl: formData.imageUrl || null,
      };

      if (editingUser) {
        const response = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingUser.id, ...userData }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Falha ao atualizar usuário");
        }

        const updatedUser = await response.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
        );

        if (
          session?.user &&
          session.user.id === updatedUser.id
        ) {
          await updateSession({
            user: {
              ...session.user,
              name: updatedUser.name,
              email: updatedUser.email,
              image: updatedUser.imageUrl ?? null,
              role: updatedUser.role,
            },
          });
        }

        showToast("Usuário atualizado com sucesso!", "success");
        closeForm();
      } else {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Falha ao criar usuário");
        }

        const newUser = await response.json();
        setUsers((prev) => [...prev, newUser]);
        showToast("Usuário cadastrado com sucesso!", "success");
        closeForm();
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Falha ao salvar usuário",
        "error"
      );
    }
  };

  const deleteUser = async (id: string) => {
    setIsDeletingUser(true);
    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Falha ao excluir usuário");
      }

      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast("Usuário excluído com sucesso!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Falha ao excluir usuário",
        "error"
      );
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setConfirmMessage(`Tem certeza que deseja remover o usuário "${user.name}"? Esta ação não pode ser desfeita.`);
    setPendingAction(() => () => deleteUser(user.id));
    setIsConfirmOpen(true);
  };

  const handleFacialCapture = (user: User) => {
    setSelectedUserForFacial(user);
    setFacialModalOpen(true);
  };

  // Obter informações do perfil
  const getRoleInfo = (role: User["role"]) => {
    switch (role) {
      case "admin":
        return { label: "Administrador", icon: Shield };
      case "pdv":
        return { label: "PDV", icon: User };
      default:
        return { label: "Usuário", icon: User };
    }
  };

  // Colunas da tabela
  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Usuário",
      render: (_, user) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {user.imageUrl ? (
              <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-500">
              {new Date(user.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contato",
      render: (_, user) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-slate-700">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate max-w-[200px]">{user.email}</span>
          </div>
          {user.phone && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Phone className="h-3 w-3" />
              {user.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "role",
      header: "Perfil",
      align: "center",
      render: (_, user) => {
        const roleInfo = getRoleInfo(user.role);
        const Icon = roleInfo.icon;
        return (
          <Badge
            variant={user.role === "admin" ? "primary" : "default"}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Icon className="h-3.5 w-3.5" />
            {roleInfo.label}
          </Badge>
        );
      },
    },
    {
      key: "facial",
      header: "Reconhecimento Facial",
      align: "center",
      render: (_, user) => {
        if (!user.facialImageUrl) {
          return <span className="text-slate-400 text-sm">Não cadastrado</span>;
        }
        return (
          <Badge variant="secondary" size="sm" className="flex items-center gap-1.5">
            <ScanFace className="h-3.5 w-3.5" />
            Cadastrado
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (_, user) => (
        <StatusBadge status={user.status === "active" ? "active" : "inactive"} size="sm" />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (_, user) => (
        <UserActionsMenu
          user={user}
          onEdit={() => openForm(user)}
          onDelete={() => handleDeleteClick(user)}
          onFacialCapture={() => handleFacialCapture(user)}
        />
      ),
    },
  ];

  const filteredUsers = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const totalFilteredPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage) || 1);

  const paginatedUsers = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  React.useEffect(() => {
    if (currentPage > totalFilteredPages) {
      setCurrentPage(totalFilteredPages);
    }
  }, [currentPage, totalFilteredPages]);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Usuários"
          description="Gerencie os usuários do sistema"
          icon={Users}
          actions={
            <Button onClick={() => openForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          }
        />

        {loading && users.length === 0 ? (
          <UsersPageSkeleton />
        ) : (
          <>
            {/* Estatísticas */}
            <UserStatsCards users={users} />

            {/* Barra de Filtros */}
            <UserFilterBar
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              roleFilter={roleFilter}
              onRoleChange={setRoleFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              totalCount={users.length}
              filteredCount={filteredUsers.length}
            />

            {/* Conteúdo: Tabela ou Grid */}
            {error ? (
              <Card>
                <CardContent className="p-0">
                  <div className="text-center py-12">
                    <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                      <div className="h-6 w-6 rounded-full bg-red-500" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      Erro ao carregar usuários
                    </h3>
                    <p className="text-slate-500 mb-4">{error}</p>
                    <Button onClick={loadUsers}>Tentar novamente</Button>
                  </div>
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <Card>
                <CardContent className="p-0">
                  <DataTable
                    columns={columns}
                    data={filteredUsers}
                    rowKey="id"
                    pagination={{
                      page: currentPage,
                      pageSize: itemsPerPage,
                      total: filteredUsers.length,
                      onPageChange: setCurrentPage,
                      onPageSizeChange: handleItemsPerPageChange,
                    }}
                    emptyMessage={
                      searchTerm || roleFilter !== "all" || statusFilter !== "all"
                        ? "Nenhum usuário encontrado com os filtros aplicados"
                        : "Nenhum usuário cadastrado"
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <UserGridView
                users={paginatedUsers}
                onEdit={openForm}
                onDelete={(id) => {
                  const user = filteredUsers.find((u) => u.id === id) ?? users.find((u) => u.id === id);
                  if (user) handleDeleteClick(user);
                }}
                onFacialCapture={handleFacialCapture}
                pagination={{
                  page: currentPage,
                  pageSize: itemsPerPage,
                  total: filteredUsers.length,
                  onPageChange: setCurrentPage,
                  onPageSizeChange: handleItemsPerPageChange,
                }}
                emptyMessage={
                  searchTerm || roleFilter !== "all" || statusFilter !== "all"
                    ? "Nenhum usuário encontrado com os filtros aplicados"
                    : "Nenhum usuário cadastrado"
                }
              />
            )}
          </>
        )}

        {/* Modal de Formulário */}
        {isFormOpen && (
          <UserFormDialog
            isOpen={isFormOpen}
            onClose={closeForm}
            onSubmit={handleFormSubmit}
            user={editingUser}
          />
        )}

        {/* Modal de Confirmação */}
        <DeleteConfirmDialog
          open={isConfirmOpen}
          onOpenChange={(open) => {
            setIsConfirmOpen(open);
            if (!open) setPendingAction(null);
          }}
          title="Confirmar Exclusão"
          description={confirmMessage}
          onConfirm={() => {
            if (pendingAction) {
              pendingAction();
            }
            setPendingAction(null);
          }}
          isLoading={isDeletingUser}
        />

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
