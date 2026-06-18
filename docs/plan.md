# 汉字对对碰 v2 — AI 词卡 + Next.js 迁移方案

## Context

现有游戏是纯静态 SPA（Vite + React 19），无后端，关卡数据存于 `public/levels.json`，进度持久化到 localStorage。

本次升级目标：
1. 迁移至 Next.js 15（Full-stack），以 API Routes 保护 Gemini API Key
2. 配对成功后后台调用 Gemini Imagen 生成词卡图片
3. 首次进入弹出设置向导（儿童 IP / 场景偏好）
4. 词卡库：替代现有"词语本"，展示带图片的卡片集
5. 修复已知 Bug（死局检测、硬编码 18、起始界面等）
6. 故事模块（低优先级，末尾实现）

---

## 技术栈变更

| 项目 | 旧 | 新 |
|---|---|---|
| 框架 | Vite + React 19 | **Next.js 15 App Router** + React 19 |
| 语言 | TypeScript | TypeScript（不变）|
| 样式 | 自定义 CSS | 自定义 CSS（保留现有）+ 新组件新增 class |
| 图片生成 | 无 | **Gemini Imagen 3** (`imagen-3.0-generate-002`) |
| TTS | 无 | **浏览器 Web Speech API** |
| 后端 | 无 | Next.js API Routes |
| 部署 | Docker / nginx | Docker（保留）or Vercel |

---

## 目录结构（迁移后）

```
hanzi-match-game-v2/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        ← 入口，原 App.tsx 逻辑
│   ├── api/
│   │   ├── generate-image/route.ts     ← Gemini Imagen 调用
│   │   └── generate-story/route.ts     ← Gemini 文本生成（故事）
│   └── globals.css                     ← 原 index.css + App.css
├── components/                         ← 原 src/components/ 迁移
├── hooks/                              ← 原 src/hooks/ 迁移 + 新 hooks
├── lib/
│   └── gemini.ts                       ← Gemini SDK 封装
├── types.ts                            ← 扩展类型
├── public/
│   └── levels.json                     ← 不变
├── .env.local                          ← GEMINI_API_KEY
└── next.config.ts
```

---

## Phase 1：技术迁移（Vite → Next.js）

### 步骤
1. `npx create-next-app@latest hanzi-match-game-v2 --typescript --app --no-tailwind --no-src-dir`
2. 将 `src/components/` → `components/`，`src/hooks/` → `hooks/`，`src/types.ts` → `types.ts`
3. 将 `src/index.css` + `src/App.css` 合并到 `app/globals.css`
4. 将 `App.tsx` 内容迁移至 `app/page.tsx`（Client Component，加 `'use client'`）
5. 将 `public/levels.json` 原样复制
6. 安装依赖：`@google/generative-ai`
7. 创建 `.env.local`，写入 `GEMINI_API_KEY=...`

---

## Phase 2：数据模型扩展（types.ts）

```typescript
// 新增

export interface UserProfile {
  childName: string;
  preferredIPs: string[];       // ['小猪佩奇', '奥特曼']
  preferredScenes: string[];    // ['学校', '森林']
  setupCompleted: boolean;
}

export interface WordCard {
  id: string;
  word: string;                 // '苹果'
  chars: [string, string];      // ['苹', '果']
  imageUrl: string;             // base64 data URL
  generatedAt: number;
  levelId: string;
  ip: string;                   // 生成时用的 IP
  scene: string;                // 生成时用的场景
}

export interface Story {
  id: string;
  words: string[];              // 选定的词汇
  content: string;              // 纯文本故事
  generatedAt: number;
  ip: string;
}

// 扩展 SaveData
export interface SaveData {
  unlockedLevels: string[];
  completedLevels: string[];
  wordCards: WordCard[];         // 新增
}
```

---

## Phase 3：Profile 设置向导（ProfileSetupModal）

**触发条件**：`localStorage` 中无 `userProfile` 或 `setupCompleted === false`

**UI 结构**：
- Step 1：欢迎页 + 输入孩子昵称（可跳过）
- Step 2：选 IP 角色（多选，最多 3 个）
  - 预设列表：小猪佩奇、奥特曼、宝可梦/皮卡丘、叶罗丽、小马宝莉、汪汪队、海底小纵队、光之美少女
  - 每个选项配对应卡通风格 emoji/颜色块
- Step 3：选偏好场景（多选）
  - 选项：森林、学校、家里、太空、海边、城市、糖果王国
- "开始游戏"按钮 → 存入 localStorage

**新 Hook**：`hooks/useProfile.ts`
- `profile: UserProfile`
- `saveProfile(profile: UserProfile): void`
- `isSetupRequired: boolean`

**文件**：`components/ProfileSetupModal.tsx`

---

## Phase 4：AI 词卡生成流程

### 后端 API（app/api/generate-image/route.ts）

```typescript
POST /api/generate-image
Body: { word: string, ip: string, scene: string }
Response: { imageBase64: string }
```

Prompt 模板（中文，对儿童友好）：
```
卡通插画风格，${ip}正在${scene}里，画面主题与"${word}"相关，
色彩鲜艳明亮，温馨可爱，适合6-9岁儿童欣赏，不含任何文字
```

使用 `@google/generative-ai` 的 `imagen-3.0-generate-002` 模型。

### 前端流程（后台生成，不阻断游戏）

1. 配对成功 → 现有消除动画 → 同时异步发起图片生成请求
2. 生成期间游戏正常进行，不 block UI
3. 图片生成完成 → 将 WordCard 存入 SaveData，显示角落通知 badge："🎴 新词卡 +1"
4. 关卡完成弹窗（CompletionModal）中新增："本关生成了 N 张词卡，点击查看 →"

**新 Hook**：`hooks/useWordCardGeneration.ts`
- `pendingCount: number`（正在生成的请求数）
- `generateCard(word, chars, levelId): void`（发起异步生成）
- 内部将完成的 WordCard 写入 `useSaveData`

**队列策略**：同时最多 3 个并发请求（避免 API rate limit），超出排队等待。

---

## Phase 5：词卡库 UI（WordCardLibraryScreen）

替代现有 `WordBookScreen`，路由：`/wordbook`（或作为同 screen 状态切换）

**布局**：
- 顶部筛选栏：按关卡、按 IP、按时间排序
- 卡片瀑布流（2 列 grid）
  - 每张词卡：生成图片（占卡片 70% 高度）+ 词语大字 + IP 名称小字
  - 点击词卡：放大查看 + 分享按钮（下载图片）
  - 未生成图片的词语（老词库）：展示纯色占位背景 + 词语

**文件**：`components/WordCardLibraryScreen.tsx`

---

## Phase 6：Bug 修复

### 6.1 死局检测
`hooks/useGame.ts` 中每次 `eliminatedCount` 变化后扫描：
```typescript
// 判断是否还有可消除对
const hasValidPair = firsts.some(f => seconds.some(s => s.cell.pairId === f.cell.pairId));
if (!hasValidPair && eliminatedCount > 0 && eliminatedCount < activePairs.length) {
  setIsDeadlock(true); // 触发"无法继续"提示
}
```
死局时显示 toast："棋盘陷入僵局！" + "重新打乱"按钮（不重置进度）。

### 6.2 硬编码 18 修复
`hooks/useGame.ts` 第 ~98 行：
```typescript
// 旧
if (next >= 18) setIsComplete(true);
// 新
if (next >= activePairs.length) setIsComplete(true);
```

### 6.3 起始界面修复
`app/page.tsx`（原 App.tsx）:
```typescript
// 旧
const [screen, setScreen] = useState<Screen>('game');
// 新：首次打开显示选关界面
const [screen, setScreen] = useState<Screen>('select');
```

### 6.4 词对数据质量修复（public/levels.json）
逐一校正以下可疑词对：
- `动物朋友`：`['狗','儿']` → `['金','鱼']`（狗儿不是标准二字词）
- `花草植物`：`['菊','苑']` → `['菊','花']`
- `交通出行`：`['火','箭']` → `['公','交']`（火箭不属于常规出行）
- `四季变化`：`['冰','封']` → `['结','冰']`
- `地理知识`：`['平','野']` → `['平','原']`，`['盆','景']` → `['盆','地']`

运行 `node scripts/validate-levels.js` 验证修复后数据。

---

## Phase 7：故事模块（低优先级）

### 入口
词卡库界面 → 多选词卡 → "生成故事" 按钮（≥ 3 词才可点）

### 后端（app/api/generate-story/route.ts）
```typescript
POST /api/generate-story
Body: { words: string[], ip: string, scene: string }
Response: { story: string }
```

Prompt：
```
用{words.length}个词语（${words.join("、")}）写一个短故事（150-250字），
主角是${ip}，发生在${scene}，风格温馨有趣适合小学生，
每个目标词语在故事中自然出现至少一次
```

### 前端（StoryScreen）
- 故事文本展示，目标词语用 `<mark>` 高亮
- **TTS 控制栏**：
  - 使用 `window.speechSynthesis`，中文语音（`lang: 'zh-CN'`）
  - 播放 / 暂停 / 重播按钮
  - 朗读时实时高亮当前段落（按 `boundary` 事件）
- "再生成"按钮（保持同样词汇）
- "分享"按钮（截图或复制文本）

**文件**：`components/StoryScreen.tsx`，`hooks/useStory.ts`，`hooks/useTTS.ts`

---

## 实现顺序（优先级）

1. ✅ Phase 1：Next.js 迁移（基础环境）
2. ✅ Phase 6：Bug 修复（低风险，立竿见影）
3. ✅ Phase 2：类型扩展
4. ✅ Phase 3：Profile 设置向导
5. ✅ Phase 4：AI 词卡生成 API + 前端流程
6. ✅ Phase 5：词卡库 UI
7. ✅ Phase 7：故事模块（TTS 朗读 + 逐句高亮 + 再生成）

---

## Phase 8 候选（v2 完成后的下一步）

> v2 所有功能（Phase 1-7）已全部完成。以下为后续迭代方向，按优先级排序。

### A. 部署上线（最高优先级）

让孩子真实使用后的反馈比预判需求更有价值，先部署再迭代。

**Option 1 — Vercel（推荐快速验证）**
```bash
npm i -g vercel
vercel --prod
# 需在 Vercel Dashboard 配置环境变量 GEMINI_API_KEY
```

**Option 2 — Docker（私有/家用 NAS 部署）**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
ENV PORT=3000
CMD ["node", "server.js"]
```
`next.config.ts` 需加 `output: 'standalone'`。

---

### B. 游戏体验增强

| 功能 | 价值 | 难度 |
|---|---|---|
| **音效**（匹配成功音、消除音、关卡完成庆祝） | 对儿童影响最大 | 低（Web Audio API / `<audio>`） |
| **关卡星级**（用时越短星越多，增加复玩动力） | 提升留存 | 中 |
| **提示功能**（点击"提示"短暂高亮一对可消除词） | 降低挫败感 | 低 |

---

### C. 内容扩展

- **课程对齐**：`public/curriculum/` 目录已存在但未接入游戏，可补充更多年级词库并在关卡选择界面展示
- **自定义词库入口优化**：当前上传入口在 GameScreen 内部，较隐蔽，可提到 LevelSelectScreen 显眼位置

---



1. **迁移验证**：`npm run dev` 启动，原有 15 关游戏完整可玩，词语本可访问
2. **API 验证**：Postman 调用 `POST /api/generate-image`，返回 base64 图片
3. **词卡流程验证**：完成一关，检查 localStorage 中 `wordCards` 数组有新增条目，词卡库有图片展示
4. **死局验证**：人工构造只剩反向词对的盘面，确认出现死局提示
5. **故事 TTS 验证**：选 3 个词卡 → 生成故事 → 点播放 → 确认朗读正常，目标词高亮

---

## 关键文件

- 迁移后入口：`app/page.tsx`
- 游戏核心 Hook：`hooks/useGame.ts`（含死局/hardcode fix）
- 图片 API：`app/api/generate-image/route.ts`
- 故事 API：`app/api/generate-story/route.ts`
- Gemini 封装：`lib/gemini.ts`
- 类型定义：`types.ts`
- 关卡数据：`public/levels.json`
- Profile Hook：`hooks/useProfile.ts`
- 词卡生成 Hook：`hooks/useWordCardGeneration.ts`
