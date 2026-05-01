import * as faceapi from 'face-api.js';

// Cache para modelos carregados
let modelsLoaded = false;

// URLs dos modelos (serão carregados do diretório public/models/)
const MODEL_URL = '/models';

/**
 * Carrega os modelos do face-api.js
 */
export async function loadModels(): Promise<void> {
  if (modelsLoaded) {
    return;
  }

  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    
    modelsLoaded = true;
    console.log('Modelos do face-api.js carregados com sucesso');
  } catch (error) {
    console.error('Erro ao carregar modelos do face-api.js:', error);
    throw new Error('Falha ao carregar modelos de reconhecimento facial');
  }
}

/**
 * Detecta rosto em uma imagem
 * @param image - Elemento HTMLImageElement, HTMLCanvasElement ou ImageData
 * @returns Array de detecções de rosto
 */
export async function detectFace(
  image: HTMLImageElement | HTMLCanvasElement | ImageData
): Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<faceapi.WithFaceDetection<{}>>>[]> {
  if (!modelsLoaded) {
    await loadModels();
  }

  const detections = await faceapi
    .detectAllFaces(image as any, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections;
}

/**
 * Extrai o descriptor facial de uma imagem
 * @param image - Elemento HTMLImageElement, HTMLCanvasElement ou ImageData
 * @returns Descriptor facial (array de números) ou null se nenhum rosto for detectado
 */
export async function extractFaceDescriptor(
  image: HTMLImageElement | HTMLCanvasElement | ImageData
): Promise<Float32Array | null> {
  const detections = await detectFace(image);
  
  if (detections.length === 0) {
    return null;
  }

  // Retorna o descriptor do primeiro rosto detectado
  return detections[0].descriptor;
}

/**
 * Valida se uma imagem contém exatamente um rosto
 * @param image - Elemento HTMLImageElement, HTMLCanvasElement ou ImageData
 * @returns true se exatamente um rosto foi detectado
 */
export async function validateSingleFace(
  image: HTMLImageElement | HTMLCanvasElement | ImageData
): Promise<{ valid: boolean; message: string }> {
  const detections = await detectFace(image);
  
  if (detections.length === 0) {
    return { valid: false, message: 'Nenhum rosto detectado na imagem' };
  }
  
  if (detections.length > 1) {
    return { valid: false, message: 'Múltiplos rostos detectados. Por favor, use uma imagem com apenas um rosto' };
  }
  
  return { valid: true, message: 'Rosto detectado com sucesso' };
}

export { descriptorToArray } from './facial-recognition-shared';

