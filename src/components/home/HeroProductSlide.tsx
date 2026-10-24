import type { CSSProperties } from 'react';
import { Picture } from '@/components/ui/Picture';
import { Link } from '@/i18n/navigation';
import { accentVars } from '@/lib/color';
import type { HeroLabels, HeroProductModel } from './hero-types';

interface HeroProductSlideProps {
  slide: HeroProductModel;
  labels: Pick<HeroLabels, 'placeholder' | 'madeIn' | 'madeInNote'>;
}

/** A brand-colored full-width slide: big packshot on a morphing blob, brand name watermark, one call to action. */
export function HeroProductSlide({ slide, labels }: HeroProductSlideProps) {
  return (
    <div className="hs-slide-inner hs-product-slide" style={accentVars(slide.accent) as CSSProperties}>
      <div className="hs-wash" aria-hidden="true" />
      <div className="hs-mark" aria-hidden="true">{slide.brand}</div>
      <div className="wrap hs-product-grid">
        <div className="hs-copy">
          <div className="hs-eyebrow hs-eyebrow-brand">{slide.brand}</div>
          <h2>{slide.label}</h2>
          <div className="hs-cta">
            <Link className="btn btn-accent" href={slide.cta.href}>
              <span>{slide.cta.label}</span> <span className="arr" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div className="hs-stage">
          <div className="hs-ring" aria-hidden="true" />
          <div className="hs-blob" aria-hidden="true" />
          <svg className="hs-leaf hs-leaf-a" viewBox="0 0 40 40" aria-hidden="true"><path d="M4 36C4 16 16 4 36 4 36 24 24 36 4 36z" /></svg>
          <svg className="hs-leaf hs-leaf-b" viewBox="0 0 40 40" aria-hidden="true"><path d="M4 36C4 16 16 4 36 4 36 24 24 36 4 36z" /></svg>
          <div className="hs-pack">
            <Picture image={slide.picture} sizes="(max-width: 960px) 60vw, 380px" placeholder={labels.placeholder} />
          </div>
          <div className="hs-chip" aria-hidden="true">
            <i>{slide.brand.charAt(0)}</i>
            <span>
              {slide.brand}
              <small>{slide.label}</small>
            </span>
          </div>
          <div className="hs-chip hs-chip-made">
            <i aria-hidden="true">✓</i>
            <span>
              {labels.madeIn}
              <small>{labels.madeInNote}</small>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
