"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  QrCode,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { InvoiceData } from "@/lib/nf-scanner/types";
import { POLLING_INTERVAL_MS } from "@/lib/scan-session/types";

export type ScanMode = "mobile-link" | "upload" | "barcode";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQRCodeScanned: (data: InvoiceData) => void;
  initialMode?: ScanMode;
  availableModes?: ScanMode[];
  closeOnSuccess?: boolean;
  title?: string;
  description?: string;
  barcodePlaceholder?: string;
  barcodeAriaLabel?: string;
  barcodeSubmitLabel?: string;
  onBarcodeSubmit?: (raw: string) => Promise<InvoiceData>;
}

export function QRScannerModal({
  isOpen,
  onClose,
  onQRCodeScanned,
  initialMode = "barcode",
  availableModes,
  closeOnSuccess = true,
  title = "Escanear QR Code da Nota Fiscal",
  description = "Use o leitor de código de barras, o link no celular ou envie uma imagem com o QR Code da nota fiscal",
  barcodePlaceholder = "https://dfe-portal.svrs.rs.gov.br/Dfe/QrCodeNFce?p=...",
  barcodeAriaLabel = "URL ou dados da NFC-e lidos pelo leitor",
  barcodeSubmitLabel = "Processar leitura",
  onBarcodeSubmit,
}: QRScannerModalProps) {
  const enabledModes = availableModes?.length
    ? availableModes
    : (["barcode", "mobile-link", "upload"] satisfies ScanMode[]);
  const resolvedInitialMode = enabledModes.includes(initialMode)
    ? initialMode
    : enabledModes[0];
  const [mode, setMode] = useState<ScanMode>(resolvedInitialMode);
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
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [barcodeUrl, setBarcodeUrl] = useState("");

  useEffect(() => {
    if (isOpen) {
      setMode(resolvedInitialMode);
    }
  }, [isOpen, resolvedInitialMode]);

  // Iniciar sessão quando o modal abrir no modo mobile-link
  useEffect(() => {
    if (isOpen && mode === "mobile-link") {
      startSession();
    }

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive/deps
  }, [isOpen, mode]);

  // Atualizar tempo restante
  useEffect(() => {
    if (!sessionId || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Sessão expirada
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

  // Focar campo do leitor USB (modo código de barras / teclado) ao abrir a aba
  useEffect(() => {
    if (!isOpen || mode !== "barcode") return;
    const t = window.setTimeout(() => barcodeInputRef.current?.focus(), 200);
    return () => window.clearTimeout(t);
  }, [isOpen, mode]);

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
          if (closeOnSuccess) {
            handleClose();
          }
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
      if (closeOnSuccess) {
        handleClose();
      }
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

  const submitBarcodeUrl = async () => {
    const raw = barcodeUrl.trim().replace(/\s+/g, "");
    if (!raw || processing) return;

    setError(null);
    setProcessing(true);

    try {
      const data = onBarcodeSubmit
        ? await onBarcodeSubmit(raw)
        : await (async () => {
            const formData = new FormData();
            formData.append("qrData", raw);

            const response = await fetch("/api/nf-scanner/process-qr", {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                typeof errorData.error === "string"
                  ? errorData.error
                  : "Erro ao processar link da nota"
              );
            }

            const payload = await response.json();
            return payload.data as InvoiceData;
          })();

      setBarcodeUrl("");
      onQRCodeScanned(data);
      if (closeOnSuccess) {
        handleClose();
      }
    } catch (err) {
      console.error("Erro ao processar leitura:", err);
      setError(err instanceof Error ? err.message : "Erro ao processar link da nota");
    } finally {
      setProcessing(false);
      window.setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }
  };

  // Fechar modal
  const handleClose = () => {
    stopPolling();
    setSessionId(null);
    setScanUrl("");
    setBarcodeUrl("");
    setError(null);
    setLinkCopied(false);
    setMode(resolvedInitialMode);
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
            >
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Seleção de modo - Tabs deslizantes */}
          {enabledModes.length > 1 && (
            <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-xl ring-1 ring-slate-200/80">
              {enabledModes.includes("barcode") && (
                <button
                  type="button"
                  onClick={() => {
                    stopPolling();
                    setMode("barcode");
                    setError(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                    mode === "barcode"
                      ? "bg-white text-primary shadow-md shadow-slate-200/60 border border-slate-200/90"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Barcode className="h-4 w-4 shrink-0" />
                  <span className="truncate">Barcode</span>
                </button>
              )}
              {enabledModes.includes("mobile-link") && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("mobile-link");
                    setError(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                    mode === "mobile-link"
                      ? "bg-white text-primary shadow-md shadow-slate-200/60 border border-slate-200/90"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Smartphone className="h-4 w-4 shrink-0" />
                  <span className="truncate">Link Mobile</span>
                </button>
              )}
              {enabledModes.includes("upload") && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("upload");
                    stopPolling();
                    setError(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                    mode === "upload"
                      ? "bg-white text-primary shadow-md shadow-slate-200/60 border border-slate-200/90"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Upload className="h-4 w-4 shrink-0" />
                  <span className="truncate">Upload</span>
                </button>
              )}
            </div>
          )}

          {/* Mensagens de erro */}
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Modo: leitor USB (teclado) — URL do QR Code da NFC-e da SEFAZ */}
          {mode === "barcode" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: "var(--modal-header-icon-bg)",
                    outline: "1px solid var(--modal-header-icon-ring)",
                  }}
                >
                  <Barcode className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-slate-800">Leitor de código de barras (modo teclado)</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Clique no campo abaixo e leia o código. O equipamento envia o link da SEFAZ como se fosse digitação;
                    na maioria dos leitores, ao terminar é enviado <span className="font-medium">Enter</span> e a nota é
                    processada automaticamente. Você também pode colar o link e clicar em Processar.
                  </p>
                </div>
              </div>

              <Input
                ref={barcodeInputRef}
                type="text"
                inputSize="lg"
                value={barcodeUrl}
                onChange={(e) => setBarcodeUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submitBarcodeUrl();
                  }
                }}
                placeholder={barcodePlaceholder}
                disabled={processing}
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-xs sm:text-sm"
                aria-label={barcodeAriaLabel}
              />

              <Button
                type="button"
                className="w-full h-10"
                disabled={processing || !barcodeUrl.trim()}
                onClick={() => void submitBarcodeUrl()}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando nota…
                  </>
                ) : (
                  barcodeSubmitLabel
                )}
              </Button>
            </div>
          )}

          {/* Modo: Link Mobile */}
          {mode === "mobile-link" && (
            <div className="space-y-4">
              {isStartingSession ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div
                    className="h-14 w-14 rounded-full flex items-center justify-center mb-4"
                    style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
                  >
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Criando sessão segura...</p>
                  <p className="text-xs text-slate-500 mt-1">Aguarde um momento</p>
                </div>
              ) : sessionId ? (
                <div className="space-y-4">
                  {/* Link */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200 p-5 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center"
                        style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
                      >
                        <Link2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Link para Captura Mobile</p>
                        <p className="text-xs text-slate-500">Acesse no celular para escanear</p>
                      </div>
                    </div>

                    {/* URL */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-600 truncate font-mono">
                        {scanUrl}
                      </div>
                      <Button
                        onClick={copyLink}
                        size="sm"
                        variant={linkCopied ? "default" : "outline"}
                        className={linkCopied ? "bg-green-600 hover:bg-green-700 h-8 text-xs gap-1.5" : "h-8 text-xs gap-1.5"}
                      >
                        {linkCopied ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      Abra este link no seu celular para usar a câmera e escanear o QR Code da nota fiscal de forma segura.
                    </p>
                  </div>

                  {/* Timer e Status */}
                  <div className="flex items-center justify-between px-2 py-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="h-4 w-4" />
                      <span>
                        Expira em:{" "}
                        <span className={`font-semibold ${timeRemaining <= 10 ? "text-red-600" : "text-slate-900"}`}>
                          {formatTime(timeRemaining)}
                        </span>
                      </span>
                    </div>
                    {isPolling && (
                      <div className="flex items-center gap-2 text-xs font-medium text-primary">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Aguardando...
                      </div>
                    )}
                  </div>

                  {/* Botões */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={startSession}
                      className="flex-1 h-8 text-xs gap-1.5"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Gerar Novo Link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1 h-8 text-xs gap-1.5"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div
                    className="h-16 w-16 rounded-full flex items-center justify-center"
                    style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
                  >
                    <Link2 className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-slate-700">Link de captura seguro</p>
                    <p className="text-xs text-slate-500">
                      Gere um link para escanear a nota fiscal usando seu celular
                    </p>
                  </div>
                  <Button onClick={startSession} className="h-8 text-xs gap-1.5">
                    <Link2 className="h-3.5 w-3.5" />
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
                className={`aspect-video rounded-xl border-2 border-dashed transition-all flex items-center justify-center cursor-pointer ${
                  processing
                    ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50"
                    : "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100/50 hover:border-primary hover:from-primary/5 hover:to-primary/10"
                }`}
              >
                <div className="text-center space-y-3 px-6">
                  {processing ? (
                    <>
                      <div
                        className="h-14 w-14 rounded-full flex items-center justify-center mx-auto"
                        style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
                      >
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Processando imagem...</p>
                        <p className="text-xs text-slate-500 mt-0.5">Extraindo dados do QR Code</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="h-14 w-14 rounded-full flex items-center justify-center mx-auto"
                        style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
                      >
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Clique para selecionar imagem</p>
                        <p className="text-xs text-slate-500 mt-0.5">PNG, JPG ou JPEG</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
