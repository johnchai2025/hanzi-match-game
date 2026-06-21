'use client'

import { levelIconByIndex, LEVEL_LOCK_ICON } from '@/lib/assets';

interface LevelNodeIconProps {
  index: number;       // 关卡在地图中的序号
  title?: string;      // 关卡标题（用于可能的精确匹配）
  locked?: boolean;    // 锁定态用专属锁图标
}

/** 地图节点关卡图标：锁定用锁图，否则按索引循环取主题图。 */
export function LevelNodeIcon({ index, title, locked }: LevelNodeIconProps) {
  const src = locked ? LEVEL_LOCK_ICON : levelIconByIndex(index, title);
  return <img src={src} alt={title || (locked ? '未解锁' : '关卡')} />;
}
