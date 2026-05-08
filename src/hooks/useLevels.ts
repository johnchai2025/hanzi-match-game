import { useState, useEffect } from 'react';
import type { LevelData } from '../types';

export function useLevels() {
  const [levels, setLevels] = useState<LevelData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/levels.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const valid = data.levels.every(
          (l: LevelData) => Array.isArray(l.pairs) && l.pairs.length === 18
        );
        if (!valid) throw new Error('字库格式错误：存在关卡词对数量不等于18');
        setLevels(data.levels);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { levels, loading, error };
}
