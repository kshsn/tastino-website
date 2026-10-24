import { getTranslations } from 'next-intl/server';
import type { ContactInfo } from '@/lib/content/contact';

interface ContactPanelProps {
  contact: ContactInfo;
}

/** Sales WhatsApp, email and factory address from the site settings; anything not set is left out. */
export async function ContactPanel({ contact }: ContactPanelProps) {
  const t = await getTranslations('leads');
  const mapHref = contact.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}` : null;
  if (!contact.whatsapp && !contact.phoneDisplay && !contact.email && !contact.address) return null;
  return (
    <ul className="lf-reach" aria-label={t('reachTitle')}>
      {(contact.whatsapp || contact.phoneDisplay) && (
        <li>
          <a href={contact.whatsapp ?? contact.tel ?? undefined} {...(contact.whatsapp ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            <i className="wa" aria-hidden="true">W</i>
            <span>
              <small>{t('salesWhatsapp')}</small>
              <b dir="ltr">{contact.whatsappDisplay || contact.phoneDisplay}</b>
            </span>
          </a>
        </li>
      )}
      {contact.email && (
        <li>
          <a href={`mailto:${contact.email}`}>
            <i className="mail" aria-hidden="true">@</i>
            <span>
              <small>{t('email')}</small>
              <b dir="ltr">{contact.email}</b>
            </span>
          </a>
        </li>
      )}
      {contact.address && (
        <li>
          <div>
            <i className="pin" aria-hidden="true">⌂</i>
            <span>
              <small>{t('factory')}</small>
              <address>{contact.address}</address>
              {mapHref && (
                <a className="map" href={mapHref} target="_blank" rel="noopener noreferrer">{t('openMap')}</a>
              )}
            </span>
          </div>
        </li>
      )}
    </ul>
  );
}
