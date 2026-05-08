import type { Cell } from '../types';
import { CellTile } from './CellTile';

interface Props {
  cells: Cell[][];
  onCellClick: (row: number, col: number) => void;
}

export function GameBoard({ cells, onCellClick }: Props) {
  return (
    <div className="game-board">
      {cells.map((row, r) =>
        row.map((cell, c) => (
          <CellTile
            key={cell.id}
            cell={cell}
            onClick={() => onCellClick(r, c)}
          />
        ))
      )}
    </div>
  );
}
