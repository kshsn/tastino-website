// The official logo file is used exactly as supplied: never recolored, cropped or redrawn.
export const LOGO_SRC = '/brand/tastino-logo.svg';
const RATIO = 272.05 / 128.52; // from the SVG viewBox

interface LogoProps {
  label: string;
  /** Intrinsic height in px (sets width/height attributes so there is no layout shift). */
  height?: number;
  /** Tailwind sizing, e.g. `h-[58px] w-auto`. */
  className?: string;
}

export function Logo({ label, height = 58, className = 'h-[58px] w-auto' }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG served as-is, no optimisation wanted
    <img src={LOGO_SRC} alt={label} height={height} width={Math.round(height * RATIO)} className={`block ${className}`} />
  );
}
