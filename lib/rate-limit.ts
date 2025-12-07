/**
 * Sistema simples de rate limiting em memória
 * Em produção, considere usar Redis para persistência entre instâncias
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Map para armazenar tentativas por IP
const rateLimitStore = new Map<string, RateLimitEntry>();

// Map para armazenar tentativas por usuário (email)
const userRateLimitStore = new Map<string, RateLimitEntry>();

// Limpar entradas expiradas periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  for (const [key, entry] of userRateLimitStore.entries()) {
    if (now > entry.resetTime) {
      userRateLimitStore.delete(key);
    }
  }
}, 60000); // Limpar a cada minuto

/**
 * Verifica se um IP excedeu o limite de tentativas
 * @param identifier - IP ou identificador único
 * @param maxAttempts - Número máximo de tentativas
 * @param windowMs - Janela de tempo em milissegundos
 * @returns true se dentro do limite, false se excedeu
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutos padrão
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // Nova entrada ou expirada, criar nova
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetAt: now + windowMs,
    };
  }

  // Entrada existente
  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetTime,
    };
  }

  // Incrementar contador
  entry.count++;
  return {
    allowed: true,
    remaining: maxAttempts - entry.count,
    resetAt: entry.resetTime,
  };
}

/**
 * Verifica rate limiting por usuário (email)
 * @param userIdentifier - Email ou ID do usuário
 * @param maxAttempts - Número máximo de tentativas
 * @param windowMs - Janela de tempo em milissegundos
 * @returns true se dentro do limite, false se excedeu
 */
export function checkUserRateLimit(
  userIdentifier: string,
  maxAttempts: number = 3,
  windowMs: number = 15 * 60 * 1000 // 15 minutos padrão
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = userRateLimitStore.get(userIdentifier);

  if (!entry || now > entry.resetTime) {
    // Nova entrada ou expirada, criar nova
    userRateLimitStore.set(userIdentifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetAt: now + windowMs,
    };
  }

  // Entrada existente
  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetTime,
    };
  }

  // Incrementar contador
  entry.count++;
  return {
    allowed: true,
    remaining: maxAttempts - entry.count,
    resetAt: entry.resetTime,
  };
}

/**
 * Obtém o IP do cliente da requisição
 */
export function getClientIP(request: Request): string {
  // Tentar obter do header X-Forwarded-For (proxies/reverse proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Tentar obter do header X-Real-IP
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback (não confiável em produção)
  return 'unknown';
}

