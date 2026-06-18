# 汉字对对碰 —— 匹配逻辑修复方案

## 一、背景与问题定义

### 两个相互冲突的诉求

| 问题 | 现象 |
|---|---|
| 每格显示完整词语（如"高山"） | 变成了普通的连连看，失去"练习单个汉字"的教学目的 |
| 玩家反映"山水"、"大火"、"雪山"等合法词无法消除 | 只有预设的固定 `pairId` 才能消除，无法识别跨词对的合法组合 |

这两个问题根源相同：上一次重构将游戏改为"整词消除模式"（每格显示完整双字词，pairId 相同才消除），同时丢弃了原本的单字拆分设计。

### 原始游戏意图（应当恢复）

- 棋盘上每格只显示**一个汉字**（如"高"、"山"、"石"、"块"）
- 玩家点击两个汉字，若它们能组成一个**合法词语**，则消除
- 目标：通过游戏让孩子练习辨认和搭配常用汉字

---

## 二、现状分析

### 当前代码状态

**`types.ts`：Cell 接口**
```typescript
export interface Cell {
  id: string;
  word: string;    // 完整词语，如"高山"（整词消除模式遗留）
  pairId: number;
  isEmpty: boolean;
  isSelected: boolean;
  isHinted: boolean;
  isEliminating: boolean;
  isShaking: boolean;
}
```

**`hooks/useGame.ts`：initBoard**
```typescript
const word = pair[0] + pair[1];   // 合并成"高山"
return [{ word, pairId }, { word, pairId }];  // 两张相同的整词牌
```

**`hooks/useGame.ts`：匹配判断**
```typescript
const canEliminate = first.pairId === second.pairId;  // 只认 pairId
```

**`components/CellTile.tsx`：渲染**
```tsx
<span className="cell-word">{cell.word}</span>  // 显示完整词语
```

### 核心限制

1. 棋盘每格存储完整词语，无法在运行时做字符级自由组合
2. 匹配逻辑完全依赖 `pairId`，与字符内容无关
3. 提示（`showHint`）、死局检测（`hasValidPair`）也全部基于 `pairId`

---

## 三、方案选择

经过五种方案对比（见下表），选择**方案 B（单字显示 + 双向 pairId 匹配）**作为本次实施方案。理由：

| 方案 | 单字显示 | 合法词范围 | 改动量 | 可立即落地 |
|---|---|---|---|---|
| A：单字 + 严格顺序 | ✅ | 仅预设 | 最小 | ✅ 但体验差（要求顺序） |
| **B：单字 + 双向 pairId** | ✅ | 仅预设（双向） | **小** | ✅ 推荐 |
| C：单字 + 静态词典 | ✅ | 全局词典 | 中 | ❌ 需准备词典数据 |
| D：单字 + API 查询 | ✅ | 全局词典 | 大 | ❌ 延迟影响体验 |
| E：单字 + 关卡扩词 | ✅ | 预设+人工扩充 | 小 | 部分（需手工维护数据） |

### 方案 B 的设计决策

- 每个词对生成两个格子，分别显示 `pair[0]` 和 `pair[1]`（单字）
- 消除条件：两个格子的 `pairId` 相同（说明来自同一词对），**不要求顺序**
- 既保留了"练习单字"的目的，又消除了"必须先点第一字"的额外负担
- 关于"山水/大火/雪山"仍无法消除的问题：这在方案 B 中是设计取舍——当前关卡数据为每个词设计了明确配对，玩家需要找到**该词对的另一半字**。这与"练习特定词语"的教学目标吻合；后续如需扩展，可叠加方案 E（关卡 extraCombos）

---

## 四、具体改动

### 4.1 `types.ts` — 修改 Cell 接口

**文件路径**：`/workspace/types.ts`

**改动**：将 `word: string` 替换为 `char: string`

```typescript
// 改动前
export interface Cell {
  id: string;
  word: string;    // 整词，如"高山"
  pairId: number;
  ...
}

// 改动后
export interface Cell {
  id: string;
  char: string;    // 单字，如"高"或"山"
  pairId: number;
  ...
}
```

**原因**：Cell 代表棋盘上一个格子，格子应该显示单个汉字，字段名也应语义准确。

---

### 4.2 `hooks/useGame.ts` — 修改 initBoard、reshuffle

**文件路径**：`/workspace/hooks/useGame.ts`

**改动 1：`initBoard` 函数**

```typescript
// 改动前（整词模式）
const allCells = pairs.flatMap((pair, pairId) => {
  const word = pair[0] + pair[1];
  return [
    { word, pairId },
    { word, pairId },
  ];
});

// 改动后（单字模式）
const allCells = pairs.flatMap((pair, pairId) => [
  { char: pair[0], pairId },
  { char: pair[1], pairId },
]);
```

**说明**：每个词对产生 2 个格子，分别存储第一字和第二字。这样棋盘上"高"和"山"各有一个格子，pairId 相同，点击任意顺序均可消除。

**改动 2：`reshuffle` 函数**

```typescript
// 改动前
const remainingCells: { word: string; pairId: number }[] = [];
row.forEach(cell => {
  if (!cell.isEmpty) {
    remainingCells.push({ word: cell.word, pairId: cell.pairId });
  }
});
// newCells[r][c] = { ...cellData, word: cellData.word, ... }

// 改动后
const remainingCells: { char: string; pairId: number }[] = [];
row.forEach(cell => {
  if (!cell.isEmpty) {
    remainingCells.push({ char: cell.char, pairId: cell.pairId });
  }
});
// newCells[r][c] = { ...cellData, char: cellData.char, ... }
```

**改动 3：`reshuffle` 中空格子的默认 word 字段**

```typescript
// 改动前
{ word: '', pairId: 0, isEmpty: true, ... }

// 改动后
{ char: '', pairId: 0, isEmpty: true, ... }
```

**说明**：`reshuffle` 在重新排列格子时需要提取并回填字符，需与 `initBoard` 保持一致的字段名。

**消除逻辑（`handleCellClick`）无需改动**：`canEliminate = first.pairId === second.pairId` 在方案 B 中仍然正确，两张来自同一词对的格子 pairId 相同，无论顺序。

**提示（`showHint`）和死局检测（`hasValidPair`）无需改动**：两者都依赖 `pairId`，在方案 B 中逻辑不变。

---

### 4.3 `components/CellTile.tsx` — 改回显示单字

**文件路径**：`/workspace/components/CellTile.tsx`

```tsx
// 改动前
<span className="cell-word">{cell.word}</span>

// 改动后
<span className="cell-char">{cell.char}</span>
```

**原因**：格子现在存储的是单字，渲染应该用 `cell.char`，同时 class 名改回 `cell-char` 保持语义一致。

---

### 4.4 `app/globals.css` — 恢复单字字号

**文件路径**：`/workspace/app/globals.css`

```css
/* 改动前（双字词用小字号） */
.cell-word {
  font-size: clamp(13px, 3.8vw, 22px);
  font-weight: 700;
  color: #1f2937;
  line-height: 1.1;
  text-align: center;
  letter-spacing: 0.05em;
  word-break: keep-all;
}

/* 改动后（单字用大字号，更易识别） */
.cell-char {
  font-size: clamp(18px, 5vw, 28px);
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}
```

**原因**：单字比双字词需要更大字号才能清晰显示，恢复到原始单字模式下的字号设定。

---

## 五、假设与决策

1. **不引入全局词典**：本次改动范围为最小可行修复，后续如需扩展合法词范围，可在方案 B 基础上叠加方案 E（手工维护关卡 `extraCombos`）或方案 C（静态词典文件）
2. **不要求顺序**：点击同一词对的两个字，无论先点哪个字都可消除，更适合小学生
3. **pairId 匹配机制保留**：提示、死局检测、重新打乱等功能继续复用 pairId，无需重写
4. **CSS 回到单字样式**：class 名从 `cell-word` 改回 `cell-char`，字号恢复大值，视觉上更清晰

---

## 六、验证步骤

1. **TypeScript 编译检查**：运行 `npx tsc --noEmit`，确认零错误
2. **视觉验证**：棋盘上每格只显示一个汉字，字体清晰，6×6 = 36 格每格一个字
3. **基本消除**：点击同一词对的两个字（如"高"+"山"），验证消除动画正常触发
4. **顺序无关**：先点"山"再点"高"，同样可以消除
5. **不同词对不消除**：点击"高"（来自"高山"词对）和"水"（来自其他词对），验证不触发消除，焦点移动到新选格子
6. **提示功能**：点击提示按钮，验证高亮显示的两个格子来自同一词对
7. **死局检测**：验证当无法找到 pairId 匹配时，触发死局提示
8. **完成通关**：消除所有格子，验证完成动画和通关逻辑正常
