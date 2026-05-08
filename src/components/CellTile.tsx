import type { Cell } from '../types';

interface Props {
  cell: Cell;
  onClick: () => void;
}

export function CellTile({ cell, onClick }: Props) {
  if (cell.isEmpty) {
    return <div className="cell cell-empty" />;
  }

  let className = 'cell';
  if (cell.isSelected) className += ' cell-selected';
  else if (cell.isHinted) className += ' cell-hinted';
  if (cell.isEliminating) className += ' cell-eliminating';
  if (cell.isShaking) className += ' cell-shaking';

  return (
    <div className={className} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
      <span className="cell-char">{cell.char}</span>
    </div>
  );
}
