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

  // Sequential animation: second char starts only after first char's Phase 1 ends
  const [startSecond, setStartSecond] = useState(false);
  // Transition gate: only show image after child finishes tracing both chars
  const [char1Done, setChar1Done] = useState(false);
  const [char2Done, setChar2Done] = useState(false);
  const allQuizDone = char1Done && char2Done;

  const showPractice = !allQuizDone;

  return (
    <div className="modal-overlay">
      <div className="reward-card-modal">
        <div className="reward-card-header">
          <h2>{card.word}</h2>
        </div>

        <div className="reward-card-image">
          {showPractice ? (
            <div className="stroke-practice-area">
              <p className="stroke-practice-hint">来写一写这两个字吧 ✏️</p>
              <div className="stroke-writers">
                <div className="stroke-writer-wrap">
                  <HanziWriterCanvas
                    char={card.chars[0]}
                    shouldStart={true}
                    onPhaseOneComplete={() => setStartSecond(true)}
                    onQuizComplete={() => setChar1Done(true)}
                  />
                  <span className="stroke-char-label">{card.chars[0]}</span>
                </div>
                <div className="stroke-writer-wrap">
                  <HanziWriterCanvas
                    char={card.chars[1]}
                    shouldStart={startSecond}
                    onQuizComplete={() => setChar2Done(true)}
                  />
                  <span className="stroke-char-label">{card.chars[1]}</span>
                </div>
              </div>
              <div className="stroke-generating-label">
                {isGenerating ? (
                  <>
                    <span className="stroke-dots" />
                    AI 正在为你画专属词卡
                  </>
                ) : hasImage ? (
                  '✨ 词卡已就绪，完成描红即可查看'
                ) : null}
              </div>
            </div>
          ) : hasImage ? (
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
          <button className="btn btn-restart" disabled={isGenerating} onClick={onSkip}>
            这次不保存
          </button>
          {!isGenerating && !hasImage && allQuizDone && onRetry && (
            <button className="btn btn-outline" onClick={onRetry}>
              再试一次生成图片
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
