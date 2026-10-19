interface MarqueeCandidate {
  slug: string;
  /** Group key (brand slug, or the Tastino line) so the strip alternates between brands. */
  group: string;
  hasImage: boolean;
}

/** Fewer than this and the product strip is not shown (US-003.5). */
export const MIN_MARQUEE_ITEMS = 4;

/**
 * Picks up to `max` products that have an image, taking one from each group in turn so the strip
 * shows the whole range rather than twelve jams in a row. Order is stable for the same input.
 */
export function pickMarquee<T extends MarqueeCandidate>(items: T[], max = 12): T[] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    if (!it.hasImage) continue;
    groups.set(it.group, [...(groups.get(it.group) ?? []), it]);
  }
  const queues = [...groups.values()];
  const out: T[] = [];
  for (let round = 0; out.length < max; round++) {
    let took = false;
    for (const q of queues) {
      if (round < q.length && out.length < max) {
        out.push(q[round]);
        took = true;
      }
    }
    if (!took) break;
  }
  return out;
}
