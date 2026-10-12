"use client";

import { cn } from "@/lib/utils";
import { Download, Loader2, Maximize, Maximize2, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const HIDE_AFTER_MS = 2600;

/** "1:05" ou "1:02:03". */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

interface VideoPlayerProps {
  src: string;
  /** Nome do arquivo para baixar e texto de acessibilidade. */
  label: string;
  /** "inline": dentro da mensagem (compacto). "modal": janela ampliada (todos os controles). */
  variant: "inline" | "modal";
  autoPlay?: boolean;
  /** Começa neste ponto (segundos). */
  startAt?: number;
  /** Pausa por fora (ex.: o vídeo ampliado está tocando). */
  suspended?: boolean;
  /** Botão "ampliar em janela" (só no inline). */
  onExpand?: (currentTime: number) => void;
  /** Avisa o ponto atual de tempos em tempos (para o vídeo ampliado e o da mensagem seguirem juntos). */
  onTime?: (currentTime: number) => void;
  /** O arquivo não chegou (rede, expirou no WhatsApp). */
  onUnavailable?: () => void;
  onLoaded?: () => void;
}

/**
 * Player de vídeo do sistema, no lugar dos controles do navegador: tocar/pausar, barra de progresso com o que já
 * carregou, volume, velocidade, abrir em janela, tela cheia e baixar. Atalhos com o foco no player: espaço ou K
 * (tocar), ← → (5 s), J L (10 s), ↑ ↓ (volume), M (mudo), F (tela cheia), 0 a 9 (pular para a posição).
 */
export function VideoPlayer({ src, label, variant, autoPlay = false, startAt, suspended = false, onExpand, onTime, onUnavailable, onLoaded }: VideoPlayerProps) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const lastReported = useRef(0);
  const scrubbing = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [ended, setEnded] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [showRates, setShowRates] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controls, setControls] = useState(true);
  const [unsupported, setUnsupported] = useState(false);

  const modal = variant === "modal";

  // ---- controles que somem sozinhos enquanto o vídeo toca
  const wake = useCallback(() => {
    setControls(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (video.current && !video.current.paused) {
        setControls(false);
        setShowRates(false);
      }
    }, HIDE_AFTER_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  // ---- ações
  const toggle = useCallback(() => {
    const el = video.current;
    if (!el) return;
    if (el.ended) el.currentTime = 0;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const el = video.current;
    if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = Math.min(Math.max(0, el.currentTime + delta), el.duration);
  }, []);

  const changeVolume = useCallback((value: number) => {
    const el = video.current;
    if (!el) return;
    const v = Math.min(1, Math.max(0, value));
    el.volume = v;
    el.muted = v === 0;
  }, []);

  const toggleMute = useCallback(() => {
    const el = video.current;
    if (el) el.muted = !el.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = box.current;
    const vid = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    } else if (el.requestFullscreen) {
      void el.requestFullscreen().catch(() => undefined);
    } else if (vid?.webkitEnterFullscreen) {
      vid.webkitEnterFullscreen(); // iPhone: só o vídeo vai para a tela cheia
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ---- pausa por fora e ponto de partida
  useEffect(() => {
    if (suspended) video.current?.pause();
  }, [suspended]);

  useEffect(() => {
    const el = video.current;
    if (el && startAt !== undefined && Math.abs(el.currentTime - startAt) > 1) el.currentTime = startAt;
  }, [startAt]);

  // ---- eventos do <video>
  const syncBuffered = () => {
    const el = video.current;
    if (!el || el.buffered.length === 0) return;
    setBuffered(el.buffered.end(el.buffered.length - 1));
  };

  // Erro: se o arquivo existe mas o navegador não decodifica (ex.: vídeo de iPhone em HEVC), oferece baixar; senão, não chegou.
  const onError = async () => {
    try {
      const probe = await fetch(src, { headers: { Range: "bytes=0-0" }, cache: "no-store" });
      if (probe.ok || probe.status === 206) {
        setUnsupported(true);
        return;
      }
    } catch {
      /* sem rede: cai em "indisponível" */
    }
    onUnavailable?.();
  };

  // ---- teclado
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement && e.target.type === "range" && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) return;
    const el = video.current;
    if (!el) return;
    let handled = true;
    switch (e.key) {
      case " ":
      case "k":
      case "K":
        if (e.target instanceof HTMLButtonElement) return; // o botão focado cuida do espaço
        toggle();
        break;
      case "ArrowLeft":
        seekBy(-5);
        break;
      case "ArrowRight":
        seekBy(5);
        break;
      case "j":
      case "J":
        seekBy(-10);
        break;
      case "l":
      case "L":
        seekBy(10);
        break;
      case "ArrowUp":
        changeVolume(el.volume + 0.1);
        break;
      case "ArrowDown":
        changeVolume(el.volume - 0.1);
        break;
      case "m":
      case "M":
        toggleMute();
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      default:
        if (/^[0-9]$/.test(e.key) && Number.isFinite(el.duration)) el.currentTime = (el.duration * Number(e.key)) / 10;
        else handled = false;
    }
    if (handled) {
      e.preventDefault();
      wake();
    }
  };

  if (unsupported) {
    return (
      <div className={cn("flex flex-col items-start gap-2 rounded-lg bg-slate-900 p-3 text-[12.5px] text-slate-200", modal ? "min-h-[200px] items-center justify-center text-center text-sm" : "max-w-[260px]")} role="alert">
        <span>Este vídeo não abre no navegador (o formato pode não ser compatível). Baixe para assistir no seu computador.</span>
        <a href={src} download={label} className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1.5 font-semibold text-white hover:bg-white/25">
          <Download className="h-4 w-4" aria-hidden />
          Baixar vídeo
        </a>
      </div>
    );
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const loadedPct = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;
  const showBar = controls || !playing || showRates;
  const btn = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return (
    <div
      ref={box}
      tabIndex={0}
      role="group"
      aria-label={`Player de vídeo: ${label}`}
      onKeyDown={onKeyDown}
      onPointerMove={wake}
      onPointerDown={wake}
      className={cn(
        "group/player relative select-none overflow-hidden bg-black text-white outline-none focus-visible:ring-2 focus-visible:ring-primary",
        modal ? "w-full" : "inline-flex max-w-full rounded-lg",
        fullscreen && "flex h-full w-full items-center justify-center rounded-none",
        !showBar && playing && "cursor-none",
      )}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={video}
        src={`${src}#t=0.1`}
        preload="metadata"
        playsInline
        autoPlay={autoPlay}
        onClick={toggle}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          if (startAt !== undefined && startAt > 0) e.currentTarget.currentTime = startAt;
          onLoaded?.();
        }}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          if (!scrubbing.current) setCurrent(e.currentTarget.currentTime);
          syncBuffered();
          const now = Date.now();
          if (onTime && now - lastReported.current > 400) {
            lastReported.current = now;
            onTime(e.currentTarget.currentTime);
          }
        }}
        onProgress={syncBuffered}
        onPlay={() => {
          setPlaying(true);
          setEnded(false);
          wake();
        }}
        onPause={() => {
          setPlaying(false);
          setControls(true);
          onTime?.(video.current?.currentTime ?? 0);
        }}
        onEnded={() => {
          setEnded(true);
          setPlaying(false);
          setControls(true);
        }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
        onRateChange={(e) => setRate(e.currentTarget.playbackRate)}
        onError={() => void onError()}
        className={cn("block bg-black", modal ? "max-h-[78vh] w-full object-contain" : "max-h-72 min-h-[110px] min-w-[236px] max-w-full", fullscreen && "h-full max-h-none w-full object-contain")}
      />

      {/* tocar grande no meio, quando parado */}
      {(!playing || ended) && !waiting && (
        <button
          type="button"
          onClick={toggle}
          aria-label={ended ? "Assistir de novo" : "Tocar vídeo"}
          className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {ended ? <RotateCcw className="h-6 w-6" aria-hidden /> : <Play className="ml-0.5 h-7 w-7 fill-current" aria-hidden />}
        </button>
      )}
      {waiting && (
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" role="status" aria-label="Carregando o vídeo">
          <Loader2 className="h-8 w-8 animate-spin text-white drop-shadow" />
        </span>
      )}

      {/* barra de controles */}
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2 pb-1.5 pt-6 transition-opacity duration-200", showBar ? "opacity-100" : "opacity-0")}>
        <div className={cn("relative mx-1 h-5", showBar && "pointer-events-auto")}>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25 transition-all group-hover/player:h-1.5">
            <div className="absolute inset-y-0 left-0 bg-white/35" style={{ width: `${loadedPct}%` }} />
            <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(current, duration || 0)}
            aria-label="Posição do vídeo"
            aria-valuetext={`${formatTime(current)} de ${formatTime(duration)}`}
            onPointerDown={() => {
              scrubbing.current = true;
            }}
            onChange={(e) => {
              const t = Number(e.target.value);
              setCurrent(t);
              if (video.current) video.current.currentTime = t;
            }}
            onPointerUp={() => {
              scrubbing.current = false;
            }}
            onBlur={() => {
              scrubbing.current = false;
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <span className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-transform group-hover/player:scale-125" style={{ left: `${progress}%` }} aria-hidden />
        </div>

        <div className={cn("flex items-center gap-0.5", showBar && "pointer-events-auto")}>
          <button type="button" onClick={toggle} className={btn} aria-label={playing ? "Pausar" : ended ? "Assistir de novo" : "Tocar"}>
            {playing ? <Pause className="h-5 w-5 fill-current" aria-hidden /> : <Play className="h-5 w-5 fill-current" aria-hidden />}
          </button>
          <span className="mx-1 min-w-[78px] text-xs tabular-nums text-white/90">
            {formatTime(current)} / {formatTime(duration)}
          </span>
          <span className="flex-1" />

          <div className="flex items-center">
            <button type="button" onClick={toggleMute} className={btn} aria-label={muted || volume === 0 ? "Ativar o som" : "Silenciar"}>
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
            </button>
            {modal && (
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                aria-label="Volume"
                className="hidden h-1 w-16 cursor-pointer accent-white sm:block"
              />
            )}
          </div>

          {modal && (
            <div className="relative">
              <button type="button" onClick={() => setShowRates((v) => !v)} className={cn(btn, "w-auto px-2 text-xs font-semibold tabular-nums")} aria-label={`Velocidade ${rate}x`} aria-expanded={showRates} aria-haspopup="menu">
                {rate}x
              </button>
              {showRates && (
                <ul role="menu" aria-label="Velocidade de reprodução" className="absolute bottom-10 right-0 z-10 min-w-[84px] overflow-hidden rounded-lg bg-black/90 py-1 text-sm shadow-xl ring-1 ring-white/15">
                  {SPEEDS.map((s) => (
                    <li key={s} role="none">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={s === rate}
                        onClick={() => {
                          if (video.current) video.current.playbackRate = s;
                          setShowRates(false);
                        }}
                        className={cn("flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left hover:bg-white/15 focus-visible:bg-white/15 focus-visible:outline-none", s === rate && "font-bold text-primary")}
                      >
                        {s === 1 ? "Normal" : `${s}x`}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {modal && (
            <a href={src} download={label} className={btn} aria-label="Baixar o vídeo" title="Baixar">
              <Download className="h-5 w-5" aria-hidden />
            </a>
          )}
          {onExpand && (
            <button
              type="button"
              onClick={() => {
                video.current?.pause();
                onExpand(video.current?.currentTime ?? 0);
              }}
              className={btn}
              aria-label="Ampliar em uma janela"
              title="Ampliar"
            >
              <Maximize2 className="h-5 w-5" aria-hidden />
            </button>
          )}
          <button type="button" onClick={toggleFullscreen} className={btn} aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"} title={fullscreen ? "Sair da tela cheia (F)" : "Tela cheia (F)"}>
            {fullscreen ? <Minimize className="h-5 w-5" aria-hidden /> : <Maximize className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  );
}
