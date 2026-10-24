'use client';

import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  BRAND_KEYS,
  COMPANY_TYPES,
  COUNTRIES,
  DIAL_CODES,
  FIELDS_FOR,
  LIMITS,
  REASONS,
  type BrandKey,
  type Reason,
} from '@/lib/leads/options';
import { sendLead } from '@/lib/leads/client';
import { LeadSuccess } from './LeadSuccess';
import { validateLead, type ErrorCode, type LeadField } from '@/lib/leads/validate';

type Errors = Partial<Record<LeadField, ErrorCode>>;
type Banner = 'network' | 'rateLimited' | 'unavailable' | 'fixErrors' | null;

interface Values {
  name: string;
  company: string;
  email: string;
  phoneCode: string;
  phone: string;
  country: string;
  companyType: string;
  brands: BrandKey[];
  product: string;
  message: string;
  consent: boolean;
  website: string;
}

interface LeadFormProps {
  initialReason: Reason;
  initialProduct: string;
  initialBrands: BrandKey[];
  /** wa.me link of the sales number, or null when none is set (no dead button). */
  whatsapp: string | null;
  /** Expected reply time in the page language, or "" when not set. */
  responseTime: string;
}

// Order in which a problem is shown and focused.
const FIELD_ORDER: LeadField[] = ['name', 'company', 'email', 'phone', 'country', 'companyType', 'brands', 'product', 'message', 'consent'];

export function LeadForm({ initialReason, initialProduct, initialBrands, whatsapp, responseTime }: LeadFormProps) {
  const t = useTranslations('leads');
  const locale = useLocale() as 'en' | 'ar';
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const key = useRef<string | null>(null);
  const [reason, setReason] = useState<Reason>(initialReason);
  const [values, setValues] = useState<Values>({
    name: '', company: '', email: '', phoneCode: 'EG', phone: '', country: '', companyType: '', brands: initialBrands, product: initialProduct,
    message: '', consent: false, website: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<Banner>(null);
  const [pending, setPending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const show = FIELDS_FOR[reason];

  const set = <K extends keyof Values>(name: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [name]: value }));
    // A field stops showing its problem as soon as the visitor edits it.
    setErrors((e) => (e[name as LeadField] ? { ...e, [name]: undefined } : e));
  };

  const errorText = (field: LeadField) => {
    const code = errors[field];
    if (!code) return null;
    const path = `errors.${field}.${code}`;
    return t.has(path) ? t(path) : t('errors.generic');
  };

  function focusFirst(found: Errors) {
    const first = FIELD_ORDER.find((f) => found[f]);
    if (!first) return;
    const el = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
    el?.focus();
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function payload() {
    key.current ??= crypto.randomUUID();
    return { reason, ...values, brands: values.brands, locale, key: key.current };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setBanner(null);
    const body = payload();
    const checked = validateLead(body);
    if (!checked.ok) {
      setErrors(checked.errors);
      setBanner('fixErrors');
      focusFirst(checked.errors);
      return;
    }
    setPending(true);
    const result = await sendLead(body);
    setPending(false);
    if (result.kind === 'ok') setReference(result.reference);
    else if (result.kind === 'invalid') {
      setErrors(result.errors);
      setBanner('fixErrors');
      focusFirst(result.errors);
    } else setBanner(result.kind === 'rate_limited' ? 'rateLimited' : result.kind);
  }

  if (reference) return <LeadSuccess reference={reference} whatsapp={whatsapp} responseTime={responseTime} />;

  const id = (n: string) => `${uid}-${n}`;
  const field = (name: LeadField, label: string, required: boolean, control: (p: { id: string; describedBy?: string; invalid: boolean }) => ReactNode) => {
    const msg = errorText(name);
    const props = { id: id(name), describedBy: msg ? id(`${name}-err`) : undefined, invalid: !!msg };
    return (
      <div className={`lf-field${msg ? ' err' : ''}`}>
        <label htmlFor={props.id}>
          {label} {required && <em aria-hidden="true">*</em>}
        </label>
        {control(props)}
        {msg && <span className="lf-msg" id={id(`${name}-err`)}>{msg}</span>}
      </div>
    );
  };
  const countryName = (c: (typeof COUNTRIES)[number]) => (locale === 'ar' ? c.ar : c.en);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      <fieldset className="lf-reasons">
        <legend className="sr-only">{t('reasonLabel')}</legend>
        {REASONS.map((r) => (
          <label key={r} className={reason === r ? 'on' : undefined}>
            <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
            <span>{t(`reasons.${r}`)}</span>
          </label>
        ))}
      </fieldset>

      {banner && (
        <div className="lf-banner" role="alert">
          {t(`banners.${banner}`)}
        </div>
      )}

      <div className="lf-grid">
        {field('name', t('fields.name'), true, (p) => (
          <input id={p.id} name="name" autoComplete="name" maxLength={LIMITS.name + 20} value={values.name} onChange={(e) => set('name', e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} aria-required="true" />
        ))}
        {field('company', t('fields.company'), true, (p) => (
          <input id={p.id} name="company" autoComplete="organization" maxLength={LIMITS.company + 20} value={values.company} onChange={(e) => set('company', e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} aria-required="true" />
        ))}
        {field('email', t('fields.email'), true, (p) => (
          <input id={p.id} name="email" type="email" autoComplete="email" dir="ltr" value={values.email} onChange={(e) => set('email', e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} aria-required="true" />
        ))}
        {field('phone', t('fields.phone'), false, (p) => (
          <div className="lf-phone" dir="ltr">
            <select aria-label={t('fields.phoneCode')} name="phoneCode" value={values.phoneCode} onChange={(e) => set('phoneCode', e.target.value)}>
              {DIAL_CODES.map((d) => (
                <option key={d.code} value={d.code}>+{d.dial} {d.code}</option>
              ))}
            </select>
            <input id={p.id} name="phone" type="tel" inputMode="tel" autoComplete="tel-national" value={values.phone} onChange={(e) => set('phone', e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} />
          </div>
        ))}
        {field('country', t('fields.country'), true, (p) => (
          <select id={p.id} name="country" autoComplete="country" value={values.country} onChange={(e) => set('country', e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} aria-required="true">
            <option value="">{t('fields.selectCountry')}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{countryName(c)}</option>
            ))}
          </select>
        ))}
        {show.companyType &&
          field('companyType', t('fields.companyType'), false, (p) => (
            <select id={p.id} name="companyType" value={values.companyType} onChange={(e) => set('companyType', e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy}>
              <option value="">—</option>
              {COMPANY_TYPES.map((c) => (
                <option key={c} value={c}>{t(`companyTypes.${c}`)}</option>
              ))}
            </select>
          ))}
      </div>

      {show.brands && (
        <fieldset className="lf-field lf-brands">
          <legend>{t('fields.brands')}</legend>
          <div>
            {BRAND_KEYS.map((b) => (
              <label key={b}>
                <input
                  type="checkbox"
                  name="brands"
                  value={b}
                  checked={values.brands.includes(b)}
                  onChange={(e) => set('brands', e.target.checked ? [...values.brands, b] : values.brands.filter((x) => x !== b))}
                />
                <span>{t(`brandNames.${b}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {show.product &&
        field('product', t('fields.product'), false, (p) => (
          <input id={p.id} name="product" maxLength={LIMITS.product + 20} value={values.product} onChange={(e) => set('product', e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} />
        ))}

      {field('message', t('fields.message'), true, (p) => (
        <textarea id={p.id} name="message" rows={4} placeholder={t('fields.messagePlaceholder')} value={values.message} onChange={(e) => set('message', e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} aria-required="true" />
      ))}

      {/* Honeypot: invisible, skipped by keyboard and screen readers. People never fill it; bots usually do. */}
      <div className="lf-hp" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set('website', e.target.value)} />
        </label>
      </div>

      <div className={`lf-field lf-consent${errors.consent ? ' err' : ''}`}>
        <label>
          <input
            type="checkbox"
            name="consent"
            checked={values.consent}
            onChange={(e) => set('consent', e.target.checked)}
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? id('consent-err') : undefined}
          />
          <span>{t.rich('consent', { privacy: (chunks) => <Link href="/privacy">{chunks}</Link> })}</span>
        </label>
        {errors.consent && <span className="lf-msg" id={id('consent-err')}>{errorText('consent')}</span>}
      </div>

      <button type="submit" className="btn btn-primary lf-submit" disabled={pending} aria-busy={pending}>
        {pending && <span className="lf-spin" aria-hidden="true" />}
        <span>{pending ? t('sending') : t('submit')}</span> <span className="arr" aria-hidden="true">→</span>
      </button>
    </form>
  );
}
