export function slugifyDocumentName(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\-А-Яа-яЁё]/g, '')
    .toLowerCase();
}