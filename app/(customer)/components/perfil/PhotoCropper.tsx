"use client";

import { Minus, Plus } from "lucide-react";
import * as React from "react";
import { clampView, cropSide, drawPreview, MAX_ZOOM, MIN_ZOOM, type CropView, type PhotoSource } from "./photo-utils";

/** Parte do palco ocupada pelo círculo (o resto é a margem escurecida). Combina com `inset` em photo.css. */
const CIRCLE_RATIO = 0.88;
const KEY_STEP = 0.05; // fração do recorte que cada toque de seta move
const KEY_ZOOM = 1.1;

/**
 * Recortador circular. Arrastar move a foto; pinça, roda do mouse, controle de zoom e
 * teclado ampliam. A foto sempre cobre o círculo inteiro.
 */
export function PhotoCropper({
  source,
  view,
  onViewChange,
  disabled = false,
}: {
  source: PhotoSource;
  view: CropView;
  onViewChange: (view: CropView) => void;
  disabled?: boolean;
}) {
  const uid = React.useId();
  const hintId = `${uid}-hint`;
  const rangeId = `${uid}-zoom`;

  const stageRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [size, setSize] = React.useState(0);

  // O estado mais novo, para vários eventos seguidos não partirem de um valor velho
  const latest = React.useRef(view);
  latest.current = view;

  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const pinch = React.useRef<{ dist: number; zoom: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const apply = React.useCallback(
    (next: CropView) => {
      const safe = clampView(source, next);
      latest.current = safe;
      onViewChange(safe);
    },
    [source, onViewChange]
  );

  /* ---- tamanho do palco */
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setSize(el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* ---- prévia */
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size <= 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    drawPreview(canvas, source, view, size, size * CIRCLE_RATIO, dpr);
  }, [source, view, size]);

  /** Pixels da tela por pixel da imagem. */
  const pixelsPerUnit = () => (size * CIRCLE_RATIO) / cropSide(source, latest.current.zoom);

  const zoomBy = React.useCallback(
    (factor: number) => apply({ ...latest.current, zoom: latest.current.zoom * factor }),
    [apply]
  );

  /* ---- roda do mouse (precisa de listener não passivo para segurar a rolagem da página) */
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el || disabled) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [disabled, zoomBy]);

  /* ---- arrastar e pinça */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setDragging(true);
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: latest.current.zoom };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous || disabled) return;
    const current = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, current);

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      apply({ ...latest.current, zoom: pinch.current.zoom * (dist / pinch.current.dist) });
      return;
    }

    if (size <= 0) return;
    const k = pixelsPerUnit();
    const v = latest.current;
    apply({ ...v, fx: v.fx - (current.x - previous.x) / k, fy: v.fy - (current.y - previous.y) / k });
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) setDragging(false);
  };

  /* ---- teclado */
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || e.ctrlKey || e.metaKey || e.altKey) return;
    const v = latest.current;
    const step = cropSide(source, v.zoom) * KEY_STEP;
    switch (e.key) {
      case "ArrowLeft":
        apply({ ...v, fx: v.fx + step });
        break;
      case "ArrowRight":
        apply({ ...v, fx: v.fx - step });
        break;
      case "ArrowUp":
        apply({ ...v, fy: v.fy + step });
        break;
      case "ArrowDown":
        apply({ ...v, fy: v.fy - step });
        break;
      case "+":
      case "=":
        zoomBy(KEY_ZOOM);
        break;
      case "-":
      case "_":
        zoomBy(1 / KEY_ZOOM);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const percent = Math.round(view.zoom * 100);

  return (
    <div className="c-crop">
      <div
        ref={stageRef}
        className={dragging ? "c-crop-stage is-dragging" : "c-crop-stage"}
        role="application"
        aria-label="Ajuste da foto"
        aria-describedby={hintId}
        tabIndex={disabled ? -1 : 0}
        data-autofocus=""
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
      >
        <canvas ref={canvasRef} className="c-crop-canvas" aria-hidden="true" />
        <span className="c-crop-mask" aria-hidden="true" />
      </div>
      <p id={hintId} className="c-crop-hint">
        Arraste a foto para enquadrar. Para ampliar, use dois dedos, a roda do mouse ou o controle abaixo. No teclado, as setas movem a foto e as teclas + e - ampliam.
      </p>

      <div className="c-crop-zoom">
        <button
          type="button"
          className="c-crop-step"
          onClick={() => zoomBy(1 / KEY_ZOOM)}
          disabled={disabled || view.zoom <= MIN_ZOOM}
          aria-label="Diminuir zoom"
        >
          <Minus size={20} aria-hidden="true" />
        </button>
        <div className="c-crop-range">
          <label htmlFor={rangeId}>Zoom</label>
          <input
            id={rangeId}
            type="range"
            min={MIN_ZOOM * 100}
            max={MAX_ZOOM * 100}
            step={1}
            value={percent}
            disabled={disabled}
            aria-valuetext={`${percent}%`}
            onChange={(e) => apply({ ...latest.current, zoom: Number(e.target.value) / 100 })}
          />
        </div>
        <button
          type="button"
          className="c-crop-step"
          onClick={() => zoomBy(KEY_ZOOM)}
          disabled={disabled || view.zoom >= MAX_ZOOM}
          aria-label="Aumentar zoom"
        >
          <Plus size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
