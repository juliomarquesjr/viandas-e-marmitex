import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        const cookieStore = await cookies();

        // Deletar o cookie mobile-token
        cookieStore.delete('mobile-token');

        return NextResponse.json(
            { message: 'Logout realizado com sucesso' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Erro no logout mobile:', error);
        return NextResponse.json(
            { error: 'Erro ao fazer logout' },
            { status: 500 }
        );
    }
}
