"use client";

import { Button } from "@/app/components/ui/button";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Camera, AlertCircle, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  loadModels,
  validateSingleFace,
  extractFaceDescriptor,
  descriptorToArray,
} from "@/lib/facial-recognition";

interface FacialLoginProps {
  onCancel: () => void;
}

export function FacialLogin({ onCancel }: FacialLoginProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const cameraStartedRef = useRef(false);

  // Iniciar webcam
  const startWebcam = useCallback(async () => {
    // Evitar iniciar se já estiver ativa
    if (cameraStartedRef.current) return;
    
    cameraStartedRef.current = true;
    
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user" // Câmera frontal
        },
        audio: false
      });
      setStream(mediaStream);
      
      // Usar setTimeout para garantir que o ref está atualizado
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          console.log('Stream atribuído ao vídeo:', {
            active: mediaStream.active,
            videoTracks: mediaStream.getVideoTracks().length
          });
          
          // Forçar reprodução
          videoRef.current.play().catch(err => {
            console.error('Erro ao iniciar reprodução:', err);
          });
        }
      }, 100);
    } catch (err) {
      cameraStartedRef.current = false;
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
  }, []);

  // Carregar modelos quando o componente montar
  useEffect(() => {
    let mounted = true;
    
    loadModels()
      .then(() => {
        if (mounted) {
          setModelsLoaded(true);
          // Iniciar câmera automaticamente após modelos carregarem
          // Pequeno delay para garantir que tudo está pronto
          setTimeout(() => {
            if (mounted && !cameraStartedRef.current) {
              startWebcam();
            }
          }, 300);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error("Erro ao carregar modelos:", err);
          setError("Erro ao carregar modelos de reconhecimento facial");
        }
      });

    return () => {
      mounted = false;
    };
  }, [startWebcam]);

  // Parar webcam
  const stopWebcam = () => {
    cameraStartedRef.current = false;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Processar login facial
  const handleFacialLogin = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) {
      setError("Aguarde o carregamento dos modelos ou inicie a webcam");
      return;
    }

    setLoading(true);
    setCapturing(true);
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Erro ao acessar canvas");
      }

      // Verificar se o vídeo está pronto e tem dimensões válidas
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        throw new Error("Aguarde a câmera estar pronta");
      }

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error("Vídeo não está pronto. Aguarde um momento e tente novamente");
      }

      // Capturar frame
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Validar rosto
      const validation = await validateSingleFace(canvas);
      if (!validation.valid) {
        setError(validation.message);
        setLoading(false);
        setCapturing(false);
        return;
      }

      // Extrair descriptor
      const descriptor = await extractFaceDescriptor(canvas);
      if (!descriptor) {
        setError("Não foi possível extrair o descriptor facial");
        setLoading(false);
        setCapturing(false);
        return;
      }

      // Converter para array
      const descriptorArray = descriptorToArray(descriptor);

      // Enviar para API de autenticação
      const response = await fetch("/api/auth/facial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor: descriptorArray }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro na autenticação");
      }

      const { user } = await response.json();

      // Criar sessão usando NextAuth com senha especial para login facial
      const signInResult = await signIn("credentials", {
        email: user.email,
        password: "__FACIAL_LOGIN__", // Senha especial para login facial
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error("Erro ao criar sessão. Tente fazer login com email/senha.");
      }

      // Aguardar um pouco para garantir que a sessão foi criada
      await new Promise(resolve => setTimeout(resolve, 300));

      // Redirecionar baseado no role
      const redirectUrl = user.role === "pdv" ? "/pdv" : "/admin";
      window.location.href = redirectUrl;
    } catch (err) {
      console.error("Erro no login facial:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao processar login facial"
      );
      setLoading(false);
      setCapturing(false);
    }
  };

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <div className="space-y-4 flex-1 flex flex-col">

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!stream && !modelsLoaded && (
        <div className="flex items-center justify-center py-6 flex-1">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" />
            <p className="text-sm text-gray-600">Carregando modelos de reconhecimento facial...</p>
          </div>
        </div>
      )}

      {!stream && modelsLoaded && (
        <Button onClick={startWebcam} className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
          <Camera className="h-4 w-4 mr-2" />
          Iniciar Câmera
        </Button>
      )}

      {stream && (
        <div className="space-y-3 flex-1 flex flex-col">
          <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video shadow-xl flex-shrink-0">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ 
                transform: 'scaleX(-1)' // Espelhar horizontalmente para parecer um espelho
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  console.log('Vídeo pronto:', {
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight,
                    readyState: videoRef.current.readyState,
                    srcObject: videoRef.current.srcObject !== null
                  });
                }
              }}
              onLoadedData={() => {
                if (videoRef.current) {
                  videoRef.current.play().catch(err => {
                    console.error('Erro ao reproduzir vídeo:', err);
                  });
                }
              }}
              onError={(e) => {
                console.error('Erro no vídeo:', e);
                setError('Erro ao reproduzir vídeo da câmera');
              }}
            />
            <canvas ref={canvasRef} className="hidden" />
            {/* Overlay de guia */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="border-2 border-white/30 rounded-full w-48 h-48" />
            </div>
            {capturing && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <div className="text-white text-center space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto" />
                  <p className="font-medium">Processando reconhecimento...</p>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleFacialLogin}
            disabled={loading || !modelsLoaded || capturing}
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {loading || capturing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reconhecendo...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Fazer Login
              </>
            )}
          </Button>
        </div>
      )}

    </div>
  );
}

