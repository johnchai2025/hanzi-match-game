'use client'

import { useState, useCallback, useRef } from 'react';
import type { Cell, LevelData, WordPair } from '../types';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickPairsForGame(allPairs: WordPair[], maxPairs = 18): WordPair[] {
  if (allPairs.length <= maxPairs) return [...allPairs];
  return shuffleArray(allPairs).slice(0, maxPairs);
}

interface UseGameOptions {
  rows?: number;
  cols?: number;
  onPairEliminated?: (payload: { word: string; chars: WordPair; pairId: number }) => void;
  onCellSelected?: (payload: { char: string; word: string }) => void;
}

/**
 * 将词对列表转换为棋盘初始状态。
 * 单字配词模式：每个词语拆成两个单字格（pairId 相同），
 * 玩家点击同一词对的两个汉字即可消除。
 */
function initBoard(pairs: WordPair[], rows: number, cols: number): Cell[][] {
  // 每个 pair 产生两个单字格（如 ["花","生"] -> "花"、"生"）
  const allCells = pairs.flatMap((pair, pairId) => {
    const word = pair[0] + pair[1];
    return [
      { char: pair[0], word, pairId },
      { char: pair[1], word, pairId },
    ];
  });

  const shuffled = shuffleArray(allCells);

  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const cellData = shuffled[r * cols + c];
      return {
        id: `cell-${r}-${c}`,
        char: cellData?.char ?? '',
        word: cellData?.word ?? '',
        pairId: cellData?.pairId ?? -1,
        isEmpty: !cellData,
        isSelected: false,
        isHinted: false,
        isEliminating: false,
        isShaking: false,
      };
    })
  );
}

// 检测棋盘上是否还有可消除的对（按词语有效性，而非 pairId）
function hasValidPair(cells: Cell[][], activePairs: WordPair[]): boolean {
  const validWords = new Set(activePairs.map(p => p[0] + p[1]));
  const remaining = cells.flat().filter(c => !c.isEmpty && c.char);
  for (let i = 0; i < remaining.length; i++) {
    for (let j = i + 1; j < remaining.length; j++) {
      if (
        validWords.has(remaining[i].char + remaining[j].char) ||
        validWords.has(remaining[j].char + remaining[i].char)
      ) return true;
    }
  }
  return false;
}

export function useGame(level: LevelData, pairsOverride?: WordPair[], options: UseGameOptions = {}) {
  const rows = options.rows ?? level.boardRows ?? 6;
  const cols = options.cols ?? level.boardCols ?? 6;
  const activePairs = pairsOverride ?? level.pairs;
  const [cells, setCells] = useState<Cell[][]>(() => initBoard(activePairs, rows, cols));
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [eliminatedCount, setEliminatedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [isDeadlock, setIsDeadlock] = useState(false);
  const milestoneShownRef = useRef(false);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 1500);
  }, []);

  const restart = useCallback((newPairs?: WordPair[]) => {
    setCells(initBoard(newPairs ?? activePairs, rows, cols));
    setSelected(null);
    setEliminatedCount(0);
    setIsComplete(false);
    setFeedback(null);
    setMilestone(null);
    setIsDeadlock(false);
    milestoneShownRef.current = false;
  }, [activePairs, rows, cols]);

  // 重新打乱棋盘（不重置进度）
  const reshuffle = useCallback(() => {
    const remainingCells: { char: string; word: string; pairId: number }[] = [];
    cells.forEach(row =>
      row.forEach(cell => {
        if (!cell.isEmpty) {
          remainingCells.push({ char: cell.char, word: cell.word, pairId: cell.pairId });
        }
      })
    );

    const shuffled = shuffleArray(remainingCells);

    setCells(() => {
      const newCells: Cell[][] = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => ({
          id: `cell-${r}-${c}`,
          char: '',
          word: '',
          pairId: 0,
          isEmpty: true,
          isSelected: false,
          isHinted: false,
          isEliminating: false,
          isShaking: false,
        }))
      );

      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (idx < shuffled.length) {
            const cellData = shuffled[idx];
            newCells[r][c] = {
              id: `cell-${r}-${c}`,
              char: cellData.char,
              word: cellData.word,
              pairId: cellData.pairId,
              isEmpty: false,
              isSelected: false,
              isHinted: false,
              isEliminating: false,
              isShaking: false,
            };
            idx++;
          }
        }
      }
      return newCells;
    });

    setSelected(null);
    setIsDeadlock(false);
    showFeedback('棋盘已重新打乱！');
  }, [cells, cols, rows, showFeedback]);

  const showHint = useCallback(() => {
    const flat: { cell: Cell; row: number; col: number }[] = [];
    cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!cell.isEmpty) flat.push({ cell, row: r, col: c });
      })
    );

    // 找到一对可组成有效词语的汉字格
    const validWords = new Set(activePairs.map(p => p[0] + p[1]));
    const validPairs: [typeof flat[0], typeof flat[0]][] = [];
    for (let i = 0; i < flat.length; i++) {
      for (let j = i + 1; j < flat.length; j++) {
        const w1 = flat[i].cell.char + flat[j].cell.char;
        const w2 = flat[j].cell.char + flat[i].cell.char;
        if (validWords.has(w1) || validWords.has(w2)) {
          validPairs.push([flat[i], flat[j]]);
        }
      }
    }

    if (validPairs.length === 0) return;
    const pick = validPairs[Math.floor(Math.random() * validPairs.length)];
    setCells(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell, isHinted: false })));
      next[pick[0].row][pick[0].col].isHinted = true;
      next[pick[1].row][pick[1].col].isHinted = true;
      return next;
    });
    setTimeout(() => {
      setCells(prev => prev.map(row => row.map(cell => ({ ...cell, isHinted: false }))));
    }, 2000);
  }, [cells, activePairs]);

  const handleCellClick = useCallback((row: number, col: number) => {
    const cell = cells[row][col];
    if (cell.isEmpty || cell.isEliminating) return;

    if (selected === null) {
      // 第一次选择
      setCells(prev => {
        const next = prev.map(r => r.map(c => ({ ...c, isSelected: false })));
        next[row][col].isSelected = true;
        return next;
      });
      setSelected({ row, col });
      options.onCellSelected?.({ char: cell.char, word: cell.word });
      return;
    }

    // 点击同一格 — 取消选中
    if (selected.row === row && selected.col === col) {
      setCells(prev => prev.map(r => r.map(c => ({ ...c, isSelected: false }))));
      setSelected(null);
      return;
    }

    const first = cells[selected.row][selected.col];
    const second = cell;

    // 两个汉字能组成有效词语即可消除（无顺序要求，不依赖 pairId）
    const w1 = first.char + second.char;
    const w2 = second.char + first.char;
    const matchedPair = activePairs.find(p => p[0] + p[1] === w1 || p[0] + p[1] === w2);
    const canEliminate = !!matchedPair;

    if (canEliminate) {
      const eliminatedWord = matchedPair![0] + matchedPair![1];
      const matchedPairIndex = activePairs.indexOf(matchedPair!);
      options.onPairEliminated?.({
        word: eliminatedWord,
        chars: matchedPair!,
        pairId: matchedPairIndex,
      });

      // 消除动画
      setCells(prev => {
        const next = prev.map(r => r.map(c => ({ ...c, isSelected: false, isHinted: false })));
        next[selected.row][selected.col].isEliminating = true;
        next[row][col].isEliminating = true;
        return next;
      });
      setSelected(null);

      setTimeout(() => {
        setCells(prev => {
          const next = prev.map(r => r.map(c => ({ ...c })));
          next[selected.row][selected.col].isEmpty = true;
          next[selected.row][selected.col].isEliminating = false;
          next[row][col].isEmpty = true;
          next[row][col].isEliminating = false;
          return next;
        });

        setEliminatedCount(prev => {
          const next = prev + 1;
          if (next >= activePairs.length) {
            setIsComplete(true);
          }
          if (next === Math.floor(activePairs.length / 2) && !milestoneShownRef.current) {
            milestoneShownRef.current = true;
            setMilestone('已经消了一半啦！继续加油 ⚡');
            setTimeout(() => setMilestone(null), 2000);
          }
          return next;
        });

        // 死局检测
        setTimeout(() => {
          setCells(currentCells => {
            if (!hasValidPair(currentCells, activePairs)) {
              const remainingCount = currentCells.flat().filter(c => !c.isEmpty).length;
              if (remainingCount > 0) {
                setIsDeadlock(true);
              }
            }
            return currentCells;
          });
        }, 50);
      }, 300);

    } else {
      // 不是同一词对 — 移动选中到新格子
      setCells(prev => {
        const next = prev.map(r => r.map(c => ({ ...c, isSelected: false })));
        next[row][col].isSelected = true;
        return next;
      });
      setSelected({ row, col });
    }
  }, [cells, selected, activePairs, options]);

  return {
    cells,
    eliminatedCount,
    isComplete,
    feedback,
    milestone,
    isDeadlock,
    handleCellClick,
    showHint,
    restart,
    reshuffle,
  };
}
