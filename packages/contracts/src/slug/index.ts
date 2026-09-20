const TR_MAP: Record<string, string> = {
  ı: "i",
  İ: "i",
};

export function slugify(name: string): string {
  return name
    .replace(/[ıİ]/g, (ch) => TR_MAP[ch] ?? ch)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
