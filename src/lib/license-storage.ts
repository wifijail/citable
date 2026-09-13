/**
 * Browser-side persistence of the visitor's license key.
 * Storage can be unavailable (private mode, blocked site data), so every access
 * is guarded and the app keeps working without it.
 */

const KEY = 'citable.license';
const EVENT = 'citable:license';

export function readStoredLicense(): string {
  try {
    return window.localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function storeLicense(value: string): void {
  try {
    if (value) window.localStorage.setItem(KEY, value);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Ignore: the key still works for the current page session.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

export function onLicenseChange(listener: (value: string) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<string>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
