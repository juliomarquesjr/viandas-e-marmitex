"use client";

import { Button } from "@/app/components/ui/button";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { DeleteConfirmDialog } from "@/app/components/DeleteConfirmDialog";
import { Camera, Upload, X, AlertCircle, Check, Trash2, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
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

  // Iniciar webcam
  const startWebcam = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false
      });
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/50">
          <div className="flex items-center justify-between">
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
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {step === "capture" 
                    ? (currentFacialImageUrl ? "Atualizar Foto Facial" : "Cadastrar Foto Facial")
                    : "Revisar Foto"
                  }
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{userName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Indicador de progresso */}
              <div className="flex items-center gap-1.5 mr-2">
                <div className={`h-1.5 w-1.5 rounded-full transition-all ${step === "capture" ? "bg-orange-500" : "bg-gray-300"}`} />
                <div className={`h-1.5 w-1.5 rounded-full transition-all ${step === "review" ? "bg-orange-500" : "bg-gray-300"}`} />
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
            <div className="space-y-6">
              {/* Foto atual (se existir) */}
              {currentFacialImageUrl && (
                <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={currentFacialImageUrl}
                        alt="Foto facial atual"
                        className="w-24 h-24 object-cover rounded-xl border-2 border-white shadow-md"
                      />
                      <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Foto Facial Cadastrada</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Você pode atualizar ou remover esta foto
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRemoveConfirm(true)}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Remover
                    </Button>
                  </div>
                </div>
              )}

              {/* Seleção de modo */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={mode === "webcam" ? "default" : "outline"}
                  onClick={() => {
                    setMode("webcam");
                    setError(null);
                  }}
                  className="h-12 relative"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Câmera
                  {mode === "webcam" && (
                    <div className="absolute inset-0 bg-orange-500/10 rounded-md" />
                  )}
                </Button>
                <Button
                  variant={mode === "upload" ? "default" : "outline"}
                  onClick={() => {
                    setMode("upload");
                    stopWebcam();
                    setError(null);
                  }}
                  className="h-12 relative"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                  {mode === "upload" && (
                    <div className="absolute inset-0 bg-orange-500/10 rounded-md" />
                  )}
                </Button>
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
                  {!stream ? (
                    <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="h-16 w-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg">
                          <Camera className="h-8 w-8 text-gray-400" />
                        </div>
                        <Button 
                          onClick={startWebcam} 
                          disabled={!modelsLoaded}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          {!modelsLoaded ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Carregando...
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4 mr-2" />
                              Iniciar Câmera
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video shadow-xl">
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
                          <div className="border-2 border-white/30 rounded-full w-48 h-48" />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={capturePhoto}
                          disabled={loading}
                          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white h-11"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Capturar Foto
                        </Button>
                        <Button
                          variant="outline"
                          onClick={stopWebcam}
                          disabled={loading}
                          className="h-11"
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
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50/50 transition-all cursor-pointer flex items-center justify-center group"
                  >
                    <div className="text-center space-y-3">
                      <div className="h-16 w-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Upload className="h-8 w-8 text-gray-400 group-hover:text-orange-500 transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 group-hover:text-orange-600 transition-colors">
                          Clique para selecionar uma imagem
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG ou JPEG
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dicas */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-900 mb-2">💡 Dicas para melhor resultado</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Certifique-se de que há apenas um rosto visível</li>
                  <li>• Mantenha boa iluminação e olhe diretamente para a câmera</li>
                  <li>• Remova óculos ou acessórios que cubram o rosto</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Etapa de Review */
            <div className="space-y-6">
              {capturedImage && (
                <div className="space-y-4">
                  {/* Preview da imagem */}
                  <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden border-2 border-gray-200">
                    <img
                      src={capturedImage}
                      alt="Preview"
                      className="w-full h-auto max-h-96 object-contain"
                    />
                    {faceValidated && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-medium">Rosto validado</span>
                      </div>
                    )}
                  </div>

                  {/* Status de validação */}
                  {validating && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Validando rosto...</p>
                        <p className="text-xs text-blue-700">Aguarde enquanto analisamos a imagem</p>
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
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Rosto detectado com sucesso!</p>
                        <p className="text-xs text-green-700">A imagem está pronta para ser salva</p>
                      </div>
                    </div>
                  )}

                  {/* Botão para revalidar */}
                  {!validating && !faceValidated && (
                    <Button
                      onClick={validateFace}
                      variant="outline"
                      className="w-full"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Tentar Validar Novamente
                    </Button>
                  )}
                </div>
              )}

              {/* Mensagem de sucesso */}
              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    {isRemoving ? "Reconhecimento facial removido com sucesso!" : "Foto facial cadastrada com sucesso!"}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
          <div className="flex justify-between items-center gap-3">
            {step === "review" && currentFacialImageUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRemoveConfirm(true)}
                disabled={loading || isRemoving || success}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button 
                variant="outline" 
                size="sm"
                onClick={step === "capture" ? handleClose : () => setStep("capture")}
                disabled={loading || isRemoving || success}
              >
                {step === "capture" ? "Cancelar" : "Voltar"}
              </Button>
              {step === "review" && capturedImage && faceValidated && !success && (
                <Button
                  size="sm"
                  onClick={saveFacialImage}
                  disabled={loading || !faceValidated}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Salvar Foto
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}
