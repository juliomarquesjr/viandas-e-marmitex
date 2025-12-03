// Decodificador de QR codes para notas fiscais

import jsQR from 'jsqr';
import { QRCodeData } from './types';
import { extractChaveAcesso } from './utils';

/**
 * Decodifica QR code de uma imagem (ImageData, Canvas ou Buffer)
 */
export function decodeQRCodeFromImageData(imageData: ImageData): QRCodeData | null {
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (!code) {
      return null;
    }
    
    return parseQRCodeData(code.data);
  } catch (error) {
    console.error('Erro ao decodificar QR code:', error);
    return null;
  }
}

/**
 * Decodifica QR code de um canvas
 */
export function decodeQRCodeFromCanvas(canvas: HTMLCanvasElement): QRCodeData | null {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return decodeQRCodeFromImageData(imageData);
  } catch (error) {
    console.error('Erro ao decodificar QR code do canvas:', error);
    return null;
  }
}

/**
 * Decodifica QR code de uma imagem HTML
 */
export async function decodeQRCodeFromImage(image: HTMLImageElement): Promise<QRCodeData | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }
    
    ctx.drawImage(image, 0, 0);
    return decodeQRCodeFromCanvas(canvas);
  } catch (error) {
    console.error('Erro ao decodificar QR code da imagem:', error);
    return null;
  }
}

/**
 * Decodifica QR code de um File/Blob
 */
export async function decodeQRCodeFromFile(file: File | Blob): Promise<QRCodeData | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = async () => {
      try {
        const result = await decodeQRCodeFromImage(img);
        URL.revokeObjectURL(url);
        resolve(result);
      } catch (error) {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    
    img.src = url;
  });
}

/**
 * Decodifica QR code de uma string base64
 */
export async function decodeQRCodeFromBase64(base64: string): Promise<QRCodeData | null> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = async () => {
      try {
        const result = await decodeQRCodeFromImage(img);
        resolve(result);
      } catch (error) {
        resolve(null);
      }
    };
    
    img.onerror = () => {
      resolve(null);
    };
    
    img.src = base64;
  });
}

/**
 * Parseia os dados do QR code e extrai URL ou chave de acesso
 */
function parseQRCodeData(data: string): QRCodeData {
  const trimmed = data.trim();
  
  // Tenta extrair chave de acesso
  const chaveAcesso = extractChaveAcesso(trimmed);
  
  // Verifica se é uma URL
  let url: string | undefined;
  try {
    const urlObj = new URL(trimmed);
    url = urlObj.href;
  } catch {
    // Não é uma URL válida
  }
  
  return {
    rawData: trimmed,
    url,
    chaveAcesso: chaveAcesso || undefined,
  };
}

