import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { HomeData } from '@/lib/content/home';
import { Paragraphs } from './Paragraphs';

interface PartnershipCtaProps {
  data: HomeData;
}

export async function PartnershipCta({ data }: PartnershipCtaProps) {
  const t = await getTranslations('home');
  const block = data.blocks.partnership;
  if (!block) return null;
  const { whatsapp, tel, phoneDisplay } = data.contact;

  return (
    <section id="partnership" className="flush-top">
      <div className="wrap">
        <div className="cta" data-reveal>
          <span className="bubble b1" aria-hidden="true" />
          <span className="bubble b2" aria-hidden="true" />
          <div className="relative flex-[1_1_480px]">
            <h2>{block.title}</h2>
            <Paragraphs items={block.paragraphs} />
          </div>
          <div className="wa">
            {whatsapp && (
              <>
                <small>{t('cta.label')}</small>
                <a className="num" href={whatsapp} target="_blank" rel="noopener noreferrer" dir="ltr">
                  {phoneDisplay}
                </a>
              </>
            )}
            <div className="cta-row">
              <Link className="btn btn-primary" href="/distributors">
                <span>{t('cta.form')}</span> <span className="arr" aria-hidden="true">→</span>
              </Link>
              {whatsapp && (
                <a className="btn btn-ghost" href={whatsapp} target="_blank" rel="noopener noreferrer">
                  {t('cta.whatsapp')}
                </a>
              )}
              {tel && (
                <a className="btn btn-ghost" href={tel}>
                  {t('cta.call')}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
