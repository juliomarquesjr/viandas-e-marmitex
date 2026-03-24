"use client";

import { Button } from "@/app/components/ui/button";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui";
import { Slider } from "@/app/components/ui/slider";
import {
  Camera,
  Upload,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ArrowLeft,
  Check,
  RotateCcw,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface UserPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoUrl?: string;
  onPhotoSelected: (file: File) => void;
  onRemovePhoto: () => void;
}

type Step = "capture" | "preview";

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

export function UserPhotoModal({
  isOpen,
  onClose,
  currentPhotoUrl,
  onPhotoSelected,
  onRemovePhoto,
}: UserPhotoModalProps) {
  const [step, setStep] = useState<Step>("capture");
  const [mode, setMode] = useState<"webcam" | "upload">("webcam");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileRef = useRef<File | null>(null);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setStep("capture");
      setPreviewUrl(null);
      setPendingFile(null);
      setError(null);
      setUploadedImageSrc("");
      setUploadedFile(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setScale(1);
      setRotate(0);
      setIsProcessing(false);
      loadVideoDevices();
    }
  }, [isOpen]);

  const loadVideoDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(videos);
      if (videos.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videos[0].deviceId);
      }
    } catch (err) {
      console.error("Erro ao carregar dispositivos de vídeo:", err);
    }
  };

  useEffect(() => {
    if (!isOpen) stopWebcam();
  }, [isOpen]);

  const startWebcam = async () => {
    setError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
          ...(selectedDeviceId && { deviceId: { exact: selectedDeviceId } }),
        },
        audio: false,
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
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
      const file = new File([blob], "user-photo.jpg", { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      setPendingFile(file);
      setPreviewUrl(url);
      stopWebcam();
      setStep("preview");
    }, "image/jpeg", 0.92);
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      fileRef.current = file;
      setUploadedFile(file);
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener("load", () =>
        setUploadedImageSrc(reader.result?.toString() || "")
      );
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(
      centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, 1, width, height),
        width,
        height
      )
    );
  };

  const getCroppedImg = (
    image: HTMLImageElement,
    crop: PixelCrop,
    scale: number = 1,
    rotate: number = 0
  ): Promise<File> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;

    canvas.width = Math.floor(cropWidth);
    canvas.height = Math.floor(cropHeight);

    ctx.scale(scale, scale);
    ctx.imageSmoothingQuality = "high";

    if (rotate) {
      const rotateCenter = [canvas.width / 2, canvas.height / 2];
      ctx.translate(rotateCenter[0], rotateCenter[1]);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.translate(-rotateCenter[0], -rotateCenter[1]);
    }

    ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) throw new Error("Canvas is empty");
        const originalName = fileRef.current?.name || "image.jpg";
        const nameWithoutExt = originalName.split(".").slice(0, -1).join(".");
        const ext = originalName.split(".").pop();
        const file = new File([blob], `${nameWithoutExt}_cropped.${ext}`, {
          type: blob.type,
          lastModified: Date.now(),
        });
        resolve(file);
      }, "image/jpeg", 0.95);
    });
  };

  const handleConfirmCrop = async () => {
    if (!imgRef.current || !completedCrop) return;
    setIsProcessing(true);
    try {
      const croppedFile = await getCroppedImg(imgRef.current, completedCrop, scale, rotate);
      const url = URL.createObjectURL(croppedFile);
      setPendingFile(croppedFile);
      setPreviewUrl(url);
      setUploadedImageSrc("");
      setUploadedFile(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setScale(1);
      setRotate(0);
      setStep("preview");
    } catch (error) {
      console.error("Error cropping image:", error);
      setError("Erro ao processar a imagem. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCropSettings = () => {
    setScale(1);
    setRotate(0);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(
        centerCrop(
          makeAspectCrop({ unit: "%", width: 90 }, 1, width, height),
          width,
          height
        )
      );
    }
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
    setUploadedImageSrc("");
    setUploadedFile(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setScale(1);
    setRotate(0);
    setIsProcessing(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
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
                      : "Foto do Usuário"
                    : "Confirmar Foto"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {step === "capture"
                    ? "Tire uma foto ou envie um arquivo"
                    : "Confirme antes de salvar"}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {step === "capture" ? (
              <>
                {/* Foto atual */}
                {currentPhotoUrl && (
                  <>
                    <SectionDivider label="Foto Atual" />
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
                      onClick={() => { setMode("webcam"); stopWebcam(); setError(null); }}
                      className={`relative z-10 h-9 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                        mode === "webcam" ? "text-primary font-semibold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Webcam
                    </button>
                    <button
                      onClick={() => { setMode("upload"); stopWebcam(); setError(null); }}
                      className={`relative z-10 h-9 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                        mode === "upload" ? "text-primary font-semibold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Arquivo
                    </button>
                  </div>
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
                          <Button onClick={(e) => { e.stopPropagation(); startWebcam(); }} variant="default" size="sm" className="text-xs h-8">
                            <Camera className="h-3.5 w-3.5 mr-1.5" />
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
                        <div className="flex gap-2">
                          <Button onClick={capturePhoto} className="flex-1 h-8 text-xs">
                            <Camera className="h-3.5 w-3.5 mr-1.5" />
                            Capturar
                          </Button>
                          <Button variant="outline" onClick={stopWebcam} className="h-8 text-xs">
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
                    {!uploadedImageSrc ? (
                      <div>
                        <div
                          onClick={() => document.getElementById("user-file-input")?.click()}
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
                              <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG ou JPEG</p>
                            </div>
                          </div>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={onSelectFile}
                          className="hidden"
                          id="user-file-input"
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <div className="relative w-full flex justify-center overflow-hidden">
                            <div className="max-w-full max-h-[280px] overflow-hidden">
                              <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={1}
                                minWidth={50}
                                minHeight={50}
                                className="max-w-full"
                              >
                                <img
                                  ref={imgRef}
                                  alt="Crop me"
                                  src={uploadedImageSrc}
                                  style={{
                                    transform: `scale(${scale}) rotate(${rotate}deg)`,
                                    maxWidth: "100%",
                                    maxHeight: "280px",
                                    objectFit: "contain",
                                  }}
                                  onLoad={onImageLoad}
                                  className="rounded-md"
                                />
                              </ReactCrop>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {/* Zoom */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded bg-blue-50 flex items-center justify-center">
                                <span className="text-[10px] font-semibold text-blue-600">+</span>
                              </div>
                              <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                Zoom
                              </label>
                              <span className="text-xs text-slate-500 ml-auto font-mono">
                                {scale.toFixed(2)}x
                              </span>
                            </div>
                            <Slider
                              value={[scale]}
                              onValueChange={(value) => setScale(value[0])}
                              min={0.5}
                              max={3}
                              step={0.1}
                              className="w-full"
                            />
                          </div>

                          {/* Rotação */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded bg-blue-50 flex items-center justify-center">
                                  <span className="text-[10px] font-semibold text-blue-600">↻</span>
                                </div>
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                  Rotação
                                </label>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-mono">{rotate}°</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRotate(0)}
                                  className="text-xs h-7 px-2.5 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Reset
                                </Button>
                              </div>
                            </div>
                            <Slider
                              value={[rotate]}
                              onValueChange={(value) => setRotate(value[0])}
                              min={-180}
                              max={180}
                              step={1}
                              className="w-full"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setUploadedImageSrc("");
                                setUploadedFile(null);
                                setCrop(undefined);
                                setCompletedCrop(undefined);
                                setScale(1);
                                setRotate(0);
                              }}
                              className="h-8 text-xs font-medium"
                            >
                              <Upload className="h-3.5 w-3.5 mr-1.5" />
                              Outra Imagem
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={resetCropSettings}
                              className="h-8 text-xs font-medium"
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                              Resetar
                            </Button>
                          </div>
                          <Button
                            type="button"
                            onClick={handleConfirmCrop}
                            disabled={!completedCrop || isProcessing}
                            className="w-full h-9 text-xs font-medium shadow-sm"
                          >
                            {isProcessing ? (
                              <>
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-1.5" />
                                Processando...
                              </>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1.5" />
                                Confirmar e Aplicar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Etapa de preview */
              <>
                <SectionDivider label="Preview da Foto" />
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
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleClose} className="text-xs h-8">
              Cancelar
            </Button>
            {step === "preview" && (
              <Button size="sm" onClick={handleConfirm} disabled={!pendingFile} className="text-xs h-8">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Usar esta foto
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
