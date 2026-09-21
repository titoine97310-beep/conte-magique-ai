// Older app builds have no requestId. Match only the same authenticated user's inputs.
export function findLegacyResume(docs, { uid, imagesHash, narrationHash, model }) {
  return docs.filter(doc => {
    const value = doc.data();
    return value.uid === uid && value.status === 'partial' && value.animationVersion === 2 &&
      value.imagesHash === imagesHash && value.narrationHash === narrationHash && value.model === model;
  }).sort((a, b) => (b.data().createdAt?.toMillis?.() || 0) - (a.data().createdAt?.toMillis?.() || 0))[0]?.id || null;
}
