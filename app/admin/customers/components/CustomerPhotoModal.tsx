"use client";

import { Button } from "@/app/components/ui/button";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { ImageCropModal } from "@/app/components/ImageCropModal";
import {
  Camera,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface CustomerPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoUrl?: string;
  onPhotoSelected: (file: File) => void;
  onRemovePhoto: () => void;
}

type Step = "capture" | "preview";

export function CustomerPhotoModal({
  isOpen,
  onClose,
  currentPhotoUrl,
  onPhotoSelected,
  onRemovePhoto,
}: CustomerPhotoModalProps) {
  const [step, setStep] = useState<Step>("capture");
  const [mode, setMode] = useState<"webcam" | "upload">("webcam");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setStep("capture");
      setPreviewUrl(null);
      setPendingFile(null);
      setError(null);
    }
  }, [isOpen]);

  // Parar webcam quando fechar
  useEffect(() => {
    if (!isOpen) stopWebcam();
  }, [isOpen]);

  const startWebcam = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      setStream(mediaStream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError("Permissão de câmera negada. Permita o acesso nas configurações do navegador.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setError("Nenhuma câmera encontrada. Verifique se há uma câmera conectada.");
        } else {
          setError(`Erro ao acessar webcam: ${err.message}`);
        }
      } else {
        setError("Não foi possível acessar a webcam.");
      }
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0) {
      setError("Aguarde a câmera estar pronta.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) { setError("Erro ao capturar imagem."); return; }
      const file = new File([blob], "customer-photo.jpg", { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      setPendingFile(file);
      setPreviewUrl(url);
      stopWebcam();
      setStep("preview");
    }, "image/jpeg", 0.92);
  };

  const handleCropComplete = (croppedFile: File) => {
    setCropModalOpen(false);
    const url = URL.createObjectURL(croppedFile);
    setPendingFile(croppedFile);
    setPreviewUrl(url);
    setStep("preview");
  };

  const handleConfirm = () => {
    if (!pendingFile) return;
    onPhotoSelected(pendingFile);
    handleClose();
  };

  const handleClose = () => {
    stopWebcam();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFile(null);
    setError(null);
    setStep("capture");
    setMode("webcam");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {step === "preview" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                      setPendingFile(null);
                      setStep("capture");
                      setError(null);
                    }}
                    className="h-8 w-8 -ml-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shadow-sm"
                  style={{ background: "var(--modal-header-icon-bg)" }}
                >
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {step === "capture"
                      ? currentPhotoUrl
                        ? "Atualizar Foto"
                        : "Foto do Cliente"
                      : "Confirmar Foto"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {step === "capture" ? "Tire uma foto ou envie um arquivo" : "Confirme antes de salvar"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2">
                  <div className={`h-1.5 w-1.5 rounded-full transition-all ${step === "capture" ? "bg-primary" : "bg-gray-300"}`} />
                  <div className={`h-1.5 w-1.5 rounded-full transition-all ${step === "preview" ? "bg-primary" : "bg-gray-300"}`} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto p-6">
            {step === "capture" ? (
              <div className="space-y-5">
                {/* Foto atual */}
                {currentPhotoUrl && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-md shrink-0">
                      <img src={currentPhotoUrl} alt="Foto atual" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">Foto atual</p>
                      <p className="text-xs text-slate-500">Selecione uma nova para substituir ou remova</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { onRemovePhoto(); handleClose(); }}
                      className="border-red-200 text-red-600 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Remover
                    </Button>
                  </div>
                )}

                {/* Seleção de modo */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setMode("webcam"); stopWebcam(); setError(null); }}
                    className={`h-11 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      mode === "webcam"
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    <Camera className="h-4 w-4" />
                    Webcam
                  </button>
                  <button
                    onClick={() => { setMode("upload"); stopWebcam(); setError(null); }}
                    className={`h-11 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      mode === "upload"
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    Arquivo
                  </button>
                </div>

                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Webcam */}
                {mode === "webcam" && (
                  <div className="space-y-4">
                    {!stream ? (
                      <div
                        className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer"
                        onClick={startWebcam}
                      >
                        <div className="text-center space-y-3">
                          <div className="h-14 w-14 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg">
                            <Camera className="h-7 w-7 text-slate-400" />
                          </div>
                          <Button onClick={(e) => { e.stopPropagation(); startWebcam(); }} variant="default" size="sm">
                            <Camera className="h-4 w-4 mr-2" />
                            Iniciar Câmera
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video shadow-lg">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{ transform: "scaleX(-1)" }}
                          />
                          <canvas ref={canvasRef} className="hidden" />
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="border-2 border-white/40 rounded-full w-40 h-40" />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button onClick={capturePhoto} className="flex-1 h-10">
                            <Camera className="h-4 w-4 mr-2" />
                            Capturar
                          </Button>
                          <Button variant="outline" onClick={stopWebcam} className="h-10">
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload */}
                {mode === "upload" && (
                  <div>
                    <div
                      onClick={() => setCropModalOpen(true)}
                      className="aspect-video bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-dashed border-slate-300 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center group"
                    >
                      <div className="text-center space-y-3">
                        <div className="h-14 w-14 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Upload className="h-7 w-7 text-slate-400 group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700 group-hover:text-primary transition-colors">
                            Clique para selecionar
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">PNG, JPG ou JPEG</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Etapa de preview */
              <div className="space-y-5">
                {previewUrl && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-40 w-40 rounded-full overflow-hidden border-4 border-white shadow-xl">
                      <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl w-full justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      <p className="text-sm text-green-800 font-medium">Foto pronta para usar</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancelar
            </Button>
            {step === "preview" && (
              <Button size="sm" onClick={handleConfirm} disabled={!pendingFile}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Usar esta foto
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de crop para uploads */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        title="Recortar Foto"
        description="Ajuste o recorte da foto do cliente"
        cropButtonText="Confirmar"
      />
    </>
  );
}
