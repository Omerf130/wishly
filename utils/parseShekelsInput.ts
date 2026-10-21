/**
 * Parses user-entered shekel amounts (whole or up to 2 decimal places).
 */
export function parseShekelsInput(raw: string): number | null {
  const normalized = raw.trim().replace(/,/g, '').replace(/₪/g, '');
  if (!normalized) {
    return 0;
  }
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
