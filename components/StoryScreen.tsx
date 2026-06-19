'use client';

import { useMemo, useState, useCallback } from 'react';
import type { SaveData, Story, AnimalCharacter, WordCard } from '@/types';
import { useStory } from '@/hooks/useStory';
import { useTTS } from '@/hooks/useTTS';

interface Props {
  saveData: SaveData;
  onBack: () => void;
  onAddStory: (story: Story) => void;
  onDeleteStory: (id: string) => void;
  getCharacter: () => AnimalCharacter;
  getRandomScene: () => string;
}

interface Segment {
  text: string;
  start: number;
}

function splitSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  const re = /[^。！？\n]+[。！？\n]*/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    segments.push({ text: match[0], start: match.index });
  }
  if (segments.length === 0) segments.push({ text: content, start: 0 });
  return segments;
}

function renderSegment(
  seg: Segment,
  segIdx: number,
  targetWords: string[],
  isActive: boolean
) {
  const wordPattern = targetWords.length > 0
    ? new RegExp(`(${targetWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
    : null;

  const parts = wordPattern ? seg.text.split(wordPattern) : [seg.text];
  const inner = parts.map((part, i) =>
    wordPattern && targetWords.includes(part)
      ? <mark key={i}>{part}</mark>
      : part
  );

  return (
    <span key={segIdx} className={isActive ? 'sentence-active' : undefined}>
      {inner}
    </span>
  );
}

// ——— 词卡选择器 ———
interface CardPickerProps {
  cards: WordCard[];
  selectedIds: Set<string>;
  isGenerating: boolean;
  onToggle: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function CardPicker({ cards, selectedIds, isGenerating, onToggle, onConfirm, onCancel }: CardPickerProps) {
  const selectedWords = cards.filter(c => selectedIds.has(c.id)).map(c => c.word);
  const canConfirm = selectedIds.size >= 3 && !isGenerating;

  return (
    <div className="story-card-picker">
      <div className="story-picker-header">
        <button className="story-picker-cancel" onClick={onCancel}>← 取消</button>
        <span className="story-picker-title">选词编故事</span>
        <div style={{ width: 56 }} />
      </div>

      <div className="story-picker-hint">
        {selectedIds.size === 0
          ? '点击词卡选择（至少3个）'
          : `已选 ${selectedIds.size} 个：${selectedWords.join('、')}`}
      </div>

      <div className="story-picker-grid">
        {cards.map(card => (
          <button
            key={card.id}
            className={`story-picker-card${selectedIds.has(card.id) ? ' selected' : ''}`}
            onClick={() => onToggle(card.id)}
          >
            <div className="story-picker-img">
              {card.imageUrl
                ? <img src={card.imageUrl} alt={card.word} />
                : <span className="story-picker-placeholder">{card.word[0]}</span>}
            </div>
            <span className="story-picker-word">{card.word}</span>
            {selectedIds.has(card.id) && <span className="story-picker-check">✓</span>}
          </button>
        ))}
      </div>

      <button
        className="btn btn-primary story-picker-confirm"
        disabled={!canConfirm}
        onClick={onConfirm}
      >
        {isGenerating ? '编故事中…' : `用这 ${selectedIds.size} 个词编故事 →`}
      </button>
    </div>
  );
}

// ——— 故事列表弹窗 ———
interface StoryListModalProps {
  stories: Story[];
  onSelect: (story: Story) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function StoryListModal({ stories, onSelect, onDelete, onClose }: StoryListModalProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="story-list-modal" onClick={e => e.stopPropagation()}>
        <div className="story-list-header">
          <span>我的故事</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="story-list-items">
          {stories.map(story => (
            <div key={story.id} className="story-list-item-row">
              {confirmDeleteId === story.id ? (
                <div className="story-delete-confirm">
                  <span className="story-delete-confirm-text">确认删除这个故事？</span>
                  <button className="story-delete-yes" onClick={() => { onDelete(story.id); setConfirmDeleteId(null); }}>
                    确认删除
                  </button>
                  <button className="story-delete-no" onClick={() => setConfirmDeleteId(null)}>
                    取消
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className="story-list-item"
                    onClick={() => onSelect(story)}
                  >
                    <span className="story-list-title">
                      {story.title ?? `${story.characterName}的小故事`}
                    </span>
                    <span className="story-list-meta">
                      {story.words.join('、')} · {story.scene}
                    </span>
                  </button>
                  <button
                    className="story-list-delete-btn"
                    onClick={() => setConfirmDeleteId(story.id)}
                    title="删除故事"
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ——— 主组件 ———
export function StoryScreen({ saveData, onBack, onAddStory, onDeleteStory, getCharacter, getRandomScene }: Props) {
  const initialStory = saveData.stories?.[0] ?? null;
  const [currentStory, setCurrentStory] = useState<Story | null>(initialStory);
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(initialStory));
  const [showPicker, setShowPicker] = useState(false);
  const [showStoryList, setShowStoryList] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  const { speak, stop, isSpeaking } = useTTS();
  const { isGenerating, error, generateStoryFromCards, regenerateStory } = useStory({
    onStoryGenerated: story => {
      setCurrentStory(story);
      setIsSaved(false);
    },
    getCharacter,
    getRandomScene,
  });

  const cards = saveData.wordCards || [];
  const canGenerate = cards.length >= 3;
  const oldStories = useMemo(() => saveData.stories || [], [saveData.stories]);

  const handleToggleCard = useCallback((id: string) => {
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleOpenPicker = () => {
    setSelectedCardIds(new Set());
    setShowPicker(true);
  };

  const handleConfirmPicker = async () => {
    const selected = cards.filter(c => selectedCardIds.has(c.id));
    stop();
    const story = await generateStoryFromCards(selected);
    if (story) {
      setShowPicker(false);
      setSelectedCardIds(new Set());
    }
  };

  const handleRegenerate = async () => {
    if (!currentStory) return;
    stop();
    await regenerateStory(currentStory.words, currentStory.animal, currentStory.characterName, currentStory.scene);
  };

  const handleSelectOldStory = (story: Story) => {
    stop();
    setCurrentStory(story);
    setIsSaved(true);
    setShowStoryList(false);
    speak(story.content);
  };

  const handleSaveStory = () => {
    if (currentStory && !isSaved) {
      onAddStory(currentStory);
      setIsSaved(true);
    }
  };

  const storySegments = useMemo(
    () => currentStory ? splitSegments(currentStory.content) : [],
    [currentStory]
  );

  if (showPicker) {
    return (
      <div className="story-screen">
        <CardPicker
          cards={cards}
          selectedIds={selectedCardIds}
          isGenerating={isGenerating}
          onToggle={handleToggleCard}
          onConfirm={handleConfirmPicker}
          onCancel={() => setShowPicker(false)}
        />
        {error && <div className="story-error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="story-screen">
      <div className="story-topbar">
        <button className="wordbook-back-btn" onClick={onBack}>← 返回</button>
        <span className="wordbook-topbar-title">讲一个故事</span>
        <div className="wordbook-topbar-spacer" />
      </div>

      <div className="story-actions">
        <button className="story-action-card story-action-new" disabled={!canGenerate || isGenerating} onClick={handleOpenPicker}>
          <span className="story-action-icon">✍️</span>
          <span className="story-action-title">{isGenerating ? '编故事中…' : '编新故事'}</span>
          <span className="story-action-sub">选择喜欢的词卡，生成一个专属故事</span>
        </button>
        <button className="story-action-card story-action-old" disabled={oldStories.length === 0} onClick={() => setShowStoryList(true)}>
          <span className="story-action-icon">📚</span>
          <span className="story-action-title">听旧故事</span>
          <span className="story-action-sub">
            {oldStories.length === 0 ? '还没有保存的故事' : `共 ${oldStories.length} 个故事，点击选择`}
          </span>
        </button>
      </div>

      {!canGenerate && (
        <div className="story-empty">至少需要3张词卡才能编故事，先去游戏里收集词卡吧。</div>
      )}
      {error && <div className="story-error">{error}</div>}

      {currentStory && (
        <div className="story-card">
          <div className="story-card-header">
            <div>
              <div className="story-title">
                {currentStory.title ?? `${currentStory.characterName}的小故事`}
              </div>
              <div className="story-meta">发生在{currentStory.scene} · {currentStory.words.join('、')}</div>
            </div>
          </div>
          <div className="story-content">
            {storySegments.map((seg, i) =>
              renderSegment(seg, i, currentStory.words, false)
            )}
          </div>
          <div className="story-controls">
            <button
              className="btn btn-primary"
              onClick={() => isSpeaking ? stop() : speak(currentStory.content)}
            >
              {isSpeaking ? '暂停朗读' : '朗读故事'}
            </button>
            <button
              className="btn btn-save-story"
              disabled={isSaved}
              onClick={handleSaveStory}
            >
              {isSaved ? '已保存 ✓' : '保存故事'}
            </button>
            <button
              className="btn btn-restart"
              disabled={isGenerating}
              onClick={handleRegenerate}
            >
              {isGenerating ? '生成中…' : '再生成'}
            </button>
          </div>
        </div>
      )}

      {showStoryList && (
        <StoryListModal
          stories={oldStories}
          onSelect={handleSelectOldStory}
          onDelete={onDeleteStory}
          onClose={() => setShowStoryList(false)}
        />
      )}
    </div>
  );
}
