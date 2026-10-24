import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/catalogue/Breadcrumbs';
import { Paragraphs } from '@/components/home/Paragraphs';
import { AboutHero } from '@/components/company/AboutHero';
import { CompanyCta } from '@/components/company/CompanyCta';
import { CompanyTabs } from '@/components/company/CompanyTabs';
import { ContactFacts } from '@/components/company/ContactFacts';
import { MoreLinks } from '@/components/company/MoreLinks';
import { ValueCards } from '@/components/company/ValueCards';
import { getAboutPage } from '@/lib/content/company';
import { pageMetadata } from '@/lib/metadata';
import { splitTagline } from '@/lib/text';
import '@/styles/company.css';

export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'about', '/about');
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('company');
  const home = await getTranslations('home');
  const { blocks, collage, contact } = await getAboutPage(locale);
  const about = blocks.about;
  const tagline = splitTagline(blocks.tagline?.paragraphs[0] ?? `${home('titleA')} ${home('titleB')}`);
  const [intro, ...story] = about?.paragraphs ?? [];

  return (
    <div className="co page">
      <div className="wrap">
        <Breadcrumbs items={[{ label: t('crumbs.home'), href: '/' }, { label: t('crumbs.about') }]} />
        <AboutHero first={tagline.first} second={tagline.second} intro={intro} collage={collage} />
        <CompanyTabs current="story" />

        {about && (
          <section id="story">
            <div className="blk">
              <div>
                <div className="eyebrow">{t('about.storyEyebrow')}</div>
                <h2>{t('about.storyTitle')}</h2>
              </div>
              {story.length > 0 && (
                <div className="copy">
                  <Paragraphs items={story} bigIndex={0} />
                </div>
              )}
            </div>
            <ValueCards />
          </section>
        )}

        <ContactFacts {...contact} />

        <section className="flush">
          <div className="eyebrow">{t('about.moreEyebrow')}</div>
          <MoreLinks
            items={[
              { href: '/quality', label: t('about.toQuality') },
              { href: '/innovation', label: t('about.toInnovation') },
            ]}
          />
        </section>

        <CompanyCta />
      </div>
    </div>
  );
}
