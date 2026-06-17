export function bucketCountForWindow(hourStart: string, hourEnd: string): number {
  const hours =
    (Date.parse(hourEnd) - Date.parse(hourStart)) / 3_600_000;
  return Math.min(48, Math.max(12, Math.ceil(hours * 12)));
}

export function timeBucketSample<T>(
  items: T[],
  hourStart: string,
  hourEnd: string,
  limit: number,
  getTimestamp: (item: T) => string,
): T[] {
  if (items.length <= limit) {
    return [...items].sort((a, b) =>
      getTimestamp(a).localeCompare(getTimestamp(b)),
    );
  }

  const start = Date.parse(hourStart);
  const end = Date.parse(hourEnd);
  const span = end - start;
  if (!Number.isFinite(span) || span <= 0) {
    return items.slice(0, limit);
  }

  const bucketCount = bucketCountForWindow(hourStart, hourEnd);
  const perBucket = Math.max(1, Math.ceil(limit / bucketCount));
  const buckets: T[][] = Array.from({ length: bucketCount }, () => []);

  for (const item of items) {
    const t = Date.parse(getTimestamp(item));
    const idx = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor(((t - start) / span) * bucketCount)),
    );
    buckets[idx].push(item);
  }

  const out: T[] = [];
  for (const bucket of buckets) {
    if (bucket.length === 0) continue;
    if (bucket.length <= perBucket) {
      out.push(...bucket);
      continue;
    }
    const step = bucket.length / perBucket;
    for (let i = 0; i < perBucket && out.length < limit; i++) {
      out.push(bucket[Math.min(bucket.length - 1, Math.floor(i * step))]);
    }
  }

  return out
    .sort((a, b) => getTimestamp(a).localeCompare(getTimestamp(b)))
    .slice(0, limit);
}
