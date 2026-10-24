import { cache } from 'react';
import { displayPhone, telLink, waLink } from '@/lib/phone';
import { pick } from '@/lib/text';
import { getPublicSettings } from './public';

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');

const SIMPLE_EMAIL = /^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/;

export interface ContactInfo {
  address: string;
  phoneDisplay: string;
  tel: string | null;
  /** WhatsApp number as shown, and the wa.me link (null when the number is empty: no dead button). */
  whatsappDisplay: string;
  whatsapp: string | null;
  email: string;
  /** Expected reply time, in the visitor's language; empty when not set. */
  responseTime: string;
}

/** Address, phone, WhatsApp and email from the public settings; anything not set is simply absent. */
export function contactFrom(settings: Awaited<ReturnType<typeof getPublicSettings>>, locale: string): ContactInfo {
  const phone = str(settings['contact.phone']);
  const wa = str(settings['contact.whatsapp']);
  const email = str(settings['contact.email']);
  return {
    address: str(pick(locale, settings['contact.addressEn'], settings['contact.addressAr'])),
    phoneDisplay: phone ? displayPhone(phone) : '',
    tel: telLink(phone),
    whatsappDisplay: wa ? displayPhone(wa) : '',
    whatsapp: waLink(wa),
    // Only a plain address becomes a mailto: link; anything with spaces, "?" or "&" (extra mail fields) is dropped.
    email: SIMPLE_EMAIL.test(email) ? email : '',
    responseTime: str(pick(locale, settings['leads.responseTimeEn'], settings['leads.responseTimeAr'])),
  };
}

export const getContactInfo = cache(async (locale: string) => contactFrom(await getPublicSettings(), locale));
