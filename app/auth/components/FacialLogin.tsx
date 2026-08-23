"use client";

import { Button } from "@/app/components/ui/button";
import {
  profileInitials,
  profileLabel,
  rememberLogin,
  type RecentLogin,
} from "@/lib/auth/recent-logins";
import {
  descriptorToArray,
  extractFaceDescriptor,
  loadModels,
  validateSingleFace,
} from "@/lib/facial-recognition";
import { AlertCircle, KeyRound, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

/** Guia circular sobre o vídeo, em px. */
const GUIDE_SIZE = 236;
const GUIDE_RADIUS = 112;
const GUIDE_CIRCUMFERENCE = 2 * Math.PI * GUIDE_RADIUS;

/** Intervalo entre tentativas de captura automática. */
const CAPTURE_INTERVAL_MS = 800;

type FacialPhase =
  | "loading-models"
  | "starting-camera"
  | "searching"
  | "recognizing"
  | "error";

const PHASE_MESSAGE: Record<Exclude<FacialPhase, "error">, string> = {
  "loading-models": "Carregando modelos",
  "starting-camera": "Abrindo a câmera",
  searching: "Procurando seu rosto",
  recognizing: "Reconhecendo o rosto",
};

interface FacialLoginProps {
  /** Perfil escolhido antes de abrir a câmera, quando houver. */
  profile: RecentLogin | null;
  onCancel: () => void;
}

export function FacialLogin({ profile, onCancel }: FacialLoginProps) {
  const [phase, setPhase] = useState<FacialPhase>("loading-models");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  const stopWebcam = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const failWith = useCallback((message: string) => {
    if (!mountedRef.current) {
      return;
    }

    setError(message);
    setPhase("error");
  }, []);

  const startWebcam = useCallback(async () => {
    if (streamRef.current) {
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      if (!mountedRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {
          // Autoplay bloqueado: o loop de captura espera o vídeo ficar pronto.
        });
      }

      setPhase("searching");
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          failWith(
            "Permissão de câmera negada. Libere o acesso à câmera para entrar pelo rosto."
          );
          return;
        }

        if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          failWith("Nenhuma câmera encontrada. Verifique se há uma câmera conectada.");
          return;
        }

        failWith(`Erro ao acessar a câmera: ${err.message}`);
        return;
      }

      failWith("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  }, [failWith]);

  // Carregar modelos e abrir a câmera em sequência, sem passo manual.
  useEffect(() => {
    mountedRef.current = true;

    loadModels()
      .then(() => {
        if (!mountedRef.current) {
          return;
        }

        setPhase("starting-camera");
        return startWebcam();
      })
      .catch(() => {
        failWith("Erro ao carregar os modelos de reconhecimento facial.");
      });

    return () => {
      mountedRef.current = false;
      stopWebcam();
    };
  }, [failWith, startWebcam, stopWebcam]);

  const authenticate = useCallback(
    async (descriptor: number[]) => {
      const nonce = `${Date.now()}-${Math.random().toString(36).substring(7)}-${Math.random()
        .toString(36)
        .substring(7)}`;

      const response = await fetch("/api/auth/facial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor, nonce, timestamp: Date.now() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          throw new Error(
            errorData.error || `Muitas tentativas. Aguarde ${retryAfter} segundos.`
          );
        }

        throw new Error(errorData.error || "Rosto não reconhecido.");
      }

      const { user, token } = await response.json();

      if (!token) {
        throw new Error("Token de autenticação não recebido.");
      }

      // O perfil escolhido antes da câmera precisa bater com o rosto reconhecido,
      // senão o operador entraria como outra pessoa sem perceber.
      if (profile && user?.email && user.email !== profile.email) {
        throw new Error(
          `O rosto reconhecido não corresponde ao perfil ${profileLabel(profile)}.`
        );
      }

      const signInResult = await signIn("credentials", {
        email: user.email,
        password: token,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error("Erro ao criar sessão. Entre com e-mail e senha.");
      }

      rememberLogin({
        email: user.email,
        name: user.name ?? null,
        role: user.role ?? null,
        image: user.image ?? null,
        method: "facial",
      });

      stopWebcam();
      await new Promise((resolve) => setTimeout(resolve, 300));
      window.location.href = user.role === "pdv" ? "/pdv" : "/admin";
    },
    [profile, stopWebcam]
  );

  const attemptRecognition = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    if (video.readyState !== video.HAVE_ENOUGH_DATA || !video.videoWidth) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const validation = await validateSingleFace(canvas);

    if (!validation.valid) {
      if (mountedRef.current) {
        // A mensagem da biblioteca fala em "imagem"; aqui a fonte é a câmera ao vivo.
        setHint(
          validation.message.includes("ltiplos") ? "Mais de um rosto na câmera" : null
        );
      }
      return;
    }

    if (!mountedRef.current) {
      return;
    }

    setHint(null);
    setPhase("recognizing");

    try {
      const descriptor = await extractFaceDescriptor(canvas);

      if (!descriptor) {
        if (mountedRef.current) {
          setPhase("searching");
        }
        return;
      }

      await authenticate(descriptorToArray(descriptor));
    } catch (err) {
      failWith(err instanceof Error ? err.message : "Erro ao processar o login facial.");
    }
  }, [authenticate, failWith]);

  // Captura automática: dispara sozinha assim que um rosto encaixa na guia.
  useEffect(() => {
    if (phase !== "searching") {
      return;
    }

    const timer = window.setInterval(() => {
      if (busyRef.current) {
        return;
      }

      busyRef.current = true;
      void attemptRecognition().finally(() => {
        busyRef.current = false;
      });
    }, CAPTURE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [attemptRecognition, phase]);

  const handleRetry = () => {
    setError(null);
    setHint(null);

    if (streamRef.current) {
      setPhase("searching");
      return;
    }

    setPhase("starting-camera");
    void startWebcam();
  };

  const handleCancel = () => {
    stopWebcam();
    onCancel();
  };

  const isRecognizing = phase === "recognizing";
  const isCameraLive = phase === "searching" || phase === "recognizing";

  return (
    <>
      {/* mesma anatomia de cabeçalho da visão de senha */}
      <div className="flex items-center gap-3.5">
        {profile?.image ? (
          <Image
            src={profile.image}
            alt=""
            width={52}
            height={52}
            className="h-[52px] w-[52px] shrink-0 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-primary text-[17px] font-semibold text-white">
            {profile ? profileInitials(profile) : "?"}
          </span>
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-xl font-semibold tracking-tight text-[color:var(--foreground)]">
            {profile ? profileLabel(profile) : "Reconhecimento facial"}
          </span>
          <span className="truncate text-[13px] text-[color:var(--muted-foreground)]">
            Olhe para a câmera para entrar.
          </span>
        </span>
      </div>

      <div
        className="relative mt-6 flex aspect-[4/3] w-full max-w-[420px] items-center justify-center overflow-hidden rounded-xl border border-[color:var(--auth-viewport-border)] bg-[#05080f] shadow-[var(--auth-viewport-shadow)]"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {isCameraLive ? (
          <div
            className="relative"
            style={
              {
                width: GUIDE_SIZE,
                height: GUIDE_SIZE,
                "--auth-scan-distance": `${GUIDE_SIZE - 4}px`,
              } as React.CSSProperties
            }
          >
            <div className="auth-facial-guide absolute inset-0 rounded-full border-2 border-white/25" />

            <svg
              width={GUIDE_SIZE}
              height={GUIDE_SIZE}
              viewBox={`0 0 ${GUIDE_SIZE} ${GUIDE_SIZE}`}
              className="absolute inset-0 -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx={GUIDE_SIZE / 2}
                cy={GUIDE_SIZE / 2}
                r={GUIDE_RADIUS}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={GUIDE_CIRCUMFERENCE}
                strokeDashoffset={
                  isRecognizing ? GUIDE_CIRCUMFERENCE * 0.25 : GUIDE_CIRCUMFERENCE
                }
                className="transition-[stroke-dashoffset] duration-[1200ms] ease-out"
              />
            </svg>

            <div className="auth-facial-scan absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r from-transparent via-blue-500/85 to-transparent" />
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/65 px-8 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm leading-relaxed text-white">{error}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex h-5 items-center gap-2.5 font-mono text-[13px] text-[color:var(--muted-foreground)]">
        {phase === "error" ? null : (
          <>
            <Loader2 className="h-[15px] w-[15px] animate-spin text-primary" />
            {hint && phase === "searching" ? hint : PHASE_MESSAGE[phase]}
          </>
        )}
      </div>

      <div className="mt-5 flex max-w-[420px] flex-col gap-2.5">
        {phase === "error" ? (
          <Button type="button" size="lg" onClick={handleRetry}>
            Tentar novamente
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={handleCancel}
          leftIcon={<KeyRound className="h-[18px] w-[18px]" />}
        >
          Usar senha
        </Button>
      </div>
    </>
  );
}
