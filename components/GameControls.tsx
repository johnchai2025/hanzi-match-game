'use client'

interface Props {
  onHint: () => void;
  onRestart: () => void;
  onSelectLevel: () => void;
}

export function GameControls({ onHint, onRestart, onSelectLevel }: Props) {
  return (
    <div className="game-controls">
      <button className="btn btn-hint" onClick={onHint}>提示</button>
      <button className="btn btn-restart" onClick={onRestart}>重新开始</button>
      <button className="btn btn-outline" onClick={onSelectLevel}>选关</button>
    </div>
  );
}
