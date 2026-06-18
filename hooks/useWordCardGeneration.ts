'use client';

import { useState, useRef } from 'react';
import type { WordCard, WordPair, AnimalCharacter } from '@/types';

interface GenerationTask {
  id: string;
  word: string;
  chars: WordPair;
  levelId: string;
  animal: string;
  characterName: string;
  scene: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

const MAX_CONCURRENT = 3;

function createWordCard(
  word: string,
  chars: WordPair,
  levelId: string,
  animal: string,
  characterName: string,
  scene: string,
  imageUrl = ''
): WordCard {
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    word,
    chars,
    imageUrl,
    generatedAt: Date.now(),
    levelId,
    animal,
    characterName,
    scene,
  };
}

async function requestGeneratedImage(word: string, animal: string, scene: string): Promise<string> {
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, animal, scene }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const { imageBase64 } = await response.json();
  return imageBase64 ?? '';
}

export function useWordCardGeneration(
  onWordCardGenerated: (card: WordCard) => void,
  getCharacter: () => AnimalCharacter,
  getRandomScene: () => string
) {
  const [pendingCount, setPendingCount] = useState(0);
  const [newCardCount, setNewCardCount] = useState(0);
  const queueRef = useRef<GenerationTask[]>([]);
  const generatingRef = useRef<Set<string>>(new Set());
  const emittedWordsRef = useRef<Set<string>>(new Set());

  async function processQueue() {
    if (generatingRef.current.size >= MAX_CONCURRENT) return;
    if (queueRef.current.length === 0) return;

    const task = queueRef.current.find(t => t.status === 'pending');
    if (!task) return;

    task.status = 'generating';
    generatingRef.current.add(task.id);
    setPendingCount(queueRef.current.filter(t => t.status === 'pending' || t.status === 'generating').length);

    try {
      const imageBase64 = await requestGeneratedImage(task.word, task.animal, task.scene);
      const card = createWordCard(task.word, task.chars, task.levelId, task.animal, task.characterName, task.scene, imageBase64);

      onWordCardGenerated(card);
      emittedWordsRef.current.add(`${task.levelId}-${task.word}`);
      task.status = 'completed';
      setNewCardCount(prev => prev + 1);
    } catch (error) {
      console.error('Failed to generate word card:', error);
      if (!emittedWordsRef.current.has(`${task.levelId}-${task.word}`)) {
        onWordCardGenerated(createWordCard(task.word, task.chars, task.levelId, task.animal, task.characterName, task.scene));
        emittedWordsRef.current.add(`${task.levelId}-${task.word}`);
        setNewCardCount(prev => prev + 1);
      }
      task.status = 'failed';
    } finally {
      generatingRef.current.delete(task.id);
      setPendingCount(queueRef.current.filter(t => t.status === 'pending' || t.status === 'generating').length);
      processQueue();
    }
  }

  const generateCard = (
    word: string,
    chars: WordPair,
    levelId: string
  ) => {
    const taskKey = `${levelId}-${word}`;
    if (queueRef.current.some(task => `${task.levelId}-${task.word}` === taskKey)) return;
    if (emittedWordsRef.current.has(taskKey)) return;

    const character = getCharacter();
    const task: GenerationTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      word,
      chars,
      levelId,
      animal: character.animal,
      characterName: character.name,
      scene: getRandomScene(),
      status: 'pending',
    };

    queueRef.current.push(task);
    setPendingCount(prev => prev + 1);
    processQueue();
  };

  const generateCardPreview = async (
    word: string,
    chars: WordPair,
    levelId: string,
    animal?: string,
    characterName?: string,
    scene?: string
  ): Promise<{ card: WordCard; error?: string }> => {
    const character = getCharacter();
    const resolvedAnimal = animal ?? character.animal;
    const resolvedName = characterName ?? character.name;
    const resolvedScene = scene ?? getRandomScene();
    try {
      const imageBase64 = await requestGeneratedImage(word, resolvedAnimal, resolvedScene);
      return { card: createWordCard(word, chars, levelId, resolvedAnimal, resolvedName, resolvedScene, imageBase64) };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('generateCardPreview failed:', msg);
      return { card: createWordCard(word, chars, levelId, resolvedAnimal, resolvedName, resolvedScene), error: msg };
    }
  };

  const generateLevelCards = (
    pairs: WordPair[],
    levelId: string
  ) => {
    pairs.forEach((pair) => {
      const word = pair.join('');
      generateCard(word, pair, levelId);
    });
  };

  const resetNewCardCount = () => {
    setNewCardCount(0);
  };

  return {
    pendingCount,
    newCardCount,
    generateCard,
    generateCardPreview,
    generateLevelCards,
    resetNewCardCount,
  };
}
