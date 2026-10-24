import type { PictureData } from '@/lib/media/types';

export interface HeroLink {
  href: string;
  label: string;
}

/** First slide: the looping video with the page headline over it. */
export interface HeroVideoModel {
  kind: 'video';
  id: 'video';
  src: string;
  /** Smaller file for phones. */
  srcSmall: string;
  poster: string;
  eyebrow: string;
  titleA: string;
  titleB: string;
  lead: string;
  primary: HeroLink;
  secondary: HeroLink;
}

/** A published product slide: brand-colored panel with the packshot. */
export interface HeroProductModel {
  kind: 'product';
  id: string;
  accent: string;
  brand: string;
  label: string;
  picture: PictureData | null;
  cta: HeroLink;
}

export type HeroSlideModel = HeroVideoModel | HeroProductModel;

export interface HeroLabels {
  region: string;
  prev: string;
  next: string;
  pause: string;
  play: string;
  /** Template with {n} and {total}; a plain string because functions cannot cross from server to client components. */
  slideOf: string;
  placeholder: string;
  madeIn: string;
  madeInNote: string;
}
