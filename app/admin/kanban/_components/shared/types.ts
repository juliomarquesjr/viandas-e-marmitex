// ─── Kanban Types ─────────────────────────────────────────────────────────────

export type BoardBackground =
  | { type: "gradient"; value: string }
  | { type: "solid"; value: string }
  | { type: "image"; value: string };

export type Priority = "none" | "low" | "medium" | "high" | "urgent";
export type BoardMemberRole = "owner" | "member" | "viewer";

export interface KanbanUser {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  role: string;
}

export interface KanbanLabel {
  id: string;
  boardId: string;
  name: string;
  color: string;
}

export interface KanbanChecklistItem {
  id: string;
  checklistId: string;
  text: string;
  isChecked: boolean;
  sortOrder: number;
  dueDate: string | null;
}

export interface KanbanChecklist {
  id: string;
  cardId: string;
  title: string;
  sortOrder: number;
  items: KanbanChecklistItem[];
}

export interface KanbanComment {
  id: string;
  cardId: string;
  authorId: string;
  author: KanbanUser;
  content: object; // TipTap JSON
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanAttachment {
  id: string;
  cardId: string;
  uploadedById: string;
  uploadedBy: KanbanUser;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface KanbanActivity {
  id: string;
  cardId: string;
  userId: string;
  user: KanbanUser;
  type: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface KanbanCardLabelRef {
  cardId: string;
  labelId: string;
  label: KanbanLabel;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  content: object | null; // TipTap JSON
  sortOrder: number;
  priority: Priority;
  dueDate: string | null;
  coverColor: string | null;
  coverImageUrl: string | null;
  isArchived: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  labels: KanbanCardLabelRef[];
  assignments: { userId: string; user: KanbanUser }[];
  checklists: KanbanChecklist[];
  comments: KanbanComment[];
  attachments: KanbanAttachment[];
  activities: KanbanActivity[];
}

export interface KanbanColumn {
  id: string;
  boardId: string;
  title: string;
  sortOrder: number;
  color: string | null;
  isArchived: boolean;
  cards: KanbanCard[];
}

export interface KanbanBoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: BoardMemberRole;
  user: KanbanUser;
}

export interface KanbanBoard {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  background: BoardBackground;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  owner: KanbanUser;
  columns: KanbanColumn[];
  members: KanbanBoardMember[];
  labels: KanbanLabel[];
}

export interface KanbanNotification {
  id: string;
  boardId: string | null;
  cardId: string | null;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

// Search result for @mention dropdown
export interface MentionResult {
  id: string;
  label: string;
  type: "user" | "customer" | "product";
  imageUrl?: string | null;
  subtitle?: string;
}

// Background presets
export const GRADIENT_PRESETS: { id: string; label: string; value: string }[] = [
  { id: "midnight", label: "Meia-noite", value: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" },
  { id: "aurora",   label: "Aurora",    value: "linear-gradient(135deg, #2af598 0%, #009efd 100%)"  },
  { id: "velvet",   label: "Veludo",    value: "linear-gradient(135deg, #2c0064 0%, #8b2fc9 100%)"  },
  { id: "ocean",    label: "Oceano",    value: "linear-gradient(160deg, #0093E9 0%, #80D0C7 100%)"  },
  { id: "ember",    label: "Brasa",     value: "linear-gradient(135deg, #f5af19 0%, #f12711 100%)"  },
  { id: "forest",   label: "Floresta",  value: "linear-gradient(135deg, #1a4a1a 0%, #4caf50 100%)"  },
  { id: "dusk",     label: "Crepúsculo",value: "linear-gradient(135deg, #2c3e50, #fd746c)"           },
  { id: "slate",    label: "Ardósia",   value: "linear-gradient(135deg, #1e293b 0%, #334155 100%)"  },
  { id: "indigo",   label: "Índigo",    value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"  },
  { id: "rose",     label: "Rosa",      value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"  },
  { id: "gold",     label: "Ouro",      value: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)"  },
  { id: "arctic",   label: "Ártico",    value: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)"  },
];

export const SOLID_PRESETS: { id: string; label: string; value: string }[] = [
  { id: "blue",   label: "Azul",    value: "#2563eb" },
  { id: "violet", label: "Violeta", value: "#7c3aed" },
  { id: "emerald",label: "Esmeralda",value: "#059669"},
  { id: "rose",   label: "Rosa",    value: "#e11d48" },
  { id: "amber",  label: "Âmbar",   value: "#d97706" },
  { id: "slate",  label: "Ardósia", value: "#475569" },
];

export const PRIORITY_CONFIG: Record<Priority, { color: string; label: string; icon: string }> = {
  urgent: { color: "#dc2626", label: "Urgente",         icon: "AlertOctagon" },
  high:   { color: "#ea580c", label: "Alta",            icon: "ArrowUp"      },
  medium: { color: "#ca8a04", label: "Média",           icon: "Minus"        },
  low:    { color: "#65a30d", label: "Baixa",           icon: "ArrowDown"    },
  none:   { color: "#94a3b8", label: "Sem prioridade",  icon: ""             },
};

export const LABEL_COLORS: { id: string; hex: string; name: string }[] = [
  { id: "green",  hex: "#61bd4f", name: "Verde"    },
  { id: "yellow", hex: "#f2d600", name: "Amarelo"  },
  { id: "orange", hex: "#ff9f1a", name: "Laranja"  },
  { id: "red",    hex: "#eb5a46", name: "Vermelho" },
  { id: "purple", hex: "#c377e0", name: "Roxo"     },
  { id: "blue",   hex: "#0079bf", name: "Azul"     },
  { id: "sky",    hex: "#00c2e0", name: "Ciano"    },
  { id: "lime",   hex: "#51e898", name: "Lima"     },
  { id: "pink",   hex: "#ff78cb", name: "Rosa"     },
  { id: "dark",   hex: "#344563", name: "Escuro"   },
];
