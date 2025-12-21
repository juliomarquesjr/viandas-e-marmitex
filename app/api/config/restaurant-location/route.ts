import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obter localização do restaurante
export async function GET() {
  try {
    const [latConfig, lngConfig] = await Promise.all([
      prisma.systemConfig.findUnique({
        where: { key: 'restaurant_latitude' }
      }),
      prisma.systemConfig.findUnique({
        where: { key: 'restaurant_longitude' }
      })
    ]);

    const latitude = latConfig?.value ? parseFloat(latConfig.value) : null;
    const longitude = lngConfig?.value ? parseFloat(lngConfig.value) : null;

    if (latitude === null || longitude === null || isNaN(latitude) || isNaN(longitude)) {
      // Retornar coordenadas padrão (São Paulo)
      return NextResponse.json({
        latitude: -23.5505,
        longitude: -46.6333,
        default: true
      });
    }

    return NextResponse.json({
      latitude,
      longitude,
      default: false
    });
  } catch (error) {
    console.error('Error fetching restaurant location:', error);
    // Retornar coordenadas padrão em caso de erro
    return NextResponse.json({
      latitude: -23.5505,
      longitude: -46.6333,
      default: true
    });
  }
}

