import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { AboutSection } from '@/components/home/AboutSection';
import { BrandsSection } from '@/components/home/BrandsSection';
import { Hero } from '@/components/home/Hero';
import { InnovationSection } from '@/components/home/InnovationSection';
import { PartnershipCta } from '@/components/home/PartnershipCta';
import { PortfolioSection } from '@/components/home/PortfolioSection';
import { ProductMarquee } from '@/components/home/ProductMarquee';
import { RevealRoot } from '@/components/home/RevealRoot';
import { SafetyBand } from '@/components/home/SafetyBand';
import { ValueStrip } from '@/components/home/ValueStrip';
import { getHomeData } from '@/lib/content/home';
import { pageMetadata } from '@/lib/metadata';
import '@/styles/home.css';
import '@/styles/hero.css';

// Content comes from the database; pages are rebuilt in the background at most once a minute,
// so an admin change shows up within 60 seconds (US-008.1).
export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'home', '/');
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await getHomeData(locale);

  return (
    <div className="home">
      <RevealRoot />
      <Hero data={data} locale={locale} />
      <ValueStrip />
      <AboutSection data={data} />
      <BrandsSection data={data} />
      <ProductMarquee items={data.marquee} />
      <SafetyBand data={data} />
      <InnovationSection data={data} />
      <PortfolioSection data={data} />
      <PartnershipCta data={data} />
    </div>
  );
}
