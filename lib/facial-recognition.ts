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
 * Compara dois descriptors faciais e retorna a distância euclidiana
 * @param descriptor1 - Primeiro descriptor facial
 * @param descriptor2 - Segundo descriptor facial
 * @returns Distância euclidiana (menor = mais similar)
 */
export function compareDescriptors(
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[]
): number {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Descriptors devem ter o mesmo tamanho');
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Calcula a similaridade entre dois descriptors (0-1, onde 1 é idêntico)
 * @param descriptor1 - Primeiro descriptor facial
 * @param descriptor2 - Segundo descriptor facial
 * @returns Similaridade (0-1)
 */
export function calculateSimilarity(
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[]
): number {
  const distance = compareDescriptors(descriptor1, descriptor2);
  // Converter distância para similaridade (threshold de 0.6 é comum)
  // Similaridade = 1 / (1 + distance)
  return 1 / (1 + distance);
}

/**
 * Verifica se dois descriptors são do mesmo rosto
 * @param descriptor1 - Primeiro descriptor facial
 * @param descriptor2 - Segundo descriptor facial
 * @param threshold - Threshold de similaridade (padrão: 0.6)
 * @returns true se os descriptors correspondem ao mesmo rosto
 */
export function isMatch(
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[],
  threshold: number = 0.6
): boolean {
  const similarity = calculateSimilarity(descriptor1, descriptor2);
  return similarity >= threshold;
}

/**
 * Converte descriptor Float32Array para array de números (para serialização JSON)
 */
export function descriptorToArray(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}

/**
 * Converte array de números para Float32Array
 */
export function arrayToDescriptor(array: number[]): Float32Array {
  return new Float32Array(array);
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

