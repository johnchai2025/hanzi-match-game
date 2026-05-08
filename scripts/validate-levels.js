#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/validate-levels.js public/levels.json');
  process.exit(1);
}

let data;
try {
  const raw = fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf-8');
  data = JSON.parse(raw);
} catch (e) {
  console.error('JSON 格式错误：', e.message);
  process.exit(1);
}

let hasError = false;
const ids = new Set();

data.levels.forEach((level, i) => {
  const label = `关卡 ${level.id || i}`;

  if (!level.id) { console.error(`${label}: 缺少 id`); hasError = true; }
  if (ids.has(level.id)) { console.error(`${label}: id 重复`); hasError = true; }
  ids.add(level.id);

  if (!Array.isArray(level.pairs)) {
    console.error(`${label}: pairs 不是数组`);
    hasError = true;
    return;
  }

  if (level.pairs.length !== 18) {
    console.error(`${label}: 词对数量为 ${level.pairs.length}，应为 18`);
    hasError = true;
  }

  const chars = level.pairs.flat();
  const charSet = new Set(chars);
  if (charSet.size !== chars.length) {
    const dup = chars.filter((c, i) => chars.indexOf(c) !== i);
    console.error(`${label}: 存在重复汉字：${[...new Set(dup)].join(' ')}`);
    hasError = true;
  }
});

if (hasError) {
  console.error('\n验证失败，请修正上述问题后重新检查。');
  process.exit(1);
} else {
  console.log(`✓ 验证通过，共 ${data.levels.length} 个关卡，格式正确。`);
}
