"use client";

import { Button } from "@/app/components/ui/button";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/app/components/ui/dialog";
import { DeleteConfirmDialog } from "@/app/components/DeleteConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui";
import {
  Camera,
  Upload,
  AlertCircle,
  Check,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  loadModels,
  validateSingleFace,
  extractFaceDescriptor,
  descriptorToArray,
} from "@/lib/facial-recognition";

interface FacialCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  currentFacialImageUrl?: string;
  onSuccess: () => void;
}

type Step = "capture" | "review";

// Componente auxiliar para divisor de seção
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

export function FacialCaptureModal({
  isOpen,
  onClose,
  userId,
  userName,
  currentFacialImageUrl,
  onSuccess,
}: FacialCaptureModalProps) {
  const [step, setStep] = useState<Step>("capture");
  const [mode, setMode] = useState<"webcam" | "upload">("webcam");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedCanvas, setCapturedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [faceValidated, setFaceValidated] = useState(false);
  
  // Estados para seleção de câmera
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar modelos quando o modal abrir
  useEffect(() => {
    if (isOpen && !modelsLoaded) {
      loadModels()
        .then(() => setModelsLoaded(true))
        .catch((err) => {
          console.error("Erro ao carregar modelos:", err);
          setError("Erro ao carregar modelos de reconhecimento facial");
        });
    }
  }, [isOpen, modelsLoaded]);

  // Carregar lista de dispositivos de vídeo quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      loadVideoDevices();
    }
  }, [isOpen]);

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep("capture");
      setCapturedImage(null);
      setCapturedCanvas(null);
      setError(null);
      setSuccess(false);
      setFaceValidated(false);
    }
  }, [isOpen]);

  // Carregar lista de dispositivos de vídeo
  const loadVideoDevices = async () => {
    try {
      // Primeiro solicitar permissão para acessar dispositivos
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      
      // Enumerar dispositivos
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevicesList = devices.filter(device => device.kind === 'videoinput');
      setVideoDevices(videoDevicesList);
      
      // Selecionar a primeira câmera por padrão
      if (videoDevicesList.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevicesList[0].deviceId);
      }
    } catch (err) {
      console.error("Erro ao carregar dispositivos de vídeo:", err);
    }
  };

  // Iniciar webcam
  const startWebcam = async () => {
    try {
      setError(null);
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
          ...(selectedDeviceId && { deviceId: { exact: selectedDeviceId } })
        },
        audio: false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => {
            console.error('Erro ao iniciar reprodução:', err);
          });
        }
      }, 100);
    } catch (err) {
      console.error("Erro ao acessar webcam:", err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError("Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
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
  };

  // Capturar foto da webcam
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Aguarde a câmera estar pronta");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg");
    setCapturedImage(imageData);
    
    // Criar uma cópia do canvas para usar na etapa de review
    const canvasCopy = document.createElement("canvas");
    canvasCopy.width = canvas.width;
    canvasCopy.height = canvas.height;
    const ctxCopy = canvasCopy.getContext("2d");
    if (ctxCopy) {
      ctxCopy.drawImage(canvas, 0, 0);
      setCapturedCanvas(canvasCopy);
    }

    // Fechar câmera e ir para etapa de review
    stopWebcam();
    setStep("review");
  };

  // Processar arquivo uploadado
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      setCapturedImage(imageUrl);

      // Criar canvas da imagem
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setCapturedCanvas(canvas);
          setStep("review");
        }
      };
      img.src = imageUrl;
    };
    reader.readAsDataURL(file);
  };

  // Validar rosto na etapa de review
  const validateFace = async () => {
    if (!capturedCanvas || !modelsLoaded) {
      setError("Imagem não disponível para validação");
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const validation = await validateSingleFace(capturedCanvas);
      if (!validation.valid) {
        setError(validation.message);
        setFaceValidated(false);
        setValidating(false);
        return;
      }

      setFaceValidated(true);
      setValidating(false);
    } catch (err) {
      console.error("Erro ao validar rosto:", err);
      setError(err instanceof Error ? err.message : "Erro ao validar rosto");
      setFaceValidated(false);
      setValidating(false);
    }
  };

  // Salvar foto facial
  const saveFacialImage = async () => {
    if (!capturedCanvas || !faceValidated) {
      setError("Por favor, valide o rosto antes de salvar");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Extrair descriptor
      const descriptor = await extractFaceDescriptor(capturedCanvas);
      if (!descriptor) {
        throw new Error("Não foi possível extrair o descriptor facial");
      }

      const descriptorArray = descriptorToArray(descriptor);

      // Converter canvas para blob
      capturedCanvas.toBlob(async (blob) => {
        if (!blob) {
          setError("Erro ao converter imagem");
          setLoading(false);
          return;
        }

        const formData = new FormData();
        const file = new File([blob], "face.jpg", { type: "image/jpeg" });
        formData.append("file", file);
        formData.append("userId", userId);
        if (currentFacialImageUrl) {
          formData.append("oldImageUrl", currentFacialImageUrl);
        }

        // Upload da imagem
        const uploadResponse = await fetch("/api/upload/face", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Erro no upload");
        }

        const { url } = await uploadResponse.json();

        // Atualizar usuário
        const updateResponse = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: userId,
            facialImageUrl: url,
            facialDescriptor: descriptorArray,
          }),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Erro ao salvar dados faciais");
        }

        setSuccess(true);
        setLoading(false);

        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 1500);
      }, "image/jpeg", 0.9);
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setError(err instanceof Error ? err.message : "Erro ao salvar foto facial");
      setLoading(false);
    }
  };

  // Remover reconhecimento facial
  const handleRemoveFacial = async () => {
    if (!currentFacialImageUrl) return;

    setIsRemoving(true);
    setError(null);
    setShowRemoveConfirm(false);

    try {
      if (currentFacialImageUrl.includes('blob.vercel-storage.com')) {
        const deleteResponse = await fetch("/api/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: currentFacialImageUrl }),
        });

        if (!deleteResponse.ok) {
          console.warn("Aviso: Não foi possível deletar a imagem do Vercel Blob");
        }
      }

      const updateResponse = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          facialImageUrl: null,
          facialDescriptor: null,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Erro ao remover dados faciais");
      }

      setSuccess(true);
      setIsRemoving(false);

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      console.error("Erro ao remover:", err);
      setError(err instanceof Error ? err.message : "Erro ao remover reconhecimento facial");
      setIsRemoving(false);
    }
  };

  // Fechar modal
  const handleClose = () => {
    stopWebcam();
    setCapturedImage(null);
    setCapturedCanvas(null);
    setUploadedFile(null);
    setError(null);
    setSuccess(false);
    setIsRemoving(false);
    setStep("capture");
    setMode("webcam");
    setFaceValidated(false);
    onClose();
  };

  // Limpar ao fechar
  useEffect(() => {
    if (!isOpen) {
      stopWebcam();
    }
  }, [isOpen]);

  // Validar automaticamente ao entrar na etapa de review
  useEffect(() => {
    if (step === "review" && capturedCanvas && modelsLoaded && !faceValidated && !validating) {
      validateFace();
    }
  }, [step, capturedCanvas, modelsLoaded]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {step === "review" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setStep("capture");
                    setCapturedImage(null);
                    setCapturedCanvas(null);
                    setFaceValidated(false);
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
                    ? currentFacialImageUrl
                      ? "Atualizar Foto Facial"
                      : "Cadastrar Foto Facial"
                    : "Confirmar Foto"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {step === "capture"
                    ? "Tire uma foto ou envie um arquivo"
                    : userName}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {step === "capture" ? (
              <>
                {/* Foto atual (se existir) */}
                {currentFacialImageUrl && (
                  <>
                    <SectionDivider label="Foto Atual" />
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-4">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-md shrink-0">
                          <img
                            src={currentFacialImageUrl}
                            alt="Foto facial atual"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="absolute -top-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">Foto Facial Cadastrada</p>
                        <p className="text-xs text-slate-500">Selecione uma nova para substituir ou remova</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRemoveConfirm(true)}
                        className="border-red-200 text-red-600 hover:bg-red-50 shrink-0 text-xs h-8"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Remover
                      </Button>
                    </div>
                  </>
                )}

                {/* Seleção de modo */}
                <SectionDivider label="Método de Captura" />
                <div className="relative bg-slate-100 rounded-lg p-1">
                  <div
                    className={`absolute top-1 bottom-1 rounded-md bg-white shadow-sm transition-all duration-200 ease-in-out ${
                      mode === "webcam" ? "left-1 right-[calc(50%-4px)]" : "left-[calc(50%-4px)] right-1"
                    }`}
                  />
                  <div className="relative grid grid-cols-2 gap-1">
                    <button
                      onClick={() => {
                        setMode("webcam");
                        setError(null);
                      }}
                      className={`relative z-10 h-9 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                        mode === "webcam"
                          ? "text-primary font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Webcam
                    </button>
                    <button
                      onClick={() => {
                        setMode("upload");
                        stopWebcam();
                        setError(null);
                      }}
                      className={`relative z-10 h-9 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                        mode === "upload"
                          ? "text-primary font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Arquivo
                    </button>
                  </div>
                </div>

                {/* Mensagens de erro */}
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Webcam */}
                {mode === "webcam" && (
                  <div className="space-y-4">
                    {/* Seletor de Câmera */}
                    {videoDevices.length > 1 && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Câmera
                        </label>
                        <Select
                          value={selectedDeviceId}
                          onValueChange={(value) => {
                            setSelectedDeviceId(value);
                            if (stream) {
                              stopWebcam();
                              setTimeout(() => startWebcam(), 100);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione uma câmera" />
                          </SelectTrigger>
                          <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
                            {videoDevices.map((device) => (
                              <SelectItem key={device.deviceId} value={device.deviceId}>
                                {device.label || `Câmera ${videoDevices.indexOf(device) + 1}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {!stream ? (
                      <div
                        className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer"
                        onClick={startWebcam}
                      >
                        <div className="text-center space-y-3">
                          <div className="h-14 w-14 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg">
                            <Camera className="h-7 w-7 text-slate-400" />
                          </div>
                          <Button
                            onClick={(e) => { e.stopPropagation(); startWebcam(); }}
                            variant="default"
                            size="sm"
                            disabled={!modelsLoaded}
                            className="text-xs h-8"
                          >
                            {!modelsLoaded ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                Carregando...
                              </>
                            ) : (
                              <>
                                <Camera className="h-3.5 w-3.5 mr-1.5" />
                                Iniciar Câmera
                              </>
                            )}
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
                            style={{ transform: 'scaleX(-1)' }}
                          />
                          <canvas ref={canvasRef} className="hidden" />
                          {/* Overlay de guia */}
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="border-2 border-white/40 rounded-full w-40 h-40" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={capturePhoto}
                            disabled={loading}
                            className="flex-1 h-8 text-xs"
                          >
                            <Camera className="h-3.5 w-3.5 mr-1.5" />
                            Capturar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={stopWebcam}
                            disabled={loading}
                            className="h-8 text-xs"
                          >
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
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-video bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-dashed border-slate-300 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center group"
                    >
                      <div className="text-center space-y-3">
                        <div className="h-14 w-14 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Upload className="h-7 w-7 text-slate-400 group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-700 group-hover:text-primary transition-colors">
                            Clique para selecionar
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            PNG, JPG ou JPEG
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dicas */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-blue-900 mb-1.5">💡 Dicas</p>
                  <ul className="text-[10px] text-blue-800 space-y-0.5">
                    <li>• Certifique-se de que há apenas um rosto visível</li>
                    <li>• Mantenha boa iluminação e olhe diretamente para a câmera</li>
                    <li>• Remova óculos ou acessórios que cubram o rosto</li>
                  </ul>
                </div>
              </>
            ) : (
              /* Etapa de Review */
              <>
                {capturedImage && (
                  <div className="space-y-4">
                    {/* Preview da imagem */}
                    <SectionDivider label="Preview da Foto" />
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl overflow-hidden border-2 border-slate-200 max-w-full">
                        <img
                          src={capturedImage}
                          alt="Preview"
                          className="max-h-64 object-contain"
                        />
                        {faceValidated && (
                          <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-medium">Validado</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status de validação */}
                    {validating && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        <div>
                          <p className="text-xs font-medium text-blue-900">Validando rosto...</p>
                          <p className="text-[10px] text-blue-700">Aguarde enquanto analisamos a imagem</p>
                        </div>
                      </div>
                    )}

                    {!validating && !faceValidated && error && (
                      <Alert variant="destructive" className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">{error}</AlertDescription>
                      </Alert>
                    )}

                    {!validating && faceValidated && (
                      <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-emerald-900">Rosto detectado com sucesso!</p>
                          <p className="text-[10px] text-emerald-700">A imagem está pronta para ser salva</p>
                        </div>
                      </div>
                    )}

                    {/* Botão para revalidar */}
                    {!validating && !faceValidated && (
                      <Button
                        onClick={validateFace}
                        variant="outline"
                        className="w-full h-8 text-xs"
                      >
                        <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                        Tentar Validar Novamente
                      </Button>
                    )}
                  </div>
                )}

                {/* Mensagem de sucesso */}
                {success && (
                  <Alert className="bg-emerald-50 border-emerald-200">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-700">
                      {isRemoving ? "Reconhecimento facial removido com sucesso!" : "Foto facial cadastrada com sucesso!"}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            {step === "review" && currentFacialImageUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRemoveConfirm(true)}
                disabled={loading || isRemoving || success}
                className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-8"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Remover
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={step === "capture" ? handleClose : () => {
                  setStep("capture");
                  setCapturedImage(null);
                  setCapturedCanvas(null);
                  setFaceValidated(false);
                  setError(null);
                }}
                disabled={loading || isRemoving || success}
                className="text-xs h-8"
              >
                {step === "capture" ? "Cancelar" : "Voltar"}
              </Button>
              {step === "review" && capturedImage && faceValidated && !success && (
                <Button
                  size="sm"
                  onClick={saveFacialImage}
                  disabled={loading || !faceValidated}
                  className="text-xs h-8"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Salvar Foto
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de remoção */}
      <DeleteConfirmDialog
        open={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        title="Remover Reconhecimento Facial"
        description="Tem certeza que deseja remover o reconhecimento facial deste usuário? Esta ação não pode ser desfeita e a imagem será deletada permanentemente."
        onConfirm={handleRemoveFacial}
        confirmText="Remover"
        cancelText="Cancelar"
        isLoading={isRemoving}
      />
    </>
  );
}
