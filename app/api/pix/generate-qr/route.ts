import { NextResponse } from 'next/server';
import { QrCodePix } from 'qrcode-pix';
import QRCode from 'qrcode';

/**
 * API route para gerar QR code PIX
 * Retorna o payload PIX que pode ser usado para gerar o QR code
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const {
      chavePix,
      valorCents,
      nomeBeneficiario,
      cidade
    } = body;
    
    // Validações - apenas chavePix e valorCents são obrigatórios
    if (!chavePix || valorCents === undefined || valorCents === null) {
      console.error('Campos obrigatórios faltando:', { chavePix: !!chavePix, valorCents });
      return NextResponse.json(
        { error: 'Campos obrigatórios: chavePix, valorCents' },
        { status: 400 }
      );
    }
    
    // Normalizar chave PIX (emails devem estar em minúsculas)
    let chavePixNormalizada = chavePix.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    if (emailRegex.test(chavePixNormalizada)) {
      chavePixNormalizada = chavePixNormalizada.toLowerCase();
    }
    
    // Normalizar nome do beneficiário - remover espaços extras
    const nomeBeneficiarioNormalizado = nomeBeneficiario 
      ? nomeBeneficiario.trim().replace(/\s+/g, ' ')
      : undefined;
    
    // Normalizar cidade - remover espaços extras e validar que não é CEP
    let cidadeNormalizada = cidade ? cidade.trim().replace(/\s+/g, ' ') : undefined;
    if (cidadeNormalizada) {
      // Validar que não é um CEP (formato 00000-000 ou 00000000)
      const cepRegex = /^\d{5}-?\d{3}$/;
      if (cepRegex.test(cidadeNormalizada)) {
        console.warn('Cidade parece ser um CEP, usando padrão BR:', cidadeNormalizada);
        cidadeNormalizada = undefined;
      }
    }
    
    // Normalizar nome e cidade
    const nomeFinal = nomeBeneficiarioNormalizado || 'PIX';
    const cidadeFinal = cidadeNormalizada || 'BR';
    
    // Converter valor de centavos para reais (biblioteca espera valor em reais)
    const valorReais = Number((valorCents / 100).toFixed(2));
    
    // Validar que o valor é maior que zero
    if (valorReais <= 0) {
      return NextResponse.json(
        { error: 'Valor deve ser maior que zero' },
        { status: 400 }
      );
    }
    
    // Usar biblioteca qrcode-pix para gerar payload PIX válido
    // QR Code dinâmico (com valor fixo) - valor já está incluído no QR Code
    const qrCodePix = QrCodePix({
      version: '01',
      key: chavePixNormalizada,
      name: nomeFinal,
      city: cidadeFinal,
      value: valorReais
    });
    
    // Gerar payload PIX usando a biblioteca
    const pixPayload = await qrCodePix.payload();
    
    // Gerar QR code como imagem base64 usando a própria biblioteca
    let qrCodeDataUrl: string;
    try {
      qrCodeDataUrl = await qrCodePix.base64();
    } catch (error) {
      console.error('Erro ao gerar QR code pela biblioteca, usando fallback:', error);
      // Fallback: usar biblioteca qrcode local
      try {
        qrCodeDataUrl = await QRCode.toDataURL(pixPayload, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          width: 300,
          margin: 2
        });
      } catch (fallbackError) {
        console.error('Erro ao gerar QR code localmente:', fallbackError);
        // Último fallback: serviço externo
        const encodedPayload = encodeURIComponent(pixPayload);
        qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedPayload}`;
      }
    }
    
    return NextResponse.json({
      payload: pixPayload,
      qrCodeUrl: qrCodeDataUrl
    });
  } catch (error) {
    console.error('Erro ao gerar QR code PIX:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar QR code PIX' },
      { status: 500 }
    );
  }
}

