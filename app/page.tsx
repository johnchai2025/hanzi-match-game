'use client'

import { useState } from 'react';
import type { LevelData, CustomLevel, Story, UserProfile, WordCard } from '@/types';
import { useLevels } from '@/hooks/useLevels';
import { useSaveData } from '@/hooks/useSaveData';
import { useProfile } from '@/hooks/useProfile';
import { LevelSelectScreen } from '@/components/LevelSelectScreen';
import { GameScreen } from '@/components/GameScreen';
import { WordBookScreen } from '@/components/WordBookScreen';
import { StoryScreen } from '@/components/StoryScreen';
import { ProfileSetupModal } from '@/components/ProfileSetupModal';

type Screen = 'select' | 'game' | 'wordbook' | 'story';

export default function Home() {
  const { levels, loading, error, reload } = useLevels();
  const { saveData, customLevels, completeLevel, addWordCard, addStory, saveCustomLevel, deleteCustomLevel, incrementPlayCount } = useSaveData();
  const { saveProfile, isSetupRequired, getCharacter, getRandomScene } = useProfile();

  // Bug fix: default to 'select' so first-time users see level selection
  const [screen, setScreen] = useState<Screen>('select');
  const [activeLevel, setActiveLevel] = useState<LevelData | null>(null);
  const [activeCustomLevel, setActiveCustomLevel] = useState<CustomLevel | null>(null);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div>加载字库中…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <div className="error-icon">⚠️</div>
        <div>字库加载失败</div>
        <div className="error-detail">{error}</div>
        <button className="btn btn-primary" onClick={reload}>重试</button>
      </div>
    );
  }

  const getNextLevel = (currentLevel: LevelData): LevelData | null => {
    const idx = levels.findIndex(l => l.id === currentLevel.id);
    return idx >= 0 && idx < levels.length - 1 ? levels[idx + 1] : null;
  };

  const handleSelectLevel = (level: LevelData) => {
    setActiveLevel(level);
    setActiveCustomLevel(null);
    setScreen('game');
  };

  const handlePlayCustom = (level: CustomLevel) => {
    setActiveCustomLevel(level);
    setActiveLevel(levels[0] ?? null);
    setScreen('game');
  };

  const handleNextLevel = (level: LevelData) => {
    setActiveLevel(level);
    setActiveCustomLevel(null);
  };

  const handleComplete = (levelId: string, nextId: string | null) => {
    completeLevel(levelId, nextId);
  };

  const handleProfileComplete = (newProfile: UserProfile) => {
    saveProfile(newProfile);
  };

  const handleAddWordCard = (card: WordCard) => {
    addWordCard(card);
  };

  const handleAddStory = (story: Story) => {
    addStory(story);
  };

  if (screen === 'game' && activeLevel) {
    return (
      <>
        <GameScreen
          key={activeCustomLevel ? activeCustomLevel.id : activeLevel.id}
          level={activeLevel}
          nextLevel={activeCustomLevel ? null : getNextLevel(activeLevel)}
          onSelectLevel={() => setScreen('select')}
          onNextLevel={handleNextLevel}
          onComplete={handleComplete}
          customLevel={activeCustomLevel ?? undefined}
          onIncrementPlayCount={incrementPlayCount}
          onSaveCustom={saveCustomLevel}
          onPlayCustom={handlePlayCustom}
          onWordBook={() => setScreen('wordbook')}
          onAddWordCard={handleAddWordCard}
          savedWordCards={saveData.wordCards}
          getCharacter={getCharacter}
          getRandomScene={getRandomScene}
        />
        {isSetupRequired && (
          <ProfileSetupModal onComplete={handleProfileComplete} />
        )}
      </>
    );
  }

  if (screen === 'wordbook') {
    return (
      <>
        <WordBookScreen
          levels={levels}
          saveData={saveData}
          customLevels={customLevels}
          onBack={() => setScreen(activeLevel ? 'game' : 'select')}
          onStory={() => setScreen('story')}
        />
        {isSetupRequired && (
          <ProfileSetupModal onComplete={handleProfileComplete} />
        )}
      </>
    );
  }

  if (screen === 'story') {
    return (
      <>
        <StoryScreen
          saveData={saveData}
          onBack={() => setScreen('wordbook')}
          onAddStory={handleAddStory}
          getCharacter={getCharacter}
          getRandomScene={getRandomScene}
        />
        {isSetupRequired && (
          <ProfileSetupModal onComplete={handleProfileComplete} />
        )}
      </>
    );
  }

  return (
    <>
      <LevelSelectScreen
        levels={levels}
        saveData={saveData}
        customLevels={customLevels}
        onSelectLevel={handleSelectLevel}
        onPlayCustom={handlePlayCustom}
        onSaveCustom={saveCustomLevel}
        onDeleteCustom={deleteCustomLevel}
      />
      {isSetupRequired && (
        <ProfileSetupModal onComplete={handleProfileComplete} />
      )}
    </>
  );
}
