export function parseHexColor(text: string): string | null {
  const color = text.trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : null;
}
