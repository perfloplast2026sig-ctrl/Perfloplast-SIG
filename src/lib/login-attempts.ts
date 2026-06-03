const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type AttemptState = {
  count: number;
  firstAttemptAt: number;
};

const attempts = new Map<string, AttemptState>();

export function assertLoginAllowed(key: string) {
  const normalized = key.trim().toLowerCase();
  const now = Date.now();
  const current = attempts.get(normalized);

  if (!current || now - current.firstAttemptAt > WINDOW_MS) {
    return;
  }

  if (current.count >= MAX_ATTEMPTS) {
    throw new Error("Demasiados intentos. Espera unos minutos antes de intentar de nuevo.");
  }
}

export function registerFailedLogin(key: string) {
  const normalized = key.trim().toLowerCase();
  const now = Date.now();
  const current = attempts.get(normalized);

  if (!current || now - current.firstAttemptAt > WINDOW_MS) {
    attempts.set(normalized, { count: 1, firstAttemptAt: now });
    return;
  }

  attempts.set(normalized, { ...current, count: current.count + 1 });
}

export function clearFailedLogins(key: string) {
  attempts.delete(key.trim().toLowerCase());
}
