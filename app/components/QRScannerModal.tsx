"use client";

import { Button } from "@/app/components/ui/button";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Camera, Upload, X, AlertCircle, Loader2, QrCode } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";
import { InvoiceData } from "@/lib/nf-scanner/types";

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
  const [mode, setMode] = useState<"webcam" | "upload">("webcam");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrDetected, setQrDetected] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setQrDetected(false);
      setScanning(false);
      setProcessing(false);
    }
  }, [isOpen]);

  // Limpar ao fechar
  useEffect(() => {
    if (!isOpen) {
      stopWebcam();
    }
  }, [isOpen]);

  // Iniciar webcam
  const startWebcam = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: "environment", // Câmera traseira no mobile
        },
        audio: false,
      });
      setStream(mediaStream);

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        
        // Aguardar o vídeo estar pronto antes de iniciar scanning
        const handleVideoReady = () => {
          video.play().catch((err) => {
            console.error("Erro ao iniciar reprodução:", err);
          });
          
          // Aguardar alguns frames estarem disponíveis
          const checkReady = () => {
            if (video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
              setTimeout(() => {
                startScanning();
              }, 500);
            } else {
              setTimeout(checkReady, 100);
            }
          };
          
          checkReady();
        };
        
        if (video.readyState >= video.HAVE_METADATA) {
          handleVideoReady();
        } else {
          video.addEventListener("loadedmetadata", handleVideoReady, { once: true });
        }
      }
    } catch (err) {
      console.error("Erro ao acessar webcam:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError(
            "Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador."
          );
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setError("Nenhuma câmera encontrada. Verifique se há uma câmera conectada.");
        } else {
          setError(`Erro ao acessar webcam: ${err.message}`);
        }
      } else {
        setError("Não foi possível acessar a webcam. Verifique as permissões.");
      }
    }
  };

  // Parar webcam
  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    stopScanning();
  };

  // Iniciar scanning de QR code
  const startScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    // Verificar se o vídeo está pronto
    if (!videoRef.current || videoRef.current.readyState < videoRef.current.HAVE_CURRENT_DATA) {
      setTimeout(startScanning, 100);
      return;
    }

    setScanning(true);
    scanIntervalRef.current = setInterval(() => {
      scanQRCode();
    }, 100); // Processar a cada 100ms para melhor responsividade
  };

  // Parar scanning
  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
  };

  // Escanear QR code do vídeo
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || processing || qrDetected) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) return;

    if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    // Usar resolução maior para melhor detecção (máximo 800px para performance)
    const maxSize = 800;
    const videoAspect = video.videoWidth / video.videoHeight;
    let canvasWidth = video.videoWidth;
    let canvasHeight = video.videoHeight;

    if (canvasWidth > maxSize || canvasHeight > maxSize) {
      if (canvasWidth > canvasHeight) {
        canvasWidth = maxSize;
        canvasHeight = Math.round(maxSize / videoAspect);
      } else {
        canvasHeight = maxSize;
        canvasWidth = Math.round(maxSize * videoAspect);
      }
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Melhorar qualidade da imagem
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Tentar detectar QR code com diferentes opções
    let code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });

    // Se não detectou, tentar sem inversão
    if (!code) {
      code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
    }

    if (code) {
      setQrDetected(true);
      stopScanning();
      processQRCode(code.data);
    }
  };

  // Processar QR code
  const processQRCode = async (qrData: string) => {
    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("qrData", qrData);

      const response = await fetch("/api/nf-scanner/process-qr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao processar QR code");
      }

      const { data } = await response.json();
      onQRCodeScanned(data);
      handleClose();
    } catch (err) {
      console.error("Erro ao processar QR code:", err);
      setError(err instanceof Error ? err.message : "Erro ao processar QR code");
      setQrDetected(false);
      if (mode === "webcam" && stream) {
        startScanning(); // Reiniciar scanning
      }
    } finally {
      setProcessing(false);
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
    stopWebcam();
    setError(null);
    setQrDetected(false);
    setProcessing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !processing) {
          handleClose();
        }
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Header Minimalista */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Escanear QR Code
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            disabled={processing}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Conteúdo */}
        <div className="p-4">
          {/* Seleção de modo - mais compacta */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={mode === "webcam" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setMode("webcam");
                setError(null);
              }}
              className="flex-1"
              disabled={processing}
            >
              <Camera className="h-4 w-4 mr-2" />
              Câmera
            </Button>
            <Button
              variant={mode === "upload" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setMode("upload");
                stopWebcam();
                setError(null);
              }}
              className="flex-1"
              disabled={processing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>

          {/* Mensagens de erro */}
          {error && (
            <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Webcam */}
          {mode === "webcam" && (
            <div className="space-y-3">
              {!stream ? (
                <div className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Camera className="h-12 w-12 text-gray-400 mx-auto" />
                    <Button
                      onClick={startWebcam}
                      disabled={processing}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Iniciar Câmera
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    {/* Overlay de guia mais sutil */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="border-2 border-white/40 rounded-lg w-56 h-56" />
                    </div>
                    {qrDetected && (
                      <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg">
                          QR Code Detectado!
                        </div>
                      </div>
                    )}
                    {processing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-white rounded-lg px-4 py-3 flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
                          <span className="text-sm font-medium">Processando...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopWebcam}
                      disabled={processing}
                      className="flex-1"
                    >
                      Parar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClose}
                      disabled={processing}
                      className="flex-1"
                    >
                      Fechar
                    </Button>
                  </div>
                  {scanning && !qrDetected && !processing && (
                    <p className="text-center text-xs text-gray-500">
                      <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                      Escaneando...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upload */}
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
                className={`aspect-video bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 transition-all flex items-center justify-center cursor-pointer ${
                  processing ? "opacity-50 cursor-not-allowed" : "hover:border-orange-400 hover:bg-orange-50/30"
                }`}
              >
                <div className="text-center space-y-2">
                  {processing ? (
                    <>
                      <Loader2 className="h-10 w-10 text-orange-500 animate-spin mx-auto" />
                      <p className="text-sm font-medium text-gray-700">Processando...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-gray-400 mx-auto" />
                      <p className="text-sm font-medium text-gray-700">
                        Clique para selecionar imagem
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG ou JPEG</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

