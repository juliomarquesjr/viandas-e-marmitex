"use client";

import { Button } from "@/app/components/ui/button";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Slider } from "@/app/components/ui/slider";
import { SectionDivider } from "@/app/components/ui/section-divider";
import {
  Upload,
  AlertCircle,
  ArrowLeft,
  Check,
  Crop as CropIcon,
  RotateCcw,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ProductPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoUrl?: string | null;
  onPhotoSelected: (file: File) => void;
  onRemovePhoto: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ProductPhotoModal({
  isOpen,
  onClose,
  currentPhotoUrl,
  onPhotoSelected,
  onRemovePhoto,
}: ProductPhotoModalProps) {
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const fileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset ao abrir/fechar e abrir file picker automaticamente
  useEffect(() => {
    if (isOpen) {
      setUploadedImageSrc('');
      setCrop(undefined);
      setCompletedCrop(undefined);
      setScale(1);
      setRotate(0);
      setIsProcessing(false);
      setError(null);
      fileRef.current = null;
      
      // Abrir file picker automaticamente após pequeno delay
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Formato não suportado. Use JPG, PNG, WebP ou GIF.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Arquivo muito grande. O tamanho máximo é 5MB.";
    }
    return null;
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const validationError = validateFile(file);

      if (validationError) {
        setError(validationError);
        // Limpa o input para permitir nova seleção
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setError(null);
      fileRef.current = file;
      setCrop(undefined);
      setCompletedCrop(undefined);
      
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const result = reader.result?.toString() || '';
        setUploadedImageSrc(result);
      });
      reader.addEventListener('error', () => {
        setError('Erro ao ler arquivo de imagem.');
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        1,
        width,
        height
      ),
      width,
      height
    ));
  };

  const getCroppedImg = (
    image: HTMLImageElement,
    crop: PixelCrop,
    scale: number = 1,
    rotate: number = 0
  ): Promise<File> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;

    canvas.width = Math.floor(cropWidth);
    canvas.height = Math.floor(cropHeight);

    ctx.scale(scale, scale);
    ctx.imageSmoothingQuality = 'high';

    if (rotate) {
      const rotateCenter = [canvas.width / 2, canvas.height / 2];
      ctx.translate(rotateCenter[0], rotateCenter[1]);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.translate(-rotateCenter[0], -rotateCenter[1]);
    }

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Canvas is empty');
        }

        const originalName = fileRef.current?.name || 'image.jpg';
        const nameWithoutExt = originalName.split('.').slice(0, -1).join('.');
        const ext = originalName.split('.').pop();
        const newName = `${nameWithoutExt}_cropped.${ext}`;

        const file = new File([blob], newName, {
          type: blob.type,
          lastModified: Date.now(),
        });
        resolve(file);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleConfirmCrop = async () => {
    if (!imgRef.current || !completedCrop) {
      return;
    }

    setIsProcessing(true);

    try {
      const croppedImageFile = await getCroppedImg(
        imgRef.current,
        completedCrop,
        scale,
        rotate
      );

      onPhotoSelected(croppedImageFile);
      handleClose();
    } catch (err) {
      console.error('Error cropping image:', err);
      setError('Erro ao processar a imagem. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCropSettings = () => {
    setScale(1);
    setRotate(0);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          1,
          width,
          height
        ),
        width,
        height
      ));
    }
  };

  const handleClose = () => {
    setUploadedImageSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setScale(1);
    setRotate(0);
    setIsProcessing(false);
    setError(null);
    fileRef.current = null;
    onClose();
  };

  const handleRemovePhoto = () => {
    onRemovePhoto();
    handleClose();
  };

  const handleCancel = () => {
    // Se o usuário cancelou antes de fazer o crop, apenas fecha
    if (!uploadedImageSrc) {
      handleClose();
    } else {
      // Se já selecionou imagem mas não quer fazer crop, limpa e fecha
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent higherZIndex className="sm:max-w-[600px] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: "var(--modal-header-icon-bg)" }}
            >
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Editar Imagem do Produto
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Ajuste e faça o crop da imagem
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Foto atual */}
          {currentPhotoUrl && (
            <>
              <SectionDivider label="Imagem Atual" />
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg overflow-hidden border-2 border-white shadow-md shrink-0">
                  <img src={currentPhotoUrl} alt="Imagem atual" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">Imagem atual</p>
                  <p className="text-xs text-slate-500">Selecione uma nova para substituir ou remova</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemovePhoto}
                  className="border-red-200 text-red-600 hover:bg-red-50 shrink-0 text-xs h-8"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Remover
                </Button>
              </div>
            </>
          )}

          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Input file escondido */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={onSelectFile}
            className="hidden"
            id="product-photo-file-input"
          />

          {!uploadedImageSrc ? (
            // Área de seleção de arquivo (caso o usuário cancele o file picker inicial)
            <div>
              <SectionDivider label="Selecionar Imagem" />
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
                    <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, WebP ou JPEG (máx. 5MB)</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Área de crop
            <div className="space-y-4">
              <SectionDivider label="Ajustar Imagem" />
              
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
                        alt="Crop preview"
                        src={uploadedImageSrc}
                        style={{
                          transform: `scale(${scale}) rotate(${rotate}deg)`,
                          maxWidth: '100%',
                          maxHeight: '280px',
                          objectFit: 'contain'
                        }}
                        onLoad={onImageLoad}
                        className="rounded-md"
                      />
                    </ReactCrop>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded bg-amber-50 flex items-center justify-center">
                        <RotateCcw className="h-3 w-3 text-amber-600" />
                      </div>
                      <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                        Rotação
                      </label>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {rotate}°
                    </span>
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

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={resetCropSettings}
                  className="flex-1 h-9 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Resetar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadedImageSrc('');
                    fileRef.current = null;
                    setCrop(undefined);
                    setCompletedCrop(undefined);
                    setScale(1);
                    setRotate(0);
                    // Limpa o valor do input file e abre o seletor
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                      // Pequeno delay para garantir que o estado foi atualizado
                      setTimeout(() => {
                        fileInputRef.current?.click();
                      }, 50);
                    }
                  }}
                  className="flex-1 h-9 text-xs"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Trocar Imagem
                </Button>
              </div>

              <Button
                onClick={handleConfirmCrop}
                disabled={!completedCrop || isProcessing}
                className="w-full h-10"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Aplicar e Salvar
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-100">
          <Button variant="outline" onClick={handleCancel} className="w-full">
            {uploadedImageSrc ? "Cancelar" : "Cancelar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
