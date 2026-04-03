# MJCal Next.js 遷移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將麻將聽牌計算機從 Python Flask 遷移到 Next.js，部署到 Vercel，實現 GitHub 自動部署。

**Architecture:**
- Next.js 16 App Router 架構
- API Routes 封裝現有 mj_calc.js 邏輯（透過 child_process 調用）
- React 組件保持現有 UI 外觀
- 階段性重構：先移植，後重寫計算邏輯

**Tech Stack:** Next.js 16, TypeScript, Node.js child_process, Vercel, GitHub Actions

---

## File Structure

```
mjcal/                           # 現有項目根目錄
├── app/                         # Next.js App Router
│   ├── page.tsx                 # 首頁（移植自 index.html）
│   ├── layout.tsx                # 根佈局
│   ├── globals.css               # 樣式（從 app-zen.css 複製）
│   └── api/
│       ├── calc/route.ts         # POST /api/calc
│       ├── generate/route.ts     # GET /api/generate
│       ├── fan_config/route.ts   # GET/POST /api/fan_config
│       └── sheauhaw/route.ts     # POST /api/sheauhaw
├── lib/
│   ├── calc.ts                   # 封裝 mj_calc.js 調用
│   ├── tiles.ts                  # 牌常量和類型定義
│   └── fan-store.ts              # 內存番數配置存儲
├── scripts/
│   └── wrapper.sh                # 包裝 mj_calc.js 為可調用腳本
├── public/
│   └── static/                   # 現有靜態資源（不變）
├── package.json                  # 更新為 Next.js 項目
├── next.config.ts                # Next.js 配置
├── tsconfig.json                  # TypeScript 配置
└── .env.local                    # 環境變量（本地開發用）
```

---

## Task 1: 初始化 Next.js 項目

**Files:**
- Modify: `package.json`
- Create: `next.config.ts`, `tsconfig.json`

- [ ] **Step 1: 更新 package.json**

```json
{
  "name": "mjcal",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create next.config.ts**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json next.config.ts tsconfig.json
git commit -m "chore: initialize Next.js project structure"
```

---

## Task 2: 創建目錄結構

**Files:**
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `app/api/calc/route.ts`, `app/api/generate/route.ts`, `app/api/fan_config/route.ts`, `app/api/sheauhaw/route.ts`
- Create: `lib/tiles.ts`, `lib/calc.ts`, `lib/fan-store.ts`

- [ ] **Step 1: Create app/layout.tsx**

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '🀄 麻將聽牌計算機',
  description: '麻將聽牌計算機 - 計算向聽數、聽牌、番數',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-HK">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Copy app-zen.css to app/globals.css**

```bash
cp public/static/app-zen.css app/globals.css
```

- [ ] **Step 3: Create lib/tiles.ts (牌常量和類型)**

```typescript
// Tile types
export const TILES: Record<string, { suit: string; value: number; unicode: string }> = {
  '1m': { suit: 'wan', value: 1, unicode: '🀇' },
  '2m': { suit: 'wan', value: 2, unicode: '🀈' },
  // ... all 34 tiles + wildcards
};

export const FLOWER_TILES: Record<string, { unicode: string; suit: string }> = {
  '梅': { unicode: '🀢', suit: 'flower' },
  '蘭': { unicode: '🀣', suit: 'flower' },
  // ... all 8 flower/season tiles
};

export const WILDCARDS: Record<string, { name: string;替代: string; 數量: number; unicode: string; suit: string; code: string }> = {
  '1j': { name: '皇', 替代: '任意牌', 數量: 34, unicode: '皇', suit: 'wild', code: '1j' },
  // ... all 9 wildcards
};

export type CalcRequest = {
  hand: string[];
  open?: string[];
  mode?: number;
  is_zimo?: boolean;
  flowers?: number;
  winning_tile?: string;
  quan_wind?: string;
  wei_wind?: string;
  fan_config?: Record<string, number>;
};

export type CalcResponse = {
  shanten: number;
  wait_type?: string;
  waiting: Array<{ tile: string; count: number; fan: number; breakdown: string[] }>;
  wind_fan: number;
  wind_info?: unknown;
  winning_breakdown: Array<{ name: string; fan: number }>;
  winning_combinations: unknown[];
  winning_fan: number;
  error?: string;
};
```

- [ ] **Step 4: Create lib/calc.ts (mj_calc.js 包裝器)**

```typescript
import { spawn } from 'child_process';
import path from 'path';

export function callMjCalc(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'mj_calc.js');
    const proc = spawn('node', [scriptPath, ...args], {
      cwd: process.cwd(),
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code || 0 });
    });
  });
}
```

- [ ] **Step 5: Create lib/fan-store.ts (內存番數配置)**

```typescript
type FanPattern = {
  name: string;
  fan: number;
};

type FanPreset = {
  name: string;
  patterns: Record<string, number>;
};

const defaultPreset: FanPreset = {
  name: 'default',
  patterns: {},
};

// In-memory store (resets on restart)
let presets: Map<string, FanPreset> = new Map([
  ['default', defaultPreset]
]);

export function getFanConfig(): Record<string, FanPreset> {
  const result: Record<string, FanPreset> = {};
  presets.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export function getFanPresets(): Array<{ id: string; name: string }> {
  const result: Array<{ id: string; name: string }> = [];
  presets.forEach((value, key) => {
    result.push({ id: key, name: value.name });
  });
  return result;
}

export function getFanPreset(id: string): FanPreset | null {
  return presets.get(id) || null;
}

export function updateFanPreset(name: string, patterns: Record<string, number>): void {
  const existing = presets.get(name) || { name, patterns: {} };
  existing.patterns = { ...existing.patterns, ...patterns };
  presets.set(name, existing);
}

export function deleteFanPreset(name: string): boolean {
  if (name === 'default') return false;
  return presets.delete(name);
}
```

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/globals.css lib/tiles.ts lib/calc.ts lib/fan-store.ts
git commit -m "feat: create Next.js app structure with lib modules"
```

---

## Task 3: 創建 API Routes

**Files:**
- Create: `app/api/calc/route.ts`
- Create: `app/api/generate/route.ts`
- Create: `app/api/fan_config/route.ts`
- Create: `app/api/sheauhaw/route.ts`

- [ ] **Step 1: Create app/api/calc/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { callMjCalc } from '@/lib/calc';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hand = [],
      open = [],
      mode = 16,
      is_zimo = false,
      flowers = 0,
      winning_tile = '',
      quan_wind = '',
      wei_wind = '',
      fan_config = {}
    } = body;

    const allTiles = [...hand, ...open];
    const expected = allTiles.length;
    const openCount = open.length;
    const isZimoStr = is_zimo ? '1' : '0';

    const result = await callMjCalc([
      'full',
      JSON.stringify(allTiles),
      String(expected),
      String(mode),
      String(flowers),
      '0', // gang
      isZimoStr,
      '0', '0', '0', // haidi, heidi, lian
      String(openCount),
      quan_wind,
      wei_wind
    ]);

    if (result.code !== 0) {
      return NextResponse.json({ error: 'Calculation failed' }, { status: 400 });
    }

    const data = JSON.parse(result.stdout);

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Calc error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create app/api/generate/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { callMjCalc } from '@/lib/calc';

export async function GET() {
  try {
    // Try up to 500 times to generate a winning hand
    for (let i = 0; i < 500; i++) {
      const result = await callMjCalc(['generate']);

      if (result.code === 0) {
        const data = JSON.parse(result.stdout);
        if (data.hand) {
          return NextResponse.json(data);
        }
      }
    }

    return NextResponse.json({ error: 'Failed to generate winning hand' }, { status: 500 });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create app/api/fan_config/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getFanConfig, getFanPresets, getFanPreset, updateFanPreset, deleteFanPreset } from '@/lib/fan-store';

export async function GET() {
  const config = getFanConfig();
  return NextResponse.json(config);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name = 'default', patterns = {} } = body;

    if (name === 'default') {
      return NextResponse.json({ status: 'error', message: 'Cannot modify default preset' }, { status: 400 });
    }

    updateFanPreset(name, patterns);
    return NextResponse.json({ status: 'ok', message: `Saved: ${name}` });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to save' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { name = '' } = body;

    if (!name || name === 'default') {
      return NextResponse.json({ status: 'error', message: 'Cannot delete default' }, { status: 400 });
    }

    const deleted = deleteFanPreset(name);
    if (deleted) {
      return NextResponse.json({ status: 'ok', message: `Deleted: ${name}` });
    }
    return NextResponse.json({ status: 'error', message: 'Preset not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to delete' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create app/api/sheauhaw/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hand = [], mode = 16, wildcards = {} } = body;

    // Call sheauhaw_adapter.js
    const scriptPath = path.join(process.cwd(), 'sheauhaw_adapter.js');

    // Calculate shanten
    const shantenResult = await new Promise<{ stdout: string; code: number }>((resolve) => {
      const proc = spawn('node', [
        scriptPath, 'step',
        JSON.stringify(hand.reduce((acc: Record<string, number>, t: string) => {
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {})),
        String(mode),
        JSON.stringify(wildcards)
      ], { cwd: process.cwd() });

      let stdout = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.on('close', (code) => resolve({ stdout, code: code || 0 }));
    });

    const shanten = shantenResult.code === 0 ? parseInt(shantenResult.stdout.trim()) : null;

    // Calculate waiting
    const waitingResult = await new Promise<{ stdout: string; code: number }>((resolve) => {
      const proc = spawn('node', [
        scriptPath, 'waiting',
        JSON.stringify(hand.reduce((acc: Record<string, number>, t: string) => {
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {})),
        String(mode),
        JSON.stringify(wildcards)
      ], { cwd: process.cwd() });

      let stdout = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.on('close', (code) => resolve({ stdout, code: code || 0 }));
    });

    const waiting = waitingResult.code === 0 ? JSON.parse(waitingResult.stdout.trim()) : [];

    return NextResponse.json({ shanten, waiting, mode });
  } catch (error) {
    console.error('Sheauhaw error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/calc/route.ts app/api/generate/route.ts app/api/fan_config/route.ts app/api/sheauhaw/route.ts
git commit -m "feat: implement API routes for calc, generate, fan_config, sheauhaw"
```

---

## Task 4: 移植首頁 UI

**Files:**
- Create: `app/page.tsx` (from index.html)

**Context needed from index.html:**
- 1925 lines of jQuery/vanilla JS
- Key sections: mode buttons, tile grids, hand/open display, calculate button, result display
- Event handlers: addTile, removeTile, calculate, showResult, generateWinningHand
- fan config modal and settings

- [ ] **Step 1: Create app/page.tsx - state and helper functions**

```typescript
'use client';

import { useState, useCallback } from 'react';
import './globals.css';
import { TILES, FLOWER_TILES, WILDCARDS, CalcResponse } from '@/lib/tiles';

// ===== State =====
const [handTiles, setHandTiles] = useState<string[]>([]);
const [openTiles, setOpenTiles] = useState<string[]>([]);
const [inputMode, setInputMode] = useState<'hand' | 'open'>('open');
const [gameMode, setGameMode] = useState<14 | 17>(17);
const [result, setResult] = useState<CalcResponse | null>(null);
const [selectedWinTile, setSelectedWinTile] = useState<string | null>(null);
const [isZimo, setIsZimo] = useState(false);
const [quanWind, setQuanWind] = useState('');
const [weiWind, setWeiWind] = useState('');
const [showFanModal, setShowFanModal] = useState(false);

// ===== Helper Functions =====
function addTile(tile: string) {
  if (inputMode === 'hand') {
    if (handTiles.filter(t => t === tile).length < 4) {
      setHandTiles([...handTiles, tile]);
    }
  } else {
    setOpenTiles([...openTiles, tile]);
  }
}

function removeTile(index: number) {
  if (inputMode === 'hand') {
    const newTiles = [...handTiles];
    newTiles.splice(index, 1);
    setHandTiles(newTiles);
  } else {
    const newTiles = [...openTiles];
    newTiles.splice(index, 1);
    setOpenTiles(newTiles);
  }
}

function clearAll() {
  setHandTiles([]);
  setOpenTiles([]);
  setResult(null);
}

function parseHandString(handStr: string): string[] {
  // Line 94-102 from index.html: parse "111m222p333s" → ["1m","2m","3m"...]
  const regex = /(\d+)([mpszjF梅蘭菊竹春夏秋冬])/g;
  const tiles: string[] = [];
  let match;
  while ((match = regex.exec(handStr)) !== null) {
    const numDigits = match[1].length;
    const tileVal = match[1][0] + match[2];
    for (let i = 0; i < numDigits; i++) {
      tiles.push(tileVal);
    }
  }
  return tiles;
}

function loadFromCode() {
  const code = (document.getElementById('codeInput') as HTMLInputElement)?.value || '';
  const tiles = parseHandString(code);
  setHandTiles(tiles);
  setOpenTiles([]);
}

async function calculate() {
  if (handTiles.length === 0) return;

  const response = await fetch('/api/calc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hand: handTiles,
      open: openTiles,
      mode: gameMode,
      is_zimo: isZimo,
      flowers: [...handTiles, ...openTiles].filter(t => t.startsWith('F')).length,
      winning_tile: selectedWinTile,
      quan_wind: quanWind,
      wei_wind: weiWind
    })
  });

  const data = await response.json();
  setResult(data);
}

async function generateWinningHand() {
  const response = await fetch('/api/generate');
  const data = await response.json();
  if (data.hand) {
    setHandTiles(data.hand);
    setOpenTiles([]);
  }
}
```

- [ ] **Step 2: Create JSX structure matching index.html HTML**

Extract these sections from index.html:
1. Mode buttons (lines 52-55): `<button class="mode-btn" id="mode14" data-mode="14">13張</button>`
2. Tile display sections (lines 78-111): hand/open display, tile grids
3. Result section (lines 184-191): shantenResult, waitingGrid
4. Modal (lines 194-199): fan settings modal

Convert inline styles and event handlers to JSX patterns:
- `onclick="addTile('1m')"` → `onClick={() => addTile('1m')}`
- `document.getElementById('codeInput').value` → use state instead
- `document.getElementById('resultSection').classList.add('show')` → conditional rendering

- [ ] **Step 3: Create TileButton component**

```typescript
// components/TileButton.tsx
interface TileButtonProps {
  tile: string;
  onClick: () => void;
  count?: number;
}

export function TileButton({ tile, onClick, count }: TileButtonProps) {
  const tileData = TILES[tile];
  const unicode = tileData?.unicode || WILDCARDS[tile]?.unicode || '?';

  return (
    <button
      className="tile-btn"
      onClick={onClick}
      style={{ position: 'relative' }}
    >
      {unicode}
      {count !== undefined && count > 1 && (
        <span className="tile-count">×{count}</span>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Render tile grids**

```typescript
// In page.tsx render:
<div className="tile-section"><h3>🀇 萬子</h3>
  <div className="tile-grid">
    {['1m','2m','3m','4m','5m','6m','7m','8m','9m'].map(tile => (
      <TileButton
        key={tile}
        tile={tile}
        onClick={() => addTile(tile)}
        count={handTiles.filter(t => t === tile).length + openTiles.filter(t => t === tile).length}
      />
    ))}
  </div>
</div>
```

- [ ] **Step 5: Preserve exact visual styling**

The CSS in app-zen.css is preserved exactly. Use same class names from index.html:
- `.mode-select`, `.mode-btn`, `.mode-btn.active`
- `.display-section`, `.tile-display`, `.label`, `.label.active`
- `.tile-grid`, `.tile-section`, `.tile-btn`
- `.result-section`, `.result-box`, `.shanten`, `.tenpai`
- `.waiting-grid`, `.waiting-item`
- `.modal`, `.modal-content`, `.modal-close`
- `.btn-settings`, `.btn-calc`, `.btn-clear`, `.btn-gen`

- [ ] **Step 6: Test locally**

```bash
npm install
npm run dev
# Visit http://localhost:3000
```

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: port index.html to Next.js page component"
```

---

## Task 5: 部署到 Vercel

**Files:**
- Modify: `.vercelignore` (if needed)
- Create: `vercel.json` (if not already present)

- [ ] **Step 1: Ensure vercel.json is correct**

```json
{
  "framework": "nextjs"
}
```

- [ ] **Step 2: Push to GitHub**

```bash
git add .
git commit -m "feat: complete Next.js migration Phase 1"
git push origin main
```

- [ ] **Step 3: Verify Vercel deployment**

Vercel should automatically detect Next.js and deploy. Check:
- https://vercel.com/dashboard for deployment status
- Visit the deployed URL to verify UI works
- Test /api/calc endpoint

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: trigger Vercel deployment via GitHub push"
```

---

## Task 6: 清理和驗證

**Files:**
- Delete: `mahjong_flask.py` (not needed anymore - but keep mj_calc.js and sheauhaw_adapter.js)
- Modify: `.gitignore` (add Next.js build artifacts)

- [ ] **Step 1: Update .gitignore**

```
# Next.js
.next/
out/
build/

# Keep mj_calc.js and other calculation logic
!mj_calc.js
!sheauhaw_adapter.js
```

- [ ] **Step 2: Verify all features work**

Test checklist:
- [ ] Mode selection (13張/16張)
- [ ] Adding tiles to hand/open
- [ ] Calculate button returns correct results
- [ ] Generate winning hand works
- [ ] Fan config modal opens/closes
- [ ] UI matches original exactly

- [ ] **Step 3: Final commit**

```bash
git add .gitignore
git commit -m "chore: finalize Phase 1 migration"
git push
```

---

## Verification Checklist

- [ ] `npm run build` succeeds locally
- [ ] `npm run dev` starts without errors
- [ ] UI displays correctly at localhost:3000
- [ ] Calculate button calls /api/calc and shows results
- [ ] Generate button calls /api/generate and populates hand
- [ ] GitHub push triggers Vercel deployment
- [ ] Deployed URL (vercel.app) works correctly
- [ ] All API endpoints return expected responses

---

## Notes for Phase 2 (Not in Scope)

Phase 2 will address:
- Rewriting mj_calc.js in TypeScript
- Fixing wildcard calculation bugs
- Adding persistent storage (Vercel Blob) for fan_config
- Adding tests

This plan covers only Phase 1: Migration.
