'use client';

import { useMemo, useState, useCallback } from 'react';
import type { SaveData, Story, AnimalCharacter, WordCard } from '@/types';
import { useStory } from '@/hooks/useStory';
import { useTTS } from '@/hooks/useTTS';
import { MascotImg } from './MascotImg';

interface Props {
  saveData: SaveData;
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

function renderBookLine(
  seg: Segment,
  segIdx: number,
  targetWords: string[]
) {
  const text = seg.text.trim();
  if (!text) return null;

  const wordPattern = targetWords.length > 0
    ? new RegExp(`(${targetWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
    : null;

  const parts = wordPattern ? text.split(wordPattern) : [text];
  const inner = parts.map((part, i) =>
    wordPattern && targetWords.includes(part)
      ? <mark key={i}>{part}</mark>
      : <span key={i}>{part}</span>
  );

  return (
    <div key={segIdx} className="book-line">
      {inner}
    </div>
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
export function StoryScreen({ saveData, onAddStory, onDeleteStory, getCharacter, getRandomScene }: Props) {
  const initialStory = saveData.stories?.[0] ?? null;
  const [currentStory, setCurrentStory] = useState<Story | null>(initialStory);
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(initialStory));
  const [showPicker, setShowPicker] = useState(false);
  const [showStoryList, setShowStoryList] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  const character = getCharacter();

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
      <div className="story-screen story-pick-wrap">
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
    <div className="room-main">
      <div className="room-floor" />
      <div className="room-cols">
        {/* 左：吉祥物念读 + 操作 */}
        <div className="room-left">
          <div className="room-narrator">
            <MascotImg animal={character.animal} pose="idle" emoji={character.emoji} className="mascot-img-xl" />
            <div className="speech room-speech">
              {currentStory ? '想听我念这个故事吗？' : '挑几张词卡，我给你编个故事吧！'}
            </div>
          </div>
          <div className="room-ctrls">
            {currentStory ? (
              <>
                <button
                  className="btn btn-primary btn-big btn-block"
                  onClick={() => (isSpeaking ? stop() : speak(currentStory.content))}
                >
                  {isSpeaking ? '⏸ 停一下' : '🔊 让我念给你听'}
                </button>
                <button className="btn btn-restart btn-block" disabled={isGenerating} onClick={handleRegenerate}>
                  {isGenerating ? '生成中…' : '🔄 换一个故事'}
                </button>
                <button className="btn btn-save-story btn-block" disabled={isSaved} onClick={handleSaveStory}>
                  {isSaved ? '已收藏 ✓' : '⭐ 收藏故事'}
                </button>
                <button className="btn btn-ghost btn-block" disabled={!canGenerate || isGenerating} onClick={handleOpenPicker}>
                  ✍️ 编新故事
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-primary btn-big btn-block" disabled={!canGenerate || isGenerating} onClick={handleOpenPicker}>
                  ✍️ 编新故事
                </button>
                <button className="btn btn-restart btn-block" disabled={oldStories.length === 0} onClick={() => setShowStoryList(true)}>
                  📚 听旧故事 {oldStories.length > 0 ? `(${oldStories.length})` : ''}
                </button>
              </>
            )}
          </div>
        </div>

        {/* 右：绘本跨页 */}
        <div className="room-book">
          {currentStory ? (
            <>
              <div className="book-title">{currentStory.title ?? `${currentStory.characterName}的小故事`}</div>
              <div className="book-tag">发生在{currentStory.scene} · {currentStory.words.join('、')}</div>
              <div className="book-page">
                {storySegments.map((seg, i) => renderBookLine(seg, i, currentStory.words))}
              </div>
            </>
          ) : (
            <div className="book-empty">
              {canGenerate
                ? '还没有故事～点左边「编新故事」开始吧！'
                : '至少收集 3 张词卡才能编故事，先去闯关收集吧～'}
            </div>
          )}
          {error && <div className="story-error">{error}</div>}
        </div>
      </div>

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
