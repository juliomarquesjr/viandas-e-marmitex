# Plano de Melhoria - Modal de Usuários

## 📋 Visão Geral

Este documento detalha o plano para modernizar o modal de cadastro/edição de usuários ([`UserFormDialog`](app/components/UserFormDialog.tsx:1)), seguindo os padrões visuais já adotados nos modais de despesas ([`ExpenseFormDialog`](app/admin/expenses/components/ExpenseFormDialog.tsx:1)) e clientes ([`CustomerFormDialog`](app/components/CustomerFormDialog.tsx:1)).

## 🎯 Objetivos

1. Padronizar a experiência visual com os demais modais do sistema
2. Melhorar a usabilidade e a disposição dos campos do formulário
3. Implementar validações visuais e estados de carregamento
4. Garantir responsividade adequada

## 📊 Análise Comparativa

### Estado Atual (UserFormDialog)

| Aspecto | Implementação Atual | Problema |
|---------|---------------------|----------|
| Estrutura do Modal | Layout customizado com motion.div | Não usa componentes Dialog do shadcn/ui |
| Header | Gradiente laranja customizado | Não segue as variáveis CSS do sistema |
| Seções | Apenas uma seção "Informações Pessoais" | Falta organização lógica dos campos |
| Labels | Labels simples sem estilo padronizado | Não usa o estilo `text-xs font-medium text-slate-500 uppercase tracking-wide` |
| Ícones | Ícones inconsistentes (alguns com, outros sem) | Falta padronização |
| Selects | Selects nativos HTML | Não usa componentes Select do shadcn/ui |
| Grid Layout | Grid 2 colunas fixo | Não otimizado para diferentes tamanhos de tela |
| Footer | Customizado sem DialogFooter | Não segue o padrão do sistema |
| Validação | Sem feedback visual de erros | Falta indicadores visuais |
| Status | Select nativo | Poderia usar toggle switch como no modal de clientes |

### Padrões do Sistema (Despesas e Clientes)

| Aspecto | Padrão Adotado |
|---------|---------------|
| Estrutura do Modal | Componentes Dialog do shadcn/ui |
| Header | DialogHeader, DialogTitle, DialogDescription com variáveis CSS |
| Ícone do Header | Container (h-10 w-10) com `--modal-header-icon-bg` e `--modal-header-icon-ring` |
| Seções | Componente SectionDivider com label e linha horizontal |
| Labels | `text-xs font-medium text-slate-500 uppercase tracking-wide` |
| Ícones nos Inputs | Absolute positioning (left-3) com padding pl-9 |
| Selects | Componentes Select do shadcn/ui |
| Grid Layout | Responsivo: `grid-cols-1 sm:grid-cols-2` ou `grid-cols-1 sm:grid-cols-3` |
| Footer | DialogFooter com texto informativo e botões alinhados |
| Validação | Bordas vermelhas e ring para campos com erro |
| Status Toggle | Toggle switch elegante com animação |

## 🎨 Padrões Visuais Identificados

### Variáveis CSS do Sistema

```css
/* Modal header */
--modal-header-bg: #e8efff;
--modal-header-text: #1e293b;
--modal-header-description: #64748b;
--modal-header-icon-bg: rgba(37, 99, 235, 0.10);
--modal-header-icon-ring: rgba(37, 99, 235, 0.18);
--modal-header-close: #94a3b8;
--modal-header-close-hover: rgba(37, 99, 235, 0.08);
```

### Componentes Utilizados

- **Dialog**: [`Dialog`](app/components/ui/dialog.tsx:8), [`DialogContent`](app/components/ui/dialog.tsx:28), [`DialogHeader`](app/components/ui/dialog.tsx:65), [`DialogTitle`](app/components/ui/dialog.tsx:74), [`DialogDescription`](app/components/ui/dialog.tsx:87), [`DialogFooter`](app/components/ui/dialog.tsx:100)
- **Label**: [`Label`](app/components/ui/label.tsx:12)
- **Select**: [`Select`](app/components/ui/select.tsx:9), [`SelectTrigger`](app/components/ui/select.tsx:15), [`SelectContent`](app/components/ui/select.tsx:70), [`SelectItem`](app/components/ui/select.tsx:114)

### Classes de Estilo

```css
/* Labels */
text-xs font-medium text-slate-500 uppercase tracking-wide

/* Inputs com ícone */
relative pl-9

/* Ícones */
absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400

/* Foco */
focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15

/* Erro */
border-red-400 ring-2 ring-red-400/15

/* Grid responsivo */
grid grid-cols-1 sm:grid-cols-2 gap-4
```

## 📝 Plano de Implementação

### 1. Reestruturação do Modal

**Ações:**
- Substituir o layout customizado por componentes Dialog do shadcn/ui
- Remover motion.div e usar as animações nativas do Dialog
- Ajustar o tamanho máximo do modal para `sm:max-w-xl` (padrão dos outros modais)

**Componentes a importar:**
```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
```

### 2. Atualização do Header

**Ações:**
- Usar DialogHeader, DialogTitle e DialogDescription
- Adicionar ícone no container com as variáveis CSS corretas
- Remover o gradiente laranja e usar as variáveis do sistema

**Estrutura esperada:**
```tsx
<DialogHeader>
  <DialogTitle>
    <div
      className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
      style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
    >
      <UserPlus className="h-5 w-5 text-primary" />
    </div>
    {user ? "Editar Usuário" : "Novo Usuário"}
  </DialogTitle>
  <DialogDescription>
    {user
      ? "Atualize as informações do usuário abaixo"
      : "Preencha os dados para cadastrar um novo usuário"}
  </DialogDescription>
</DialogHeader>
```

### 3. Organização em Seções Lógicas

**Seções propostas:**

#### Seção 1: Informações Pessoais
- Nome Completo (obrigatório)
- Email (obrigatório)
- Telefone (opcional)

#### Seção 2: Perfil & Acesso
- Perfil (obrigatório) - Select
- Status - Toggle switch
- Senha (obrigatório na criação, opcional na edição)

**Componente SectionDivider:**
```tsx
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}
```

### 4. Melhoria dos Inputs

**Ações:**
- Adicionar ícones em todos os inputs
- Usar Label com o estilo padronizado
- Ajustar padding para acomodar ícones (pl-9)
- Adicionar classes de foco consistentes
- Implementar validação visual

**Padrão de input com ícone:**
```tsx
<div className="space-y-1.5">
  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
    Nome Completo <span className="text-red-400">*</span>
  </Label>
  <div className="relative">
    <Input
      placeholder="Nome completo do usuário"
      value={formData.name}
      onChange={(e) => updateFormData("name", e.target.value)}
      className="pl-9"
      required
    />
    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
  </div>
</div>
```

### 5. Substituição dos Selects

**Ações:**
- Substituir selects nativos por componentes Select do shadcn/ui
- Adicionar ícones nos selects
- Manter a mesma funcionalidade

**Padrão de select:**
```tsx
<div className="space-y-1.5">
  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
    Perfil <span className="text-red-400">*</span>
  </Label>
  <div className="relative">
    <Select
      value={formData.role}
      onValueChange={(v) => updateFormData("role", v as UserFormData["role"])}
    >
      <SelectTrigger className="pl-9">
        <SelectValue placeholder="Selecione o perfil" />
      </SelectTrigger>
      <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
        <SelectItem value="pdv">PDV</SelectItem>
        <SelectItem value="admin">Administrador</SelectItem>
      </SelectContent>
    </Select>
    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
  </div>
</div>
```

### 6. Implementação do Toggle Switch para Status

**Ações:**
- Substituir o select de status por um toggle switch elegante
- Seguir o padrão do modal de clientes

**Estrutura do toggle:**
```tsx
<div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
  <div className="flex items-center gap-3">
    <div
      className="h-9 w-9 rounded-lg flex items-center justify-center"
      style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
    >
      <Check className="h-4 w-4 text-primary" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-700">Status do Usuário</p>
      <p className="text-xs text-slate-400">Ative ou desative o acesso do usuário</p>
    </div>
  </div>
  <button
    type="button"
    onClick={() => updateFormData("status", formData.status === "active" ? "inactive" : "active")}
    className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
      formData.status === "active" ? "bg-primary" : "bg-slate-200"
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
        formData.status === "active" ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
</div>
```

### 7. Otimização do Grid Layout

**Ações:**
- Melhorar a disposição dos campos em grid responsivo
- Nome e Email ocuparem largura total em mobile, metade em desktop
- Telefone em coluna menor

**Estrutura do grid:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {/* Nome — 2/3 da largura */}
  <div className="space-y-1.5 sm:col-span-2">
    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
      Nome Completo <span className="text-red-400">*</span>
    </Label>
    <div className="relative">
      <Input placeholder="Nome completo do usuário" className="pl-9" required />
      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
    </div>
  </div>

  {/* Email — 2/3 da largura */}
  <div className="space-y-1.5 sm:col-span-2">
    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
      Email <span className="text-red-400">*</span>
    </Label>
    <div className="relative">
      <Input type="email" placeholder="usuario@exemplo.com" className="pl-9" required />
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
    </div>
  </div>

  {/* Telefone — 1/3 da largura */}
  <div className="space-y-1.5 sm:col-span-1">
    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
      Telefone
    </Label>
    <div className="relative">
      <Input placeholder="(11) 99999-9999" className="pl-9" />
      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
    </div>
  </div>
</div>
```

### 8. Atualização do Footer

**Ações:**
- Usar DialogFooter
- Adicionar texto informativo sobre campos obrigatórios
- Melhorar estilo dos botões

**Estrutura do footer:**
```tsx
<DialogFooter>
  <p className="text-xs text-slate-400">
    <span className="text-red-400">*</span> campos obrigatórios
  </p>
  <div className="flex items-center gap-2">
    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
      Cancelar
    </Button>
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {user ? "Atualizando..." : "Cadastrando..."}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          {user ? "Atualizar" : "Cadastrar Usuário"}
        </>
      )}
    </Button>
  </div>
</DialogFooter>
```

### 9. Implementação de Validação Visual

**Ações:**
- Adicionar estados de erro visuais
- Implementar validação de campos obrigatórios
- Mostrar mensagens de erro abaixo dos campos

**Sistema de validação:**
```tsx
type FormErrors = Partial<Record<keyof UserFormData, string>>;
type FormTouched = Partial<Record<keyof UserFormData, boolean>>;

const [errors, setErrors] = useState<FormErrors>({});
const [touched, setTouched] = useState<FormTouched>({});

const validateField = (field: keyof FormErrors, value: any): string | undefined => {
  switch (field) {
    case "name": return !value?.trim() ? "Obrigatório" : undefined;
    case "email": return !value?.trim() ? "Obrigatório" : undefined;
    case "role": return !value ? "Obrigatório" : undefined;
    case "password": return !user && !value?.trim() ? "Obrigatório" : undefined;
    default: return undefined;
  }
};

const handleBlur = (field: keyof FormErrors) => {
  setTouched((t) => ({ ...t, [field]: true }));
  setErrors((e) => ({ ...e, [field]: validateField(field, formData[field]) }));
};

const err = (field: keyof FormErrors) =>
  touched[field] && errors[field] ? "border-red-400 focus:ring-red-400/20" : "";
```

### 10. Implementação de Estados de Carregamento

**Ações:**
- Adicionar estado de loading no formulário
- Desabilitar botões durante o envio
- Mostrar indicador visual de carregamento

**Estado de loading:**
```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateForm()) {
    showToast("Por favor, preencha todos os campos obrigatórios", "error");
    return;
  }
  setIsSubmitting(true);
  try {
    await onSubmit(e, formData);
  } finally {
    setIsSubmitting(false);
  }
};
```

## 📐 Estrutura Final do Modal

```tsx
<Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
  <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
    <DialogHeader>
      <DialogTitle>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
             style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}>
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        {user ? "Editar Usuário" : "Novo Usuário"}
      </DialogTitle>
      <DialogDescription>
        {user ? "Atualize as informações do usuário abaixo" : "Preencha os dados para cadastrar um novo usuário"}
      </DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        
        {/* Seção 1: Informações Pessoais */}
        <SectionDivider label="Informações Pessoais" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nome, Email, Telefone */}
        </div>

        {/* Seção 2: Perfil & Acesso */}
        <SectionDivider label="Perfil & Acesso" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Perfil (Select) */}
          {/* Senha */}
        </div>
        
        {/* Status Toggle */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
          {/* Toggle switch */}
        </div>
      </div>

      <DialogFooter>
        <p className="text-xs text-slate-400">
          <span className="text-red-400">*</span> campos obrigatórios
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {user ? "Atualizando..." : "Cadastrando..."}
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                {user ? "Atualizar" : "Cadastrar Usuário"}
              </>
            )}
          </Button>
        </div>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

## 🎯 Benefícios Esperados

1. **Consistência Visual**: O modal de usuários seguirá os mesmos padrões visuais dos demais modais do sistema
2. **Melhor Usabilidade**: Organização lógica dos campos em seções facilita o preenchimento
3. **Feedback Visual**: Validações visuais e estados de carregamento melhoram a experiência do usuário
4. **Responsividade**: Grid responsivo garante boa experiência em diferentes tamanhos de tela
5. **Acessibilidade**: Uso de componentes do shadcn/ui garante melhor acessibilidade
6. **Manutenibilidade**: Código mais limpo e seguindo padrões estabelecidos

## 📦 Checklist de Implementação

- [ ] Substituir estrutura do modal por componentes Dialog
- [ ] Atualizar header com ícone e variáveis CSS
- [ ] Criar componente SectionDivider
- [ ] Organizar campos em seções lógicas
- [ ] Adicionar ícones em todos os inputs
- [ ] Atualizar labels para o estilo padronizado
- [ ] Substituir selects nativos por componentes Select
- [ ] Implementar toggle switch para status
- [ ] Otimizar grid layout responsivo
- [ ] Atualizar footer com DialogFooter
- [ ] Implementar validação visual
- [ ] Adicionar estados de carregamento
- [ ] Testar responsividade
- [ ] Testar acessibilidade
