'use client'

import type { LevelData } from '../types';

interface Props {
  level: LevelData;
  eliminatedCount: number;
  pairCount: number;
  isCustom?: boolean;
  customTitle?: string;
  onSelectLevel: () => void;
  onUpload: () => void;
}

export function GameHeader({ level, eliminatedCount, pairCount, isCustom, customTitle, onUpload }: Props) {
  const progress = pairCount > 0 ? (eliminatedCount / pairCount) * 100 : 0;

  return (
    <div className="game-header">
      <div className="game-header-top">
        <span className="game-title">汉字对对碰</span>
        <button className="btn btn-sm btn-upload" onClick={onUpload}>上传词库</button>
      </div>
      <div className="game-header-info">
        <span className="level-label">
          {isCustom
            ? `自定义 · ${customTitle}`
            : `一年级下 · 第${level.level}单元 · ${level.title}`}
        </span>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-count">{eliminatedCount}/{pairCount}</span>
      </div>
    </div>
  );
}
