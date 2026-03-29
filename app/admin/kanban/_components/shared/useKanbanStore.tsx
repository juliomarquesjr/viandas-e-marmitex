"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { KanbanBoard, KanbanCard, KanbanColumn, KanbanNotification } from "./types";

// ─── State ────────────────────────────────────────────────────────────────────

interface KanbanState {
  boards: KanbanBoard[];
  activeBoard: KanbanBoard | null;
  activeCardId: string | null;
  notifications: KanbanNotification[];
  unreadCount: number;
  isLoading: boolean;
}

const initialState: KanbanState = {
  boards: [],
  activeBoard: null,
  activeCardId: null,
  notifications: [],
  unreadCount: 0,
  isLoading: false,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type KanbanAction =
  | { type: "SET_BOARDS"; boards: KanbanBoard[] }
  | { type: "SET_ACTIVE_BOARD"; board: KanbanBoard | null }
  | { type: "ADD_BOARD"; board: KanbanBoard }
  | { type: "UPDATE_BOARD"; boardId: string; patch: Partial<KanbanBoard> }
  | { type: "REMOVE_BOARD"; boardId: string }
  | { type: "ADD_COLUMN"; column: KanbanColumn }
  | { type: "UPDATE_COLUMN"; columnId: string; patch: Partial<KanbanColumn> }
  | { type: "REMOVE_COLUMN"; columnId: string }
  | { type: "REORDER_COLUMNS"; columns: KanbanColumn[] }
  | { type: "ADD_CARD"; card: KanbanCard }
  | { type: "UPDATE_CARD"; cardId: string; patch: Partial<KanbanCard> }
  | { type: "REMOVE_CARD"; cardId: string }
  | { type: "MOVE_CARD"; cardId: string; fromColumnId: string; toColumnId: string; newOrder: KanbanCard[] }
  | { type: "REORDER_CARDS"; columnId: string; cards: KanbanCard[] }
  | { type: "SET_ACTIVE_CARD"; cardId: string | null }
  | { type: "SET_NOTIFICATIONS"; notifications: KanbanNotification[]; unreadCount: number }
  | { type: "MARK_NOTIFICATION_READ"; notificationId: string }
  | { type: "MARK_ALL_READ" }
  | { type: "SET_LOADING"; isLoading: boolean }
  | { type: "ROLLBACK"; snapshot: KanbanState };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function kanbanReducer(state: KanbanState, action: KanbanAction): KanbanState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.isLoading };

    case "SET_BOARDS":
      return { ...state, boards: action.boards };

    case "SET_ACTIVE_BOARD":
      return { ...state, activeBoard: action.board };

    case "ADD_BOARD":
      return { ...state, boards: [action.board, ...state.boards] };

    case "UPDATE_BOARD": {
      const boards = state.boards.map((b) =>
        b.id === action.boardId ? { ...b, ...action.patch } : b
      );
      const activeBoard =
        state.activeBoard?.id === action.boardId
          ? { ...state.activeBoard, ...action.patch }
          : state.activeBoard;
      return { ...state, boards, activeBoard };
    }

    case "REMOVE_BOARD":
      return {
        ...state,
        boards: state.boards.filter((b) => b.id !== action.boardId),
        activeBoard: state.activeBoard?.id === action.boardId ? null : state.activeBoard,
      };

    case "ADD_COLUMN": {
      if (!state.activeBoard) return state;
      const activeBoard = {
        ...state.activeBoard,
        columns: [...state.activeBoard.columns, action.column],
      };
      return { ...state, activeBoard };
    }

    case "UPDATE_COLUMN": {
      if (!state.activeBoard) return state;
      const columns = state.activeBoard.columns.map((c) =>
        c.id === action.columnId ? { ...c, ...action.patch } : c
      );
      return { ...state, activeBoard: { ...state.activeBoard, columns } };
    }

    case "REMOVE_COLUMN": {
      if (!state.activeBoard) return state;
      const columns = state.activeBoard.columns.filter((c) => c.id !== action.columnId);
      return { ...state, activeBoard: { ...state.activeBoard, columns } };
    }

    case "REORDER_COLUMNS": {
      if (!state.activeBoard) return state;
      return { ...state, activeBoard: { ...state.activeBoard, columns: action.columns } };
    }

    case "ADD_CARD": {
      if (!state.activeBoard) return state;
      const columns = state.activeBoard.columns.map((col) =>
        col.id === action.card.columnId
          ? { ...col, cards: [...col.cards, action.card] }
          : col
      );
      return { ...state, activeBoard: { ...state.activeBoard, columns } };
    }

    case "UPDATE_CARD": {
      if (!state.activeBoard) return state;
      const columns = state.activeBoard.columns.map((col) => ({
        ...col,
        cards: col.cards.map((c) =>
          c.id === action.cardId ? { ...c, ...action.patch } : c
        ),
      }));
      return { ...state, activeBoard: { ...state.activeBoard, columns } };
    }

    case "REMOVE_CARD": {
      if (!state.activeBoard) return state;
      const columns = state.activeBoard.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((c) => c.id !== action.cardId),
      }));
      return {
        ...state,
        activeBoard: { ...state.activeBoard, columns },
        activeCardId: state.activeCardId === action.cardId ? null : state.activeCardId,
      };
    }

    case "MOVE_CARD": {
      if (!state.activeBoard) return state;
      const columns = state.activeBoard.columns.map((col) => {
        if (col.id === action.fromColumnId) {
          return { ...col, cards: col.cards.filter((c) => c.id !== action.cardId) };
        }
        if (col.id === action.toColumnId) {
          return { ...col, cards: action.newOrder };
        }
        return col;
      });
      return { ...state, activeBoard: { ...state.activeBoard, columns } };
    }

    case "REORDER_CARDS": {
      if (!state.activeBoard) return state;
      const columns = state.activeBoard.columns.map((col) =>
        col.id === action.columnId ? { ...col, cards: action.cards } : col
      );
      return { ...state, activeBoard: { ...state.activeBoard, columns } };
    }

    case "SET_ACTIVE_CARD":
      return { ...state, activeCardId: action.cardId };

    case "SET_NOTIFICATIONS":
      return { ...state, notifications: action.notifications, unreadCount: action.unreadCount };

    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.notificationId ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };

    case "MARK_ALL_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      };

    case "ROLLBACK":
      return action.snapshot;

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface KanbanContextType {
  state: KanbanState;
  dispatch: React.Dispatch<KanbanAction>;
  // Helpers
  getColumn: (columnId: string) => KanbanColumn | undefined;
  getCard: (cardId: string) => KanbanCard | undefined;
  getActiveCard: () => KanbanCard | undefined;
}

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

export function KanbanProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(kanbanReducer, initialState);

  const getColumn = useCallback(
    (columnId: string) => state.activeBoard?.columns.find((c) => c.id === columnId),
    [state.activeBoard]
  );

  const getCard = useCallback(
    (cardId: string) => {
      for (const col of state.activeBoard?.columns ?? []) {
        const card = col.cards.find((c) => c.id === cardId);
        if (card) return card;
      }
      return undefined;
    },
    [state.activeBoard]
  );

  const getActiveCard = useCallback(
    () => (state.activeCardId ? getCard(state.activeCardId) : undefined),
    [state.activeCardId, getCard]
  );

  return (
    <KanbanContext.Provider value={{ state, dispatch, getColumn, getCard, getActiveCard }}>
      {children}
    </KanbanContext.Provider>
  );
}

export function useKanban() {
  const ctx = useContext(KanbanContext);
  if (!ctx) throw new Error("useKanban must be used within KanbanProvider");
  return ctx;
}
