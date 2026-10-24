import { getTranslations } from 'next-intl/server';
import { Picture } from '@/components/ui/Picture';
import type { PictureData } from '@/lib/media/types';

interface ProductFanProps {
  pictures: PictureData[];
}

const SLOTS = ['f1', 'f2', 'f3'] as const;

export async function ProductFan({ pictures }: ProductFanProps) {
  const t = await getTranslations('company');
  if (pictures.length !== 3) return null;
  return (
    <div className="fan" aria-hidden="true">
      <span className="halo" />
      {pictures.map((pic, i) => (
        <Picture key={SLOTS[i]} image={pic} sizes="(max-width: 960px) 40vw, 220px" placeholder={t('imageSoon')} className={SLOTS[i]} decorative />
      ))}
    </div>
  );
}
