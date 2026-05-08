import { useState, useCallback } from 'react';
import type { SaveData, CustomLevel } from '../types';

const SAVE_KEY = 'hanzi-match-save';
const CUSTOM_KEY = 'hanzi-match-custom-levels';

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { unlockedLevels: ['1-1'], completedLevels: [] };
}

function loadCustomLevels(): CustomLevel[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function useSaveData() {
  const [saveData, setSaveData] = useState<SaveData>(loadSave);
  const [customLevels, setCustomLevels] = useState<CustomLevel[]>(loadCustomLevels);

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
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
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
    saveCustomLevel,
    deleteCustomLevel,
    incrementPlayCount,
  };
}
