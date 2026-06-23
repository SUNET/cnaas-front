// Thin wrapper around full-page navigation. Exists as a mockable seam: jsdom 26
// makes `globalThis.location` (and its methods) non-configurable, so tests cannot
// stub `location.replace` directly. Tests mock this module instead.
export function redirectTo(url: string): void {
  globalThis.location.replace(url);
}
