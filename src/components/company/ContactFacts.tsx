import { getTranslations } from 'next-intl/server';

interface ContactFactsProps {
  address: string;
  phoneDisplay: string;
  tel: string | null;
  email: string;
}

/** Address, phone and email from the site settings. Anything not set is left out; nothing is invented. */
export async function ContactFacts({ address, phoneDisplay, tel, email }: ContactFactsProps) {
  const t = await getTranslations('company.about');
  if (!address && !phoneDisplay && !email) return null;
  return (
    <section className="flush" aria-labelledby="find-h">
      <h2 id="find-h" className="sr-only">{t('findTitle')}</h2>
      <div className="facts">
        {address && (
          <div className="fact">
            <small>{t('address')}</small>
            <address>{address}</address>
          </div>
        )}
        {phoneDisplay && (
          <div className="fact">
            <small>{t('phone')}</small>
            {tel ? <a className="ltr" href={tel}>{phoneDisplay}</a> : <b className="ltr">{phoneDisplay}</b>}
          </div>
        )}
        {email && (
          <div className="fact">
            <small>{t('email')}</small>
            <a className="ltr" href={`mailto:${email}`}>{email}</a>
          </div>
        )}
      </div>
    </section>
  );
}
