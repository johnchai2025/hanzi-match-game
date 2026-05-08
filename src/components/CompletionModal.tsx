interface Props {
  onNextLevel: (() => void) | null;
  onRestart: () => void;
  onSelectLevel: () => void;
}

export function CompletionModal({ onNextLevel, onRestart, onSelectLevel }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-emoji">🎉</div>
        <div className="modal-title">太棒了！</div>
        <div className="modal-sub">全部消除，过关！</div>
        <div className="modal-actions">
          {onNextLevel && (
            <button className="btn btn-primary" onClick={onNextLevel}>下一关</button>
          )}
          <button className="btn btn-restart" onClick={onRestart}>再玩一次</button>
          <button className="btn btn-outline" onClick={onSelectLevel}>选关</button>
        </div>
      </div>
    </div>
  );
}
