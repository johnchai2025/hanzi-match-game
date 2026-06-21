'use client'

import { animalIcon, MASCOT } from '@/lib/assets';

interface MascotImgProps {
  animal?: string;           // 孩子所选动物，如 '小兔子'
  pose?: 'idle' | 'cheer';   // 仅在无 animal 图时用作缺省回退
  emoji?: string;            // 最终回退 emoji
  className?: string;        // 额外尺寸类，如 'mascot-img-xl'
}

/** 吉祥物 = 孩子所选动物的定制图；无则回退缺省兔子图；再无则 emoji。 */
export function MascotImg({ animal, pose = 'idle', emoji = '🐰', className = '' }: MascotImgProps) {
  const src = animalIcon(animal) ?? MASCOT[pose];
  if (src) {
    return (
      <div className={`mascot-img ${className}`}>
        <img src={src} alt={animal || '小伙伴'} />
      </div>
    );
  }
  return <div className={`mascot ${className}`}>{emoji}</div>;
}
