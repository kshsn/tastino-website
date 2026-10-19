import { getTranslations } from 'next-intl/server';
import { Picture } from '@/components/ui/Picture';
import type { HomeData } from '@/lib/content/home';
import { Paragraphs } from './Paragraphs';
import { TiltCard } from './TiltCard';

interface BrandsSectionProps {
  data: HomeData;
}

const SIZES = '(max-width: 520px) 60vw, (max-width: 960px) 40vw, 200px';

export async function BrandsSection({ data }: BrandsSectionProps) {
  const t = await getTranslations('home');
  const block = data.blocks['brand-excellence'];
  const [lead, ...rest] = block?.paragraphs ?? [];
  if (data.brandCards.length === 0 && !block) return null;

  return (
    <section id="brands" className="flush-top">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div>
            <div className="eyebrow">{t('brands.eyebrow')}</div>
            {block && <h2>{block.title}</h2>}
          </div>
          {lead && <p>{lead}</p>}
        </div>

        <div className="brands">
          {data.brandCards.map((b) => (
            <div key={b.slug} data-reveal>
              <TiltCard href={`/brands/${b.slug}`} accent={b.accent}>
                <span className="tag">{b.name}</span>
                <p className="cat">{b.category}</p>
                <div className="img">
                  <Picture image={b.picture} sizes={SIZES} placeholder={t('imageSoon')} decorative />
                </div>
                <div className="more">
                  <span>{t('brands.productCount', { count: b.productCount })}</span>
                  <span className="arr" aria-hidden="true">→</span>
                </div>
              </TiltCard>
            </div>
          ))}
          {data.tastinoLines.productCount > 0 && (
            <div data-reveal>
              <TiltCard href="/products/tastino-lines" accent="#0F6B3E">
                <span className="tag">{t('brands.linesTag')}</span>
                <p className="cat">{t('brands.linesCategory')}</p>
                <div className="img">
                  <Picture image={data.tastinoLines.picture} sizes={SIZES} placeholder={t('imageSoon')} decorative />
                </div>
                <div className="more">
                  <span>{t('brands.productCount', { count: data.tastinoLines.productCount })}</span>
                  <span className="arr" aria-hidden="true">→</span>
                </div>
              </TiltCard>
            </div>
          )}
        </div>

        {rest.length > 0 && (
          <div className="cols2" data-reveal>
            <Paragraphs items={rest} />
          </div>
        )}
      </div>
    </section>
  );
}
