'use client';

import { useState } from 'react';
import type { UserProfile, AnimalCharacter } from '@/types';
import { AVAILABLE_ANIMALS, AVAILABLE_SCENES } from '@/types';

interface ProfileSetupModalProps {
  onComplete: (profile: UserProfile) => void;
}

type Step = 1 | 2 | 3;

export function ProfileSetupModal({ onComplete }: ProfileSetupModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [childName, setChildName] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState<typeof AVAILABLE_ANIMALS[number] | null>(null);
  const [animalName, setAnimalName] = useState('');
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]);

  const handleSceneToggle = (sceneName: string) => {
    setSelectedScenes(prev => {
      if (prev.includes(sceneName)) return prev.filter(s => s !== sceneName);
      return [...prev, sceneName];
    });
  };

  const handleComplete = () => {
    const character: AnimalCharacter = {
      animal: selectedAnimal?.animal ?? '小兔子',
      emoji: selectedAnimal?.emoji ?? '🐰',
      name: animalName.trim() || (selectedAnimal?.animal ?? '小兔子'),
    };
    onComplete({
      childName: childName.trim() || '小朋友',
      character,
      preferredScenes: selectedScenes,
      setupCompleted: true,
    });
  };

  const canProceed = () => {
    if (step === 2) return selectedAnimal !== null && animalName.trim().length > 0;
    if (step === 3) return selectedScenes.length > 0;
    return true;
  };

  return (
    <div className="profile-setup-modal">
      <div className="profile-setup-content">
        {/* 进度指示器 */}
        <div className="step-indicator">
          {[1, 2, 3].map(s => (
            <div key={s} className={`step-dot ${s === step ? 'active' : ''} ${s < step ? 'completed' : ''}`}>
              {s < step ? '✓' : s}
            </div>
          ))}
        </div>

        {/* Step 1: 欢迎页 + 输入名字 */}
        {step === 1 && (
          <div className="step-content">
            <div className="welcome-icon">👋</div>
            <h2>欢迎来到汉字对对碰！</h2>
            <p className="step-description">
              让我们一起开启有趣的汉字学习之旅吧！
            </p>
            <div className="input-group">
              <label>你叫什么名字呀？（可选）</label>
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="输入你的名字"
                maxLength={10}
                className="name-input"
              />
            </div>
          </div>
        )}

        {/* Step 2: 选小动物 + 起名字 */}
        {step === 2 && (
          <div className="step-content">
            <h2>选一个专属小动物</h2>
            <p className="step-description">
              它会陪你一起学汉字，给它起个名字吧！
            </p>
            <div className="animal-grid">
              {AVAILABLE_ANIMALS.map(a => (
                <button
                  key={a.animal}
                  className={`animal-card ${selectedAnimal?.animal === a.animal ? 'selected' : ''}`}
                  onClick={() => setSelectedAnimal(a)}
                >
                  <span className="animal-emoji">{a.emoji}</span>
                  <span className="animal-name">{a.animal}</span>
                  {selectedAnimal?.animal === a.animal && (
                    <span className="check-mark">✓</span>
                  )}
                </button>
              ))}
            </div>
            {selectedAnimal && (
              <div className="input-group" style={{ marginTop: '16px' }}>
                <label>给你的{selectedAnimal.animal}起个名字</label>
                <input
                  type="text"
                  value={animalName}
                  onChange={(e) => setAnimalName(e.target.value)}
                  placeholder={`例如：${selectedAnimal.emoji}棉花糖`}
                  maxLength={6}
                  className="name-input"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: 选择场景 */}
        {step === 3 && (
          <div className="step-content">
            <h2>选择你喜欢的场景</h2>
            <p className="step-description">
              选择你喜欢的场景，让学习更有趣！
            </p>
            <div className="scene-grid">
              {AVAILABLE_SCENES.map(scene => (
                <button
                  key={scene.name}
                  className={`scene-card ${selectedScenes.includes(scene.name) ? 'selected' : ''}`}
                  onClick={() => handleSceneToggle(scene.name)}
                >
                  <span className="scene-emoji">{scene.emoji}</span>
                  <span className="scene-name">{scene.name}</span>
                  {selectedScenes.includes(scene.name) && (
                    <span className="check-mark">✓</span>
                  )}
                </button>
              ))}
            </div>
            <p className="selection-count">
              已选择 {selectedScenes.length} 个场景
            </p>
          </div>
        )}

        {/* 按钮组 */}
        <div className="button-group">
          {step > 1 && (
            <button
              className="btn btn-secondary"
              onClick={() => setStep(prev => (prev - 1) as Step)}
            >
              上一步
            </button>
          )}
          {step < 3 ? (
            <button
              className="btn btn-primary"
              onClick={() => setStep(prev => (prev + 1) as Step)}
              disabled={!canProceed()}
            >
              下一步
            </button>
          ) : (
            <button
              className="btn btn-primary btn-start"
              onClick={handleComplete}
              disabled={!canProceed()}
            >
              🎮 开始游戏
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
