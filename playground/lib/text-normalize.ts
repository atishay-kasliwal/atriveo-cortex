export function normalizeEntityText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]+$/g, "");
}

export function displayEntityText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}
