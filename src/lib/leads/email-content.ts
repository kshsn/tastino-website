import { BRAND_LABEL_EN, COMPANY_TYPE_LABEL_EN, type BrandKey, type CompanyType, type Reason } from './options';
import { singleLine } from './normalize';

/** The only address that receives internal lead mail (US-006.4). One place, so no other code can add a recipient. */
export const NOTIFICATION_RECIPIENT = 'info@tastinofoods.com';

/**
 * Recipients for internal mail: always exactly info@tastinofoods.com. If the setting lists anything else, the
 * extra addresses are ignored (and `ignored` says so, so the caller can log it).
 */
export function resolveRecipients(configured: unknown): { to: string[]; ignored: string[] } {
  const list = Array.isArray(configured) ? configured.filter((x): x is string => typeof x === 'string') : [];
  const ignored = list.filter((a) => a.trim().toLowerCase() !== NOTIFICATION_RECIPIENT);
  return { to: [NOTIFICATION_RECIPIENT], ignored };
}

const REASON_LABEL: Record<Reason, string> = {
  distributor: 'Distributor application',
  catalogue: 'Catalogue request',
  product: 'Product inquiry',
  other: 'General inquiry',
};

/** The fields of a stored lead that the emails use. */
export interface LeadForEmail {
  reference: string;
  reason: Reason;
  name: string;
  email: string;
  phone: string | null;
  company: string;
  country: string;
  companyType: CompanyType | string | null;
  brandsOfInterest: string[];
  product: string | null;
  message: string;
  locale: string;
  consentAt: Date;
  consentTextVersion: string;
  createdAt: Date;
}

export interface OutgoingEmail {
  to: string[];
  replyTo?: string;
  subject: string;
  text: string;
}

const dash = (v: string | null | undefined) => (v && v.trim() ? v : '—');

/** A header value: no line breaks or other control characters can survive (header injection). */
const header = (v: string) => singleLine(v).slice(0, 200);

/** Email to the sales inbox with every submitted field. Reply-To is the visitor, so "Reply" answers them. */
export function buildNotification(lead: LeadForEmail, to: string[]): OutgoingEmail {
  const brands = lead.brandsOfInterest.map((b) => BRAND_LABEL_EN[b as BrandKey] ?? b).join(', ');
  const companyType = lead.companyType ? (COMPANY_TYPE_LABEL_EN[lead.companyType as CompanyType] ?? lead.companyType) : null;
  const lines = [
    `Reference: ${lead.reference}`,
    `Reason: ${REASON_LABEL[lead.reason]}`,
    `Received: ${lead.createdAt.toISOString()}`,
    `Language of the form: ${lead.locale === 'ar' ? 'Arabic' : 'English'}`,
    '',
    `Name: ${dash(lead.name)}`,
    `Company: ${dash(lead.company)}`,
    `Email: ${dash(lead.email)}`,
    `Phone: ${dash(lead.phone)}`,
    `Country: ${dash(lead.country)}`,
    `Company type: ${dash(companyType)}`,
    `Brands of interest: ${dash(brands)}`,
    `Product: ${dash(lead.product)}`,
    '',
    'Message:',
    dash(lead.message),
    '',
    `Consent given: yes (wording version ${lead.consentTextVersion}, ${lead.consentAt.toISOString()})`,
  ];
  return {
    to,
    replyTo: lead.email,
    subject: header(`[${REASON_LABEL[lead.reason]}] ${lead.company} (${lead.reference})`),
    text: lines.join('\n'),
  };
}

export interface AutoReplyContext {
  /** Expected response time in the visitor's language ("within one business day"), or '' to leave the sentence out. */
  responseTime: string;
  email: string;
  phone: string;
  address: string;
  whatsapp: string;
}

/**
 * Confirmation to the visitor, in their language. Separate from the internal notification.
 * It greets generically and echoes nothing the visitor typed except the server-made reference, so the form cannot be
 * used to send a chosen message to somebody else's address.
 */
export function buildAutoReply(lead: LeadForEmail, ctx: AutoReplyContext): OutgoingEmail {
  const ar = lead.locale === 'ar';
  const contact = [ctx.email, ctx.phone, ctx.whatsapp, ctx.address].filter(Boolean);
  const body = ar
    ? [
        'مرحباً،',
        '',
        'شكراً لتواصلك مع تستينو فودز. وصل طلبك إلى فريق المبيعات.',
        ...(ctx.responseTime ? [`سنرد عليك ${ctx.responseTime}.`] : []),
        `رقم الطلب: ${lead.reference}`,
        '',
        'للتواصل المباشر:',
        ...contact,
        '',
        'تستينو فودز',
      ]
    : [
        'Hello,',
        '',
        'Thank you for contacting Tastino Foods. Your request has reached our sales team.',
        ...(ctx.responseTime ? [`We will reply ${ctx.responseTime}.`] : []),
        `Your reference: ${lead.reference}`,
        '',
        'To reach us directly:',
        ...contact,
        '',
        'Tastino Foods',
      ];
  return {
    to: [lead.email],
    subject: ar ? `وصلنا طلبك (${lead.reference}) — تستينو فودز` : `We received your request (${lead.reference}) — Tastino Foods`,
    text: body.join('\n'),
  };
}
