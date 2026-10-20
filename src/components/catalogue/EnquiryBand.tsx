import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

interface EnquiryBandProps {
  title: string;
  /** WhatsApp link with the prefilled message already added; null hides the button. */
  whatsappHref: string | null;
  /** Where the distributor button goes (the form, with the brand preselected). */
  formHref: string;
}

export async function EnquiryBand({ title, whatsappHref, formHref }: EnquiryBandProps) {
  const t = await getTranslations('catalogue.brandPage');
  return (
    <div className="band">
      <h2>{title}</h2>
      <div className="actions">
        {whatsappHref && (
          <a className="btn btn-wa" href={whatsappHref} target="_blank" rel="noopener noreferrer">
            {t('whatsapp')}
          </a>
        )}
        <Link className="btn btn-primary" href={formHref}>
          {t('become')}
        </Link>
      </div>
    </div>
  );
}
