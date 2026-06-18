'use client';

interface NewCardToastProps {
  count: number;
  show: boolean;
}

export function NewCardToast({ count, show }: NewCardToastProps) {
  if (!show || count === 0) return null;

  return (
    <div className="new-card-toast">
      <span className="card-icon">🎴</span>
      <span>新词卡 +{count}</span>
    </div>
  );
}
