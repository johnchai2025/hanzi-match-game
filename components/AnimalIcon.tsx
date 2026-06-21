'use client'

import { animalIcon } from '@/lib/assets';

interface AnimalIconProps {
  animal: string;   // 动物名，如 '小兔子'
  emoji: string;    // 回退 emoji
}

/** 动物选择图标：有定制图渲染 <img>，否则回退 emoji。 */
export function AnimalIcon({ animal, emoji }: AnimalIconProps) {
  const src = animalIcon(animal);
  if (src) return <img src={src} alt={animal} />;
  return <span style={{ fontSize: '2rem' }}>{emoji}</span>;
}
