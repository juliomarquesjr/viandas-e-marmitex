"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import QrScanner from "qr-scanner";
QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js";
import { Button } from "@/app/components/ui/button";
import {
  Camera,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

type ScanState = "checking" | "waiting" | "scanning" | "success" | "error" | "no-session";

interface SessionInfo {
  sessionId: string;
  expiresIn: number;
}

export default function ScanPage() {
  const [scanState, setScanState] = useState<ScanState>("checking");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldStartScanner, setShouldStartScanner] = useState(false);

  const scannerRef = useRef<QrScanner | null>(null);
  const isScanningRef = useRef(false);

  // Verificar se há sessão aguardando
  const checkWaitingSession = useCallback(async () => {
    setScanState("checking");
    setErrorMessage("");

    try {
      const response = await fetch("/api/scan-session?checkWaiting=true");
      const data = await response.json();

      if (data.hasWaitingSession) {
        setSessionInfo({
          sessionId: data.sessionId,
          expiresIn: data.expiresIn,
        });
        setTimeRemaining(data.expiresIn);
        setScanState("waiting");
      } else {
        setScanState("no-session");
      }
    } catch (error) {
      console.error("Erro ao verificar sessão:", error);
      setErrorMessage("Erro ao verificar sessão. Tente novamente.");
      setScanState("error");
    }
  }, []);

  // Parar scanner
  const stopScanner = useCallback(async () => {
    isScanningRef.current = false;

    if (scannerRef.current) {
      try {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      } catch (error) {
        console.error("Erro ao parar scanner:", error);
      }
      scannerRef.current = null;
    }
  }, []);

  // Enviar QR Code escaneado
  const submitQRCode = useCallback(async (qrData: string) => {
    if (!sessionInfo) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/scan-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          sessionId: sessionInfo.sessionId,
          qrData,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setScanState("success");
      } else {
        setErrorMessage(data.error || "Erro ao processar QR Code");
        setScanState("error");
      }
    } catch (error) {
      console.error("Erro ao enviar QR Code:", error);
      setErrorMessage("Erro ao enviar QR Code. Tente novamente.");
      setScanState("error");
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionInfo]);

  // Iniciar scanner quando shouldStartScanner for true e elemento existir
  useEffect(() => {
    if (!shouldStartScanner || !sessionInfo) return;

    let mounted = true;

    const initScanner = async () => {
      if (isScanningRef.current) return;

      // Verificar suporte a câmera
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage("Seu navegador não suporta acesso à câmera. Use Chrome, Safari ou Firefox atualizado.");
        setScanState("error");
        return;
      }

      // Garantir que qualquer scanner anterior foi completamente parado
      await stopScanner();

      // Aguardar um pouco para garantir que a câmera foi liberada
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!mounted) return;

      isScanningRef.current = true;

      try {
        // Aguardar para garantir que o elemento está no DOM
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!mounted) return;

        const videoEl = document.getElementById("qr-video") as HTMLVideoElement | null;
        if (!videoEl) {
          throw new Error("Elemento de vídeo do scanner não encontrado");
        }

        scannerRef.current = new QrScanner(
          videoEl,
          async (result) => {
            if (!isScanningRef.current || !mounted) return;
            await stopScanner();
            await submitQRCode(result.data);
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 10,
          }
        );

        await scannerRef.current.start();
      } catch (error) {
        console.error("Erro ao iniciar scanner:", error);

        if (!mounted) return;

        let errorMsg = "Erro ao acessar câmera. Verifique as permissões.";

        if (error instanceof Error) {
          const msg = error.message.toLowerCase();

          if (msg.includes("notreadableerror") || msg.includes("device in use") || msg.includes("track start failed")) {
            errorMsg = "A câmera está sendo usada por outro aplicativo. Feche outros apps que usam a câmera e tente novamente.";
          } else if (msg.includes("notallowederror") || msg.includes("permission") || msg.includes("denied")) {
            errorMsg = "Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador e recarregue a página.";
          } else if (msg.includes("notsupported") || msg.includes("not supported") || msg.includes("no camera") || msg.includes("no input") || msg.includes("could not find")) {
            errorMsg = "Não foi possível acessar a câmera. Verifique se ela está disponível e tente usar outro navegador (Chrome recomendado).";
          } else if (msg.includes("overconstrainederror") || msg.includes("constraint")) {
            errorMsg = "A câmera do dispositivo não atende aos requisitos. Tente recarregar a página.";
          } else if (msg.includes("https") || msg.includes("secure")) {
            errorMsg = "A câmera requer conexão segura (HTTPS). Acesse via HTTPS.";
          } else {
            errorMsg = error.message;
          }
        }

        setErrorMessage(errorMsg);
        setScanState("error");
        isScanningRef.current = false;
        setShouldStartScanner(false);
      }
    };

    initScanner();

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [shouldStartScanner, sessionInfo, stopScanner, submitQRCode]);

  // Solicitar início do scanner
  const requestStartScanner = () => {
    if (isScanningRef.current || !sessionInfo) return;
    setScanState("scanning");
    setShouldStartScanner(true);
  };

  // Cancelar e voltar
  const handleCancel = async () => {
    await stopScanner();
    setShouldStartScanner(false);
    setScanState("waiting");
  };

  // Tentar novamente após erro
  const handleRetry = () => {
    setShouldStartScanner(false);
    if (sessionInfo && timeRemaining > 0) {
      setScanState("waiting");
    } else {
      checkWaitingSession();
    }
  };

  // Verificar sessão ao montar
  useEffect(() => {
    checkWaitingSession();

    return () => {
      stopScanner();
    };
  }, [checkWaitingSession, stopScanner]);

  // Atualizar tempo restante
  useEffect(() => {
    if (scanState !== "waiting" && scanState !== "scanning") return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          stopScanner();
          setScanState("no-session");
          setSessionInfo(null);
          setShouldStartScanner(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [scanState, stopScanner]);

  // Formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <Camera className="h-5 w-5 text-orange-500" />
            Escanear QR Code
          </h1>
          {timeRemaining > 0 && (scanState === "waiting" || scanState === "scanning") && (
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <span>⏱️</span>
              <span className={timeRemaining <= 10 ? "text-red-400 font-medium" : ""}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Estado: Verificando */}
          {scanState === "checking" && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
              <p className="text-slate-400">Verificando sessão...</p>
            </div>
          )}

          {/* Estado: Sem sessão */}
          {scanState === "no-session" && (
            <div className="text-center py-12 bg-slate-800 rounded-xl p-8">
              <AlertCircle className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Nenhuma sessão ativa
              </h2>
              <p className="text-slate-400 mb-6">
                Abra o modal de despesas no computador e clique em "Nota Fiscal"
                para iniciar uma sessão de escaneamento.
              </p>
              <Button
                onClick={checkWaitingSession}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar novamente
              </Button>
            </div>
          )}

          {/* Estado: Aguardando início do scan */}
          {scanState === "waiting" && (
            <div className="text-center py-8 bg-slate-800 rounded-xl p-8">
              <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="h-10 w-10 text-orange-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Pronto para escanear
              </h2>
              <p className="text-slate-400 mb-6">
                Clique no botão abaixo para abrir a câmera e escanear o QR Code
                da nota fiscal.
              </p>
              <Button
                onClick={requestStartScanner}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                size="lg"
              >
                <Camera className="h-5 w-5 mr-2" />
                Abrir Câmera
              </Button>
            </div>
          )}

          {/* Estado: Escaneando */}
          {scanState === "scanning" && (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-slate-800 relative">
                <video
                  id="qr-video"
                  className="w-full"
                  style={{ minHeight: "300px" }}
                />
              </div>
              <p className="text-center text-slate-400 text-sm">
                Aponte a câmera para o QR Code da nota fiscal
              </p>
              {isSubmitting && (
                <div className="flex items-center justify-center gap-2 text-orange-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processando...</span>
                </div>
              )}
              <Button
                onClick={handleCancel}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                disabled={isSubmitting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          )}

          {/* Estado: Sucesso */}
          {scanState === "success" && (
            <div className="text-center py-12 bg-slate-800 rounded-xl p-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                QR Code Escaneado!
              </h2>
              <p className="text-slate-400 mb-6">
                Os dados da nota fiscal foram enviados com sucesso para o
                computador.
              </p>
              <p className="text-sm text-slate-500">
                Você pode fechar esta página.
              </p>
            </div>
          )}

          {/* Estado: Erro */}
          {scanState === "error" && (
            <div className="text-center py-12 bg-slate-800 rounded-xl p-8">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Erro</h2>
              <p className="text-slate-400 mb-6">{errorMessage}</p>
              <Button
                onClick={handleRetry}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-3">
        <p className="text-center text-xs text-slate-500">
          Escaneie o QR Code da nota fiscal para enviar os dados automaticamente
        </p>
      </footer>
    </div>
  );
}
