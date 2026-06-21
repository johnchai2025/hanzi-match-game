'use client';

import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  char: string;
  size?: number;
  strokeColor?: string;
  shouldStart?: boolean;            // default true; set false to defer animation
  onPhaseOneComplete?: () => void;  // fires when stroke animation ends (before quiz)
  onQuizComplete?: () => void;      // fires when tracing quiz is successfully done
}

export function HanziWriterCanvas({
  char,
  size = 140,
  strokeColor = '#c06020',
  shouldStart = true,
  onPhaseOneComplete,
  onQuizComplete,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const containerId = `hw-${uid}-${char}`;
  const writerRef = useRef<unknown>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!shouldStart) return;
    let cancelled = false;

    async function init() {
      const HanziWriter = (await import('hanzi-writer')).default;
      if (cancelled) return;

      const el = document.getElementById(containerId);
      if (!el) return;

      const writer = HanziWriter.create(el, char, {
        width: size,
        height: size,
        padding: 8,
        strokeColor,
        outlineColor: '#d4a574',
        drawingColor: '#8a5628',
        highlightColor: '#f59e0b',
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
        showOutline: true,
        showCharacter: false,
        onLoadCharDataError: () => {
          if (cancelled) return;
          setLoadFailed(true);
          // Auto-advance so the parent doesn't stay blocked on a missing character
          onPhaseOneComplete?.();
          onQuizComplete?.();
        },
      });

      writerRef.current = writer;

      writer.animateCharacter({
        onComplete: () => {
          if (cancelled) return;
          onPhaseOneComplete?.();
          writer.quiz({
            onComplete: () => {
              if (!cancelled) onQuizComplete?.();
            },
          });
        },
      });
    }

    init();

    return () => {
      cancelled = true;
    };
  // char/size/strokeColor are stable after mount; only re-run when shouldStart flips
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldStart]);

  if (loadFailed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.55,
          color: strokeColor,
          fontFamily: "'Ma Shan Zheng', serif",
          border: '2px dashed #d4a574',
          borderRadius: 12,
          background: '#fff8ef',
        }}
      >
        {char}
      </div>
    );
  }

  return <div id={containerId} style={{ width: size, height: size }} />;
}
