'use client'

import type { CSSProperties } from 'react';
import type { Cell } from '../types';
import { CellTile } from './CellTile';

interface Props {
  cells: Cell[][];
  onCellClick: (row: number, col: number) => void;
  flippedCells?: Set<string>;
  onFlipCell?: (cellId: string) => void;
}

export function GameBoard({ cells, onCellClick, flippedCells, onFlipCell }: Props) {
  const cols = cells[0]?.length ?? 0;

  const boardStyle = { '--board-cols': cols } as CSSProperties & Record<'--board-cols', number>;

  return (
    <div className="game-board" style={boardStyle}>
      {cells.map((row, r) =>
        row.map((cell, c) => (
          <CellTile
            key={cell.id}
            cell={cell}
            onClick={() => onCellClick(r, c)}
            isFlipped={flippedCells?.has(cell.id)}
            onFlip={() => onFlipCell?.(cell.id)}
          />
        ))
      )}
    </div>
  );
}
