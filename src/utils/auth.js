export const AUTH_TOKEN_KEY = "auth_token";
export const AUTH_USER_KEY = "auth_user";

function isBrowser() {
  return typeof window !== "undefined";
}

function readLocalStorage(key) {
  if (!isBrowser()) {
    return "";
  }

  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeLocalStorage(key, value) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function removeLocalStorage(key) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

export function normalizeAuthToken(token, tokenType = "Bearer") {
  const rawToken = typeof token === "string" ? token.trim() : "";
  if (!rawToken) {
    return "";
  }

  if (/^[A-Za-z]+\s+.+$/.test(rawToken)) {
    return rawToken;
  }

  const normalizedType = typeof tokenType === "string" ? tokenType.trim() : "";
  if (!normalizedType) {
    return rawToken;
  }

  return `${normalizedType} ${rawToken}`;
}

export function getStoredAuthToken() {
  const current = readLocalStorage(AUTH_TOKEN_KEY);
  if (!current) {
    return "";
  }

  const normalized = normalizeAuthToken(current);
  if (normalized && normalized !== current) {
    writeLocalStorage(AUTH_TOKEN_KEY, normalized);
  }

  return normalized;
}

export function getStoredAuthUser() {
  const raw = readLocalStorage(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuthSession(payload) {
  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const token = normalizeAuthToken(source?.token, source?.tokenType || "Bearer");

  if (token) {
    writeLocalStorage(AUTH_TOKEN_KEY, token);
  }

  if (source?.user && typeof source.user === "object") {
    writeLocalStorage(AUTH_USER_KEY, JSON.stringify(source.user));
  }

  return token;
}

export function clearStoredAuth() {
  removeLocalStorage(AUTH_TOKEN_KEY);
  removeLocalStorage(AUTH_USER_KEY);
}
