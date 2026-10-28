// Case- and accent-insensitive "contains", so "istanbul" finds "İstanbul".
export function matchesQuery(query: string, ...fields: string[]): boolean {
  const needle = fold(query);
  if (needle === "") return true;
  return fields.some((field) => fold(field).includes(needle));
}

function fold(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replaceAll("ı", "i");
}
