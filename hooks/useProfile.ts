'use client';

import { useState, useCallback } from 'react';
import type { UserProfile, AnimalCharacter } from '@/types';

const PROFILE_KEY = 'hanziGame_profile';

const defaultCharacter: AnimalCharacter = { animal: '小兔子', emoji: '🐰', name: '小兔' };

const defaultProfile: UserProfile = {
  childName: '',
  character: defaultCharacter,
  preferredScenes: [],
  setupCompleted: false,
};

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (typeof window === 'undefined') return defaultProfile;
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultProfile, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    }
    return defaultProfile;
  });

  const saveProfile = useCallback((newProfile: UserProfile) => {
    setProfile(newProfile);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    }
  }, []);

  const isSetupRequired = !profile.setupCompleted;

  const getCharacter = useCallback((): AnimalCharacter => {
    return profile.character ?? defaultCharacter;
  }, [profile.character]);

  const getRandomScene = useCallback(() => {
    if (profile.preferredScenes.length > 0) {
      return profile.preferredScenes[Math.floor(Math.random() * profile.preferredScenes.length)];
    }
    return '森林';
  }, [profile.preferredScenes]);

  return {
    profile,
    saveProfile,
    isSetupRequired,
    isLoaded: true,
    getCharacter,
    getRandomScene,
  };
}
