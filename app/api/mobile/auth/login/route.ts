import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signMobileToken } from '@/lib/mobile-auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { login, password } = body;

        if (!login || !password) {
            return NextResponse.json(
                { error: 'Login e senha são obrigatórios' },
                { status: 400 }
            );
        }

        // Buscar cliente por email ou telefone
        const customer = await prisma.customer.findFirst({
            where: {
                OR: [
                    { email: login },
                    { phone: login }
                ],
                active: true
            }
        });

        if (!customer || !customer.password) {
            return NextResponse.json(
                { error: 'Credenciais inválidas' },
                { status: 401 }
            );
        }

        // Verificar senha
        const isPasswordValid = await bcrypt.compare(password, customer.password);

        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Credenciais inválidas' },
                { status: 401 }
            );
        }

        // Gerar token
        const token = await signMobileToken({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            role: 'customer'
        });

        // Criar resposta com cookie
        const response = NextResponse.json({
            user: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone
            },
            token
        });

        // Definir cookie HttpOnly
        response.cookies.set({
            name: 'mobile-token',
            value: token,
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 30, // 30 dias
            sameSite: 'lax'
        });

        return response;

    } catch (error) {
        console.error('Erro no login mobile:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
