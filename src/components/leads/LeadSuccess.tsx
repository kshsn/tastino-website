'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface LeadSuccessProps {
  reference: string;
  whatsapp: string | null;
  responseTime: string;
}

/** Replaces the form after a saved request: reference number, reply time and a WhatsApp fallback. */
export function LeadSuccess({ reference, whatsapp, responseTime }: LeadSuccessProps) {
  const t = useTranslations('leads');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="lf-done" role="status">
      <svg viewBox="0 0 100 100" fill="none" strokeWidth="6" strokeLinecap="round" aria-hidden="true">
        <circle cx="50" cy="50" r="44" />
        <path d="M30 52l13 13 27-29" />
      </svg>
      <h2 ref={heading} tabIndex={-1}>{t('success.title')}</h2>
      <p>{t('success.body')} {responseTime ? t('success.reply', { time: responseTime }) : t('success.replyNoTime')}</p>
      <div className="lf-ref">
        <span>{t('success.reference')}</span> <bdi dir="ltr">{reference}</bdi>
      </div>
      {whatsapp && (
        <div>
          <a className="btn btn-wa" href={`${whatsapp}?text=${encodeURIComponent(t('wa.success', { reference }))}`} target="_blank" rel="noopener noreferrer">
            {t('success.whatsapp')}
          </a>
        </div>
      )}
    </div>
  );
}
