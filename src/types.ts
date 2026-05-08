export type WordPair = [string, string];

export interface LevelData {
  id: string;
  grade: 1 | 2 | 3;
  level: number;
  title: string;
  pairs: WordPair[];
}

export interface Cell {
  id: string;
  char: string;
  pairId: number;
  role: 'first' | 'second';
  isEmpty: boolean;
  isSelected: boolean;
  isHinted: boolean;
  isEliminating: boolean;
  isShaking: boolean;
}

export interface GameState {
  currentLevel: LevelData;
  cells: Cell[][];
  selectedCell: { row: number; col: number } | null;
  eliminatedCount: number;
  isComplete: boolean;
  feedbackMessage: string | null;
}

export interface SaveData {
  unlockedLevels: string[];
  completedLevels: string[];
}

export interface CustomLevel {
  id: string;
  title: string;
  pairs: WordPair[];
  createdAt: number;
  playCount: number;
}

export interface ParseResult {
  pairs: WordPair[];
  errors: string[];
  warnings: string[];
}
