// Names for lead statuses and reasons. This file has no server-only imports, so browser components can use it
// (the lead service itself pulls in the database and must stay on the server).

export type LeadStatusValue = 'NEW' | 'IN_CONTACT' | 'QUALIFIED' | 'CLOSED';
export type LeadReasonValue = 'DISTRIBUTOR' | 'CATALOGUE' | 'PRODUCT' | 'OTHER';

export const LEAD_STATUSES: readonly LeadStatusValue[] = ['NEW', 'IN_CONTACT', 'QUALIFIED', 'CLOSED'];
export const LEAD_REASONS: readonly LeadReasonValue[] = ['DISTRIBUTOR', 'CATALOGUE', 'PRODUCT', 'OTHER'];

export const STATUS_LABEL: Record<LeadStatusValue, string> = { NEW: 'New', IN_CONTACT: 'In contact', QUALIFIED: 'Qualified', CLOSED: 'Closed' };

const REASON_LABEL: Record<LeadReasonValue, string> = { DISTRIBUTOR: 'Become a distributor', CATALOGUE: 'Catalogue request', PRODUCT: 'Product inquiry', OTHER: 'Other' };
export const reasonLabel = (r: LeadReasonValue): string => REASON_LABEL[r];
