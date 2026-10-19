const digits = (v: string) => v.replace(/\D/g, '');

/** `https://wa.me/<digits>` for a stored number such as "+201100111887"; null when the number is empty. */
export function waLink(number: unknown): string | null {
  if (typeof number !== 'string') return null;
  const d = digits(number);
  return d.length >= 8 ? `https://wa.me/${d}` : null;
}

/** `tel:` link for a stored number; null when empty. */
export function telLink(number: unknown): string | null {
  if (typeof number !== 'string') return null;
  const d = digits(number);
  return d.length >= 8 ? `tel:+${d}` : null;
}

/** Readable form: "+20 110 011 1887" for Egyptian numbers, the original text otherwise. */
export function displayPhone(number: unknown): string {
  if (typeof number !== 'string') return '';
  const d = digits(number);
  const m = /^20(\d{3})(\d{3})(\d{4})$/.exec(d);
  return m ? `+20 ${m[1]} ${m[2]} ${m[3]}` : number.trim();
}
