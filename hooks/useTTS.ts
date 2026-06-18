'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Priority order: Apple Neural (macOS/iOS) → Windows Neural → Google
const PREFERRED_VOICE_NAMES = [
  'Tingting Premium',
  'Tingting Enhanced',
  'Tingting',
  'Sinji',
  'Yaoyao Online (Natural)',
  'Microsoft Huihui',
  'Microsoft Yaoyao',
  '普通话',
  'zh-CN',
];

function selectBestChineseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const zhVoices = voices.filter(v => v.lang.startsWith('zh'));
  if (zhVoices.length === 0) return null;

  for (const keyword of PREFERRED_VOICE_NAMES) {
    const match = zhVoices.find(v => v.name.includes(keyword));
    if (match) return match;
  }

  const online = zhVoices.find(v => !v.localService && v.lang === 'zh-CN');
  if (online) return online;

  return zhVoices.find(v => v.lang === 'zh-CN') ?? zhVoices[0];
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentCharIndex, setCurrentCharIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  // Chrome bug: speechSynthesis silently stops after ~15s on long texts.
  // Workaround: pause + resume every 10s while speaking.
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cloudUnavailableRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        bestVoiceRef.current = selectBestChineseVoice(voices);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const clearKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      clearKeepAlive();
    };
  }, [clearKeepAlive]);

  const speakWithWebSpeech = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    clearKeepAlive();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.88;
    utterance.pitch = 1.05;

    if (bestVoiceRef.current) {
      utterance.voice = bestVoiceRef.current;
    }

    utterance.onboundary = (event) => setCurrentCharIndex(event.charIndex);

    const onFinish = () => {
      setIsSpeaking(false);
      setCurrentCharIndex(-1);
      clearKeepAlive();
    };
    utterance.onend = onFinish;
    utterance.onerror = onFinish;

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    setCurrentCharIndex(0);
    window.speechSynthesis.speak(utterance);

    keepAliveRef.current = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        clearKeepAlive();
      }
    }, 10000);
  }, [clearKeepAlive]);

  const speak = useCallback(async (text: string) => {
    // Stop any current playback
    audioRef.current?.pause();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    clearKeepAlive();
    setCurrentCharIndex(-1);

    // Use cloud TTS unless it's already been confirmed unavailable this session
    if (!cloudUnavailableRef.current) {
      try {
        setIsSpeaking(true);
        const res = await fetch('/api/generate-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();

        if (data.unsupported) {
          console.warn('[TTS] Edge TTS unavailable, falling back to Web Speech');
          cloudUnavailableRef.current = true;
          setIsSpeaking(false);
          speakWithWebSpeech(text);
          return;
        }

        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
        audioRef.current = audio;

        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => {
          setIsSpeaking(false);
          // Audio play failed — fall back to Web Speech
          speakWithWebSpeech(text);
        };

        await audio.play();
        return;
      } catch {
        console.warn('[TTS] Edge TTS request failed, falling back to Web Speech');
        cloudUnavailableRef.current = true;
        setIsSpeaking(false);
      }
    }

    speakWithWebSpeech(text);
  }, [clearKeepAlive, speakWithWebSpeech]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsSpeaking(false);
    setCurrentCharIndex(-1);
    clearKeepAlive();
  }, [clearKeepAlive]);

  return { isSpeaking, currentCharIndex, speak, stop };
}
