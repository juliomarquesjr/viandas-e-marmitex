# Plano de Padronização dos Modais de Exclusão

## 📋 Resumo da Análise

### Situação Atual

O sistema possui dois componentes de diálogo para confirmações:

1. **`ConfirmDialog`** (`app/components/ConfirmDialog.tsx`)
   - Ícone: `AlertCircle` (amarelo)
   - Botão de confirmação: azul (padrão)
   - Texto padrão: "Confirmar"
   - Layout simples
   - Uso atual: Confirmações genéricas e exclusões (inconsistente)

2. **`DeleteConfirmDialog`** (`app/components/DeleteConfirmDialog.tsx`)
   - Ícone: `AlertTriangle` (vermelho)
   - Botão de confirmação: vermelho (`variant="destructive"`)
   - Texto padrão: "Excluir"
   - Layout moderno com `DialogFooter`
   - Uso atual: Apenas em algumas telas de exclusão (padrão correto)

### Padrão Definido

O **`DeleteConfirmDialog`** deve ser o padrão para TODAS as ações de exclusão no sistema, pois:
- ✅ Usa cores apropriadas para ações destrutivas (vermelho)
- ✅ Tem visual mais moderno e consistente com o design system
- ✅ Melhor estrutura com `DialogFooter`
- ✅ Mais específico e semântico para ações de exclusão

O **`ConfirmDialog`** deve continuar existindo para:
- ✅ Confirmações genéricas (não destrutivas)
- ✅ Ações que não envolvem exclusão

## 🎯 Telas que Precisam de Atualização

### 1. `app/admin/products/page.tsx`
**Status:** ❌ Usa `ConfirmDialog` (incorreto)
**Linha:** 770-778
**Ação necessária:** Substituir por `DeleteConfirmDialog`

**Código atual:**
```tsx
<ConfirmDialog
  open={deleteConfirm !== null}
  onOpenChange={(open) => !open && setDeleteConfirm(null)}
  title="Excluir Produto"
  description="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
  confirmText="Excluir"
  onConfirm={() => deleteConfirm && deleteProduct(deleteConfirm)}
  isLoading={isDeletingProduct}
/>
```

**Código após alteração:**
```tsx
<DeleteConfirmDialog
  open={deleteConfirm !== null}
  onOpenChange={(open) => !open && setDeleteConfirm(null)}
  title="Excluir Produto"
  description="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
  onConfirm={() => deleteConfirm && deleteProduct(deleteConfirm)}
  isLoading={isDeletingProduct}
/>
```

---

### 2. `app/admin/customers/page.tsx`
**Status:** ❌ Usa `ConfirmDialog` para exclusão (incorreto)
**Linha:** 683-691
**Ação necessária:** Substituir por `DeleteConfirmDialog` (apenas exclusão)

**Código atual:**
```tsx
<ConfirmDialog
  open={deleteConfirm !== null}
  onOpenChange={(open) => !open && setDeleteConfirm(null)}
  title="Excluir Cliente"
  description="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
  confirmText="Excluir"
  onConfirm={() => deleteConfirm && deleteCustomer(deleteConfirm)}
  isLoading={isDeletingCustomer}
/>
```

**Código após alteração:**
```tsx
<DeleteConfirmDialog
  open={deleteConfirm !== null}
  onOpenChange={(open) => !open && setDeleteConfirm(null)}
  title="Excluir Cliente"
  description="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
  onConfirm={() => deleteConfirm && deleteCustomer(deleteConfirm)}
  isLoading={isDeletingCustomer}
/>
```

**⚠️ IMPORTANTE:** O `ConfirmDialog` genérico (linhas 693-704) NÃO deve ser alterado, pois é usado para confirmações genéricas.

---

### 3. `app/admin/expenses/page.tsx`
**Status:** ❌ Usa `ConfirmDialog` para exclusão (incorreto)
**Linha:** 240-247
**Ação necessária:** Substituir por `DeleteConfirmDialog`

**Código atual:**
```tsx
<ConfirmDialog
  open={!!ex.deletingExpense}
  onOpenChange={(open) => !open && ex.setDeletingExpense(undefined)}
  onConfirm={ex.handleDeleteExpense}
  title="Remover Despesa"
  description={`Tem certeza que deseja remover a despesa "${ex.deletingExpense?.description}"? Esta ação não pode ser desfeita.`}
  isLoading={ex.isDeletingExpense}
/>
```

**Código após alteração:**
```tsx
<DeleteConfirmDialog
  open={!!ex.deletingExpense}
  onOpenChange={(open) => !open && ex.setDeletingExpense(undefined)}
  onConfirm={ex.handleDeleteExpense}
  title="Remover Despesa"
  description={`Tem certeza que deseja remover a despesa "${ex.deletingExpense?.description}"? Esta ação não pode ser desfeita.`}
  isLoading={ex.isDeletingExpense}
/>
```

---

### 4. `app/admin/users/page.tsx`
**Status:** ❌ Usa `ConfirmDialog` para exclusão (incorreto)
**Linha:** 575-592
**Ação necessária:** Substituir por `DeleteConfirmDialog`

**Código atual:**
```tsx
<ConfirmDialog
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
  confirmText="Excluir"
  isLoading={isDeletingUser}
/>
```

**Código após alteração:**
```tsx
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
```

## ✅ Telas que Já Usam o Padrão Correto

As seguintes telas já usam `DeleteConfirmDialog` e NÃO precisam de alteração:

1. ✅ `app/admin/orders/page.tsx` - Já usa `DeleteConfirmDialog`
2. ✅ `app/admin/customers/[id]/page.tsx` - Já usa `DeleteConfirmDialog` (padrão de referência)
3. ✅ `app/admin/components/FacialCaptureModal.tsx` - Já usa `DeleteConfirmDialog`
4. ✅ `app/admin/pre-orders/page.tsx` - Já usa `DeleteConfirmDialog`

## 🔧 Checklist de Implementação

### Para cada arquivo que precisa ser alterado:

1. **Atualizar a importação:**
   - Remover: `import { ConfirmDialog } from "../../components/ConfirmDialog";`
   - Adicionar: `import { DeleteConfirmDialog } from "../../components/DeleteConfirmDialog";`

2. **Substituir o componente:**
   - Trocar `<ConfirmDialog>` por `<DeleteConfirmDialog>`
   - Remover a prop `confirmText` (já é "Excluir" por padrão)
   - Manter todas as outras props

3. **Testar a funcionalidade:**
   - Verificar se o modal abre corretamente
   - Confirmar que a exclusão funciona
   - Validar o estado de loading
   - Testar o cancelamento

## 📊 Comparação Visual

### ConfirmDialog (Antigo - Não usar para exclusão)
```
┌─────────────────────────────┐
│      ⚠️ (amarelo)           │
│   Confirmar Exclusão        │
│                             │
│  Tem certeza que deseja    │
│  excluir este item?         │
│                             │
│  [Cancelar]  [Confirmar]    │ ← Azul
└─────────────────────────────┘
```

### DeleteConfirmDialog (Novo - Padrão correto)
```
┌─────────────────────────────┐
│  ⚠️ (vermelho)  Excluir     │
│                             │
│  Tem certeza que deseja    │
│  excluir este item?         │
│                             │
│              [Cancelar] [Excluir] ← Vermelho
└─────────────────────────────┘
```

## 🎨 Benefícios da Padronização

1. **Consistência Visual:** Todos os modais de exclusão terão a mesma aparência
2. **UX Melhorada:** Cores apropriadas (vermelho) indicam ações destrutivas
3. **Semântica:** `DeleteConfirmDialog` é mais específico e claro
4. **Manutenibilidade:** Código mais organizado e fácil de manter
5. **Design System:** Alinhado com as melhores práticas de UI/UX

## ⚠️ Observações Importantes

1. **NÃO remover** o `ConfirmDialog` - ele ainda é necessário para confirmações genéricas
2. **NÃO alterar** o `ConfirmDialog` genérico em `app/admin/customers/page.tsx` (linhas 693-704)
3. **Apenas substituir** os diálogos de EXCLUSÃO por `DeleteConfirmDialog`
4. **Testar** cada tela após a alteração para garantir funcionamento correto

## 📝 Próximos Passos

1. Atualizar `app/admin/products/page.tsx`
2. Atualizar `app/admin/customers/page.tsx` (apenas exclusão)
3. Atualizar `app/admin/expenses/page.tsx`
4. Atualizar `app/admin/users/page.tsx`
5. Testar todas as alterações
6. Documentar as mudanças no changelog (se houver)

---

**Data:** 20 de março de 2026  
**Responsável:** Equipe de Desenvolvimento  
**Status:** ✅ Análise concluída, aguardando implementação
