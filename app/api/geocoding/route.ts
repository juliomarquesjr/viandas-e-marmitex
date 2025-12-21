import { NextRequest, NextResponse } from 'next/server';

// API para geocodificar endereços usando Nominatim (OpenStreetMap)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Endereço é obrigatório' },
        { status: 400 }
      );
    }

    // Usar Nominatim (OpenStreetMap) - gratuito, sem API key
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Viandas-e-Marmitex/1.0' // Nominatim requer User-Agent
        }
      }
    );

    if (!response.ok) {
      throw new Error('Erro ao buscar coordenadas');
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Endereço não encontrado' },
        { status: 404 }
      );
    }

    const result = data[0];
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Coordenadas inválidas' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      latitude,
      longitude,
      display_name: result.display_name,
      address: result.address
    });
  } catch (error) {
    console.error('Erro ao geocodificar endereço:', error);
    return NextResponse.json(
      { error: 'Erro ao geocodificar endereço' },
      { status: 500 }
    );
  }
}

