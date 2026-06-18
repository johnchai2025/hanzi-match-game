'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { LevelData, CustomLevel, WordPair, WordCard } from '../types';
import { useGame, pickPairsForGame } from '../hooks/useGame';
import { useTTS } from '../hooks/useTTS';
import { useWordCardGeneration } from '../hooks/useWordCardGeneration';
import { GameBoard } from './GameBoard';
import { GameHeader } from './GameHeader';
import { GameControls } from './GameControls';
import { FeedbackToast } from './FeedbackToast';
import { MilestoneToast } from './MilestoneToast';
import { CompletionModal } from './CompletionModal';
import { UploadPanel } from './UploadPanel';
import { DeadlockModal } from './DeadlockModal';
import { NewCardToast } from './NewCardToast';
import { RewardCardModal } from './RewardCardModal';

interface RewardCardState {
  status: 'generating' | 'ready';
  card: WordCard;
  error?: string;
}

interface Props {
  level: LevelData;
  nextLevel: LevelData | null;
  onSelectLevel: () => void;
  onNextLevel: (level: LevelData) => void;
  onComplete: (levelId: string, nextId: string | null) => void;
  customLevel?: CustomLevel;
  onIncrementPlayCount?: (id: string) => void;
  onSaveCustom: (level: CustomLevel) => void;
  onPlayCustom: (level: CustomLevel) => void;
  onWordBook: () => void;
  // 新增：词卡生成相关
  onAddWordCard?: (card: WordCard) => void;
  savedWordCards?: WordCard[];
  getCharacter?: () => import('../types').AnimalCharacter;
  getRandomScene?: () => string;
}

export function GameScreen({
  level,
  nextLevel,
  onSelectLevel,
  onNextLevel,
  onComplete,
  customLevel,
  onIncrementPlayCount,
  onSaveCustom,
  onPlayCustom,
  onWordBook,
  onAddWordCard,
  savedWordCards = [],
  getCharacter,
  getRandomScene,
}: Props) {
  const rows = customLevel ? 4 : level.boardRows ?? 4;
  const cols = customLevel ? 4 : level.boardCols ?? 4;
  const pairCount = Math.floor((rows * cols) / 2);

  const activePairs = useMemo<WordPair[]>(() => {
    if (customLevel) return pickPairsForGame(customLevel.pairs, pairCount);
    return pickPairsForGame(level.pairs, pairCount);
  }, [level, customLevel, pairCount]);

  const completedRef = useRef(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showNewCardToast, setShowNewCardToast] = useState(false);
  const [savedCardCount, setSavedCardCount] = useState(0);
  const [rewardCard, setRewardCard] = useState<RewardCardState | null>(null);
  const [flippedCells, setFlippedCells] = useState<Set<string>>(new Set());
  const { speak } = useTTS();
  const handleGeneratedCard = useCallback(() => {}, []);

  const {
    generateCardPreview,
    resetNewCardCount,
  } = useWordCardGeneration(
    handleGeneratedCard,
    getCharacter ?? (() => ({ animal: '小兔子', emoji: '🐰', name: '小兔' })),
    getRandomScene ?? (() => '森林')
  );

  const handlePairEliminated = useCallback(({ word, chars }: { word: string; chars: WordPair }) => {
    speak(word);
    const character = getCharacter?.() ?? { animal: '小兔子', emoji: '🐰', name: '小兔' };
    const scene = getRandomScene?.() ?? '森林';
    const placeholderCard: WordCard = {
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      word,
      chars,
      imageUrl: '',
      generatedAt: Date.now(),
      levelId: level.id,
      animal: character.animal,
      characterName: character.name,
      scene,
    };

    setRewardCard({ status: 'generating', card: placeholderCard });
    generateCardPreview(word, chars, level.id, character.animal, character.name, scene).then(({ card, error }) => {
      setRewardCard(current => {
        if (!current || current.card.word !== word || current.card.levelId !== level.id) return current;
        return { status: 'ready', card, error };
      });
    });
  }, [generateCardPreview, getCharacter, getRandomScene, level.id, speak]);

  const gameOptions = useMemo(() => ({
    rows,
    cols,
    onPairEliminated: handlePairEliminated,
  }), [cols, handlePairEliminated, rows]);

  const { cells, eliminatedCount, isComplete, feedback, milestone, isDeadlock, handleCellClick, showHint, restart, reshuffle } =
    useGame(level, activePairs, gameOptions);

  // 监听关卡完成
  useEffect(() => {
    if (isComplete && !completedRef.current) {
      completedRef.current = true;
      if (!customLevel) {
        onComplete(level.id, nextLevel?.id ?? null);
      } else if (onIncrementPlayCount) {
        onIncrementPlayCount(customLevel.id);
      }

    }
  }, [isComplete, level, nextLevel, customLevel, onComplete, onIncrementPlayCount]);

  const handleFlipCell = useCallback((cellId: string) => {
    setFlippedCells(prev => {
      const next = new Set(prev);
      if (next.has(cellId)) next.delete(cellId);
      else next.add(cellId);
      return next;
    });
  }, []);

  const handleRestart = () => {
    completedRef.current = false;
    setSavedCardCount(0);
    setRewardCard(null);
    setFlippedCells(new Set());
    resetNewCardCount();
    const newPairs = customLevel ? pickPairsForGame(customLevel.pairs, pairCount) : pickPairsForGame(level.pairs, pairCount);
    restart(newPairs);
  };

  const handleReshuffle = () => {
    reshuffle();
  };

  const handleSaveRewardCard = () => {
    if (!rewardCard) return;
    const existingCard = savedWordCards.find(
      card => card.levelId === rewardCard.card.levelId && card.word === rewardCard.card.word
    );
    const willChangeLibrary = !existingCard || (!existingCard.imageUrl && Boolean(rewardCard.card.imageUrl));

    onAddWordCard?.(rewardCard.card);
    if (willChangeLibrary) {
      setSavedCardCount(prev => prev + 1);
      setShowNewCardToast(true);
      setTimeout(() => setShowNewCardToast(false), 3000);
    }
    setRewardCard(null);
  };

  const handleSkipRewardCard = () => {
    setRewardCard(null);
  };

  const handleRetryRewardCard = () => {
    if (!rewardCard) return;
    const { word, chars, levelId, animal, characterName, scene } = rewardCard.card;
    setRewardCard({ status: 'generating', card: rewardCard.card });
    generateCardPreview(word, chars, levelId, animal, characterName, scene).then(({ card, error }) => {
      setRewardCard(current => {
        if (!current || current.card.word !== word || current.card.levelId !== levelId) return current;
        return { status: 'ready', card, error };
      });
    });
  };

  return (
    <div className="game-screen">
      <GameHeader
        level={level}
        eliminatedCount={eliminatedCount}
        pairCount={activePairs.length}
        isCustom={!!customLevel}
        customTitle={customLevel?.title}
        onSelectLevel={onSelectLevel}
        onUpload={() => setShowUpload(true)}
      />
      <MilestoneToast message={milestone} />
      <GameBoard cells={cells} onCellClick={handleCellClick} flippedCells={flippedCells} onFlipCell={handleFlipCell} />
      <FeedbackToast message={feedback} />
      <NewCardToast count={savedCardCount} show={showNewCardToast} />
      <GameControls
        onHint={showHint}
        onRestart={handleRestart}
        onSelectLevel={onSelectLevel}
      />
      <button className="btn-wordbook-entry" onClick={onWordBook}>
        📚 词语本
      </button>
      {isComplete && (
        <CompletionModal
          onNextLevel={nextLevel && !customLevel ? () => onNextLevel(nextLevel) : null}
          onRestart={handleRestart}
          onSelectLevel={onSelectLevel}
          onWordBook={onWordBook}
          newCardCount={savedCardCount}
        />
      )}
      {rewardCard && (
        <RewardCardModal
          card={rewardCard.card}
          status={rewardCard.status}
          error={rewardCard.error}
          onSave={handleSaveRewardCard}
          onSkip={handleSkipRewardCard}
          onRetry={handleRetryRewardCard}
        />
      )}
      {isDeadlock && (
        <DeadlockModal
          onReshuffle={handleReshuffle}
          onRestart={handleRestart}
        />
      )}
      {showUpload && (
        <UploadPanel
          onSave={onSaveCustom}
          onPlay={onPlayCustom}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
