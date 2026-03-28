# Plano de Implementação — Sistema Kanban (Estilo Trello)

> Data: 2026-03-28
> Status: Planejamento

---

## Visão Geral

Sistema Kanban multiusuário completo integrado ao `/admin/kanban/`, com experiência visual única (glassmorphism, animações Framer Motion, backgrounds personalizáveis), drag & drop nativo, editor de texto rico (TipTap), menções a Users/Clientes/Produtos, datas de entrega com urgência visual, checklists, comentários e notificações.

---

## 1. Novos Modelos Prisma

```prisma
model KanbanBoard {
  id          String   @id @default(uuid())
  ownerId     String
  title       String
  description String?
  background  Json     @default("{\"type\":\"gradient\",\"value\":\"linear-gradient(135deg, #1e293b 0%, #334155 100%)\"}")
  isArchived  Boolean  @default(false)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner         User                @relation("OwnedBoards",    fields: [ownerId], references: [id])
  columns       KanbanColumn[]
  members       KanbanBoardMember[]
  labels        KanbanLabel[]
  notifications KanbanNotification[]

  @@index([ownerId])
}

model KanbanBoardMember {
  id        String   @id @default(uuid())
  boardId   String
  userId    String
  role      String   @default("member") // "owner" | "member" | "viewer"
  createdAt DateTime @default(now())

  board KanbanBoard @relation(fields: [boardId], references: [id], onDelete: Cascade)
  user  User        @relation("BoardMemberships", fields: [userId],  references: [id], onDelete: Cascade)

  @@unique([boardId, userId])
  @@index([boardId])
  @@index([userId])
}

model KanbanColumn {
  id         String   @id @default(uuid())
  boardId    String
  title      String
  sortOrder  Int      @default(0)
  color      String?
  isArchived Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  board KanbanBoard  @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cards KanbanCard[]

  @@index([boardId])
}

model KanbanCard {
  id            String    @id @default(uuid())
  columnId      String
  title         String
  description   String?   // plain-text preview extraído do TipTap JSON
  content       Json?     // TipTap JSON document completo
  sortOrder     Int       @default(0)
  priority      String    @default("none") // "none" | "low" | "medium" | "high" | "urgent"
  dueDate       DateTime?
  coverColor    String?
  coverImageUrl String?
  isArchived    Boolean   @default(false)
  createdById   String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  column      KanbanColumn           @relation(fields: [columnId],    references: [id], onDelete: Cascade)
  createdBy   User                   @relation("CreatedCards",        fields: [createdById], references: [id])
  labels      KanbanCardLabel[]
  assignments KanbanCardAssignment[]
  checklists  KanbanChecklist[]
  comments    KanbanComment[]
  attachments KanbanAttachment[]
  activities  KanbanActivity[]
  mentions    KanbanMention[]

  @@index([columnId])
  @@index([createdById])
  @@index([dueDate])
}

model KanbanLabel {
  id      String @id @default(uuid())
  boardId String
  name    String
  color   String

  board KanbanBoard       @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cards KanbanCardLabel[]

  @@index([boardId])
}

model KanbanCardLabel {
  cardId  String
  labelId String

  card  KanbanCard  @relation(fields: [cardId],  references: [id], onDelete: Cascade)
  label KanbanLabel @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@id([cardId, labelId])
}

model KanbanCardAssignment {
  cardId    String
  userId    String
  createdAt DateTime @default(now())

  card KanbanCard @relation(fields: [cardId],  references: [id], onDelete: Cascade)
  user User       @relation("CardAssignments", fields: [userId], references: [id], onDelete: Cascade)

  @@id([cardId, userId])
  @@index([userId])
}

model KanbanChecklist {
  id        String              @id @default(uuid())
  cardId    String
  title     String
  sortOrder Int                 @default(0)
  createdAt DateTime            @default(now())

  card  KanbanCard            @relation(fields: [cardId], references: [id], onDelete: Cascade)
  items KanbanChecklistItem[]

  @@index([cardId])
}

model KanbanChecklistItem {
  id          String          @id @default(uuid())
  checklistId String
  text        String
  isChecked   Boolean         @default(false)
  sortOrder   Int             @default(0)
  dueDate     DateTime?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  checklist KanbanChecklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)

  @@index([checklistId])
}

model KanbanComment {
  id        String     @id @default(uuid())
  cardId    String
  authorId  String
  content   Json       // TipTap JSON (suporta @mentions inline)
  isEdited  Boolean    @default(false)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  card   KanbanCard @relation(fields: [cardId],    references: [id], onDelete: Cascade)
  author User       @relation("CardComments",      fields: [authorId], references: [id])

  @@index([cardId])
  @@index([authorId])
}

model KanbanAttachment {
  id           String   @id @default(uuid())
  cardId       String
  uploadedById String
  name         String
  url          String
  mimeType     String
  sizeBytes    Int
  createdAt    DateTime @default(now())

  card       KanbanCard @relation(fields: [cardId],       references: [id], onDelete: Cascade)
  uploadedBy User       @relation("CardAttachments",      fields: [uploadedById], references: [id])

  @@index([cardId])
}

model KanbanActivity {
  id        String   @id @default(uuid())
  cardId    String
  userId    String
  // tipos: "card_created" | "card_moved" | "card_renamed" | "comment_added"
  //        | "due_date_set" | "label_added" | "member_assigned"
  //        | "checklist_item_checked" | "attachment_added" | "description_updated"
  type      String
  meta      Json?
  createdAt DateTime @default(now())

  card KanbanCard @relation(fields: [cardId], references: [id], onDelete: Cascade)
  user User       @relation("CardActivities", fields: [userId],  references: [id])

  @@index([cardId])
  @@index([createdAt])
}

model KanbanMention {
  id              String   @id @default(uuid())
  cardId          String
  sourceType      String   // "description" | "comment"
  sourceId        String?  // commentId quando sourceType == "comment"
  mentionType     String   // "user" | "customer" | "product"
  mentionTargetId String
  createdAt       DateTime @default(now())

  card KanbanCard @relation(fields: [cardId], references: [id], onDelete: Cascade)

  @@index([cardId])
  @@index([mentionTargetId])
}

model KanbanNotification {
  id        String   @id @default(uuid())
  boardId   String?
  cardId    String?
  userId    String
  // tipos: "mention" | "due_soon" | "overdue" | "card_assigned" | "comment_reply"
  type      String
  title     String
  body      String
  isRead    Boolean  @default(false)
  meta      Json?
  createdAt DateTime @default(now())

  board KanbanBoard? @relation(fields: [boardId], references: [id], onDelete: SetNull)
  user  User         @relation("KanbanNotifications", fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([createdAt])
}
```

**Adições ao modelo `User` existente:**
```prisma
  ownedBoards         KanbanBoard[]          @relation("OwnedBoards")
  boardMemberships    KanbanBoardMember[]    @relation("BoardMemberships")
  createdCards        KanbanCard[]           @relation("CreatedCards")
  cardAssignments     KanbanCardAssignment[] @relation("CardAssignments")
  cardComments        KanbanComment[]        @relation("CardComments")
  cardAttachments     KanbanAttachment[]     @relation("CardAttachments")
  cardActivities      KanbanActivity[]       @relation("CardActivities")
  kanbanNotifications KanbanNotification[]   @relation("KanbanNotifications")
```

---

## 2. Estrutura de API Routes

```
app/api/kanban/
├── boards/
│   ├── route.ts                          GET (listar) | POST (criar)
│   └── [boardId]/
│       ├── route.ts                      GET (board completo) | PATCH | DELETE
│       ├── members/
│       │   ├── route.ts                  GET | POST (convidar)
│       │   └── [userId]/route.ts         PATCH (role) | DELETE
│       ├── labels/
│       │   ├── route.ts                  GET | POST
│       │   └── [labelId]/route.ts        PATCH | DELETE
│       └── columns/
│           ├── route.ts                  POST (criar coluna)
│           └── reorder/route.ts          PATCH (reordenar)
├── columns/
│   └── [columnId]/
│       ├── route.ts                      PATCH | DELETE
│       └── cards/
│           ├── route.ts                  GET | POST
│           └── reorder/route.ts          PATCH
├── cards/
│   └── [cardId]/
│       ├── route.ts                      GET | PATCH | DELETE
│       ├── move/route.ts                 POST (mover entre colunas)
│       ├── labels/route.ts               POST | DELETE
│       ├── assignments/route.ts          POST | DELETE
│       ├── checklists/
│       │   ├── route.ts                  GET | POST
│       │   └── [checklistId]/
│       │       ├── route.ts              PATCH | DELETE
│       │       └── items/
│       │           ├── route.ts          POST
│       │           └── [itemId]/route.ts PATCH | DELETE
│       ├── comments/
│       │   ├── route.ts                  GET | POST
│       │   └── [commentId]/route.ts      PATCH | DELETE
│       ├── attachments/
│       │   ├── route.ts                  GET | POST
│       │   └── [attachmentId]/route.ts   DELETE
│       └── activities/route.ts           GET (somente leitura)
├── notifications/
│   ├── route.ts                          GET (lista + count não lidas)
│   ├── [notificationId]/route.ts         PATCH (marcar lida)
│   └── read-all/route.ts                 POST
└── mentions/
    └── search/route.ts                   GET ?q=&types=user,customer,product
```

---

## 3. Estrutura de Arquivos — App Router

```
app/admin/kanban/
├── layout.tsx                            ← Full-bleed (sem max-w container)
├── page.tsx                              ← Galeria de boards
├── [boardId]/
│   ├── page.tsx                          ← Board view
│   └── settings/
│       └── page.tsx                      ← Configurações do board
└── _components/
    ├── board-gallery/
    │   ├── BoardGallery.tsx
    │   ├── BoardCard.tsx
    │   ├── CreateBoardDialog.tsx
    │   └── BackgroundPicker.tsx
    ├── board/
    │   ├── BoardView.tsx
    │   ├── BoardHeader.tsx
    │   ├── BoardBackground.tsx
    │   └── BoardFilterBar.tsx
    ├── column/
    │   ├── ColumnList.tsx
    │   ├── Column.tsx
    │   ├── ColumnHeader.tsx
    │   ├── AddColumnButton.tsx
    │   └── ColumnDropzone.tsx
    ├── card/
    │   ├── CardItem.tsx
    │   ├── CardCover.tsx
    │   ├── CardLabels.tsx
    │   ├── CardMeta.tsx
    │   ├── CardDueDate.tsx
    │   ├── CardPriority.tsx
    │   └── DragOverlay.tsx
    ├── card-modal/
    │   ├── CardModal.tsx
    │   ├── CardModalHeader.tsx
    │   ├── CardModalCover.tsx
    │   ├── CardModalDescription.tsx
    │   ├── CardModalLabels.tsx
    │   ├── CardModalAssignees.tsx
    │   ├── CardModalDueDate.tsx
    │   ├── CardModalPriority.tsx
    │   ├── CardModalChecklists.tsx
    │   ├── CardModalComments.tsx
    │   ├── CardModalAttachments.tsx
    │   └── CardModalActivity.tsx
    ├── editor/
    │   ├── RichTextEditor.tsx
    │   ├── EditorToolbar.tsx
    │   ├── MentionList.tsx
    │   └── MentionExtension.ts
    ├── notifications/
    │   ├── NotificationPanel.tsx
    │   ├── NotificationItem.tsx
    │   └── DueDateWatcher.tsx
    ├── settings/
    │   ├── BoardSettingsPage.tsx
    │   ├── MembersSection.tsx
    │   ├── LabelsSection.tsx
    │   └── DangerZone.tsx
    └── shared/
        ├── AvatarGroup.tsx
        ├── ColorPicker.tsx
        ├── PriorityBadge.tsx
        └── useKanbanStore.ts
```

---

## 4. Novos Pacotes NPM

```bash
# Drag & Drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @dnd-kit/modifiers

# Editor rico (TipTap)
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
  @tiptap/extension-mention @tiptap/extension-placeholder \
  @tiptap/extension-underline @tiptap/extension-text-align \
  @tiptap/extension-task-list @tiptap/extension-task-item \
  @tiptap/extension-link @tiptap/extension-image \
  @tiptap/extension-color @tiptap/extension-text-style \
  @tiptap/extension-highlight @tiptap/extension-code-block-lowlight

# Posicionamento do dropdown de mentions
tippy.js

# Syntax highlighting para blocos de código
lowlight

# Novos primitivos Radix
@radix-ui/react-scroll-area
@radix-ui/react-tooltip
@radix-ui/react-tabs
@radix-ui/react-avatar
@radix-ui/react-separator
@radix-ui/react-collapsible

# Color picker leve para labels/covers
react-colorful
```

**Já instalados e reutilizados:** `framer-motion`, `@radix-ui/react-dialog`, `@radix-ui/react-popover`, `@radix-ui/react-dropdown-menu`, `react-day-picker`, `date-fns`, `lucide-react`, `@vercel/blob`, `clsx`, `tailwind-merge`.

---

## 5. Fases de Implementação

### Fase 1 — Fundação (Semana 1)
- [ ] Adicionar modelos Prisma + `npx prisma migrate dev --name add_kanban`
- [ ] Instalar pacotes novos
- [ ] Layout full-bleed `app/admin/kanban/layout.tsx`
- [ ] Adicionar item "Kanban" no sidebar (`ModernSidebar.tsx`)
- [ ] API routes básicas: boards CRUD, columns POST, cards POST
- [ ] `useKanbanStore.ts` com `useReducer` + Context (zero libs externas)

### Fase 2 — Galeria de Boards + Board View (Semana 2)
- [ ] Página galeria (`/admin/kanban`) com grid de `BoardCard`
- [ ] `CreateBoardDialog` + `BackgroundPicker` (12 gradientes preset)
- [ ] Board View com colunas e cards (somente leitura inicialmente)
- [ ] Sistema de backgrounds (gradient / solid / image)
- [ ] Criação inline de colunas e cards

### Fase 3 — Drag & Drop (Semana 3)
- [ ] `DndContext` + `SortableContext` para colunas (horizontal)
- [ ] `SortableContext` para cards dentro de cada coluna (vertical)
- [ ] Drag cross-column com placeholder visual
- [ ] `DragOverlay` (card ghost com rotate + scale)
- [ ] API `move` para persistir mudanças de posição
- [ ] Acessibilidade: `KeyboardSensor`

### Fase 4 — Card Modal + Editor Rico (Semanas 3–4)
- [ ] `CardModal` (Radix Dialog, slide-over full-width)
- [ ] TipTap com todas as extensões configuradas
- [ ] Extensão `@mention` conectada à `/api/kanban/mentions/search`
- [ ] `MentionList` com ícones por tipo (user/customer/product)
- [ ] Panels da sidebar do modal (labels, assignees, due date, prioridade, cover)
- [ ] Checklists com barra de progresso
- [ ] Comentários com TipTap inline + @mentions
- [ ] Log de atividades

### Fase 5 — Menções, Notificações & Urgência de Data (Semana 4)
- [ ] Processamento server-side de menções ao salvar card/comentário
- [ ] Criação automática de `KanbanNotification` para usuários mencionados
- [ ] Lógica de urgência de data em `CardDueDate.tsx` (overdue/hoje/em breve)
- [ ] `NotificationPanel` no header (bell icon + badge)
- [ ] `DueDateWatcher` com polling a cada 2 minutos

### Fase 6 — Compartilhamento & Configurações (Semana 5)
- [ ] Settings page com tabs (Membros, Labels, Background, Danger Zone)
- [ ] Busca e convite de usuários por nome/email
- [ ] CRUD de labels com `react-colorful`
- [ ] Controle de acesso: apenas owner pode gerenciar configurações

### Fase 7 — Polimento & UX de Excelência (Semanas 5–6)
- [ ] Glassmorphism completo nos cards e colunas
- [ ] Animações Framer Motion em todos os estados
- [ ] Skeleton loading para fetch inicial
- [ ] Empty states ilustrados
- [ ] Atalhos de teclado (`N` = novo card, `B` = background, `Esc` = fechar modal)
- [ ] Responsivo mobile (horizontal scroll + bottom-sheet no modal)

---

## 6. Design System do Kanban

### Backgrounds Preset (Gradientes)
```ts
const GRADIENT_PRESETS = [
  { id: "midnight",  value: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" },
  { id: "aurora",    value: "linear-gradient(135deg, #2af598 0%, #009efd 100%)"  },
  { id: "velvet",    value: "linear-gradient(135deg, #2c0064 0%, #8b2fc9 100%)"  },
  { id: "ocean",     value: "linear-gradient(160deg, #0093E9 0%, #80D0C7 100%)"  },
  { id: "ember",     value: "linear-gradient(135deg, #f5af19 0%, #f12711 100%)"  },
  { id: "forest",    value: "linear-gradient(135deg, #1a4a1a 0%, #4caf50 100%)"  },
  { id: "dusk",      value: "linear-gradient(135deg, #2c3e50, #fd746c)"           },
  { id: "slate-pro", value: "linear-gradient(135deg, #1e293b 0%, #334155 100%)"  },
  { id: "indigo",    value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"  },
  { id: "rose",      value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"  },
  { id: "gold",      value: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)"  },
  { id: "arctic",    value: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)"  },
];
```

### Glassmorphism — Spec CSS
```css
/* Cards sobre backgrounds escuros */
.kanban-card {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.20);
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15);
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.kanban-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.20);
}
.kanban-column {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
}
```

### Urgência de Data
| Estado    | Background | Texto     | Label      |
|-----------|-----------|-----------|------------|
| Atrasado  | #fef2f2   | #dc2626   | "Atrasado" |
| Hoje      | #fef3c7   | #d97706   | "Hoje"     |
| Em breve  | #fffbeb   | #b45309   | "{n}d"     |
| Normal    | glass     | white/70  | data       |

### Prioridades
| Nível   | Cor     | Ícone          |
|---------|---------|----------------|
| Urgente | #dc2626 | AlertOctagon   |
| Alta    | #ea580c | ArrowUp        |
| Média   | #ca8a04 | Minus          |
| Baixa   | #65a30d | ArrowDown      |
| Nenhuma | #94a3b8 | —              |

### Animações Framer Motion
```ts
// Card enter/exit
cardVariants = {
  initial: { opacity: 0, y: -8, scale: 0.97 },
  animate: { opacity: 1, y: 0,  scale: 1,   transition: { type: "spring", stiffness: 400, damping: 30 } },
  exit:    { opacity: 0, y: 8,  scale: 0.96, transition: { duration: 0.15 } },
}
// Modal slide-in
modalVariants = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 35 } },
  exit:    { x: "100%", opacity: 0, transition: { duration: 0.25, ease: "easeIn" } },
}
// DragOverlay ghost
overlayVariants = {
  animate: { rotate: 2, scale: 1.04, transition: { type: "spring", stiffness: 500, damping: 20 } },
}
```

---

## 7. Decisões Técnicas Chave

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Estado global | `useReducer` + Context | Sem libs novas; consistente com o resto do projeto |
| Fetch inicial do board | Server Component → Client | Elimina flash de loading no primeiro render |
| Armazenamento do editor | Prisma `Json` (JSONB) | TipTap `getJSON()` já é um objeto; zero serialização extra |
| Ordenação de cards | `sortOrder` Int com gaps de 1000 | Reordenar 1 item = 1 UPDATE; sem cascata |
| Real-time | Polling a cada 30s (visibilitychange) | Sem infra WebSocket para MVP; evolutivo |
| Uploads de anexos | Re-usa `/api/upload` existente | Evita duplicar pipeline Sharp + Vercel Blob |
| Mentions storage | Tabela flat `KanbanMention` | PostgreSQL não suporta FK polimórfica |

---

## 8. Arquivos Existentes a Modificar

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.prisma` | Adicionar 12 modelos + relações no User |
| `app/admin/components/layout/ModernSidebar.tsx` | Item "Kanban" no nav (ícone `KanbanSquare`) |
| `app/admin/components/layout/PageHeader.tsx` | Adicionar `kanban` ao `routeLabels` |
| `middleware.ts` | Carve-out para role `pdv` acessar `/admin/kanban` |
