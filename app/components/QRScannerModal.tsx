"use client";

import { Button } from "@/app/components/ui/button";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Smartphone,
  Upload,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Clock,
  Link2,
  Barcode,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { InvoiceData } from "@/lib/nf-scanner/types";
import { POLLING_INTERVAL_MS } from "@/lib/scan-session/types";

type ScanMode = "mobile-link" | "upload";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQRCodeScanned: (data: InvoiceData) => void;
}

export function QRScannerModal({
  isOpen,
  onClose,
  onQRCodeScanned,
}: QRScannerModalProps) {
  const [mode, setMode] = useState<ScanMode>("mobile-link");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados do modo Link Mobile
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scanUrl, setScanUrl] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Iniciar sessão quando o modal abrir no modo mobile-link
  useEffect(() => {
    if (isOpen && mode === "mobile-link") {
      startSession();
    }
    
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  // Atualizar tempo restante
  useEffect(() => {
    if (!sessionId || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Sessão expirou
          setError("Sessão expirada. Clique em 'Gerar Novo Link' para tentar novamente.");
          stopPolling();
          setSessionId(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionId, timeRemaining]);

  // Iniciar sessão de scan
  const startSession = async () => {
    setIsStartingSession(true);
    setError(null);
    setLinkCopied(false);

    try {
      const response = await fetch("/api/scan-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      if (!response.ok) {
        throw new Error("Erro ao criar sessão");
      }

      const data = await response.json();
      
      setSessionId(data.sessionId);
      setScanUrl(data.scanUrl);
      setTimeRemaining(data.expiresIn);
      
      // Iniciar polling
      startPolling(data.sessionId);
      
    } catch (err) {
      console.error("Erro ao iniciar sessão:", err);
      setError("Erro ao criar sessão. Tente novamente.");
    } finally {
      setIsStartingSession(false);
    }
  };

  // Iniciar polling para verificar resultado
  const startPolling = (id: string) => {
    stopPolling();
    setIsPolling(true);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/scan-session?sessionId=${id}`);
        const data = await response.json();

        if (data.status === "completed" && data.result?.invoiceData) {
          // Scan completado com sucesso
          stopPolling();
          onQRCodeScanned(data.result.invoiceData);
          handleClose();
        } else if (data.status === "expired") {
          // Sessão expirou
          stopPolling();
          setError("Sessão expirada. Clique em 'Gerar Novo Link' para tentar novamente.");
          setSessionId(null);
        }
      } catch (err) {
        console.error("Erro no polling:", err);
      }
    }, POLLING_INTERVAL_MS);
  };

  // Parar polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  // Copiar link
  const copyLink = async () => {
    if (!scanUrl) return;

    try {
      await navigator.clipboard.writeText(scanUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar:", err);
    }
  };

  // Processar arquivo uploadado
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/nf-scanner/process-qr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao processar imagem");
      }

      const { data } = await response.json();
      onQRCodeScanned(data);
      handleClose();
    } catch (err) {
      console.error("Erro ao processar arquivo:", err);
      setError(err instanceof Error ? err.message : "Erro ao processar imagem");
    } finally {
      setProcessing(false);
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Fechar modal
  const handleClose = () => {
    stopPolling();
    setSessionId(null);
    setScanUrl("");
    setError(null);
    setLinkCopied(false);
    onClose();
  };

  // Formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && !processing && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
            >
              <Link2 className="h-4 w-4 text-primary" />
            </div>
            Escanear QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seleção de modo */}
          <div className="flex gap-2">
            <Button
              variant={mode === "mobile-link" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setMode("mobile-link");
                setError(null);
              }}
              className="flex-1"
              disabled={processing}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Link Mobile
            </Button>
            <Button
              variant={mode === "upload" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setMode("upload");
                stopPolling();
                setError(null);
              }}
              className="flex-1"
              disabled={processing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex-1 opacity-50 cursor-not-allowed"
              title="Disponível em breve"
            >
              <Barcode className="h-4 w-4 mr-2" />
              Barcode
            </Button>
          </div>

          {/* Mensagens de erro */}
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Modo: Link Mobile */}
          {mode === "mobile-link" && (
            <div className="space-y-4">
              {isStartingSession ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-3" />
                  <p className="text-sm text-slate-500">Criando sessão...</p>
                </div>
              ) : sessionId ? (
                <div className="space-y-4">
                  {/* Link */}
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Link2 className="h-4 w-4" />
                      Link para Captura Mobile
                    </div>
                    <p className="text-xs text-slate-500">
                      Acesse este link no seu celular para usar a câmera e escanear o QR Code da nota fiscal.
                    </p>
                    
                    {/* URL */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 truncate">
                        {scanUrl}
                      </div>
                      <Button
                        onClick={copyLink}
                        size="sm"
                        variant={linkCopied ? "default" : "outline"}
                        className={linkCopied ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {linkCopied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Timer e Status */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="h-4 w-4" />
                      <span>
                        Expira em:{" "}
                        <span className={timeRemaining <= 10 ? "text-red-500 font-medium" : ""}>
                          {formatTime(timeRemaining)}
                        </span>
                      </span>
                    </div>
                    {isPolling && (
                      <div className="flex items-center gap-1.5 text-xs text-orange-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Aguardando escaneamento...
                      </div>
                    )}
                  </div>

                  {/* Botões */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startSession}
                      className="flex-1"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Gerar Novo Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="text-center">
                    <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      Clique no botão abaixo para gerar um link de captura
                    </p>
                  </div>
                  <Button onClick={startSession} size="sm">
                    <Link2 className="h-4 w-4 mr-2" />
                    Gerar Link
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Modo: Upload */}
          {mode === "upload" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => !processing && fileInputRef.current?.click()}
                className={`aspect-video bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 transition-all flex items-center justify-center cursor-pointer ${
                  processing ? "opacity-50 cursor-not-allowed" : "hover:border-orange-400 hover:bg-orange-50/30"
                }`}
              >
                <div className="text-center space-y-2">
                  {processing ? (
                    <>
                      <Loader2 className="h-10 w-10 text-orange-500 animate-spin mx-auto" />
                      <p className="text-sm font-medium text-slate-700">Processando...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-slate-400 mx-auto" />
                      <p className="text-sm font-medium text-slate-700">
                        Clique para selecionar imagem
                      </p>
                      <p className="text-xs text-slate-500">PNG, JPG ou JPEG</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Info sobre barcode */}
          <p className="text-xs text-slate-400 text-center">
            * Barcode: disponível em breve para leitura de código de barras de produtos
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
