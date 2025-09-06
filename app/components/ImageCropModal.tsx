"use client";

import { Check, Crop as CropIcon, RotateCcw, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactCrop, {
    Crop,
    PixelCrop,
    centerCrop,
    makeAspectCrop
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageFile: File) => void;
  onUploadStart?: () => void;
  aspectRatio?: number; // e.g., 1 for square, 16/9 for wide
  maxWidth?: number;
  maxHeight?: number;
}

export function ImageCropModal({
  isOpen,
  onClose,
  onCropComplete,
  onUploadStart,
  aspectRatio = 1, // Default to square
  maxWidth = 800,
  maxHeight = 800,
}: ImageCropModalProps) {
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileRef = useRef<File | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setImgSrc('');
      setCrop(undefined);
      setCompletedCrop(undefined);
      setScale(1);
      setRotate(0);
      setIsProcessing(false);
      fileRef.current = null;
    }
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      fileRef.current = file;
      setCrop(undefined); // Makes crop preview update between images.
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || '')
      );
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (aspectRatio) {
      const { width, height } = e.currentTarget;
      setCrop(centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          aspectRatio,
          width,
          height
        ),
        width,
        height
      ));
    }
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
    
    // Calculate the actual crop dimensions
    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;

    // Set canvas size to crop size
    canvas.width = Math.floor(cropWidth);
    canvas.height = Math.floor(cropHeight);

    // Scale the canvas context
    ctx.scale(scale, scale);
    ctx.imageSmoothingQuality = 'high';

    // Rotate if needed
    if (rotate) {
      const rotateCenter = [canvas.width / 2, canvas.height / 2];
      ctx.translate(rotateCenter[0], rotateCenter[1]);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.translate(-rotateCenter[0], -rotateCenter[1]);
    }

    // Draw the cropped image
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
        
        // Create file with original name but add crop suffix
        const originalName = fileRef.current?.name || 'image.jpg';
        const nameWithoutExt = originalName.split('.').slice(0, -1).join('.');
        const ext = originalName.split('.').pop();
        const newName = `${nameWithoutExt}_cropped.${ext}`;
        
        const file = new File([blob], newName, {
          type: blob.type,
          lastModified: Date.now(),
        });
        resolve(file);
      }, 'image/jpeg', 0.95); // High quality JPEG
    });
  };

  const handleCrop = async () => {
    if (!imgRef.current || !completedCrop) {
      return;
    }

    setIsProcessing(true);
    onUploadStart?.();

    try {
      const croppedImageFile = await getCroppedImg(
        imgRef.current,
        completedCrop,
        scale,
        rotate
      );
      
      onCropComplete(croppedImageFile);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Erro ao processar a imagem. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetSettings = () => {
    setScale(1);
    setRotate(0);
    if (imgRef.current && aspectRatio) {
      const { width, height } = imgRef.current;
      setCrop(centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          aspectRatio,
          width,
          height
        ),
        width,
        height
      ));
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        // Close modal when clicking outside the card
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Card className="w-full max-w-4xl max-h-[90vh] bg-white shadow-2xl border-0 flex flex-col">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CropIcon className="h-5 w-5 text-primary" />
            Editar Imagem do Produto
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {!imgSrc ? (
            // File selection area
            <div className="space-y-6">
              <div className="text-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-primary/50 transition-colors">
                  <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Selecione uma imagem
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Escolha uma imagem para editar e fazer o crop
                  </p>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onSelectFile}
                      className="hidden"
                      id="file-input"
                    />
                    <Button
                      type="button"
                      className="bg-primary hover:bg-primary/90 cursor-pointer"
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Escolher Arquivo
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-4">
                    Formatos suportados: JPG, PNG, WEBP, GIF (máx. 5MB)
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Cropping interface
            <div className="space-y-6">
              {/* Image preview and crop area */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-center">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspectRatio}
                    minWidth={50}
                    minHeight={50}
                    className="max-w-full max-h-[400px]"
                  >
                    <img
                      ref={imgRef}
                      alt="Crop me"
                      src={imgSrc}
                      style={{ 
                        transform: `scale(${scale}) rotate(${rotate}deg)`,
                        maxWidth: '100%',
                        maxHeight: '400px',
                        objectFit: 'contain'
                      }}
                      onLoad={onImageLoad}
                      className="rounded-md"
                    />
                  </ReactCrop>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Scale control */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    Zoom: {scale.toFixed(2)}x
                  </label>
                  <Slider
                    value={[scale]}
                    onValueChange={(value) => setScale(value[0])}
                    min={0.5}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Rotate control */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Rotação: {rotate}°
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRotate(0)}
                      className="text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
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

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setImgSrc('');
                    fileRef.current = null;
                  }}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Escolher Outra Imagem
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetSettings}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Resetar Configurações
                </Button>
                
                <Button
                  type="button"
                  onClick={handleCrop}
                  disabled={!completedCrop || isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isProcessing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}