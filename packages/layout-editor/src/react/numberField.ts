export function parseFieldNumber(
  text: string,
  positive = false,
): number | null {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) && (!positive || value > 0) ? value : null;
}
