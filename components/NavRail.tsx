'use client'

export type NavTab = 'home' | 'cards' | 'story';

interface NavRailProps {
  active: NavTab;
  onNavigate: (tab: NavTab) => void;
}

const ITEMS: { key: NavTab; ic: string; label: string }[] = [
  { key: 'home', ic: '🗺️', label: '闯关' },
  { key: 'cards', ic: '🎴', label: '词卡库' },
  { key: 'story', ic: '📖', label: '故事屋' },
];

/** 左侧竖向导航栏（iPad 横屏）。 */
export function NavRail({ active, onNavigate }: NavRailProps) {
  return (
    <div className="rail">
      <div className="rail-logo">字</div>
      {ITEMS.map((it) => (
        <button
          key={it.key}
          className={'rail-item' + (active === it.key ? ' active' : '')}
          onClick={() => onNavigate(it.key)}
        >
          <span className="ri-ic">{it.ic}</span>
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}
