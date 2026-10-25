import type { Prisma, PublishStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { assertPublishable, type PublishableEntity } from './rules';

type Delegate = {
  findUniqueOrThrow(args: { where: { id: string } }): Promise<Record<string, unknown> & { status: PublishStatus }>;
  update(args: { where: { id: string }; data: { status: PublishStatus } }): Promise<unknown>;
};

const delegateFor = (tx: Prisma.TransactionClient, entity: PublishableEntity): Delegate =>
  ({ brand: tx.brand, product: tx.product, pageBlock: tx.pageBlock, heroSlide: tx.heroSlide })[entity] as unknown as Delegate;

const ENTITY_TYPE: Record<PublishableEntity, string> = {
  brand: 'Brand',
  product: 'Product',
  pageBlock: 'PageBlock',
  heroSlide: 'HeroSlide',
};

/**
 * Publishes or unpublishes an item atomically. Publishing checks that both languages are complete;
 * repeating the current status is a no-op and writes no audit entry.
 */
export async function setPublishStatus(
  entity: PublishableEntity,
  id: string,
  status: PublishStatus,
  actorId?: string,
  /** Extra checks that run inside the same transaction before a publish (images, variants, slide limit). */
  extraCheck?: (tx: Prisma.TransactionClient, current: Record<string, unknown>) => Promise<void>,
  ip?: string,
) {
  return db.$transaction(async (tx) => {
    const d = delegateFor(tx, entity);
    const current = await d.findUniqueOrThrow({ where: { id } });
    if (current.status === status) return { changed: false };
    if (status === 'PUBLISHED') {
      assertPublishable(entity, current);
      await extraCheck?.(tx, current);
    }
    await d.update({ where: { id }, data: { status } });
    await tx.auditLog.create({
      data: {
        actorId: actorId ?? null,
        action: status === 'PUBLISHED' ? 'publish' : 'unpublish',
        entityType: ENTITY_TYPE[entity],
        entityId: id,
        ip: ip ?? null,
      },
    });
    return { changed: true };
  });
}
