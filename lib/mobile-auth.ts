import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = process.env.NEXTAUTH_SECRET || 'super-secret-mobile-key-change-me';
const key = new TextEncoder().encode(SECRET_KEY);

export async function signMobileToken(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d') // Sessão mobile longa
        .sign(key);
}

export async function verifyMobileToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, key);
        return payload;
    } catch (error) {
        return null;
    }
}

export async function getMobileSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get('mobile-token')?.value;

    if (!token) return null;

    return await verifyMobileToken(token);
}
