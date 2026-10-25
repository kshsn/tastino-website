import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { diffFields, writeAudit } from './audit';
import { checkSettings, type SettingsInput } from './content-validate';
import type { Actor } from './content-service';
import { refreshPublicSite } from './revalidate';

const KEYS = ['contact.email', 'contact.phone', 'contact.whatsapp', 'contact.addressEn', 'contact.addressAr', 'contact.mapLink', 'social'] as const;

/** The editable settings with sensible empty values. Private settings (mail server, recipients) are never listed here. */
export async function getEditableSettings(): Promise<SettingsInput> {
  const rows = await db.setting.findMany({ where: { key: { in: [...KEYS] } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const str = (k: string) => (typeof map[k] === 'string' ? (map[k] as string) : '');
  const social = Array.isArray(map.social)
    ? (map.social as unknown[]).flatMap((s) => (s && typeof s === 'object' && typeof (s as { network?: unknown }).network === 'string' && typeof (s as { url?: unknown }).url === 'string' ? [{ network: (s as { network: string }).network, url: (s as { url: string }).url }] : []))
    : [];
  return {
    'contact.email': str('contact.email'),
    'contact.phone': str('contact.phone'),
    'contact.whatsapp': str('contact.whatsapp'),
    'contact.addressEn': str('contact.addressEn'),
    'contact.addressAr': str('contact.addressAr'),
    'contact.mapLink': str('contact.mapLink'),
    social,
  };
}

export type SaveSettingsResult = { status: 'ok'; changed: string[] } | { status: 'invalid'; errors: Record<string, string> };

/** Saves only the settings that were sent and really changed, all in one transaction with one audit entry. */
export async function saveSettings(actor: Actor, raw: unknown): Promise<SaveSettingsResult> {
  const checked = checkSettings(raw);
  if (!checked.ok) return { status: 'invalid', errors: checked.errors };
  const incoming = checked.data as Record<string, unknown>;
  const result = await db.$transaction(async (tx) => {
    const current = await tx.setting.findMany({ where: { key: { in: Object.keys(incoming) } } });
    const before = Object.fromEntries(current.map((r) => [r.key, r.value]));
    const changes = diffFields(Object.fromEntries(Object.keys(incoming).map((k) => [k, before[k] ?? null])), incoming);
    for (const key of Object.keys(changes)) {
      await tx.setting.upsert({ where: { key }, update: { value: incoming[key] as Prisma.InputJsonValue }, create: { key, value: incoming[key] as Prisma.InputJsonValue, isPrivate: false } });
    }
    if (Object.keys(changes).length) await writeAudit(tx, { actorId: actor.id, ip: actor.ip, action: 'settings.update', entityType: 'Setting', changes });
    return Object.keys(changes);
  });
  if (result.length) refreshPublicSite();
  return { status: 'ok', changed: result };
}
