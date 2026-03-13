import { slugifyDocumentName } from './naming.js';

let transientIdCounter = 0;

// Platform-level helper for transient unique entity ids.
// This is infrastructure only: it does not know module schemas or document semantics.
export function createTransientEntityId(baseSlug, fallback = 'entity') {
  const normalizedBase = slugifyDocumentName(baseSlug) || slugifyDocumentName(fallback) || 'entity';
  const timestamp = Date.now().toString(36);
  transientIdCounter = (transientIdCounter + 1) % Number.MAX_SAFE_INTEGER;
  const counter = transientIdCounter.toString(36);

  return `${normalizedBase}_${timestamp}${counter}`;
}
