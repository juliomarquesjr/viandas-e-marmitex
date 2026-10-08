/**
 * Decodificação e recorte da foto do perfil, tudo no navegador e sem dependências.
 *
 * O recortador trabalha em coordenadas da própria imagem: `fx` e `fy` são o ponto da
 * imagem que fica no centro do círculo, e `zoom` (1 a MAX_ZOOM) diz quanto da imagem
 * cabe nele. Assim o estado não depende do tamanho da tela e o arquivo final sai da
 * mesma conta que a prévia.
 */

/** Maior lado da imagem mostrada no recortador; fotos de 12 MP viram algo leve. */
const MAX_WORKING_SIDE = 1600;
/** Lado do recorte enviado ao servidor. */
export const OUTPUT_SIZE = 512;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export interface PhotoSource {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface CropView {
  zoom: number;
  fx: number;
  fy: number;
}

export class PhotoDecodeError extends Error {
  constructor() {
    super("decode");
    this.name = "PhotoDecodeError";
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Lado do quadrado recortado, em pixels da imagem. */
export function cropSide(source: Pick<PhotoSource, "width" | "height">, zoom: number): number {
  return Math.min(source.width, source.height) / zoom;
}

/** Mantém o zoom no intervalo e o recorte inteiro dentro da foto: nada de espaço vazio no círculo. */
export function clampView(source: Pick<PhotoSource, "width" | "height">, view: CropView): CropView {
  const zoom = clamp(Number.isFinite(view.zoom) ? view.zoom : MIN_ZOOM, MIN_ZOOM, MAX_ZOOM);
  const half = cropSide(source, zoom) / 2;
  return {
    zoom,
    fx: clamp(Number.isFinite(view.fx) ? view.fx : source.width / 2, half, source.width - half),
    fy: clamp(Number.isFinite(view.fy) ? view.fy : source.height / 2, half, source.height - half),
  };
}

export function initialView(source: Pick<PhotoSource, "width" | "height">): CropView {
  return { zoom: MIN_ZOOM, fx: source.width / 2, fy: source.height / 2 };
}

function loadWithImageElement(file: Blob): Promise<{ drawable: CanvasImageSource; width: number; height: number; release: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const release = () => URL.revokeObjectURL(url);
    img.onload = () => resolve({ drawable: img, width: img.naturalWidth, height: img.naturalHeight, release });
    img.onerror = () => {
      release();
      reject(new PhotoDecodeError());
    };
    img.src = url;
  });
}

/**
 * Lê o arquivo, respeita a orientação do celular e reduz para o tamanho de trabalho.
 * Lança PhotoDecodeError quando o navegador não consegue abrir o arquivo (HEIC sem suporte, por exemplo).
 */
export async function loadPhoto(file: File): Promise<PhotoSource> {
  let drawable: CanvasImageSource | null = null;
  let width = 0;
  let height = 0;
  let release: () => void = () => undefined;

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      drawable = bitmap;
      width = bitmap.width;
      height = bitmap.height;
      release = () => bitmap.close();
    } catch {
      drawable = null;
    }
  }

  if (!drawable) {
    const loaded = await loadWithImageElement(file);
    drawable = loaded.drawable;
    width = loaded.width;
    height = loaded.height;
    release = loaded.release;
  }

  try {
    if (!width || !height) throw new PhotoDecodeError();
    const scale = Math.min(1, MAX_WORKING_SIDE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new PhotoDecodeError();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(drawable, 0, 0, canvas.width, canvas.height);
    return { canvas, width: canvas.width, height: canvas.height };
  } catch (error) {
    throw error instanceof PhotoDecodeError ? error : new PhotoDecodeError();
  } finally {
    release();
  }
}

/** Desenha a prévia: o quadrado do recorte ocupa `box` px, centrado em um palco de `stage` px. */
export function drawPreview(canvas: HTMLCanvasElement, source: PhotoSource, view: CropView, stage: number, box: number, dpr: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const px = Math.max(1, Math.round(stage * dpr));
  if (canvas.width !== px || canvas.height !== px) {
    canvas.width = px;
    canvas.height = px;
  }
  const scale = (box / cropSide(source, view.zoom)) * dpr; // pixels da tela por pixel da imagem
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, px, px);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.setTransform(scale, 0, 0, scale, px / 2 - view.fx * scale, px / 2 - view.fy * scale);
  ctx.drawImage(source.canvas, 0, 0);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    } catch {
      resolve(null);
    }
  });
}

/** Gera o arquivo de 512×512 com a área visível do círculo (WebP; JPEG se o navegador não gerar WebP). */
export async function renderCrop(source: PhotoSource, view: CropView): Promise<{ blob: Blob; filename: string } | null> {
  const safe = clampView(source, view);
  const side = cropSide(source, safe.zoom);
  const out = document.createElement("canvas");
  out.width = OUTPUT_SIZE;
  out.height = OUTPUT_SIZE;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source.canvas, safe.fx - side / 2, safe.fy - side / 2, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const webp = await canvasToBlob(out, "image/webp", 0.9);
  if (webp && webp.type === "image/webp") return { blob: webp, filename: "foto.webp" };

  // JPEG não tem transparência: o fundo branco evita áreas pretas se a foto original tinha alpha
  const flat = document.createElement("canvas");
  flat.width = OUTPUT_SIZE;
  flat.height = OUTPUT_SIZE;
  const flatCtx = flat.getContext("2d");
  if (!flatCtx) return null;
  flatCtx.fillStyle = "#ffffff";
  flatCtx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  flatCtx.drawImage(out, 0, 0);
  const jpeg = await canvasToBlob(flat, "image/jpeg", 0.9);
  return jpeg ? { blob: jpeg, filename: "foto.jpg" } : null;
}
