export type WordPair = [string, string];

export interface LevelData {
  id: string;
  grade: 1 | 2 | 3;
  level: number;
  title: string;
  pairs: WordPair[];
  semester?: 1 | 2;
  lessons?: string[];
  newChars?: string[];
  boardRows?: number;
  boardCols?: number;
}

export interface Cell {
  id: string;
  char: string;    // 格子显示的单个汉字，如 "高"
  word: string;    // 完整词语，如 "高山"，用于词卡和朗读
  pairId: number;  // 同一词语的两个汉字共享同一 pairId
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

// ========== Phase 2: 新增数据模型 ==========

export interface AnimalCharacter {
  animal: string;   // '小兔子' | '小猫咪' 等
  emoji: string;    // '🐰' | '🐱' 等
  name: string;     // 孩子起的名字，如 '棉花糖'
}

export interface UserProfile {
  childName: string;
  character: AnimalCharacter;
  preferredScenes: string[];
  setupCompleted: boolean;
}

export interface WordCard {
  id: string;
  word: string;
  chars: [string, string];
  imageUrl: string;
  generatedAt: number;
  levelId: string;
  characterName: string;  // 角色名，如 '棉花糖'
  animal: string;         // 动物类型，如 '小兔子'
  scene: string;
}

export interface Story {
  id: string;
  words: string[];
  wordCards?: string[];
  content: string;
  audioUrl?: string;
  generatedAt: number;
  characterName: string;  // 角色名
  animal: string;         // 动物类型
  scene: string;
}

// 扩展 SaveData
export interface SaveData {
  unlockedLevels: string[];
  completedLevels: string[];
  wordCards: WordCard[];         // 新增
  stories: Story[];
}

export interface CurriculumUnit {
  id: string;
  grade: 1 | 2 | 3;
  semester: 1 | 2;
  unit: number;
  title: string;
  lessons: string[];
  newChars: string[];
  pairs: WordPair[];
  boardRows: number;
  boardCols: number;
}

export interface Curriculum {
  version: string;
  textbook: string;
  grade: 1 | 2 | 3;
  semester: 1 | 2;
  units: CurriculumUnit[];
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

// ========== 常量定义 ==========

export const AVAILABLE_ANIMALS: Omit<AnimalCharacter, 'name'>[] = [
  { animal: '小兔子', emoji: '🐰' },
  { animal: '小猫咪', emoji: '🐱' },
  { animal: '小熊猫', emoji: '🐼' },
  { animal: '小狗狗', emoji: '🐶' },
  { animal: '小鸭子', emoji: '🐥' },
  { animal: '小狐狸', emoji: '🦊' },
  { animal: '小老虎', emoji: '🐯' },
  { animal: '小青蛙', emoji: '🐸' },
];

export const AVAILABLE_SCENES = [
  { name: '森林', emoji: '🌲' },
  { name: '学校', emoji: '🏫' },
  { name: '家里', emoji: '🏠' },
  { name: '太空', emoji: '🚀' },
  { name: '海边', emoji: '🏖️' },
  { name: '城市', emoji: '🏙️' },
  { name: '糖果王国', emoji: '🍬' },
] as const;
