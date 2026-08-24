/**
 * Rate limiting en memoria + lockout por intentos fallidos.
 *
 * Diseño:
 * - rateLimit: ventana deslizante de N requests por (clave, ventanaMs).
 * - loginAttempts: cuenta intentos fallidos por email/IP, bloquea tras MAX_FAILED.
 *
 * Nota: En memoria (no Redis). Adecuado para single-instance. Para multi-instance,
 * migrar a Redis o DB.
 */

const WINDOW_MS = 60_000; // 1 minuto
const MAX_REQUESTS = 100; // 100 req/min por IP

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60_000; // 5 minutos de bloqueo

type RateEntry = { count: number; resetAt: number };
type LoginEntry = { attempts: number; lockedUntil: number | null };

const rateStore = new Map<string, RateEntry>();
const loginStore = new Map<string, LoginEntry>();

// Limpieza periódica de entradas expiradas (cada 5 min)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateStore) {
      if (entry.resetAt < now) rateStore.delete(key);
    }
    for (const [key, entry] of loginStore) {
      if (entry.lockedUntil && entry.lockedUntil < now && entry.attempts === 0) {
        loginStore.delete(key);
      }
    }
  }, 5 * 60_000).unref?.();
}

/**
 * Rate limiting por clave (normalmente IP).
 * Retorna { allowed, remaining, resetAt }.
 */
export function rateLimit(key: string, limit = MAX_REQUESTS, windowMs = WINDOW_MS) {
  const now = Date.now();
  const entry = rateStore.get(key);

  if (!entry || entry.resetAt < now) {
    rateStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Registrar un intento fallido de login para una clave (email o IP).
 */
export function registerFailedAttempt(key: string) {
  const now = Date.now();
  const entry = loginStore.get(key) ?? { attempts: 0, lockedUntil: null };

  // Si estaba bloqueado y el bloqueo expiró, resetear
  if (entry.lockedUntil && entry.lockedUntil < now) {
    entry.attempts = 0;
    entry.lockedUntil = null;
  }

  entry.attempts++;

  if (entry.attempts >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }

  loginStore.set(key, entry);
}

/**
 * Resetear intentos fallidos tras un login exitoso.
 */
export function resetFailedAttempts(key: string) {
  loginStore.delete(key);
}

/**
 * Verificar si una clave está bloqueada por demasiados intentos fallidos.
 * Retorna { locked, remainingAttempts, lockedUntilMs }.
 */
export function checkLockout(key: string) {
  const now = Date.now();
  const entry = loginStore.get(key);

  if (!entry) {
    return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS, lockedUntilMs: null };
  }

  // Si el bloqueo expiró, resetear
  if (entry.lockedUntil && entry.lockedUntil < now) {
    entry.attempts = 0;
    entry.lockedUntil = null;
    loginStore.set(key, entry);
    return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS, lockedUntilMs: null };
  }

  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      locked: true,
      remainingAttempts: 0,
      lockedUntilMs: entry.lockedUntil,
      lockoutSecondsLeft: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  return {
    locked: false,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - entry.attempts),
    lockedUntilMs: null,
  };
}

/**
 * Obtener IP del request (considerando headers de proxy).
 */
export function getClientIP(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri;
  return "unknown";
}

export const RATE_LIMIT_CONFIG = {
  WINDOW_MS,
  MAX_REQUESTS,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_MS,
};
