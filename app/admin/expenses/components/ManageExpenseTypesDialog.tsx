"use client";

import { useToast } from "@/app/components/Toast";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ExpenseType } from "@/lib/types";
import { Tag, X } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function ManageExpenseTypesDialog({ isOpen, onClose, onChanged }: Props) {
  const [items, setItems] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseType | undefined>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const { showToast } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/expense-types");
      if (!res.ok) throw new Error("Falha ao carregar tipos");
      setItems(await res.json());
    } catch (e) {
      showToast("Erro ao carregar tipos de despesa", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  const openCreate = () => {
    setEditing(undefined);
    setName("");
    setDescription("");
    setActive(true);
    setFormOpen(true);
  };

  const openEdit = (it: ExpenseType) => {
    setEditing(it);
    setName(it.name);
    setDescription(it.description || "");
    setActive(!!it.active);
    setFormOpen(true);
  };

  const save = async () => {
    try {
      if (!name.trim()) return;
      setSaving(true);
      const url = editing ? `/api/expense-types/${editing.id}` : "/api/expense-types";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao salvar tipo");
      showToast(editing ? "Tipo atualizado" : "Tipo criado", "success");
      setFormOpen(false);
      await load();
      onChanged();
    } catch (e: any) {
      showToast(e?.message || "Erro ao salvar tipo de despesa", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (it: ExpenseType) => {
    try {
      const res = await fetch(`/api/expense-types/${it.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao remover tipo");
      showToast("Tipo removido", "success");
      await load();
      onChanged();
    } catch (e: any) {
      showToast(e?.message || "Erro ao remover tipo de despesa", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl max-h-[95vh] overflow-hidden bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col">
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 sticky top-0 z-20 relative p-6">
          <div className="absolute inset-0 opacity-5" />
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gerenciar Tipos de Despesa</h2>
              <p className="text-gray-600 mt-1 text-sm">Crie, edite e remova tipos utilizados nas despesas</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-full hover:bg-white/50 text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{items.length} tipo(s)</div>
            <Button size="sm" onClick={openCreate}>Novo Tipo</Button>
          </div>
          <div className="grid gap-2">
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 p-4 bg-white animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
                        <div className="h-3 w-64 bg-gray-100 rounded" />
                      </div>
                      <div className="flex gap-2 ml-4">
                        <div className="h-9 w-20 bg-gray-100 rounded" />
                        <div className="h-9 w-20 bg-gray-100 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : items.map(it => (
              <div key={it.id} className="rounded-xl border border-gray-200 p-4 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center">
                      <Tag className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{it.name}</span>
                        <Badge variant={it.active ? "default" : "outline"}>{it.active ? "Ativo" : "Inativo"}</Badge>
                      </div>
                      {it.description && <div className="text-sm text-gray-600 mt-1">{it.description}</div>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(it)}>Editar</Button>
                    <Button variant="outline" size="sm" onClick={() => removeItem(it)}>Remover</Button>
                  </div>
                </div>
              </div>
            ))}
            {(!loading && items.length === 0) && (
              <div className="text-sm text-muted-foreground">Nenhum tipo cadastrado</div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 z-20 bg-gray-50/50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <Button variant="outline" onClick={onClose} className="px-6">Fechar</Button>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 sticky top-0 z-20 relative p-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? "Editar" : "Novo"} Tipo de Despesa</h3>
              <Button variant="ghost" size="icon" onClick={() => setFormOpen(false)} className="h-9 w-9 rounded-full hover:bg-white/50 text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nome *</label>
                <Input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Descrição</label>
                <Input value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="et-active" checked={active} onChange={e => setActive(e.target.checked)} className="rounded border-border" />
                <label htmlFor="et-active" className="text-sm font-medium">Ativo</label>
              </div>
            </div>
            <div className="bg-gray-50/50 border-t border-gray-200 px-5 py-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    Salvando...
                  </span>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


