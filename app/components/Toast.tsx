"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

const DISMISS_DURATION = 5000;

const TOAST_CONFIG = {
  success: {
    accentColor: "#10b981",
    iconBg: "#d1fae5",
    iconColor: "#10b981",
    Icon: CheckCircle2,
  },
  error: {
    accentColor: "#ef4444",
    iconBg: "#fee2e2",
    iconColor: "#ef4444",
    Icon: XCircle,
  },
  warning: {
    accentColor: "#f59e0b",
    iconBg: "#fef3c7",
    iconColor: "#f59e0b",
    Icon: AlertTriangle,
  },
  info: {
    accentColor: "#2563eb",
    iconBg: "#dbeafe",
    iconColor: "#2563eb",
    Icon: Info,
  },
} as const satisfies Record<
  ToastType,
  { accentColor: string; iconBg: string; iconColor: string; Icon: React.ElementType }
>;

const toastVariants = {
  initial: { opacity: 0, x: 80, scale: 0.96 },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 },
  },
  exit: {
    opacity: 0,
    x: 80,
    scale: 0.95,
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
};

interface ProgressBarProps {
  color: string;
  onComplete: () => void;
}

const ProgressBar = ({ color, onComplete }: ProgressBarProps) => {
  const [width, setWidth] = useState(100);
  const startTimeRef = useRef<number>(Date.now());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / DISMISS_DURATION) * 100);
      setWidth(remaining);

      if (elapsed < DISMISS_DURATION) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onComplete();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onComplete]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        height: "3px",
        width: `${width}%`,
        backgroundColor: color,
        transition: "none",
      }}
    />
  );
};

interface ToastCardProps {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  description?: string;
  onClose: (id: string) => void;
}

const ToastCard = ({ id, message, type, title, description, onClose }: ToastCardProps) => {
  const { accentColor, iconBg, iconColor, Icon } = TOAST_CONFIG[type];

  const headingText = title ?? message;
  const bodyText = description ?? (title ? message : undefined);

  const handleComplete = useCallback(() => onClose(id), [onClose, id]);

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="group"
      style={{
        width: 360,
        backgroundColor: "#ffffff",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.08)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div style={{ display: "flex" }}>
        {/* Faixa lateral colorida */}
        <div
          style={{
            width: 4,
            backgroundColor: accentColor,
            flexShrink: 0,
          }}
        />

        {/* Conteúdo */}
        <div style={{ flex: 1, padding: "12px 14px 20px 14px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            {/* Badge de ícone circular */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={16} color={iconColor} strokeWidth={2.5} />
            </div>

            {/* Textos */}
            <div style={{ flex: 1, paddingTop: 5 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0f172a",
                  lineHeight: "1.3",
                  margin: 0,
                }}
              >
                {headingText}
              </p>
              {bodyText && (
                <p
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                    marginTop: 3,
                    lineHeight: "1.4",
                    margin: "3px 0 0 0",
                  }}
                >
                  {bodyText}
                </p>
              )}
            </div>

            {/* Botão fechar — aparece no hover */}
            <button
              onClick={() => onClose(id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: 6,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#94a3b8",
                flexShrink: 0,
                marginTop: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#475569")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Barra de progresso countdown */}
          <ProgressBar color={accentColor} onComplete={handleComplete} />
        </div>
      </div>
    </motion.div>
  );
};

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  description?: string;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", title?: string, description?: string) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => {
        const next = [...prev, { id, message, type, title, description }];
        return next.length > 5 ? next.slice(next.length - 5) : next;
      });
    },
    []
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    const handleShowToast = (event: CustomEvent) => {
      const { message, type, title, description } = event.detail;
      showToast(message, type, title, description);
    };

    window.addEventListener("showToast", handleShowToast as EventListener);
    return () => {
      window.removeEventListener("showToast", handleShowToast as EventListener);
    };
  }, [showToast]);

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 items-end">
        <AnimatePresence mode="sync">
          {toasts.map((toast) => (
            <ToastCard
              key={toast.id}
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={hideToast}
              title={toast.title}
              description={toast.description}
            />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

export const useToast = () => {
  const showToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      title?: string,
      description?: string
    ) => {
      const event = new CustomEvent("showToast", {
        detail: { message, type, title, description },
      });
      window.dispatchEvent(event);
    },
    []
  );

  return { showToast };
};
