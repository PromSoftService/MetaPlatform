function stableSortObject(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => stableSortObject(entry));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return entries.reduce((accumulator, [key, nested]) => {
      accumulator[key] = stableSortObject(nested);
      return accumulator;
    }, {});
  }

  return value;
}

export function normalizeDocumentSnapshot(documentRecord) {
  return stableSortObject({
    moduleId: documentRecord?.moduleId || '',
    document: documentRecord?.document || null
  });
}

export function areDocumentSnapshotsSemanticallyEqual(leftRecord, rightRecord) {
  return JSON.stringify(normalizeDocumentSnapshot(leftRecord)) === JSON.stringify(normalizeDocumentSnapshot(rightRecord));
}
