/**
 * Utilitários puros de descriptor facial compartilhados entre client/server.
 * Este módulo não deve importar face-api.js para evitar warnings no build.
 */
export function compareDescriptors(
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[]
): number {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error("Descriptors devem ter o mesmo tamanho");
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

export function calculateSimilarity(
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[]
): number {
  const distance = compareDescriptors(descriptor1, descriptor2);
  return 1 / (1 + distance);
}

export function isMatch(
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[],
  threshold: number = 0.6
): boolean {
  const similarity = calculateSimilarity(descriptor1, descriptor2);
  return similarity >= threshold;
}

export function descriptorToArray(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}

export function arrayToDescriptor(array: number[]): Float32Array {
  return new Float32Array(array);
}
