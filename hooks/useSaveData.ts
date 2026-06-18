'use client'

import { useState, useCallback, useEffect } from 'react';
import type { SaveData, CustomLevel, Story, WordCard } from '../types';
import { saveImage, loadAllImages } from '../lib/imageStore';

const SAVE_KEY = 'hanzi-match-save';
const CUSTOM_KEY = 'hanzi-match-custom-levels';

const defaultSave: SaveData = { unlockedLevels: ['g1s2u1'], completedLevels: [], wordCards: [], stories: [] };

// Strip imageUrl before writing to localStorage (images live in IndexedDB)
function stripImageUrls(data: SaveData): SaveData {
  return {
    ...data,
    wordCards: data.wordCards?.map(c => ({ ...c, imageUrl: '' })) ?? [],
  };
}

function saveToLocalStorage(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(stripImageUrls(data)));
  } catch (e) {
    console.error('localStorage save failed:', e);
  }
}

function loadSaveFromStorage(): SaveData {
  if (typeof window === 'undefined') return defaultSave;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const unlockedLevels = parsed.unlockedLevels?.length ? parsed.unlockedLevels : ['g1s2u1'];
      return {
        unlockedLevels: unlockedLevels.includes('g1s2u1') ? unlockedLevels : ['g1s2u1', ...unlockedLevels],
        completedLevels: parsed.completedLevels || [],
        wordCards: parsed.wordCards || [],
        stories: parsed.stories || [],
      };
    }
  } catch {}
  return defaultSave;
}

function loadCustomLevelsFromStorage(): CustomLevel[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function useSaveData() {
  const [saveData, setSaveData] = useState<SaveData>(() => loadSaveFromStorage());
  const [customLevels, setCustomLevels] = useState<CustomLevel[]>(() => loadCustomLevelsFromStorage());

  // One-time on mount: migrate old imageUrls from localStorage → IndexedDB, then hydrate
  useEffect(() => {
    const cards = saveData.wordCards;
    if (!cards || cards.length === 0) return;

    // If old data had imageUrls saved in localStorage, migrate them to IndexedDB then strip
    const cardsWithImages = cards.filter(c => c.imageUrl);
    if (cardsWithImages.length > 0) {
      Promise.all(cardsWithImages.map(c => saveImage(c.id, c.imageUrl)))
        .then(() => saveToLocalStorage(saveData))
        .catch(console.error);
    }

    // Load all images from IndexedDB and hydrate in-memory state
    loadAllImages(cards.map(c => c.id)).then(imageMap => {
      if (imageMap.size === 0) return;
      setSaveData(prev => ({
        ...prev,
        wordCards: prev.wordCards?.map(c => ({
          ...c,
          imageUrl: c.imageUrl || imageMap.get(c.id) || '',
        })) ?? [],
      }));
    }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once at mount

  const completeLevel = useCallback((levelId: string, nextLevelId: string | null) => {
    setSaveData(prev => {
      const next: SaveData = {
        completedLevels: prev.completedLevels.includes(levelId)
          ? prev.completedLevels
          : [...prev.completedLevels, levelId],
        unlockedLevels:
          nextLevelId && !prev.unlockedLevels.includes(nextLevelId)
            ? [...prev.unlockedLevels, nextLevelId]
            : prev.unlockedLevels,
        wordCards: prev.wordCards || [],
        stories: prev.stories || [],
      };
      saveToLocalStorage(next);
      return next;
    });
  }, []);

  const addWordCard = useCallback((card: WordCard) => {
    // Persist image to IndexedDB before stripping from localStorage
    if (card.imageUrl) {
      saveImage(card.id, card.imageUrl).catch(console.error);
    }

    setSaveData(prev => {
      const existingCards = prev.wordCards || [];
      const existingIndex = existingCards.findIndex(
        c => c.levelId === card.levelId && c.word === card.word
      );
      if (existingIndex >= 0) {
        const existing = existingCards[existingIndex];
        if (existing.imageUrl || !card.imageUrl) return prev;

        const updatedCards = [...existingCards];
        updatedCards[existingIndex] = { ...existing, ...card };
        const next: SaveData = { ...prev, wordCards: updatedCards };
        saveToLocalStorage(next);
        return next;
      }

      const next: SaveData = { ...prev, wordCards: [...existingCards, card] };
      saveToLocalStorage(next);
      return next;
    });
  }, []);

  const addWordCards = useCallback((cards: WordCard[]) => {
    cards.forEach(c => {
      if (c.imageUrl) saveImage(c.id, c.imageUrl).catch(console.error);
    });

    setSaveData(prev => {
      const existingWords = new Set(
        prev.wordCards?.map(c => `${c.levelId}-${c.word}`) || []
      );
      const newCards = cards.filter(
        c => !existingWords.has(`${c.levelId}-${c.word}`)
      );
      if (newCards.length === 0) return prev;

      const next: SaveData = {
        ...prev,
        wordCards: [...(prev.wordCards || []), ...newCards],
      };
      saveToLocalStorage(next);
      return next;
    });
  }, []);

  const addStory = useCallback((story: Story) => {
    setSaveData(prev => {
      const next: SaveData = {
        ...prev,
        stories: [story, ...(prev.stories || [])],
      };
      saveToLocalStorage(next);
      return next;
    });
  }, []);

  const saveCustomLevel = useCallback((level: CustomLevel) => {
    setCustomLevels(prev => {
      const next = [...prev, level];
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteCustomLevel = useCallback((id: string) => {
    setCustomLevels(prev => {
      const next = prev.filter(l => l.id !== id);
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const incrementPlayCount = useCallback((id: string) => {
    setCustomLevels(prev => {
      const next = prev.map(l => l.id === id ? { ...l, playCount: l.playCount + 1 } : l);
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    saveData,
    customLevels,
    completeLevel,
    addWordCard,
    addWordCards,
    addStory,
    saveCustomLevel,
    deleteCustomLevel,
    incrementPlayCount,
  };
}
