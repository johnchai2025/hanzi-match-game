'use client'

import { useState } from 'react';
import type { WordCard } from '@/types';
import { HanziWriterCanvas } from './HanziWriterCanvas';

interface Props {
  card: WordCard;
  status: 'generating' | 'ready';
  error?: string;
  onSave: () => void;
  onSkip: () => void;
  onRetry?: () => void;
}

export function RewardCardModal({ card, status, error, onSave, onSkip, onRetry }: Props) {
  const isGenerating = status === 'generating';
  const hasImage = Boolean(card.imageUrl);

  const [startSecond, setStartSecond] = useState(false);
  const [char1Done, setChar1Done] = useState(false);
  const [char2Done, setChar2Done] = useState(false);
  const allQuizDone = char1Done && char2Done;

  const showPractice = !allQuizDone;

  return (
    <div className="modal-overlay">
      <div className={`reward-card-modal${showPractice ? ' practice' : ''}`}>
        <button className="reward-card-close" onClick={onSkip}>×</button>

        {showPractice ? (
          <div className="stroke-practice-area">
            <div className="stroke-writers">
              <div className="stroke-writer-wrap">
                <HanziWriterCanvas
                  char={card.chars[0]}
                  size={190}
                  shouldStart={true}
                  onPhaseOneComplete={() => setStartSecond(true)}
                  onQuizComplete={() => setChar1Done(true)}
                />
              </div>
              <div className="stroke-writer-wrap">
                <HanziWriterCanvas
                  char={card.chars[1]}
                  size={190}
                  shouldStart={startSecond}
                  onQuizComplete={() => setChar2Done(true)}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="reward-card-image">
              {hasImage ? (
                <img src={card.imageUrl} alt={card.word} />
              ) : isGenerating ? (
                <div className="reward-card-placeholder">
                  <div className="reward-card-spinner" />
                  <span>词卡快好了…</span>
                </div>
              ) : (
                <div className="reward-card-placeholder">
                  <span className="reward-card-placeholder-word">{card.word}</span>
                  <span className="reward-card-placeholder-hint">
                    {error ? `生成失败：${error}` : '图片暂时没生成，也可以保存文字词卡'}
                  </span>
                </div>
              )}
            </div>
            <div className="reward-card-actions">
              <button className="btn btn-primary" disabled={isGenerating} onClick={onSave}>
                保存到词卡库
              </button>
              <button className="btn btn-restart" onClick={onSkip}>
                这次不保存
              </button>
              {!isGenerating && !hasImage && onRetry && (
                <button className="btn btn-outline" onClick={onRetry}>
                  再试一次生成图片
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
